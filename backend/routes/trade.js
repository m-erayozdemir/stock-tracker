const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const LimitOrder = require('../models/LimitOrder');

// ✅ ALIM (Market)
router.post('/buy', async (req, res) => {
  try {
    const { userId, symbol, price, quantity } = req.body;
    if (!userId || !symbol || !price || !quantity) {
      return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }
    if (isNaN(price) || isNaN(quantity)) {
      return res.status(400).json({ message: 'Fiyat ve miktar sayısal olmalıdır.' });
    }

    const totalCost = price * quantity;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });

    if (user.balance < totalCost) {
      return res.status(400).json({ message: 'Yetersiz bakiye' });
    }

    const transaction = new Transaction({ userId, symbol, price, quantity, type: 'buy' });
    await transaction.save();

    user.balance -= totalCost;
    await user.save();

    res.json({ message: 'Alım başarılı', balance: user.balance });
  } catch (err) {
    console.error('🛑 /buy hatası:', err.message);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// ✅ SATIM (Market)
router.post('/sell', async (req, res) => {
  try {
    const { userId, symbol, price, quantity } = req.body;
    const transactions = await Transaction.find({ userId, symbol });

    const totalOwned = transactions.reduce((sum, tx) =>
      tx.type === 'buy' ? sum + tx.quantity : sum - tx.quantity, 0);

    if (quantity > totalOwned) {
      return res.status(400).json({ message: 'Yetersiz hisse miktarı' });
    }

    const transaction = new Transaction({ userId, symbol, price, quantity, type: 'sell' });
    await transaction.save();

    const user = await User.findById(userId);
    user.balance += price * quantity;
    await user.save();

    res.json({ message: 'Satış başarılı', balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// ✅ LİMİT ALIM EMRİ
router.post('/limit_buy', async (req, res) => {
  try {
    const { userId, symbol, price, quantity } = req.body;
    if (!userId || !symbol || !price || !quantity) {
      return res.status(400).json({ message: 'Tüm alanlar gereklidir.' });
    }

    const user = await User.findById(userId);
    const totalCost = price * quantity;

    if (!user || user.balance < totalCost) {
      return res.status(400).json({ message: 'Yetersiz bakiye' });
    }

    // Bakiye bloke edilir
    user.balance -= totalCost;
    await user.save();

    const order = new LimitOrder({ userId, symbol, price, quantity, type: 'limit_buy' });
    await order.save();

    res.json({ message: 'Limit alım emri başarıyla eklendi' });
  } catch (err) {
    console.error('🛑 limit_buy hatası:', err.message);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// ✅ LİMİT SATIŞ EMRİ
router.post('/limit_sell', async (req, res) => {
  try {
    const { userId, symbol, price, quantity } = req.body;

    const transactions = await Transaction.find({ userId, symbol });
    const totalOwned = transactions.reduce((sum, tx) =>
      tx.type === 'buy' ? sum + tx.quantity : sum - tx.quantity, 0);

    if (quantity > totalOwned) {
      return res.status(400).json({ message: 'Yetersiz hisse' });
    }

    const order = new LimitOrder({ userId, symbol, price, quantity, type: 'limit_sell' });
    await order.save();

    res.json({ message: 'Limit satış emri başarıyla eklendi' });
  } catch (err) {
    console.error('🛑 limit_sell hatası:', err.message);
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// ✅ AKTİF LIMIT EMİRLERİ GETİR
router.get('/limit-orders/:userId', async (req, res) => {
  try {
    const orders = await LimitOrder.find({
      userId: req.params.userId,
      sent: false
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

// ✅ LIMIT EMRİ SİL (isteğe bağlı)
router.delete('/limit-order/:id', async (req, res) => {
  try {
    const order = await LimitOrder.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Emir bulunamadı' });

    if (order.type === 'limit_buy') {
      const user = await User.findById(order.userId);
      user.balance += order.price * order.quantity;
      await user.save();
    }

    await LimitOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Limit emri silindi' });
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});

//Gerçekleşen emirler
router.get('/limit-orders/completed/:userId', async (req, res) => {
  try {
    const orders = await LimitOrder.find({
      userId: req.params.userId,
      sent: true
    }).sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Sunucu hatası', error: err.message });
  }
});


// ✅ PORTFÖY
router.get('/portfolio/:userId', async (req, res) => {
  const userId = req.params.userId;
  const transactions = await Transaction.find({ userId });

  const portfolioMap = {};

  for (const tx of transactions) {
    if (!portfolioMap[tx.symbol]) {
      portfolioMap[tx.symbol] = { total: 0, totalCost: 0 };
    }

    const entry = portfolioMap[tx.symbol];

    if (tx.type === 'buy') {
      entry.total += tx.quantity;
      entry.totalCost += tx.price * tx.quantity;
    } else if (tx.type === 'sell') {
      entry.total -= tx.quantity;
      entry.totalCost -= tx.price * tx.quantity;
    }
  }

  const portfolio = Object.entries(portfolioMap)
    .filter(([_, val]) => val.total > 0)
    .map(([symbol, val]) => ({
      symbol,
      quantity: val.total,
      averageBuyPrice: parseFloat((val.totalCost / val.total).toFixed(2)),
    }));

  res.json(portfolio);
});

module.exports = router;
