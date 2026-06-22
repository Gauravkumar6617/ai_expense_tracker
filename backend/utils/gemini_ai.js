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

export const generateMonthlyBudgetSummary = async (
  income_this_month,
  expense_this_month,
) => {};
