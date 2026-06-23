import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Warn early if the key is missing so you can debug setup issues
if (!process.env.GEMINI_API_KEY) {
  console.error(
    "⚠️  WARNING: GEMINI_API_KEY is not set. AI features will not work.",
  );
}

// Initialize the Google Gen AI client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

/**
 * Strips markdown code-block wraps (like ```json and ```)
 * from the response text so it can be parsed cleanly as raw JSON.
 */
const stripMarkdown = (text) => {
  if (!text) return "";
  let cleaned = text.trim();

  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\n?/g, "").replace(/\n?```$/g, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\n?/g, "").replace(/\n?```$/g, "");
  }

  return cleaned.trim();
};

export { ai, stripMarkdown };

export const generateMonthlyInsight = async ({
  totalIncome,
  totalExpenses,
  savingsRate,
  expenseBreakdown,
  previousMonths,
  currency = "USD",
}) => {
  const breakdownText =
    expenseBreakdown.length > 0
      ? expenseBreakdown
          .map((c) => `- ${c.category}: ${currency} ${c.amount.toFixed(2)}`)
          .join("\n")
      : "- No expenses recorded yet";

  const trendText =
    previousMonths.length > 0
      ? previousMonths
          .map(
            (m) =>
              `- ${m.month}: Income ${currency} ${m.income.toFixed(2)}, Expenses ${currency} ${m.expenses.toFixed(2)}`,
          )
          .join("\n")
      : "- No previous month data available";

  const prompt = `Analyze this user's monthly financial data and generate actionable insights.

Currency: ${currency}
Total Income (this month): ${currency} ${totalIncome.toFixed(2)}
Total Expenses (this month): ${currency} ${totalExpenses.toFixed(2)}
Savings Rate: ${savingsRate.toFixed(1)}%

Expense breakdown by category (this month):
${breakdownText}

Previous months trend:
${trendText}

Return ONLY valid JSON (no markdown, no commentary) in this exact structure:
{
  "summary": "2-3 sentence summary of the user's financial health this month",
  "highlights": ["Positive observation 1", "Positive observation 2"],
  "concerns": ["Concern 1", "Concern 2"],
  "recommendations": [
    {"title": "Short title", "detail": "Actionable suggestion (1-2 sentences)"}
  ],
  "topSpendingCategory": "Category name or null",
  "estimatedMonthlySavings": number,
  "healthScore": number
}

Constraints:
- "healthScore" must be an integer between 0 and 100.
- Provide 3 recommendations.
- Reference actual numbers from the data. Tone: friendly but honest.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (monthly insight):", error);
    throw new Error("Failed to generate monthly insight. Please try again.");
  }
};

export const generateSavingsTips = async ({
  topCategories,
  monthlyIncome,
  currency = "USD",
}) => {
  const categoryText =
    topCategories.length > 0
      ? topCategories
          .map(
            (c) =>
              `- ${c.category}: ${currency} ${c.amount.toFixed(2)} across ${c.transactionCount} transactions`,
          )
          .join("\n")
      : "- No spending data available";

  const prompt = `Generate personalized savings tips for a user.

Monthly Income (last 30 days): ${currency} ${monthlyIncome.toFixed(2)}
Top spending categories (last 30 days):
${categoryText}

Return ONLY valid JSON (no markdown):
{
  "overallTip": "Top-level 1-sentence advice",
  "tips": [
    {
      "category": "Category this targets",
      "title": "Short tip title",
      "detail": "2-3 sentence actionable suggestion",
      "estimatedSavings": number
    }
  ]
}

Provide exactly 4 tips. Each tip should reference an actual category from the data and include a realistic monthly savings estimate.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (savings tips):", error);
    throw new Error("Failed to generate savings tips.");
  }
};

export const analyzeTransactionList = async ({
  transactions,
  currency = "USD",
}) => {
  const formatDate = (d) => {
    if (!d) return "";
    if (d instanceof Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
    return String(d).split("T")[0];
  };

  const lines = transactions
    .slice(0, 50)
    .map((t) => {
      const date = formatDate(t.transaction_date);
      const amt = parseFloat(t.amount).toFixed(2);
      const cat = t.category_name || "uncategorized";
      const desc = t.description ? ` | ${t.description}` : "";
      return `- ${date}: ${t.type} ${currency} ${amt} | ${cat}${desc}`;
    })
    .join("\n");

  const prompt = `Analyze these ${transactions.length} transactions and provide a concise, helpful spending insight. Focus on trends, unusual spending patterns, or potential areas for improvement.

Transactions:
${lines}

Return ONLY valid JSON (no markdown):
{
  "insight": "2-4 sentence analysis with specific numbers from the data. Tone: friendly, helpful.",
  "highlight": "Single short phrase capturing the key takeaway (e.g., 'Heavy on dining', 'Stable income', 'Dining out')"
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (analyze transactions):", error);

    // Retry once after a short delay for transient errors
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const retryResp = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const cleanedRetry = stripMarkdown(retryResp.text);
      return JSON.parse(cleanedRetry);
    } catch (retryError) {
      console.error("Gemini retry failed (analyze transactions):", retryError);

      // Deterministic local fallback so the endpoint still returns helpful data
      try {
        const total = transactions.length;
        const sums = transactions.reduce(
          (acc, t) => {
            const amt = parseFloat(t.amount) || 0;
            if (t.type === "expense") acc.expense += amt;
            if (t.type === "income") acc.income += amt;
            acc.byCategory[t.category_name || "Uncategorized"] =
              (acc.byCategory[t.category_name || "Uncategorized"] || 0) + amt;
            return acc;
          },
          { income: 0, expense: 0, byCategory: {} },
        );

        const topCategory = Object.entries(sums.byCategory).sort(
          (a, b) => b[1] - a[1],
        )[0] || [null, 0];
        const topCatName = topCategory[0];
        const topCatAmount = topCategory[1] || 0;

        const insight = `Analyzed ${total} transactions: total income ${currency} ${sums.income.toFixed(2)}, total expenses ${currency} ${sums.expense.toFixed(2)}.`;
        const highlight = topCatName
          ? `Top spending: ${topCatName}`
          : "No categorized spending";

        return { insight, highlight };
      } catch (fallbackError) {
        console.error("Fallback analyze error:", fallbackError);
        throw new Error("Failed to analyze transactions.");
      }
    }
  }
};

export const analyzeBudgetList = async ({ budgets, currency = "USD" }) => {
  const lines = budgets
    .map((b) => {
      const spent = parseFloat(b.spent);
      const total = parseFloat(b.amount);
      const pct = total > 0 ? ((spent / total) * 100).toFixed(1) : "0";
      return `Budget ID ${b.id} | Category: ${b.category_name} | Limit: ${currency} ${total.toFixed(2)} | Spent: ${currency} ${spent.toFixed(2)} (${pct}%)`;
    })
    .join("\n");

  const prompt = `You're a personal finance assistant. Analyze each budget below and provide a one-sentence warning/insight.

Today: ${new Date().toISOString().split("T")[0]}

Budgets:
${lines}

For each budget, return:
- status: 'good' (well-paced, under target), 'caution' (approaching limit or above 70%), or 'concerning' (over budget)
- message: A specific, friendly 1-sentence assessment with actionable feedback or encouragement

Return ONLY valid JSON (no markdown):
{
  "analyses": [
    { "budgetId": number, "status": "good"|"caution"|"concerning", "message": "string" }
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const cleaned = stripMarkdown(response.text);
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Gemini API error (analyze budgets):", error);
    throw new Error("Failed to analyze budget list.");
  }
};
