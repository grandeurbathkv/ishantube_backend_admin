import express from 'express';
import { protect } from '../../middleware/user.middleware.js';
import * as orderController from './order.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Order statistics
router.get('/stats', orderController.getOrderStats);

// Get orders with partial or unavailable items (for Purchase Management)
router.get('/partial-unavailable', orderController.getPartialUnavailableOrders);

// Export orders to Excel
router.post('/export-excel', orderController.exportOrdersToExcel);

// Send email to vendor
router.post('/send-vendor-email', orderController.sendEmailToVendor);

// Get pending orders by party
router.get('/pending-by-party/:partyId', orderController.getPendingOrdersByParty);

// Create new order
router.post('/', orderController.createOrder);

// Get all orders with filters
router.get('/', orderController.getAllOrders);

// Get order by ID
router.get('/:id', orderController.getOrderById);

// Update order
router.put('/:id', orderController.updateOrder);

// Update order status only
router.patch('/:id/status', orderController.updateOrderStatus);

// Update payment status
router.patch('/:id/payment', orderController.updatePaymentStatus);

// Cancel order
router.patch('/:id/cancel', orderController.cancelOrder);

// Delete order
router.delete('/:id', orderController.deleteOrder);

export default router;
