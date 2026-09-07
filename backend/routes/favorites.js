const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth');
const User = require('../models/User');

// 🔒 GET: Favori hisse listesi
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user.favoriteStocks || []);
  } catch (err) {
    console.error("❌ Favoriler alınamadı:", err.message);
    res.status(500).json({ message: 'Favori hisseler alınamadı.' });
  }
});

// ➕ POST: Favori hisse ekle
router.post('/', protect, async (req, res) => {
  let { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({ message: 'Hisse kodu gerekli.' });
  }

  symbol = symbol.trim().toUpperCase();

  try {
    const user = await User.findById(req.user._id);

    if (user.favoriteStocks.includes(symbol)) {
      return res.status(400).json({ message: 'Bu hisse zaten favorilerde.' });
    }

    user.favoriteStocks.push(symbol);
    await user.save();

    res.status(200).json({ message: 'Favori hisse eklendi.' });
  } catch (err) {
    console.error("❌ Favori ekleme hatası:", err.message);
    res.status(500).json({ message: 'Favori eklenemedi.' });
  }
});

// ❌ DELETE: Favori hisseyi sil
router.delete('/:symbol', protect, async (req, res) => {
  const symbol = req.params.symbol.trim().toUpperCase();

  try {
    const user = await User.findById(req.user._id);
    user.favoriteStocks = user.favoriteStocks.filter((fav) => fav !== symbol);
    await user.save();

    res.status(200).json({ message: 'Favori hisse silindi.' });
  } catch (err) {
    console.error("❌ Favori silme hatası:", err.message);
    res.status(500).json({ message: 'Favori silinemedi.' });
  }
});

module.exports = router;
