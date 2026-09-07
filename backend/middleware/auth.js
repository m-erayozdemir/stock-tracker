const jwt = require('jsonwebtoken');
const User = require('../models/User'); // 📌 Modeli ekle

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Yetkisiz erişim: Token yok.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 📌 Veritabanından kullanıcıyı bul
    const user = await User.findById(decoded.id).select("-password"); // şifreyi çıkar

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    req.user = user; // 🔥 Artık req.user gerçek kullanıcı objesi
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Geçersiz token.' });
  }
};

module.exports = protect;
