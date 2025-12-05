import express from 'express';
import { protect } from '../../middleware/user.middleware.js';
import {
    createPurchaseRequest,
    getAllPurchaseRequests,
    getPurchaseRequestById,
    updatePurchaseRequest,
    deletePurchaseRequest
} from './purchaseRequest.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Create a new Purchase Request
router.post('/', createPurchaseRequest);

// Get all Purchase Requests with filters and pagination
router.get('/', getAllPurchaseRequests);

// Get Purchase Request by ID
router.get('/:id', getPurchaseRequestById);

// Update Purchase Request
router.put('/:id', updatePurchaseRequest);

// Delete Purchase Request
router.delete('/:id', deletePurchaseRequest);

export default router;
