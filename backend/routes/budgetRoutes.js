import express from "express";
import {
  createBudget,
  getBudgets,
  updateBudget,
  analyzeBudget,
  getBudgetById,
} from "../controller/budgetController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.use(protect);
router.get("/", getBudgets);
router.post("/", createBudget);
router.put("/:id", updateBudget);
router.get("/:id", getBudgetById);
router.post("/analyze", analyzeBudget); // Add this line to handle the analyze route

export default router;
