import pool from "../db.js";
import { getCategory } from "./categoryController.js";

const pctChange = (current, previous) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100; // If previous is 0, return 100% if current is not 0, else return 0%
  }
  return ((current - previous) / previous) * 100;
};

const getBudgetSummary = async (req, res) => {
  try {
    const result = await pool.query(
      `
      WITH monthly AS (
    SELECT
        date_trunc('month', transaction_date) AS month,
        type,
        SUM(amount) AS total
    FROM transactions
    WHERE user_id = $1
      AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
    GROUP BY 1, 2
)
SELECT
    COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) AND type = 'income' THEN total END), 0) AS income_this_month,
    COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) AND type = 'expense' THEN total END), 0) AS expense_this_month,
    COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND type = 'income' THEN total END), 0) AS income_last_month,
    COALESCE(SUM(CASE WHEN month = date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND type = 'expense' THEN total END), 0) AS expense_last_month
FROM monthly
      `,
      [req.userId],
    );
    const rows = result.rows[0];
    const income_this_month = parseFloat(rows.income_this_month);
    const expense_this_month = parseFloat(rows.expense_this_month);
    const income_last_month = parseFloat(rows.income_last_month);
    const expense_last_month = parseFloat(rows.expense_last_month);
    const balance_this_month = income_this_month - expense_this_month;
    const savings_this_month =
      balance_this_month > 0
        ? (balance_this_month / income_this_month) * 100
        : 0;
    res.json({
      income_this_month,
      expense_this_month,
      balance_this_month,
      savings_this_month,
      income_change: pctChange(income_this_month, income_last_month),
      expense_change: pctChange(expense_this_month, expense_last_month),
    });
  } catch (error) {
    console.error("Error fetching budget summary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const getCategoryBreakdown = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
                c.id AS category_id,
                c.name AS category_name,
                c.icon AS category_icon,
                c.color AS category_color,
                SUM(t.amount) AS total,
                COUNT(t.id) AS transaction_count
            FROM transactions t
            JOIN categories c ON c.id = t.category_id
            WHERE t.user_id = $1
              AND t.type = 'expense'
              AND t.transaction_date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.id
            ORDER BY total DESC`,
      [req.userId], // Fixed: Placed correctly inside the query parentheses
    );

    // Send the data back to the frontend
    return res.json(result.rows);
  } catch (error) {
    console.error("getCategoryBreakdown error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export default getCategoryBreakdown;

export const getMonthlySummary = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
    to_char(date_trunc('month', transaction_date), 'YYYY-MM') AS month,
    SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
    SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
FROM transactions
WHERE user_id = $1
  AND transaction_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
GROUP BY 1
ORDER BY 1`,
      [req.userId],
    );
    res.json(result.rows);
  } catch (error) {
    console.error("getMonthlySummary error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
