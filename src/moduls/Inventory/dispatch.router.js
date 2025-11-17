import express from 'express';
import { protect } from '../../middleware/user.middleware.js';
import * as dispatchController from './dispatch.controller.js';

const router = express.Router();

// Apply auth middleware
router.use(protect);

// Create dispatch note
router.post('/', dispatchController.createDispatch);

// Get all dispatches
router.get('/', dispatchController.getAllDispatches);

// Get dispatch by ID
router.get('/:id', dispatchController.getDispatchById);

// Update dispatch status
router.patch('/:id/status', dispatchController.updateDispatchStatus);

export default router;
