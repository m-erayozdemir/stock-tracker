const mongoose = require('mongoose');

const alarmSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true },
  targetPrice: { type: Number, required: true },
  direction: {
    type: String,
    enum: ['above', 'below'],
    required: true,
  },
  sent: { type: Boolean, default: false },
  sentAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Alarm', alarmSchema);
