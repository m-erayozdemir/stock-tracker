const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String },
  password: { type: String }, // Google kullanıcılarında olmayabilir
  authProvider: { type: String, default: 'local' }, // 🌐 'local' veya 'google'

  bio: { type: String, default: '' },

  privacy: {
    emailVisible: { type: Boolean, default: false },
    phoneVisible: { type: Boolean, default: false },
  },

  favoriteStocks: {
    type: [String],
    default: []
  },

  isVerified: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },

  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  balance: { type: Number, default: 10000 }

}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
