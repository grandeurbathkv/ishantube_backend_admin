import express from 'express';
import {
    createPaymentReceipt,
    getAllPaymentReceipts,
    getPaymentReceiptById,
    getPaymentReceiptsByOrder,
    updatePaymentReceipt,
    deletePaymentReceipt,
    getPaymentSummary
} from './paymentReceipt.controller.js';
import { protect } from '../../middleware/user.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @route   POST /api/payment-receipt
 * @desc    Create new payment receipt
 * @access  Private
 */
router.post('/', createPaymentReceipt);

/**
 * @route   GET /api/payment-receipt
 * @desc    Get all payment receipts with pagination and filters
 * @access  Private
 */
router.get('/', getAllPaymentReceipts);

/**
 * @route   GET /api/payment-receipt/summary
 * @desc    Get payment summary statistics
 * @access  Private
 */
router.get('/summary', getPaymentSummary);

/**
 * @route   GET /api/payment-receipt/order/:orderId
 * @desc    Get payment receipts by order ID
 * @access  Private
 */
router.get('/order/:orderId', getPaymentReceiptsByOrder);

/**
 * @route   GET /api/payment-receipt/:id
 * @desc    Get payment receipt by ID
 * @access  Private
 */
router.get('/:id', getPaymentReceiptById);

/**
 * @route   PATCH /api/payment-receipt/:id
 * @desc    Update payment receipt
 * @access  Private
 */
router.patch('/:id', updatePaymentReceipt);

/**
 * @route   DELETE /api/payment-receipt/:id
 * @desc    Delete payment receipt
 * @access  Private
 */
router.delete('/:id', deletePaymentReceipt);

export default router;
