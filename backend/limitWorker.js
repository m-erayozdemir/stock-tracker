// limitWorker.js
require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const LimitOrder = require('./models/LimitOrder');

// MongoDB'ye bağlan
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB bağlantısı kuruldu'))
  .catch((err) => console.error('❌ MongoDB bağlantı hatası:', err));

// Fiyatı API'den al
const getCurrentPrice = async (symbol) => {
  try {
    const res = await axios.get('https://api.twelvedata.com/price', {
      params: {
        symbol,
        apikey: process.env.TWELVE_DATA_API_KEY,
      },
    });

    return parseFloat(res.data?.price);
  } catch (err) {
    console.error(`🔴 ${symbol} fiyat alınamadı`, err.message);
    return null;
  }
};

// Ana kontrol fonksiyonu
const checkLimitOrders = async () => {
  console.log('🔁 Limit emirleri kontrol ediliyor...');

  const orders = await LimitOrder.find({ sent: false });

  for (const order of orders) {
    const price = await getCurrentPrice(order.symbol);
    if (!price) continue;

    const { userId, symbol, quantity, type } = order;

    // Limit emri koşulları
    if (
      (type === 'limit_buy' && price <= order.price) ||
      (type === 'limit_sell' && price >= order.price)
    ) {
      const user = await User.findById(userId);
      if (!user) continue;

      if (type === 'limit_buy') {
        const cost = price * quantity;
        // Bakiye zaten önceden düşülmüştü → işlem kaydı
        const tx = new Transaction({ userId, symbol, price, quantity, type: 'buy' });
        await tx.save();

        order.sent = true;
        await order.save();

        console.log(`✅ ALIM gerçekleşti → ${symbol} x${quantity} @ $${price}`);

      } else if (type === 'limit_sell') {
        const transactions = await Transaction.find({ userId, symbol });
        const totalOwned = transactions.reduce((sum, tx) =>
          tx.type === 'buy' ? sum + tx.quantity : sum - tx.quantity, 0);

        if (totalOwned >= quantity) {
          const tx = new Transaction({ userId, symbol, price, quantity, type: 'sell' });
          await tx.save();

          user.balance += price * quantity;
          await user.save();

          order.sent = true;
          await order.save();

          console.log(`✅ SATIM gerçekleşti → ${symbol} x${quantity} @ $${price}`);
        } else {
          console.log(`⚠️ Yetersiz hisse: ${symbol}, sahip: ${totalOwned}, istenen: ${quantity}`);
        }
      }
    }
  }

  console.log('✅ Kontrol tamamlandı.\n');
};

// Döngü başlat (her 30 saniyede bir)
setInterval(checkLimitOrders, 30000);

// Başlangıçta da çalıştır
checkLimitOrders();
