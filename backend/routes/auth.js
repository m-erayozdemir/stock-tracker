const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../models/User');
const protect = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');

dotenv.config();
const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ KAYIT OL (reCAPTCHA ile)
router.post('/register', async (req, res) => {
  let { name, email, password, phoneNumber } = req.body;

  if (!name || !email || !password || !phoneNumber) {
    return res.status(400).json({ message: 'Tüm alanları doldurun.' });
  }

  phoneNumber = phoneNumber.trim();
  if (phoneNumber.startsWith('0')) {
    phoneNumber = phoneNumber.slice(1);
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Bu e-posta zaten kayıtlı.' });
    }

    const phoneVerified = await User.findOne({ phoneNumber, isVerified: true });
    if (phoneVerified) {
      return res.status(400).json({ message: 'Bu telefon numarası zaten doğrulanmış bir hesapta kullanılıyor.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      isVerified: true, // SMS verification disabled for this portfolio release.
    });

    await newUser.save();

    // ✅ Token üretimi ve response
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(201).json({
      message: 'Kayıt başarılı. Bu sürümde SMS doğrulaması kapalıdır.',
      token,
    });
  } catch (error) {
    console.error('❌ Kayıt hatası:', error.message);
    return res.status(500).json({ message: 'Kayıt sırasında bir hata oluştu.' });
  }
});


// ✅ OTP DOĞRULAMA
// ✅ OTP DOĞRULAMA (JWT ile korumalı)
router.post('/verify-otp', protect, (_req, res) => {
  return res.status(410).json({ message: 'Bu sürümde SMS doğrulaması kapalıdır.' });
});

// ✅ GİRİŞ (reCAPTCHA ile)
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'E-posta ve şifre zorunludur.' });
  }

  try {

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Kullanıcı bulunamadı.' });


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Şifre hatalı.' });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ token });
  } catch (error) {
    console.error('❌ Giriş hatası:', error.message);
    return res.status(500).json({ message: 'Giriş sırasında hata oluştu.' });
  }
});

// ✅ ŞİFRE DEĞİŞTİRME
router.post('/change-password', protect, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Mevcut ve yeni şifre gerekli.' });
  }

  try {
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Mevcut şifre hatalı.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return res.json({ message: 'Şifre başarıyla güncellendi.' });
  } catch (err) {
    console.error("Şifre değiştirme hatası:", err.message);
    return res.status(500).json({ message: 'Şifre değiştirilemedi.' });
  }
});

// ✅ GOOGLE İLE GİRİŞ
router.post('/google', async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        name,
        email,
        password: '',
        phoneNumber: '',
        isVerified: true,
      });

      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token: jwtToken });
  } catch (err) {
    console.error('❌ Google login error:', err.message);
    res.status(401).json({ message: 'Google ile doğrulama başarısız' });
  }
});

// ✅ TELEFON NUMARASI GÜNCELLEME ve OTP GÖNDERME
router.post('/send-otp', protect, (_req, res) => {
  return res.status(410).json({ message: 'Bu sürümde SMS doğrulaması kapalıdır.' });
});

module.exports = router;
