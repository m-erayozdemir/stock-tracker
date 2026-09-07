# 1️⃣ Node.js base image
FROM node:18

# 2️⃣ Çalışma dizini oluştur
WORKDIR /app

# 3️⃣ package.json ve package-lock.json dosyalarını kopyala
COPY package*.json ./

# 4️⃣ Sadece production bağımlılıkları yükle
RUN npm install --only=production

# 5️⃣ Geriye kalan dosyaları kopyala
COPY . .

# 6️⃣ Uygulama portu
EXPOSE 5001

# 7️⃣ Healthcheck için opsiyonel (örnek)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# 8️⃣ Uygulamayı başlat
CMD ["node", "index.js"]
