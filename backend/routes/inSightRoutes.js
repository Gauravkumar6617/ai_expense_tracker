import express from "express";
import {
  getUserCurrencyHandler,
  getInSight,
  getInsights,
  generateInsight,
} from "../controller/insightController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect); // Apply the protect middleware to all routes in this router

router.get("/", getInsights);
router.post("/generate", generateInsight);

export default router;
