const amqp = require('amqplib');

let channel, connection;

async function connectRabbitMQ(retryCount = 0) {
  try {
    const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost'; // fallback
    connection = await amqp.connect(rabbitmqUrl);
    channel = await connection.createChannel();
    await channel.assertQueue('smsQueue', { durable: true });
    console.log("✅ RabbitMQ connected and queue declared");
  } catch (error) {
    console.error("❌ RabbitMQ connection error:", error.message);

    if (retryCount < 5) {
      console.log(`🔁 Tekrar deneniyor... (${retryCount + 1}/5)`);
      setTimeout(() => connectRabbitMQ(retryCount + 1), 3000);
    } else {
      console.error("🚫 RabbitMQ bağlantısı başarısız (5 deneme yapıldı).");
    }
  }
}

function sendToQueue(message) {
  if (!channel) {
    console.error("❌ RabbitMQ kanalı hazır değil. Mesaj gönderilemedi.");
    return;
  }

  try {
    channel.sendToQueue('smsQueue', Buffer.from(JSON.stringify(message)), {
      persistent: true
    });
    console.log("📤 Mesaj kuyruğa eklendi:", message);
  } catch (err) {
    console.error("❌ Kuyruğa mesaj gönderilemedi:", err.message);
  }
}

module.exports = {
  connectRabbitMQ,
  sendToQueue,
};
