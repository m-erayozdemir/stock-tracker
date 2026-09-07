const express = require('express');
const axios = require('axios');
const router = express.Router();

const TWELVE_API_KEY = process.env.TWELVE_DATA_API_KEY;

router.get('/:symbol', async (req, res) => {
  console.log("💡 /api/prices isteği geldi:", req.params.symbol);
  let symbol = req.params.symbol;

  // "BIST:ASELS" → "ASELS.IS"
  if (symbol.startsWith('BIST:')) {
    symbol = symbol.split(':')[1] + '.IS';
  }
  // "NASDAQ:AAPL" → "AAPL"
  else if (symbol.startsWith('NASDAQ:')) {
    symbol = symbol.split(':')[1];
  }

  try {
    const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${TWELVE_API_KEY}`;
    const response = await axios.get(url);

    const price = parseFloat(response.data?.price);
    if (!price || isNaN(price)) {
      console.warn(`⚠️ Geçersiz fiyat verisi:`, response.data);
      return res.status(404).json({ error: 'Fiyat bulunamadı.' });
    }

    res.json({ symbol, price });
  } catch (error) {
    console.error(`❌ Twelve Data API hatası (${symbol}):`, error.message);
    res.status(500).json({ error: 'Fiyat alınamadı.' });
  }
});

module.exports = router;
