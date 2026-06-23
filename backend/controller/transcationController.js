import pool from "../db.js";
import { analyzeTransactionList } from "../utils/gemini_ai.js";

export const getTransactions = async (req, res) => {
  const {
    startDate,
    endDate,
    categoryId,
    type,
    search,
    limit = 50,
    offset = 0,
  } = req.query;

  const conditions = ["t.user_id = $1"];
  const values = [req.userId];

  let idx = 2;

  if (startDate) {
    conditions.push(`t.transactions_date >= $${idx}`);
    values.push(startDate);
    idx++;
  }

  if (endDate) {
    conditions.push(`t.transactions_date <= $${idx}`);
    values.push(endDate);
    idx++;
  }

  if (categoryId) {
    conditions.push(`t.category_id = $${idx}`);
    values.push(categoryId);
    idx++;
  }

  if (type) {
    conditions.push(`t.type = $${idx}`);
    values.push(type);
    idx++;
  }

  if (search) {
    conditions.push(`(t.description ILIKE $${idx} OR t.notes ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  // add limit and offset placeholders
  const limitPos = idx++;
  const offsetPos = idx++;
  values.push(Number(limit));
  values.push(Number(offset));

  const query = `
    SELECT
      t.*,
      t.transactions_date AS transaction_date,
      c.name AS category_name,
      c.icon AS category_icon,
      c.color AS category_color
    FROM transactions t
    LEFT JOIN category c ON t.category_id = c.id
    WHERE ${conditions.join(" AND ")}
    ORDER BY t.transactions_date DESC, t.id DESC
    LIMIT $${limitPos}
    OFFSET $${offsetPos}
  `;

  try {
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error while getting transaction data:", error);
    res
      .status(500)
      .json({ message: "Error while getting transaction details" });
  }
};

export const createTranscation = async (req, res) => {
  // Accept both frontend (camelCase) and backend (snake_case) field names
  const body = req.body || {};
  const category_id = body.category_id || body.categoryId || null;
  const amount = body.amount;
  const type = body.type;
  const description = body.description || null;
  const notes = body.notes || null;
  const transactions_date =
    body.transactions_date || body.transactionDate || body.transactionsDate;

  if (!amount || !type || !transactions_date) {
    return res
      .status(400)
      .json({ message: "Amount, type and transactions_date are required" });
  }

  if (type !== "expense" && type !== "income") {
    return res
      .status(400)
      .json({ message: "type must be 'expense' or 'income'" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, category_id, amount, type, description, notes, transactions_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        req.userId,
        category_id || null,
        amount,
        type,
        description || null,
        notes || null,
        transactions_date,
      ],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("error while creating transcation", error);
    return res.status(500).json({
      message: "Error while creating a transaction. Please try again later.",
    });
  }
};

export const getTranscatioById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.*,
              t.transactions_date AS transaction_date,
              c.name AS category_name,
              c.icon AS category_icon,
              c.color AS category_color
       FROM transactions t
       LEFT JOIN category c ON t.category_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "no data found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("error while fetching transaction by id", error);
    return res.status(500).json({ message: "Error fetching transaction" });
  }
};

export const updateTranscation = async (req, res) => {
  const { id } = req.params;
  // accept both camelCase and snake_case from frontend
  const body = req.body || {};
  const category_id = body.category_id || body.categoryId || null;
  const amount = body.amount || null;
  const type = body.type || null;
  const notes = body.notes || null;
  const description = body.description || null;
  const transactions_date =
    body.transactions_date ||
    body.transactionsDate ||
    body.transactionDate ||
    null;

  try {
    const result = await pool.query(
      `UPDATE transactions SET
         category_id = COALESCE($1, category_id),
         amount = COALESCE($2, amount),
         notes = COALESCE($3, notes),
         description = COALESCE($4, description),
         transactions_date = COALESCE($5, transactions_date),
         type = COALESCE($6, type)
       WHERE id = $7 AND user_id = $8 RETURNING *`,
      [
        category_id || null,
        amount || null,
        notes || null,
        description || null,
        transactions_date || null,
        type || null,
        id,
        req.userId,
      ],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "no data found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("error while updating transcation", error);
    return res.status(500).json({
      message: "Error while updating a transaction. Please try again later.",
    });
  }
};

export const analyzeTransactions = async (req, res) => {
  const { transactionIds } = req.body || {};
  // If Gemini API key is not configured, return a clear error rather than calling the AI client
  if (!process.env.GEMINI_API_KEY) {
    return res
      .status(503)
      .json({
        message:
          "GEMINI_API_KEY not set. AI analysis is unavailable. Set GEMINI_API_KEY in .env to enable this feature.",
      });
  }
  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    return res
      .status(400)
      .json({ message: "transactionIds (array) is required in body" });
  }

  const ids = transactionIds.slice(0, 50);

  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.type, t.description, t.transactions_date AS transaction_date,
                    c.name AS category_name
             FROM transactions t
             LEFT JOIN category c ON c.id = t.category_id
             WHERE t.user_id = $1 AND t.id = ANY($2::int[])
             ORDER BY t.transactions_date DESC`,
      [req.userId, ids],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions found for analysis" });
    }

    // users table has column 'curreny' in schema; select that
    const userRes = await pool.query(
      "SELECT curreny FROM users WHERE id = $1",
      [req.userId],
    );
    const currency = userRes.rows[0]?.curreny || "USD";

    const analysis = await analyzeTransactionList({
      transactions: result.rows,
      currency,
    });

    res.json(analysis);
  } catch (error) {
    console.error("AnalyzeTransactions error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
