import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  message: {
    type: String,
    trim: true
  },
  attachment: {
    type: String, // URL to the uploaded file
    default: null
  },
  attachment_type: {
    type: String, // MIME type of the file
    default: null
  },
  attachment_name: {
    type: String, // Original filename
    default: null
  },
  is_read: {
    type: Boolean,
    default: false
  },
  read_at: {
    type: Date,
    default: null
  },
  is_deleted_by_sender: {
    type: Boolean,
    default: false
  },
  is_deleted_by_receiver: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster queries
chatMessageSchema.index({ sender_id: 1, receiver_id: 1, createdAt: -1 });
chatMessageSchema.index({ receiver_id: 1, is_read: 1 });

// Virtual populate for sender and receiver details
chatMessageSchema.virtual('sender', {
  ref: 'User',
  localField: 'sender_id',
  foreignField: '_id',
  justOne: true
});

chatMessageSchema.virtual('receiver', {
  ref: 'User',
  localField: 'receiver_id',
  foreignField: '_id',
  justOne: true
});

// Ensure virtuals are included in JSON
chatMessageSchema.set('toJSON', { virtuals: true });
chatMessageSchema.set('toObject', { virtuals: true });

export default mongoose.model('ChatMessage', chatMessageSchema);
