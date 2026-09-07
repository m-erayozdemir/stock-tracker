// models/LimitOrder.js
const mongoose = require('mongoose');

const limitOrderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true },
  price: { type: Number, required: true }, // hedef fiyat
  quantity: { type: Number, required: true },
  type: { type: String, enum: ['limit_buy', 'limit_sell'], required: true },
  createdAt: { type: Date, default: Date.now },
  sent: { type: Boolean, default: false }, // işleme konuldu mu?
});

module.exports = mongoose.model('LimitOrder', limitOrderSchema);
