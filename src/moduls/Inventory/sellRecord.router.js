import express from "express";
import {
    createSellRecord,
    getSellRecords,
    getSellSummary,
    getSellRecord,
    updateSellRecordStatus
} from "./sellRecord.controller.js";
import { authenticateToken } from "../../middleware/user.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Create new sell record
router.post("/", createSellRecord);

// Get all sell records
router.get("/", getSellRecords);

// Get sell summary
router.get("/summary", getSellSummary);

// Get single sell record
router.get("/:id", getSellRecord);

// Update sell record status
router.put("/:id/status", updateSellRecordStatus);

export default router;