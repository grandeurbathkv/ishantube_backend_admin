import ChatMessage from './chat.model.js';
import User from '../users/user.model.js';
import mongoose from 'mongoose';
import { onlineUsers } from '../../socket.js';

// Get IO instance helper
const getIO = (req) => req.app.get('io');

// Get all users for chat (excluding current user)
export const getAllUsers = async (req, res) => {
  try {
    console.log('🔍 Step 1: getAllUsers API called');
    console.log('🔍 Step 1.1: Authenticated user:', req.user);
    
    // First, check total users in database
    const totalUsersCount = await User.countDocuments({});
    console.log('🔍 Step 2.1: Total users in database:', totalUsersCount);
    
    // Get ALL users first (for debugging)
    const allUsers = await User.find({}, {
      'User Name': 1,
      'Email id': 1,
      Image: 1,
      _id: 1
    }).lean();
    console.log('🔍 Step 2.2: ALL users fetched:', allUsers.length);
    console.log('🔍 Step 2.3: Sample user:', allUsers[0]);
    
    const currentUserId = req.user ? req.user._id : null;
    console.log('🔍 Step 2: Current User ID:', currentUserId);

    // Get all users except current user
    const users = currentUserId 
      ? await User.find(
          { _id: { $ne: currentUserId } },
          {
            'User Name': 1,
            'Email id': 1,
            Image: 1,
            _id: 1
          }
        ).lean()
      : allUsers; // If no current user, return all users
    
    console.log('🔍 Step 3: Total users found from DB (excluding current):', users.length);
    console.log('🔍 Step 4: Users data:', JSON.stringify(users, null, 2));

    // Get last message for each user
    const usersWithLastMessage = await Promise.all(
      users.map(async (user) => {
        console.log(`🔍 Step 5: Processing user ${user._id} - ${user['User Name']}`);
        
        // Find last message between current user and this user
        const lastMessage = await ChatMessage.findOne({
          $or: [
            { sender_id: currentUserId, receiver_id: user._id },
            { sender_id: user._id, receiver_id: currentUserId }
          ]
        })
          .sort({ createdAt: -1 })
          .lean();
        
        console.log(`🔍 Step 6: Last message for ${user['User Name']}:`, lastMessage ? 'Found' : 'None');

        // Count unread messages from this user
        const unreadCount = await ChatMessage.countDocuments({
          sender_id: user._id,
          receiver_id: currentUserId,
          is_read: false
        });
        
        console.log(`🔍 Step 7: Unread count for ${user['User Name']}:`, unreadCount);
        
        // Check if user is online
        const isOnline = onlineUsers.has(user._id.toString());
        console.log(`🔍 Step 7.1: User ${user['User Name']} online status:`, isOnline);

        return {
          _id: user._id,
          name: user['User Name'],
          email: user['Email id'],
          profile_image: user.Image,
          last_message: lastMessage ? lastMessage.message : null,
          last_message_time: lastMessage ? lastMessage.createdAt : null,
          unread_count: unreadCount,
          is_online: isOnline
        };
      })
    );
    
    console.log('🔍 Step 8: Users with last message count:', usersWithLastMessage.length);
    console.log('🔍 Step 8.1: Online users in socket:', Array.from(onlineUsers.keys()));

    // Sort by last message time
    usersWithLastMessage.sort((a, b) => {
      if (!a.last_message_time) return 1;
      if (!b.last_message_time) return -1;
      return new Date(b.last_message_time) - new Date(a.last_message_time);
    });
    
    console.log('🔍 Step 9: Sending response with users:', usersWithLastMessage.length);

    res.status(200).json({
      success: true,
      data: usersWithLastMessage
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
};

// Get single user details
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId, {
      'User Name': 1,
      'Email id': 1,
      Image: 1,
      _id: 1
    }).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user['User Name'],
        email: user['Email id'],
        profile_image: user.Image,
        is_online: false
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
};

// Get chat messages between two users
export const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    // Fetch messages between the two users
    const messages = await ChatMessage.find({
      $or: [
        { sender_id: currentUserId, receiver_id: userId },
        { sender_id: userId, receiver_id: currentUserId }
      ],
      $and: [
        {
          $or: [
            { is_deleted_by_sender: false, sender_id: currentUserId },
            { is_deleted_by_receiver: false, receiver_id: currentUserId }
          ]
        }
      ]
    })
      .sort({ createdAt: 1 })
      .lean();

    // Mark messages as read
    await ChatMessage.updateMany(
      {
        sender_id: userId,
        receiver_id: currentUserId,
        is_read: false
      },
      {
        is_read: true,
        read_at: new Date()
      }
    );

    res.status(200).json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
      error: error.message
    });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    console.log('🔍 Step 1: sendMessage API called');
    console.log('🔍 Step 1.1: Request body:', req.body);
    console.log('🔍 Step 1.2: Request file:', req.file);
    
    const currentUserId = req.user._id;
    const { receiver_id, message } = req.body;
    
    console.log('🔍 Step 2: Current user ID:', currentUserId);
    console.log('🔍 Step 2.1: Receiver ID:', receiver_id);
    console.log('🔍 Step 2.2: Message:', message);

    if (!receiver_id) {
      console.log('❌ Step 3: Receiver ID is missing');
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }

    if (!message && !req.file) {
      console.log('❌ Step 4: Both message and attachment are missing');
      return res.status(400).json({
        success: false,
        message: 'Message or attachment is required'
      });
    }

    // Check if receiver exists
    console.log('🔍 Step 5: Checking if receiver exists');
    const receiverExists = await User.findById(receiver_id);
    if (!receiverExists) {
      console.log('❌ Step 5.1: Receiver not found');
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }
    console.log('✅ Step 5.2: Receiver found:', receiverExists['User Name']);

    // Create message object
    console.log('🔍 Step 6: Creating message object');
    const messageData = {
      sender_id: currentUserId,
      receiver_id,
      message: message || '',
      is_read: false
    };

    // If file is uploaded
    if (req.file) {
      console.log('🔍 Step 6.1: File uploaded, adding to message data');
      messageData.attachment = req.file.path || req.file.location; // Support both local and cloud storage
      messageData.attachment_type = req.file.mimetype;
      messageData.attachment_name = req.file.originalname;
    }

    console.log('🔍 Step 7: Saving message to database');
    // Save message to database
    const newMessage = await ChatMessage.create(messageData);
    console.log('✅ Step 7.1: Message saved:', newMessage._id);

    console.log('🔍 Step 8: Populating message with user details');
    // Populate sender and receiver details
    const populatedMessage = await ChatMessage.findById(newMessage._id)
      .populate('sender_id', 'User Name Email id Image')
      .populate('receiver_id', 'User Name Email id Image')
      .lean();
    
    console.log('✅ Step 8.1: Message populated:', populatedMessage);

    console.log('✅ Step 9: Sending success response');
    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });

    // Emit socket event to receiver (if online)
    console.log('🔍 Step 10: Emitting socket event');
    const io = getIO(req);
    const receiverSocketId = onlineUsers.get(receiver_id.toString());
    console.log('🔍 Step 10.1: Receiver socket ID:', receiverSocketId);
    console.log('🔍 Step 10.2: Online users:', Array.from(onlineUsers.keys()));
    
    if (receiverSocketId && io) {
      console.log('✅ Step 10.3: Receiver is online, sending socket event');
      io.to(receiverSocketId).emit('new_message', {
        data: populatedMessage
      });
    } else {
      console.log('⚠️ Step 10.3: Receiver is offline or IO not available');
    }
    
  } catch (error) {
    console.error('❌ Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message',
      error: error.message
    });
  }
};

// Delete message
export const deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const { messageId } = req.params;

    const message = await ChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Mark message as deleted for the current user
    if (message.sender_id.toString() === currentUserId.toString()) {
      message.is_deleted_by_sender = true;
    } else if (message.receiver_id.toString() === currentUserId.toString()) {
      message.is_deleted_by_receiver = true;
    } else {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this message'
      });
    }

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message',
      error: error.message
    });
  }
};

// Get unread message count
export const getUnreadCount = async (req, res) => {
  try {
    const currentUserId = req.user._id;

    const unreadCount = await ChatMessage.countDocuments({
      receiver_id: currentUserId,
      is_read: false
    });

    res.status(200).json({
      success: true,
      data: { unread_count: unreadCount }
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error.message
    });
  }
};
