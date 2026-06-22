import express from "express";
import {
  createBudget,
  getBudgets,
  updateBudget,
  getBudgetById,
} from "../controller/budgetController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.use(protect);
router.get("/", getBudgets);
router.post("/", createBudget);
router.put("/:id", updateBudget);
router.get("/:id", getBudgetById);

export default router;
