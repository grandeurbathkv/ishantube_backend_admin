# Order Approval Notification System

## 🎯 Overview

Real-time notification system that sends notifications when orders are approved/rejected by Admin/Super Admin.

## 📧 Notification Channels

### 1. **In-App Chat Notification** ✅ (Implemented)

- Real-time notifications via Socket.IO
- Messages appear in the chat module
- Automatic notification when order status changes

### 2. **WhatsApp Notification** ⚠️ (API Integration Pending)

- Sends WhatsApp message to user's registered mobile number
- Message includes order details and approval status

---

## 🔧 How It Works

### Backend Flow:

1. Admin/Super Admin approves/rejects order
2. `approveOrder()` or `rejectOrder()` function is called
3. Order status updated in database
4. `sendOrderApprovalNotification()` or `sendOrderRejectionNotification()` is triggered
5. **Chat notification** sent via Socket.IO (real-time)
6. **WhatsApp notification** logged (needs API integration)

### Frontend Flow:

1. User logged in and Socket.IO connected
2. Real-time listener active for `order_notification` event
3. When notification received:
   - Toast notification displayed on screen
   - Message appears in chat module
   - Browser notification (if permission granted)

---

## 🚀 WhatsApp API Integration Guide

### Option 1: Twilio WhatsApp Business API (Recommended)

#### Step 1: Setup Twilio Account

```bash
# Install Twilio SDK
npm install twilio
```

#### Step 2: Add Environment Variables

```env
# .env file
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Your Twilio WhatsApp number
```

#### Step 3: Uncomment Code in `notificationHelper.js`

```javascript
// In sendWhatsAppNotification function (line ~95)
// Uncomment this section:

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const whatsappMessage = await client.messages.create({
  body: message,
  from: process.env.TWILIO_WHATSAPP_NUMBER,
  to: `whatsapp:${phoneNumber}`,
});

console.log("✅ WhatsApp message sent:", whatsappMessage.sid);
```

#### Step 4: Test

```bash
# Test with your number
curl -X POST http://localhost:5000/api/test-whatsapp \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210", "message": "Test message"}'
```

---

### Option 2: WhatsApp Business API (Official)

#### Requirements:

1. Facebook Business Account
2. WhatsApp Business Account
3. Phone number verification
4. API access approval

#### Setup Steps:

1. Go to [Facebook Business Manager](https://business.facebook.com/)
2. Create WhatsApp Business Account
3. Get API credentials
4. Verify phone number
5. Submit app for review

#### Integration Code:

```javascript
import axios from "axios";

const sendWhatsAppMessage = async (phoneNumber, message) => {
  const response = await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: phoneNumber,
      type: "text",
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};
```

---

### Option 3: Third-Party Services

#### A. **Wati.io**

- Easy setup
- Template management
- Analytics dashboard

```bash
# Install Wati SDK
npm install @wati/wati-sdk
```

#### B. **Gupshup**

- Enterprise-grade
- Multi-channel support

```bash
npm install gupshup-node-sdk
```

#### C. **Interakt**

- Indian market focused
- Easy integration

```bash
npm install interakt-api
```

---

## 📱 Current Implementation Status

### ✅ Working Features:

- [x] Real-time Socket.IO notifications
- [x] In-app chat messages
- [x] Toast notifications
- [x] Browser notifications
- [x] Order approval/rejection workflow
- [x] User role-based access control
- [x] Notification logging

### ⚠️ Pending Integration:

- [ ] WhatsApp API integration (waiting for credentials)
- [ ] SMS notifications (optional)
- [ ] Email notifications (optional)

---

## 🔔 Notification Message Templates

### Approval Message:

```
✅ Your order ORD000123 has been approved by Admin Name!

Order Details:
- Party: ABC Company
- Amount: ₹50,000
- Date: 25-Dec-2024

You can now proceed with further processing.
```

### Rejection Message:

```
❌ Your order ORD000123 has been rejected by Admin Name.

Order Details:
- Party: ABC Company
- Amount: ₹50,000
- Date: 25-Dec-2024

Reason: Stock unavailable

Please contact the administrator for more details.
```

---

## 🧪 Testing

### Test Real-time Notifications:

1. Login as Marketing user
2. Create an order
3. Login as Admin in another browser/tab
4. Approve the order
5. Check Marketing user's screen for:
   - Toast notification (top-right)
   - Chat message
   - Browser notification

### Test WhatsApp (After Integration):

1. Register user with valid mobile number
2. Create order as that user
3. Approve order as Admin
4. Check WhatsApp for notification

---

## 📊 Logs

Backend logs show:

```
📧 Sending chat notification to user: 673abc123...
✅ Chat notification sent successfully via Socket.IO
📱 Sending WhatsApp notification to: +919876543210
📱 WhatsApp Message Content:
   To: +919876543210
   Message: ✅ *Order Approved!* ...
⚠️  WhatsApp API not configured - message logged only
```

---

## 🛠️ Files Modified

### Backend:

- `src/utils/notificationHelper.js` (NEW) - Notification helper functions
- `src/moduls/Inventory/order.controller.js` - Added notification calls
- `src/socket.js` - Existing Socket.IO setup

### Frontend:

- `src/utils/socketService.ts` - Added order notification listener
- `src/components/notifications/OrderNotificationToast.tsx` (NEW) - Toast component
- `src/feature-module/feature-module.tsx` - Added notification component

---

## 🔐 Security Notes

1. **Phone Number Validation**: Always validate phone numbers
2. **Rate Limiting**: Implement rate limiting for WhatsApp messages
3. **Message Templates**: Use approved templates for WhatsApp Business
4. **Error Handling**: Handle API failures gracefully
5. **Logging**: Log all notification attempts for audit

---

## 📞 Support

For WhatsApp API integration support:

- Twilio: https://www.twilio.com/docs/whatsapp
- WhatsApp Business: https://developers.facebook.com/docs/whatsapp
- Wati: https://www.wati.io/docs

---

## ✨ Future Enhancements

- [ ] SMS notifications
- [ ] Email notifications with PDF attachment
- [ ] Push notifications for mobile app
- [ ] Notification preferences per user
- [ ] Notification history dashboard
- [ ] Bulk notification system
- [ ] Scheduled notifications
- [ ] Multi-language support

---

**Status**: Real-time notifications working ✅ | WhatsApp pending API integration ⏳
