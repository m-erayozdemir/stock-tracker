// routes/search.js
const express = require('express');
const axios = require('axios');
const router = express.Router();
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

router.get('/', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json([]);

  try {
    const response = await axios.get(`https://finnhub.io/api/v1/search?q=${query}&token=${FINNHUB_API_KEY}`);
    
    // Normalizasyon: sadece geçerli sembol ve açıklamaları dön
    const results = response.data.result
      .filter(r => r.symbol && /^[A-Z]+(\.IS)?$/.test(r.symbol)) // ASELS veya ASELS.IS gibi
      .map(r => ({
        symbol: r.symbol.toUpperCase(),
        description: r.description,
      }));

    res.json(results);
  } catch (err) {
    console.error('🔍 Arama hatası:', err.message);
    res.status(500).json([]);
  }
});

module.exports = router;
