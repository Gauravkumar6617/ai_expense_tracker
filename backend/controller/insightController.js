import pool from "../db.js";
import {
  generateMonthlyInsight,
  generateSavingsTips,
  analyzeBudgetList,
} from "../utils/gemini_ai.js";

// Utility to read user's currency (DB column is named `curreny` in schema)
export const getUserCurrency = async (userId) => {
  const result = await pool.query("SELECT curreny FROM users WHERE id = $1", [
    userId,
  ]);
  return result.rows[0]?.curreny || "USD";
};

// Express handler to return user's currency
export const getUserCurrencyHandler = async (req, res) => {
  try {
    const currency = await getUserCurrency(req.userId);
    res.json({ currency });
  } catch (error) {
    console.error("Error fetching user currency:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// Return latest insight for user
export const getInSight = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM ai_insight WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No insights found for this user" });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching user insight:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

const buildMonthlyInsight = async (userId) => {
  const data = await pool.query(
    `WITH current_month AS (
						SELECT 
								SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
								SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expense
						FROM transactions
						WHERE user_id = $1
								AND transactions_date >= date_trunc('month', CURRENT_DATE)
				),
				breakdown AS (
						SELECT c.name AS category, SUM(t.amount) AS amount
						FROM transactions t
						JOIN category c ON c.id = t.category_id
						WHERE t.user_id = $1
								AND t.type = 'expense'
								AND t.transactions_date >= date_trunc('month', CURRENT_DATE)
						GROUP BY c.name
						ORDER BY amount DESC
				),
				trend AS (
						SELECT 
								to_char(date_trunc('month', transactions_date), 'YYYY-MM') AS month,
								SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) AS income,
								SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS expenses
						FROM transactions
						WHERE user_id = $1
								AND transactions_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '3 months'
								AND transactions_date < date_trunc('month', CURRENT_DATE)
						GROUP BY 1
						ORDER BY 1 DESC
				)
				SELECT
						(SELECT income FROM current_month) AS income,
						(SELECT expense FROM current_month) AS expense,
						(SELECT json_agg(breakdown) FROM breakdown) AS breakdown,
						(SELECT json_agg(trend) FROM trend) AS trend`,
    [userId],
  );

  const row = data.rows[0] || {};
  const totalIncome = parseFloat(row.income || 0);
  const totalExpenses = parseFloat(row.expense || 0);
  const savingsRate =
    totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
  const currency = await getUserCurrency(userId);

  const content = await generateMonthlyInsight({
    totalIncome,
    totalExpenses,
    savingsRate,
    expenseBreakdown: (row.breakdown || []).map((b) => ({
      category: b.category,
      amount: parseFloat(b.amount),
    })),
    previousMonths: (row.trend || []).map((t) => ({
      month: t.month,
      income: parseFloat(t.income),
      expenses: parseFloat(t.expenses),
    })),
    currency,
  });

  const now = new Date();
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const periodEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return { content, periodStart, periodEnd };
};

const buildSavingsTips = async (userId) => {
  const data = await pool.query(
    `WITH top_categories AS (
				SELECT c.name AS category, SUM(t.amount) AS amount, COUNT(t.id) AS transactionCount
				FROM transactions t
				JOIN category c ON c.id = t.category_id
				WHERE t.user_id = $1 AND t.type = 'expense' AND t.transactions_date >= CURRENT_DATE - INTERVAL '30 days'
				GROUP BY c.name
				ORDER BY amount DESC
				LIMIT 5
		),
		monthly_income AS (
			SELECT SUM(amount) AS income FROM transactions WHERE user_id = $1 AND type = 'income' AND transactions_date >= CURRENT_DATE - INTERVAL '30 days'
		)
		SELECT (SELECT json_agg(top_categories) FROM top_categories) AS top_categories, (SELECT income FROM monthly_income) AS monthly_income`,
    [userId],
  );

  const row = data.rows[0] || {};
  const topCategories = row.top_categories || [];
  const monthlyIncome = parseFloat(row.monthly_income || 0);
  const currency = await getUserCurrency(userId);

  const content = await generateSavingsTips({
    topCategories,
    monthlyIncome,
    currency,
  });
  return { content, periodStart: null, periodEnd: null };
};

const buildBudgetAlert = async (userId, categoryId) => {
  if (!categoryId) {
    const err = new Error("categoryId is required for budget_alert");
    err.status = 400;
    throw err;
  }

  const budgetRow = await pool.query(
    `SELECT b.*, c.name AS category_name,
						COALESCE((
								SELECT SUM(amount) FROM transactions
								WHERE user_id = b.user_id
										AND category_id = b.category_id
										AND type = 'expense'
										AND transactions_date >= date_trunc('month', CURRENT_DATE)
						), 0) AS spent
				 FROM budgets b
				 JOIN category c ON c.id = b.category_id
				 WHERE b.user_id = $1 AND b.category_id = $2`,
    [userId, categoryId],
  );

  if (budgetRow.rows.length === 0) {
    const err = new Error("Budget not found for category");
    err.status = 404;
    throw err;
  }

  const b = budgetRow.rows[0];
  const budgets = [{ ...b }];
  const currency = await getUserCurrency(userId);

  const analysis = await analyzeBudgetList({ budgets, currency });
  return { content: analysis, periodStart: null, periodEnd: null };
};

export const generateInsight = async (req, res) => {
  const { type, categoryId } = req.body || {};
  if (!type) {
    return res.status(400).json({ message: "Insight type is required" });
  }

  try {
    let result;
    if (type === "monthly_summary") {
      result = await buildMonthlyInsight(req.userId);
    } else if (type === "savings_tips") {
      result = await buildSavingsTips(req.userId);
    } else if (type === "budget_alert") {
      result = await buildBudgetAlert(req.userId, categoryId);
    } else {
      return res.status(400).json({ message: "Unknown insight type" });
    }

    const inserted = await pool.query(
      `INSERT INTO ai_insight (user_id, insight_type, period_start, period_end, content_json)
						 VALUES ($1, $2, $3, $4, $5)
						 RETURNING *`,
      [req.userId, type, result.periodStart, result.periodEnd, result.content],
    );

    res.status(201).json(inserted.rows[0]);
  } catch (error) {
    console.error("GenerateInsight error:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Server error" });
  }
};
