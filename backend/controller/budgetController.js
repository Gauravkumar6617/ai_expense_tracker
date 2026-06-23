import pool from "../db.js";
import { analyzeBudgetList } from "../utils/gemini_ai.js";
export const getbudgets = async (req, res) => {
  const user_id = req.userId;

  try {
    const result = await pool.query(
      `
SELECT 
    b.id,
    b.category_id,
    b.amount,
    b.period,
    b.start_date,
    c.name AS category_name,
    c.icon AS category_icon,
    c.color AS category_color,
    COALESCE(SUM(t.amount), 0) AS spent
FROM budgets b
JOIN categories c ON c.id = b.category_id
LEFT JOIN transactions t 
    ON t.category_id = b.category_id
    AND t.user_id = b.user_id
    AND t.type = 'expense'
    AND (
        (b.period = 'monthly' AND t.transaction_date >= date_trunc('month', CURRENT_DATE))
        OR (b.period = 'weekly' AND t.transaction_date >= date_trunc('week', CURRENT_DATE))
    )
WHERE b.user_id = $1
GROUP BY b.id, c.name, c.icon, c.color
ORDER BY c.name
  `,
      [user_id],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const createBudget = async (req, res) => {
  const { category_id, amount, period = "monthly", start_date } = req.body;
  const user_id = req.userId;

  if (!category_id || !amount || !period || !start_date) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (period !== "monthly" && period !== "weekly") {
    return res
      .status(400)
      .json({ error: "Invalid period. Must be 'monthly' or 'weekly'" });
  }

  try {
    const today = new Date();
    const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    const effectiveDate = start_date < monthStart ? monthStart : start_date;
    const result = await pool.query(
      `
INSERT INTO budgets (user_id, category_id, amount, period, start_date)
VALUES ($1, $2, $3, $4, $5)
RETURNING *
  `,
      [user_id, category_id, amount, period, effectiveDate],
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res
        .status(400)
        .json({ error: "Budget for this category already exists" });
    }
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const updateBudget = async (req, res) => {
  const { id } = req.params;
  const { period, amount } = req.body;
  const user_id = req.userId;
  if (!amount || !period) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    const result = await pool.query(
      `
UPDATE budgets
SET amount = $1, period = $2
WHERE id = $3 AND user_id = $4
RETURNING *
  `,
      [amount, period, id, user_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const deleteBudget = async (req, res) => {
  const { id } = req.params;
  const user_id = req.userId;

  try {
    const result = await pool.query(
      `
DELETE FROM budgets
WHERE id = $1 AND user_id = $2
RETURNING *
  `,
      [id, user_id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Budget not found" });
    }

    res.json({ message: "Budget deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const analyzeBudgets = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
                b.id,
                b.amount,
                b.period,
                c.name AS category_name,
                COALESCE(SUM(t.amount), 0) AS spent
            FROM budgets b
            JOIN categories c ON c.id = b.category_id
            LEFT JOIN transactions t
                ON t.category_id = b.category_id
                AND t.user_id = b.user_id
                AND t.type = 'expense'
                AND (
                    (b.period = 'monthly' AND t.transaction_date >= date_trunc('month', CURRENT_DATE))
                    OR (b.period = 'weekly' AND t.transaction_date >= date_trunc('week', CURRENT_DATE))
                )
            WHERE b.user_id = $1
            GROUP BY b.id, c.name`,
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.json({ analyses: [] });
    }

    const userRes = await pool.query(
      "SELECT currency FROM users WHERE id = $1",
      [req.userId],
    );
    const currency = userRes.rows[0]?.currency || "USD";

    const data = await analyzeBudgetList({
      budgets: result.rows,
      currency,
    });

    res.json(data);
  } catch (error) {
    console.error("AnalyzeBudgets error:", error);
    res.status(500).json({ message: error.message || "Server error" });
  }
};
