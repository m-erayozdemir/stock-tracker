const axios = require('axios');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Alarm = require('./models/Alarm');
const User = require('./models/User');
const { sendToQueue } = require('./utils/queue');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB bağlantısı kuruldu'))
  .catch((err) => console.error('❌ MongoDB bağlantı hatası:', err.message));

const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

const checkAlarms = async () => {
  try {
    const alarms = await Alarm.find({ sent: false }).populate('userId');

    for (const alarm of alarms) {
      const { symbol, targetPrice, direction, userId } = alarm;

      let current;
      try {
        const res = await axios.get(`https://api.twelvedata.com/price`, {
          params: {
            symbol,
            apikey: TWELVE_DATA_API_KEY,
          },
        });

        if (res.data && res.data.price) {
          current = parseFloat(res.data.price);
        } else {
          throw new Error(res.data.message || 'Fiyat alınamadı');
        }
      } catch (fetchError) {
        console.error(`❌ ${symbol} fiyatı alınamadı (TwelveData):`, fetchError.message);
        continue;
      }

      const match =
        (direction === 'above' && current >= targetPrice) ||
        (direction === 'below' && current <= targetPrice);

      if (match) {
        try {
          sendToQueue({
            phoneNumber: userId.phoneNumber,
            text: `${symbol} ${current}₺ oldu! Alarm tetiklendi.`,
          });

          alarm.sent = true;
          alarm.sentAt = new Date();
          await alarm.save();

          console.log(`📢 Alarm kuyruğa alındı => ${symbol} @ ${current} (${direction} ${targetPrice})`);
        } catch (smsError) {
          console.error(`❌ Kuyruğa atılamadı (${symbol}):`, smsError.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Alarm kontrol hatası:', err.message);
  }
};

setInterval(checkAlarms, 10 * 1000);
