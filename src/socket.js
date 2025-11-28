import jwt from 'jsonwebtoken';
import ChatMessage from './moduls/chat/chat.model.js';

// Store online users
const onlineUsers = new Map(); // userId -> socketId

export const initializeSocketIO = (io) => {
  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.userEmail = decoded.email;
      next();
    } catch (error) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId} (Socket ID: ${socket.id})`);
    
    // Add user to online users
    onlineUsers.set(socket.userId, socket.id);
    
    // Broadcast user online status to all clients
    io.emit('user_online', {
      userId: socket.userId,
      status: 'online'
    });

    // Send list of online users to the newly connected user
    const onlineUsersList = Array.from(onlineUsers.keys());
    socket.emit('online_users', onlineUsersList);

    // Join user to their own room for private messages
    socket.join(`user_${socket.userId}`);

    // Handle sending a message
    socket.on('send_message', async (data) => {
      try {
        const { receiver_id, message, attachment, attachment_type } = data;

        // Create message in database
        const messageData = {
          sender_id: socket.userId,
          receiver_id,
          message: message || '',
          is_read: false
        };

        if (attachment) {
          messageData.attachment = attachment;
          messageData.attachment_type = attachment_type;
        }

        const newMessage = await ChatMessage.create(messageData);
        const populatedMessage = await ChatMessage.findById(newMessage._id)
          .populate('sender_id', 'User Name Email id Image')
          .populate('receiver_id', 'User Name Email id Image')
          .lean();

        // Send to sender
        socket.emit('message_sent', {
          success: true,
          data: populatedMessage
        });

        // Send to receiver if online
        const receiverSocketId = onlineUsers.get(receiver_id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('new_message', {
            data: populatedMessage
          });
        }

        // Broadcast new message notification
        io.to(`user_${receiver_id}`).emit('message_notification', {
          sender_id: socket.userId,
          message: message || 'Sent an attachment',
          timestamp: newMessage.createdAt
        });

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', {
          success: false,
          message: 'Failed to send message',
          error: error.message
        });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      const { receiver_id, isTyping } = data;
      const receiverSocketId = onlineUsers.get(receiver_id);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('user_typing', {
          userId: socket.userId,
          isTyping
        });
      }
    });

    // Handle message read receipt
    socket.on('mark_read', async (data) => {
      try {
        const { messageId } = data;
        
        await ChatMessage.findByIdAndUpdate(messageId, {
          is_read: true,
          read_at: new Date()
        });

        const message = await ChatMessage.findById(messageId);
        if (message) {
          const senderSocketId = onlineUsers.get(message.sender_id.toString());
          if (senderSocketId) {
            io.to(senderSocketId).emit('message_read', {
              messageId,
              readAt: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle mark all messages as read from a user
    socket.on('mark_all_read', async (data) => {
      try {
        const { sender_id } = data;
        
        await ChatMessage.updateMany(
          {
            sender_id,
            receiver_id: socket.userId,
            is_read: false
          },
          {
            is_read: true,
            read_at: new Date()
          }
        );

        const senderSocketId = onlineUsers.get(sender_id);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messages_read', {
            userId: socket.userId
          });
        }
      } catch (error) {
        console.error('Error marking all messages as read:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.userId} (Socket ID: ${socket.id})`);
      
      // Remove user from online users
      onlineUsers.delete(socket.userId);
      
      // Broadcast user offline status
      io.emit('user_offline', {
        userId: socket.userId,
        status: 'offline'
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  });

  // Expose online users getter
  io.getOnlineUsers = () => Array.from(onlineUsers.keys());
};

export { onlineUsers };
