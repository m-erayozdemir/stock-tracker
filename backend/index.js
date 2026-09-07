require('dotenv').config();
require('./checkAlarms');

const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth');
const favoritesRoutes = require('./routes/favorites');
const priceRoutes = require('./routes/prices');
const alarmRoutes = require('./routes/alarms');
const searchRoutes = require('./routes/search');
const kurlarRoute = require('./routes/kurlar');
const altinRoute = require('./routes/altin');
const meRoute = require('./routes/me');
const priceHistoryRoute = require('./routes/priceHistory');
const tradeRoutes = require('./routes/trade');
const usersRoute = require('./routes/users');
const messageRoutes = require('./routes/messages');
const connectRabbitMQ = require('./utils/queue').connectRabbitMQ;

const app = express();
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
const server = http.createServer(app);

// ✅ Tüm izinli originleri tek yerde toplayalım
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(value => value.trim());

// ✅ CORS ayarı
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// ✅ Socket.io da aynı izinleri kullanmalı
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

// 🔌 Online kullanıcılar - userId ile socket.id eşleştirmesi
const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("🔌 Yeni bağlantı:", socket.id);

  // ✅ Kullanıcı online duruma geçti
  socket.on("addUser", (userId) => {
    console.log("👤 Kullanıcı eklendi:", userId, "Socket:", socket.id);
    onlineUsers.set(userId, socket.id);
    
    // Tüm kullanıcılara online kullanıcı listesini gönder
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // ✅ Mesaj gönderme
  socket.on("sendMessage", (data) => {
    console.log("📤 Mesaj gönderiliyor:", data);
    const receiverSocket = onlineUsers.get(data.receiverId);
    
    if (receiverSocket) {
      // Sadece alıcıya mesajı gönder
      io.to(receiverSocket).emit("receiveMessage", data);
      console.log("✅ Mesaj alıcıya iletildi:", data.receiverId);
    } else {
      console.log("❌ Alıcı çevrimdışı:", data.receiverId);
    }
  });

  // ✅ Yazma durumu (typing indicator)
  socket.on("typing", ({ senderId, receiverId, isTyping }) => {
    console.log("⌨️ Typing event:", { senderId, receiverId, isTyping });
    const receiverSocket = onlineUsers.get(receiverId);
    
    if (receiverSocket) {
      io.to(receiverSocket).emit("userTyping", { userId: senderId, isTyping });
    }
  });

  // ✅ Mesaj silme - düzeltildi
socket.on("deleteMessage", ({ messageId, deletedBy, deleteType, receiverId, senderId }) => {
  console.log("🗑️ Mesaj silme event:", { messageId, deletedBy, deleteType });

  if (deleteType === 'forEveryone') {
    const senderSocket = onlineUsers.get(deletedBy);
    if (senderSocket) {
      io.to(senderSocket).emit("messageDeleted", { 
        messageId, 
        deletedBy, 
        deleteType, 
        receiverId, 
        senderId 
      });
    }

    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit("messageDeleted", { 
        messageId, 
        deletedBy, 
        deleteType, 
        receiverId, 
        senderId 
      });
    }
  }
});


  // ✅ Mesaj okundu - düzeltildi
  socket.on("messageRead", ({ messageId, readBy }) => {
    console.log("✅ Mesaj okundu event:", { messageId, readBy });
    
    // Mesajı gönderen kişiye "okundu" bilgisini ilet
    // Bu bilgiyi tüm online kullanıcılara gönder (mesaj sahibi alacak)
    socket.broadcast.emit("messageRead", { messageId, readBy });
  });

  // ✅ Toplu mesaj okundu işaretleme
  socket.on("markMessagesAsRead", ({ otherUserId, userId }) => {
    console.log("📖 Toplu mesaj okundu:", { otherUserId, userId });
    
    const otherUserSocket = onlineUsers.get(otherUserId);
    if (otherUserSocket) {
      io.to(otherUserSocket).emit("messagesMarkedAsRead", { byUserId: userId });
    }
  });

  // ✅ Kullanıcı bağlantısı kesildi
  socket.on("disconnect", () => {
    console.log("🔌 Bağlantı kesildi:", socket.id);
    
    // Hangi kullanıcının bağlantısı kesildi bul ve kaldır
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        console.log("👋 Kullanıcı çıkış yaptı:", userId);
        onlineUsers.delete(userId);
        break;
      }
    }
    
    // Güncellenmiş online kullanıcı listesini gönder
    io.emit("onlineUsers", Array.from(onlineUsers.keys()));
  });

  // ✅ Hata durumları
  socket.on("error", (error) => {
    console.error("❌ Socket hatası:", error);
  });
});

// ✅ Socket.io instance'ını app'e ekle (routes'larda kullanmak için)
app.set("io", io);

// ✅ RabbitMQ bağlantısı
connectRabbitMQ();

// ✅ Middleware
app.use(express.json());

// ✅ API Routes
app.get("/", (req, res) => res.send("✅ Backend çalışıyor!"));
app.use("/api/auth", authRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/prices", priceRoutes);
app.use("/api/alarms", alarmRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/kurlar", kurlarRoute);
app.use("/api/altin", altinRoute);
app.use("/api/me", meRoute);
app.use("/api/price-history", priceHistoryRoute);
app.use("/api/trade", tradeRoutes);
app.use("/api/users", usersRoute);
app.use("/api/messages", messageRoutes);

// ✅ 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ error: "Endpoint bulunamadı" });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Global hata:", err);
  res.status(500).json({ error: "Sunucu hatası" });
});

// ✅ MongoDB bağlantısı
mongoose
  .connect(process.env.MONGO_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  })
  .then(() => console.log("✅ MongoDB bağlandı"))
  .catch((err) => console.error("❌ MongoDB bağlantı hatası:", err));

// ✅ Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM sinyali alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('✅ HTTP sunucusu kapatıldı');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB bağlantısı kapatıldı');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT sinyali alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('✅ HTTP sunucusu kapatıldı');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB bağlantısı kapatıldı');
      process.exit(0);
    });
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend ${PORT} portunda çalışıyor`);
  console.log(`📡 Socket.io aktif, izinli originler:`, allowedOrigins);
});
