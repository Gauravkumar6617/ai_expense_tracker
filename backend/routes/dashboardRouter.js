import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getBudgetSummary,
  getCategoryBreakdown,
  getMonthlySummary,
} from "../controller/dashboardContoller.js";

const router = express.Router();

router.use(protect);
router.get("/summary", getBudgetSummary);
router.get("/category-breakdown", getCategoryBreakdown);
router.get("/monthly-summary", getMonthlySummary);

export default router;
