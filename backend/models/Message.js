const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },

  // ✅ Okundu bilgisi
  read: { type: Boolean, default: false },

  readAt: { type: Date },
  deleted: { type: Boolean, default: false },
  deletedAt: { type: Date },

  // ✅ Mesajı silen kullanıcılar
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

module.exports = mongoose.model('Message', MessageSchema);
