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
      `WITH monthly AS (
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
            FROM monthly`,
      [req.userId],
    );

    // Fallback to empty values if no transactions exist for the specified periods
    const row = result.rows[0] || {
      income_this_month: "0",
      expense_this_month: "0",
      income_last_month: "0",
      expense_last_month: "0",
    };

    const incomeThisMonth = parseFloat(row.income_this_month);
    const expenseThisMonth = parseFloat(row.expense_this_month);
    const incomeLastMonth = parseFloat(row.income_last_month);
    const expenseLastMonth = parseFloat(row.expense_last_month);

    const balance = incomeThisMonth - expenseThisMonth;
    const savingsRate =
      incomeThisMonth > 0 ? (balance / incomeThisMonth) * 100 : 0;

    res.json({
      incomeThisMonth,
      expenseThisMonth,
      balance,
      savingsRate,
      incomeDelta: pctChange(incomeThisMonth, incomeLastMonth),
      expenseDelta: pctChange(expenseThisMonth, expenseLastMonth),
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
