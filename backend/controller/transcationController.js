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

  const conditions = ["t.userId = $1"];
  const values = [req.userId];

  let idx = 2;

  // Filter by start date
  if (startDate) {
    conditions.push(`t.transactions_date >= $${idx++}`);
    values.push(startDate);
  }

  // Filter by end date
  if (endDate) {
    conditions.push(`t.transactions_date <= $${idx++}`);
    values.push(endDate);
  }

  // Filter by category
  if (categoryId) {
    conditions.push(`t.category_id = $${idx++}`);
    values.push(categoryId);
  }

  // Filter by transaction type
  if (type) {
    conditions.push(`t.type = $${idx++}`);
    values.push(type);
  }

  // Search in description or notes
  if (search) {
    conditions.push(`(t.description ILIKE $${idx} OR t.notes ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }

  // Pagination
  values.push(Number(limit));
  values.push(Number(offset));

  try {
    const query = `
      SELECT
        t.*,
        c.name AS category_name,
        c.icon AS category_icon,
        c.color AS category_color
      FROM transactions t
      LEFT JOIN categories c
        ON t.category_id = c.id
      WHERE ${conditions.join(" AND ")}
      ORDER BY t.transactions_date DESC, t.id DESC
      LIMIT $${idx++}
      OFFSET $${idx}
    `;

    const result = await pool.query(query, values);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error while getting transaction data:", error);

    res.status(500).json({
      message: "Error while getting transaction details",
    });
  }
};

export const createTranscation = async (req, res) => {
  const { category_id, amount, type, description, notes, transactions_date } =
    req.body;

  if (!amount || !type || !transactions_date) {
    return res
      .status(400)
      .json({ message: "Amount & Type & Transcation Date is required " });
  }
  if (type !== "expense" && type !== "income") {
    return res.status(400).json({ message: "type of expense is requried" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO transactions user_id ,category_id ,amount , type ,description , notes ,  transactions_date VALUES ($1 , $2 , $3 , $4 ,$5 ,$6 ,$7) RETURNING * ,[req.userId ,category_id || null ,amount , type  ,description || null , notes || null ,transactions_date ] `,
    );
    req.status(201).json(result.rows[0]);
  } catch (error) {
    console.log("error while creating transcation", error);
    return res.status(500).json({
      message: "Error while cretaing a transcation.Please try again later.",
    });
  }
};

export const getTranscatioById = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.* ,
            c.name AS category_name,
            c.icon AS category_icon,
            c.color AS category_color
             FROM transactions t
             LEFT JOIN categories  c ON.category_id = c.id WHERE t.id 
             WHERE t.id = $1 AND t.userId = $2,
        [id,req.userId]
            `,
    );
    if (result.rows.length == 0) {
      res.status(400).json({ message: "no data found" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.log("error while creating transcation", error);
    return res.status(500).json({
      message: "Error while cretaing a transcation.Please try again later.",
    });
  }
};

export const updateTranscation = async (req, res) => {
  const { id } = req.params;
  const { categoryId, amount, type, transactionsDate, note, description } =
    req.body;

  try {
    const result = await pool.query(
      ` UPDATE transactions SET category_id = COALESCE ($1,category_id),
          amount = COALESCE ($2, amount),
          notes =  COALESCE ($3 , notes),
            description = COALESCE ($4 , description),
            transactions_date = COALESCE ($5 , transactions_date),
            type = COALESCE ($6 , type)
            WHERE id = $7 AND userId = $8 RETURNING *,
            [categoryId,amount,note,description,transactionsDate,type,id,req.userId]


        `,
    );
    if (result.rows.length == 0) {
      res.status(400).json({ message: "no data found" });
    }

    return res.json(result.rows[0]);
  } catch {
    console.log("error while updating transcation", error);
    return res.status(500).json({
      message: "Error while updating a transcation.Please try again later.",
    });
  }
};

export const analyzeTransactions = async (req, res) => {
  // Note: transactionIds would typically be destructured here, e.g., const { transactionIds } = req.body;
  const ids = transactionIds.slice(0, 50);

  try {
    const result = await pool.query(
      `SELECT t.id, t.amount, t.type, t.description, t.transaction_date,
                    c.name AS category_name
             FROM transactions t
             LEFT JOIN categories c ON c.id = t.category_id
             WHERE t.user_id = $1 AND t.id = ANY($2::int[])
             ORDER BY t.transaction_date DESC`,
      [req.userId, ids],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "No transactions found for analysis" });
    }

    const userRes = await pool.query(
      "SELECT currency FROM users WHERE id = $1",
      [req.userId],
    );
    const currency = userRes.rows[0]?.currency || "USD";

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
