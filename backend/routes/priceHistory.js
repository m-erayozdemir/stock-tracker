const express = require('express');
const axios = require('axios');
const router = express.Router();

const API_KEY = process.env.TWELVE_DATA_API_KEY;

router.get('/', async (req, res) => {
  const { symbol, start, end } = req.query;

  if (!symbol || !start || !end) {
    return res.status(400).json({ error: 'Eksik parametreler' });
  }

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&start_date=${start}&end_date=${end}&apikey=${API_KEY}`;
    const response = await axios.get(url);

    const values = response.data?.values;
    if (!values || !Array.isArray(values)) {
      return res.status(404).json({ error: 'Veri bulunamadı' });
    }

    const prices = values.map(entry => ({
      date: entry.datetime,
      price: parseFloat(entry.close)
    })).sort((a, b) => new Date(a.date) - new Date(b.date)); // Artan sırada

    res.json({ prices });
  } catch (error) {
    console.error('Veri alma hatası:', error.message);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;
