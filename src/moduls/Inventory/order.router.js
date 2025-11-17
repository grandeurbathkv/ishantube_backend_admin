import express from 'express';
import { protect } from '../../middleware/user.middleware.js';
import * as orderController from './order.controller.js';

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Order statistics
router.get('/stats', orderController.getOrderStats);

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

// Delete order
router.delete('/:id', orderController.deleteOrder);

export default router;
