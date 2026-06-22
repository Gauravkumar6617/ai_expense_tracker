import pool from "../db.js";

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
  } catch (error) {}
};
