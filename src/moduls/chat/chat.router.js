import express from 'express';
import * as chatController from './chat.controller.js';
import { authenticateToken } from '../../middleware/user.middleware.js';
import { uploadChatAttachment } from '../../middleware/gcs.upload.middleware.js';

const router = express.Router();

// Get all users for chat
router.get('/users', authenticateToken, chatController.getAllUsers);

// Get specific user details
router.get('/users/:userId', authenticateToken, chatController.getUserById);

// Get messages between current user and another user
router.get('/messages/:userId', authenticateToken, chatController.getMessages);

// Send a message (with optional file attachment)
router.post('/send', authenticateToken, uploadChatAttachment, chatController.sendMessage);

// Delete a message
router.delete('/messages/:messageId', authenticateToken, chatController.deleteMessage);

// Get unread message count
router.get('/unread-count', authenticateToken, chatController.getUnreadCount);

export default router;
