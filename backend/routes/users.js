const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Message = require('../models/Message');
const protect = require('../middleware/auth');

// 🔐 Giriş yapan kullanıcının bilgisi
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id) // ID tutarlılığı için _id kullan
      .populate('followers', '_id name phoneNumber')
      .populate('following', '_id name phoneNumber');

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (err) {
    console.error("🔴 /me hatası:", err.message);
    res.status(500).json({ message: 'Sunucu hatası' });
  }
});

// 👥 Takip Et
router.post('/:id/follow', protect, async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user._id;

  if (targetUserId === String(currentUserId)) {
    return res.status(400).json({ message: 'Kendini takip edemezsin.' });
  }

  try {
    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Zaten takip ediliyor mu kontrolü
    if (currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ message: 'Bu kullanıcıyı zaten takip ediyorsun.' });
    }

    // Takip işlemini gerçekleştir
    currentUser.following.push(targetUserId);
    targetUser.followers.push(currentUserId);

    await Promise.all([currentUser.save(), targetUser.save()]);

    // Güncellenmiş bilgileri populate ederek döndür
    const updatedCurrentUser = await User.findById(currentUserId)
      .populate('followers', '_id name phoneNumber')
      .populate('following', '_id name phoneNumber');

    const updatedTargetUser = await User.findById(targetUserId)
      .populate('followers', '_id name phoneNumber')
      .populate('following', '_id name phoneNumber');

    res.json({ 
      message: 'Takip işlemi başarılı',
      targetUser: updatedTargetUser, 
      me: updatedCurrentUser 
    });
  } catch (err) {
    console.error("🔴 Takip hatası:", err.message);
    res.status(500).json({ message: 'Takip işlemi başarısız.' });
  }
});

// ❌ Takibi bırak
router.post('/:id/unfollow', protect, async (req, res) => {
  const targetUserId = req.params.id;
  const currentUserId = req.user._id;

  try {
    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
    }

    // Takip ediliyor mu kontrolü
    if (!currentUser.following.includes(targetUserId)) {
      return res.status(400).json({ message: 'Bu kullanıcıyı zaten takip etmiyorsun.' });
    }

    // Takip bırakma işlemini gerçekleştir
    currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== String(currentUserId));

    await Promise.all([currentUser.save(), targetUser.save()]);

    // Güncellenmiş bilgileri populate ederek döndür
    const updatedCurrentUser = await User.findById(currentUserId)
      .populate('followers', '_id name phoneNumber')
      .populate('following', '_id name phoneNumber');

    const updatedTargetUser = await User.findById(targetUserId)
      .populate('followers', '_id name phoneNumber')
      .populate('following', '_id name phoneNumber');

    res.json({ 
      message: 'Takip bırakma işlemi başarılı',
      targetUser: updatedTargetUser, 
      me: updatedCurrentUser 
    });
  } catch (err) {
    console.error("🔴 Takip bırakma hatası:", err.message);
    res.status(500).json({ message: 'Takip bırakma işlemi başarısız.' });
  }
});

// 👤 Belirli kullanıcı profili
router.get('/:id', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -otp -otpExpires')
      .populate('followers', '_id name phoneNumber')
      .populate('following', '_id name phoneNumber');

    if (!user) {
      return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (err) {
    console.error("🔴 Profil hatası:", err.message);
    res.status(500).json({ message: 'Profil alınamadı' });
  }
});

// 🔍 Kullanıcı arama
router.get('/', protect, async (req, res) => {
  try {
    const search = req.query.search || '';
    const currentUserId = req.user._id;
    
    const users = await User.find({
      _id: { $ne: currentUserId }, // Kendi profilini hariç tut
      name: { $regex: search, $options: 'i' }
    })
    .select('_id name phoneNumber followers following')
    .limit(20);

    res.json(users);
  } catch (err) {
    console.error("🔴 /api/users arama hatası:", err.message);
    res.status(500).json({ message: 'Kullanıcılar getirilemedi' });
  }
});

module.exports = router;