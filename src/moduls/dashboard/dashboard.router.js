import express from 'express';
import * as dashboardController from './dashboard.controller.js';
import { protect } from '../../middleware/user.middleware.js';

const router = express.Router();

// Get dashboard metrics - protected route
router.get('/metrics', protect, dashboardController.getDashboardMetrics);

export default router;
