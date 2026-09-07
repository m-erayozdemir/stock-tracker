const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const protect = require('../middleware/auth');

// 📚 Mesajlaşma için kullanıcı listesi (takip edilenler + mesajlaşılanlar) + okunmamış sayıları
// 📚 Mesajlaşma için kullanıcı listesi (takip edilenler + mesajlaşılanlar) + okunmamış sayıları
router.get('/conversation-users', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    console.log('🔄 Conversation users isteniyor, userId:', userId);
    
    // Mesajlaşılmış kullanıcıları bul
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
      hiddenFor: { $ne: userId } // Gizlenmiş mesajları hariç tut
    }).select('senderId receiverId');

    const userIdSet = new Set();
    
    // Mesajlaşılmış kullanıcılar
    messages.forEach(msg => {
      if (msg.senderId.toString() !== userId.toString()) {
        userIdSet.add(msg.senderId.toString());
      }
      if (msg.receiverId.toString() !== userId.toString()) {
        userIdSet.add(msg.receiverId.toString());
      }
    });

    console.log('💬 Mesajlaşılmış kullanıcılar:', Array.from(userIdSet));

    // ✅ Takip edilen kullanıcıları da ekle - POPULATE ile
    const currentUser = await User.findById(userId).populate('following', '_id').select('following');
    console.log('👤 Current user following:', currentUser?.following);
    
    if (currentUser && currentUser.following && currentUser.following.length > 0) {
      currentUser.following.forEach(followedUser => {
        if (followedUser && followedUser._id) {
          userIdSet.add(followedUser._id.toString());
        }
      });
    }

    console.log('📋 Tüm kullanıcılar (mesajlaşılanlar + takip edilenler):', Array.from(userIdSet));

    // Eğer hiç kullanıcı yoksa boş array döndür
    if (userIdSet.size === 0) {
      console.log('⚠️ Hiç kullanıcı bulunamadı');
      return res.json([]);
    }

    // Kullanıcı bilgilerini getir
    const users = await User.find(
      { _id: { $in: Array.from(userIdSet) } }
    ).select('_id name phoneNumber profilePicture');

    console.log('👥 Bulunan kullanıcılar:', users.map(u => ({ id: u._id, name: u.name, phone: u.phoneNumber })));

    // Her kullanıcı için okunmamış mesaj sayısını hesapla
    const usersWithUnreadCount = await Promise.all(
      users.map(async (user) => {
        const unreadCount = await Message.countDocuments({
          senderId: user._id,
          receiverId: userId,
          read: false,
          hiddenFor: { $ne: userId }
        });

        return {
          ...user.toObject(),
          unreadCount
        };
      })
    );

    // Son mesaja göre sırala
    const usersWithLastMessage = await Promise.all(
      usersWithUnreadCount.map(async (user) => {
        const lastMessage = await Message.findOne({
          $or: [
            { senderId: userId, receiverId: user._id },
            { senderId: user._id, receiverId: userId }
          ],
          hiddenFor: { $ne: userId }
        }).sort({ timestamp: -1 });

        return {
          ...user,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
            isOwn: lastMessage.senderId.toString() === userId.toString()
          } : null
        };
      })
    );

    // Son mesaj zamanına göre sırala (son mesajı olmayanlar sonda)
    usersWithLastMessage.sort((a, b) => {
      if (!a.lastMessage && !b.lastMessage) return 0;
      if (!a.lastMessage) return 1;
      if (!b.lastMessage) return -1;
      return new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp);
    });

    console.log('✅ Final sonuç:', usersWithLastMessage.length, 'kullanıcı');
    res.json(usersWithLastMessage);
    
  } catch (err) {
    console.error("❌ Mesaj kullanıcıları alınamadı:", err.message);
    console.error("❌ Stack trace:", err.stack);
    res.status(500).json({ error: 'Mesaj kullanıcıları getirilemedi' });
  }
});

// 📩 Yeni mesaj gönder
router.post('/', protect, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user._id;

    if (!receiverId || !content || !content.trim()) {
      return res.status(400).json({ error: 'Alıcı ve mesaj içeriği gerekli' });
    }

    // Alıcının var olup olmadığını kontrol et
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Alıcı kullanıcı bulunamadı' });
    }

    // Kendine mesaj göndermeyi engelle
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ error: 'Kendinize mesaj gönderemezsiniz' });
    }

    const message = new Message({
      senderId,
      receiverId,
      content: content.trim(),
      timestamp: new Date(),
      read: false
    });

    await message.save();

    // Populate edilmiş mesajı döndür
    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', '_id name phoneNumber profilePicture')
      .populate('receiverId', '_id name phoneNumber profilePicture');

    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('❌ Mesaj kaydedilirken hata:', err);
    res.status(500).json({ error: 'Mesaj kaydedilemedi' });
  }
});

// 💬 İki kullanıcı arasındaki mesaj geçmişini getir
router.get('/:otherUserId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    // Diğer kullanıcının var olup olmadığını kontrol et
    const otherUser = await User.findById(otherUserId);
    if (!otherUser) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ],
      hiddenFor: { $ne: userId } // Gizlenmiş mesajları hariç tut
    })
    .populate('senderId', '_id name phoneNumber profilePicture')
    .populate('receiverId', '_id name phoneNumber profilePicture')
    .sort({ timestamp: 1 });

    res.json(messages);
  } catch (err) {
    console.error('❌ Mesajlar alınırken hata:', err);
    res.status(500).json({ error: 'Mesajlar alınamadı' });
  }
});

// 🔥 Mesajı herkes için sil (sadece gönderen silebilir)
router.delete('/:id/for-everyone', protect, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Mesaj bulunamadı' });
    }

    // Sadece mesajı gönderen silebilir
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Bu mesajı silme yetkiniz yok' });
    }

    // Mesaj 24 saatten eski ise silinemez
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (message.timestamp < twentyFourHoursAgo) {
      return res.status(400).json({ error: 'Bu mesaj 24 saatten eski olduğu için silinemez' });
    }

    // Mesajı "silindi" olarak işaretle, tamamen silme
    await Message.findByIdAndUpdate(messageId, {
      content: 'Bu mesaj silindi',
      deleted: true,
      deletedAt: new Date()
    });

    res.json({ success: true, message: 'Mesaj herkes için silindi' });
  } catch (err) {
    console.error('❌ Mesaj silinemedi:', err);
    res.status(500).json({ error: 'Mesaj silinemedi' });
  }
});

// 🧩 Mesajı benden gizle (benim için sil)
router.put('/:id/hide', protect, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Mesaj bulunamadı' });
    }

    // Mesajın taraflarından biri olmak gerekiyor
    if (message.senderId.toString() !== userId.toString() &&
        message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Bu mesajı gizleme yetkiniz yok' });
    }

    await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { hiddenFor: userId } },
      { new: true }
    );

    res.json({ success: true, message: 'Mesaj sizin için gizlendi' });
  } catch (err) {
    console.error('❌ Mesaj gizlenemedi:', err);
    res.status(500).json({ error: 'Mesaj gizlenemedi' });
  }
});

// ✅ Mesajı okundu olarak işaretle
router.put('/:id/read', protect, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Mesaj bulunamadı' });
    }

    // Sadece alıcı mesajı okundu olarak işaretleyebilir
    if (message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Bu mesajı okundu olarak işaretleme yetkiniz yok' });
    }

    // Zaten okunmuşsa tekrar güncelleme
    if (message.read) {
      return res.json(message);
    }

    const updated = await Message.findByIdAndUpdate(
      messageId,
      { read: true, readAt: new Date() },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    console.error('❌ Mesaj okundu olarak işaretlenemedi:', err);
    res.status(500).json({ error: 'Mesaj okundu olarak işaretlenemedi' });
  }
});

// ✅ Bir kullanıcıdan gelen tüm okunmamış mesajları okundu olarak işaretle
router.put('/read-all/:otherUserId', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId } = req.params;

    const result = await Message.updateMany(
      {
        senderId: otherUserId,
        receiverId: userId,
        read: false,
        hiddenFor: { $ne: userId }
      },
      {
        read: true,
        readAt: new Date()
      }
    );

    res.json({ 
      success: true, 
      message: `${result.modifiedCount} mesaj okundu olarak işaretlendi` 
    });
  } catch (err) {
    console.error('❌ Mesajlar okundu olarak işaretlenemedi:', err);
    res.status(500).json({ error: 'Mesajlar okundu olarak işaretlenemedi' });
  }
});

// 📊 Okunmamış mesaj sayısını getir
router.get('/unread/count', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadCount = await Message.countDocuments({
      receiverId: userId,
      read: false,
      hiddenFor: { $ne: userId }
    });

    res.json({ count: unreadCount });
  } catch (err) {
    console.error('❌ Okunmamış mesaj sayısı alınamadı:', err);
    res.status(500).json({ error: 'Okunmamış mesaj sayısı alınamadı' });
  }
});

// 📊 Kullanıcı bazında okunmamış mesaj sayıları
router.get('/unread/by-user', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadMessages = await Message.aggregate([
      {
        $match: {
          receiverId: userId,
          read: false,
          hiddenFor: { $ne: userId }
        }
      },
      {
        $group: {
          _id: '$senderId',
          count: { $sum: 1 },
          lastMessage: { $last: '$$ROOT' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'sender',
          pipeline: [
            { $project: { name: 1, phoneNumber: 1, profilePicture: 1 } }
          ]
        }
      },
      {
        $unwind: '$sender'
      }
    ]);

    res.json(unreadMessages);
  } catch (err) {
    console.error('❌ Kullanıcı bazında okunmamış mesajlar alınamadı:', err);
    res.status(500).json({ error: 'Kullanıcı bazında okunmamış mesajlar alınamadı' });
  }
});

// 🔍 Mesajlarda arama yap
router.get('/search/:query', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const { query } = req.params;
    const { otherUserId } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Arama terimi en az 2 karakter olmalı' });
    }

    const searchFilter = {
      $or: [
        { senderId: userId },
        { receiverId: userId }
      ],
      content: { $regex: query.trim(), $options: 'i' },
      hiddenFor: { $ne: userId }
    };

    // Belirli bir kullanıcı ile mesajlarda ara
    if (otherUserId) {
      searchFilter.$or = [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId }
      ];
    }

    const messages = await Message.find(searchFilter)
      .populate('senderId', '_id name phoneNumber')
      .populate('receiverId', '_id name phoneNumber')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(messages);
  } catch (err) {
    console.error('❌ Mesaj araması yapılamadı:', err);
    res.status(500).json({ error: 'Mesaj araması yapılamadı' });
  }
});

module.exports = router;