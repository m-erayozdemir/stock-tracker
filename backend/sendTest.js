const { connectRabbitMQ, sendToQueue } = require('./utils/queue');

async function test() {
  if (!process.env.SMS_TEST_PHONE) throw new Error("Set SMS_TEST_PHONE explicitly before sending a test SMS");
  await connectRabbitMQ();
  await sendToQueue({
    phoneNumber: process.env.SMS_TEST_PHONE,
    text: "Test"
  });
  console.log("📬 Kuyruğa test mesajı atıldı");
}

test();
