import express from "express";
import {
  createTranscation,
  getTransactions,
  analyzeTransactions,
  updateTranscation,
  getTranscatioById,
} from "../controller/transcationController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();

router.use(protect);
router.get("/", getTransactions);
router.post("/", createTranscation);
router.get("/analyze", analyzeTransactions);
router.put("/:id", updateTranscation);
router.get("/:id", getTranscatioById);

export default router;
