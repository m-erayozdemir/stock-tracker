// routes/me.js
const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const User = require('../models/User');

router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -otp -otpExpires')
      .populate('followers', '_id name email')
      .populate('following', '_id name email');

    res.json(user);
  } catch (err) {
    console.error("🔴 /api/me hatası:", err.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

module.exports = router;
