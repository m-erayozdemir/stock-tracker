require('dotenv').config();

const amqp = require('amqplib');
const sendSmsToUser = require('./utils/sms');

const rabbitHost = process.env.RABBITMQ_URL || 'amqp://localhost';

async function startWorker() {
  try {
    const connection = await amqp.connect(rabbitHost);
    const channel = await connection.createChannel();
    await channel.assertQueue('smsQueue');
    console.log("📡 SMS Worker listening...");

    channel.consume('smsQueue', async (msg) => {
      const { phoneNumber, text } = JSON.parse(msg.content.toString());
      console.log("📨 Mesaj alındı:", phoneNumber, text);

      try {
        await sendSmsToUser(phoneNumber, text);
        channel.ack(msg);
      } catch (err) {
        console.error("❌ SMS gönderim hatası:", err.message);
        // channel.nack(msg); // isteğe bağlı: kuyruğa geri atmak için
      }
    });
  } catch (err) {
    console.error("❌ Worker başlatılamadı:", err.message);
  }
}

startWorker();
