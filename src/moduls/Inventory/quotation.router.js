import express from 'express';
import * as quotationController from './quotation.controller.js';
import { protect } from '../../middleware/user.middleware.js';

const router = express.Router();

// Create a new quotation
router.post('/', protect, quotationController.createQuotation);

// Get all quotations with filters and pagination
router.get('/', protect, quotationController.getAllQuotations);

// Get quotation statistics
router.get('/stats', protect, quotationController.getQuotationStats);

// Get quotation by ID
router.get('/:id', protect, quotationController.getQuotationById);

// Download quotation as PDF
router.get('/:id/pdf', protect, quotationController.downloadQuotationPDF);

// Send quotation via email
router.post('/:id/send', protect, quotationController.sendQuotation);

// Update quotation
router.put('/:id', protect, quotationController.updateQuotation);

// Update quotation status
router.patch('/:id/status', protect, quotationController.updateQuotationStatus);

// Delete quotation
router.delete('/:id', protect, quotationController.deleteQuotation);

export default router;
