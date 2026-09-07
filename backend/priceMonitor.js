const mongoose = require('mongoose');
const dotenv = require('dotenv');
const axios = require('axios');
const Alarm = require('./models/Alarm');
const User = require('./models/User');
const sendSmsToUser = require('./utils/sms');

dotenv.config();
mongoose.connect(process.env.MONGO_URI);

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

const checkAlarms = async () => {
  try {
    const alarms = await Alarm.find({ sent: false }).populate('userId');

    for (const alarm of alarms) {
      const symbol = alarm.symbol;
      const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
      
      const res = await axios.get(url);
      const current = res.data.c;

      console.log(`🔍 ${symbol} güncel fiyat: ${current} | hedef: ${alarm.targetPrice}`);

      if (
        (alarm.direction === 'above' && current >= alarm.targetPrice) ||
        (alarm.direction === 'below' && current <= alarm.targetPrice)
      ) {
      await sendSmsToUser(
      alarm.userId.phoneNumber,
      `📈 ${symbol} fiyatı hedefe ulaştı: ${current} ₺`
      );
      alarm.sent = true;
      alarm.sentAt = new Date();
      await alarm.save();

      console.log(`✅ SMS gönderildi: ${symbol} @ ${current}`);
      }

    }
  } catch (err) {
    console.error('❌ Alarm kontrol hatası:', err.message);
  }
};

// Her 1 dakikada bir kontrol için (canlıda bunu kullan)
setInterval(checkAlarms, 60 * 1000);
