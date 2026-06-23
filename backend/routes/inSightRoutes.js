import express from "express";
import {
  getUserCurrencyHandler,
  getInSight,
} from "../controller/insightController.js";
import { protect } from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(protect); // Apply the protect middleware to all routes in this router

router.get("/", getUserCurrencyHandler);
router.get("/generate", getInSight);

export default router;
