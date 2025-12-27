import ChatMessage from '../moduls/chat/chat.model.js';
import User from '../moduls/users/user.model.js';

/**
 * Send system notification to user via chat
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - Receiver user ID
 * @param {string} params.message - Notification message
 * @param {Object} params.io - Socket.io instance
 * @param {string} params.systemUserId - System user ID (optional, defaults to admin)
 */
export const sendChatNotification = async ({ userId, message, io, systemUserId = null }) => {
    try {
        console.log('📧 Sending chat notification to user:', userId);
        console.log('📧 User ID type:', typeof userId);
        console.log('📧 Message:', message.substring(0, 50) + '...');
        console.log('📧 IO available:', !!io);

        // If no system user ID provided, use first admin user
        if (!systemUserId) {
            const adminUser = await User.findOne({ Role: 'Super Admin' });
            systemUserId = adminUser ? adminUser._id : userId; // Fallback to self if no admin
            console.log('📧 System user ID (sender):', systemUserId);
        }

        // Create system message in database
        const notificationMessage = await ChatMessage.create({
            sender_id: systemUserId,
            receiver_id: userId,
            message: message,
            is_read: false
        });

        console.log('✅ Message saved to database:', notificationMessage._id);

        const populatedMessage = await ChatMessage.findById(notificationMessage._id)
            .populate('sender_id', 'User Name Email id Image')
            .populate('receiver_id', 'User Name Email id Image')
            .lean();

        console.log('✅ Message populated:', {
            _id: populatedMessage._id,
            sender: populatedMessage.sender_id?.['User Name'],
            receiver: populatedMessage.receiver_id?.['User Name']
        });

        // Send real-time notification via Socket.IO
        if (io) {
            const userRoom = `user_${userId}`;
            console.log('📡 Emitting to room:', userRoom);

            // Emit to specific user room
            io.to(userRoom).emit('new_message', {
                data: populatedMessage
            });

            console.log('📡 Emitted new_message event');

            // Also emit a dedicated notification event
            io.to(userRoom).emit('order_notification', {
                type: 'order_approved',
                message: message,
                timestamp: new Date(),
                data: populatedMessage
            });

            console.log('📡 Emitted order_notification event');
            console.log('✅ Chat notification sent successfully via Socket.IO');
        } else {
            console.log('⚠️ Socket.IO not available');
        }

        return {
            success: true,
            message: 'Notification sent successfully',
            data: populatedMessage
        };
    } catch (error) {
        console.error('❌ Error sending chat notification:', error);
        return {
            success: false,
            message: 'Failed to send notification',
            error: error.message
        };
    }
};

/**
 * Send WhatsApp notification to user
 * @param {Object} params - Notification parameters
 * @param {string} params.phoneNumber - Receiver phone number (with country code)
 * @param {string} params.message - Notification message
 */
export const sendWhatsAppNotification = async ({ phoneNumber, message }) => {
    try {
        console.log('📱 Sending WhatsApp notification to:', phoneNumber);

        // For now, we'll log the message and return success
        // In production, integrate with Twilio/WhatsApp Business API

        // Example Twilio integration (commented out):
        /*
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const client = require('twilio')(accountSid, authToken);
    
        const whatsappMessage = await client.messages.create({
          body: message,
          from: 'whatsapp:+14155238886', // Your Twilio WhatsApp number
          to: `whatsapp:${phoneNumber}`
        });
    
        console.log('✅ WhatsApp message sent:', whatsappMessage.sid);
        */

        // For now, just log
        console.log('📱 WhatsApp Message Content:');
        console.log('   To:', phoneNumber);
        console.log('   Message:', message);
        console.log('⚠️  WhatsApp API not configured - message logged only');

        return {
            success: true,
            message: 'WhatsApp notification logged (API integration pending)',
            data: {
                phoneNumber,
                message,
                status: 'logged'
            }
        };
    } catch (error) {
        console.error('❌ Error sending WhatsApp notification:', error);
        return {
            success: false,
            message: 'Failed to send WhatsApp notification',
            error: error.message
        };
    }
};

/**
 * Send order approval notification to user (both chat and WhatsApp)
 * @param {Object} params - Notification parameters
 * @param {Object} params.order - Order object
 * @param {string} params.approvedBy - Name of person who approved
 * @param {Object} params.io - Socket.io instance
 */
export const sendOrderApprovalNotification = async ({ order, approvedBy, io }) => {
    try {
        console.log('🔔 Sending order approval notifications...');
        console.log('🔔 Order ID:', order._id);
        console.log('🔔 Order created by:', order.created_by);
        console.log('🔔 Approved by:', approvedBy);

        // Get order creator details
        const orderCreator = await User.findById(order.created_by);

        if (!orderCreator) {
            console.error('❌ Order creator not found for ID:', order.created_by);
            return {
                success: false,
                message: 'Order creator not found'
            };
        }

        console.log('✅ Order creator found:', orderCreator['User Name']);
        console.log('✅ Creator mobile:', orderCreator['Mobile Number']);

        // Prepare notification message
        const chatMessage = `✅ Your order ${order.order_no} has been approved by ${approvedBy}!\n\n` +
            `Order Details:\n` +
            `- Party: ${order.party_name}\n` +
            `- Amount: ₹${order.net_amount_payable?.toLocaleString('en-IN')}\n` +
            `- Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}\n\n` +
            `You can now proceed with further processing.`;

        const whatsappMessage = `✅ *Order Approved!*\n\n` +
            `Your order *${order.order_no}* has been approved by ${approvedBy}.\n\n` +
            `*Order Details:*\n` +
            `• Party: ${order.party_name}\n` +
            `• Amount: ₹${order.net_amount_payable?.toLocaleString('en-IN')}\n` +
            `• Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}\n\n` +
            `Thank you!`;

        // Send chat notification
        const chatResult = await sendChatNotification({
            userId: orderCreator._id.toString(),
            message: chatMessage,
            io
        });

        // Send WhatsApp notification
        const mobileNumber = orderCreator['Mobile Number'];
        let whatsappResult = { success: false };

        if (mobileNumber) {
            // Format phone number (add +91 if not present for Indian numbers)
            const formattedNumber = mobileNumber.startsWith('+')
                ? mobileNumber
                : `+91${mobileNumber}`;

            whatsappResult = await sendWhatsAppNotification({
                phoneNumber: formattedNumber,
                message: whatsappMessage
            });
        } else {
            console.log('⚠️  No mobile number found for user');
        }

        return {
            success: true,
            message: 'Notifications sent successfully',
            data: {
                chat: chatResult,
                whatsapp: whatsappResult
            }
        };
    } catch (error) {
        console.error('❌ Error sending order approval notifications:', error);
        return {
            success: false,
            message: 'Failed to send notifications',
            error: error.message
        };
    }
};

/**
 * Send new order creation notification to all Admin and Super Admin users
 * @param {Object} params - Notification parameters
 * @param {Object} params.order - Order object
 * @param {string} params.createdByName - Name of person who created the order
 * @param {Object} params.io - Socket.io instance
 */
export const sendNewOrderNotification = async ({ order, createdByName, io }) => {
    try {
        console.log('🔔 Sending new order creation notifications to Admin/Super Admin...');
        console.log('🔔 Order ID:', order._id);
        console.log('🔔 Order No:', order.order_no);
        console.log('🔔 Created by:', createdByName);

        // Find all Admin and Super Admin users
        const adminUsers = await User.find({
            Role: { $in: ['Admin', 'Super Admin'] }
        });

        if (!adminUsers || adminUsers.length === 0) {
            console.log('⚠️ No Admin or Super Admin users found');
            return {
                success: false,
                message: 'No Admin or Super Admin users found'
            };
        }

        console.log(`✅ Found ${adminUsers.length} Admin/Super Admin users`);

        // Prepare notification message
        const chatMessage = `🆕 New order created by ${createdByName} - Pending Approval!\n\n` +
            `Order No: ${order.order_no}\n` +
            `Party: ${order.party_name}\n` +
            `Amount: ₹${order.net_amount_payable?.toLocaleString('en-IN')}\n` +
            `Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}\n\n` +
            `Please review and approve/reject this order.`;

        // Send notification to each Admin/Super Admin
        const notificationPromises = adminUsers.map(async (admin) => {
            console.log(`📧 Sending notification to ${admin['User Name']} (${admin.Role})`);

            return await sendChatNotification({
                userId: admin._id.toString(),
                message: chatMessage,
                io
            });
        });

        const results = await Promise.all(notificationPromises);

        const successCount = results.filter(r => r.success).length;
        console.log(`✅ Successfully sent ${successCount}/${adminUsers.length} notifications`);

        return {
            success: true,
            message: `Notifications sent to ${successCount} admin users`,
            data: {
                totalAdmins: adminUsers.length,
                successCount: successCount,
                results: results
            }
        };
    } catch (error) {
        console.error('❌ Error sending new order notifications:', error);
        return {
            success: false,
            message: 'Failed to send notifications',
            error: error.message
        };
    }
};

/**
 * Send order rejection notification to user (both chat and WhatsApp)
 * @param {Object} params - Notification parameters
 * @param {Object} params.order - Order object
 * @param {string} params.rejectedBy - Name of person who rejected
 * @param {string} params.remarks - Rejection remarks
 * @param {Object} params.io - Socket.io instance
 */
export const sendOrderRejectionNotification = async ({ order, rejectedBy, remarks, io }) => {
    try {
        console.log('🔔 Sending order rejection notifications...');

        // Get order creator details
        const orderCreator = await User.findById(order.created_by);

        if (!orderCreator) {
            console.error('❌ Order creator not found');
            return {
                success: false,
                message: 'Order creator not found'
            };
        }

        // Prepare notification message
        const chatMessage = `❌ Your order ${order.order_no} has been rejected by ${rejectedBy}.\n\n` +
            `Order Details:\n` +
            `- Party: ${order.party_name}\n` +
            `- Amount: ₹${order.net_amount_payable?.toLocaleString('en-IN')}\n` +
            `- Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}\n\n` +
            `Reason: ${remarks || 'No reason provided'}\n\n` +
            `Please contact the administrator for more details.`;

        const whatsappMessage = `❌ *Order Rejected*\n\n` +
            `Your order *${order.order_no}* has been rejected by ${rejectedBy}.\n\n` +
            `*Order Details:*\n` +
            `• Party: ${order.party_name}\n` +
            `• Amount: ₹${order.net_amount_payable?.toLocaleString('en-IN')}\n` +
            `• Date: ${new Date(order.order_date).toLocaleDateString('en-IN')}\n\n` +
            `*Reason:* ${remarks || 'No reason provided'}\n\n` +
            `Please contact administrator.`;

        // Send chat notification
        const chatResult = await sendChatNotification({
            userId: orderCreator._id.toString(),
            message: chatMessage,
            io
        });

        // Send WhatsApp notification
        const mobileNumber = orderCreator['Mobile Number'];
        let whatsappResult = { success: false };

        if (mobileNumber) {
            const formattedNumber = mobileNumber.startsWith('+')
                ? mobileNumber
                : `+91${mobileNumber}`;

            whatsappResult = await sendWhatsAppNotification({
                phoneNumber: formattedNumber,
                message: whatsappMessage
            });
        } else {
            console.log('⚠️  No mobile number found for user');
        }

        return {
            success: true,
            message: 'Notifications sent successfully',
            data: {
                chat: chatResult,
                whatsapp: whatsappResult
            }
        };
    } catch (error) {
        console.error('❌ Error sending order rejection notifications:', error);
        return {
            success: false,
            message: 'Failed to send notifications',
            error: error.message
        };
    }
};
