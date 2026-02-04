import express from 'express';
import { protect } from '../../middleware/user.middleware.js';
import * as pendingDispatchController from './pendingDispatch.controller.js';

const router = express.Router();

// Test endpoint (no auth required)
router.get('/test', pendingDispatchController.testDatabaseData);

// Apply auth middleware to protected routes
router.use(protect);

// Get pending dispatch materials
router.get('/materials', pendingDispatchController.getPendingDispatchMaterials);

// Get pending materials summary
router.get('/summary', pendingDispatchController.getPendingMaterialsSummary);

export default router;