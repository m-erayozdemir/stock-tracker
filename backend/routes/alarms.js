const express = require('express');
const Alarm = require('../models/Alarm');
const auth = require('../middleware/auth'); // JWT kontrolü
const router = express.Router();

// 🔔 Alarm oluştur
router.post('/', auth, async (req, res) => {
  const { symbol, targetPrice, direction } = req.body;

  if (!symbol || !targetPrice || !direction) {
    return res.status(400).json({ message: "Sembol, hedef fiyat ve yön gerekli." });
  }

  try {
    const alarm = new Alarm({
      userId: req.user._id, // ✅ düzeltildi
      symbol,
      targetPrice,
      direction,
    });

    await alarm.save();
    res.status(201).json({ message: "Alarm başarıyla kuruldu.", alarm });
  } catch (err) {
    console.error("❌ Alarm oluşturma hatası:", err.message);
    res.status(500).json({ message: "Alarm kurulamadı." });
  }
});

// 🔔 Tüm alarmları getir
router.get('/', auth, async (req, res) => {
  try {
    const alarms = await Alarm.find({ userId: req.user._id }).sort({ createdAt: -1 }); // ✅ zaten doğru
    res.json(alarms);
  } catch (err) {
    console.error("❌ Alarmlar alınamadı:", err.message);
    res.status(500).json({ message: "Alarmlar alınamadı." });
  }
});

// 🔔 Alarm sil
router.delete('/:id', auth, async (req, res) => {
  try {
    await Alarm.deleteOne({ _id: req.params.id, userId: req.user._id }); // ✅ düzeltildi
    res.json({ message: "Alarm silindi." });
  } catch (err) {
    console.error("❌ Alarm silme hatası:", err.message);
    res.status(500).json({ message: "Alarm silinemedi." });
  }
});

module.exports = router;
