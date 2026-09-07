const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const currencies = ["USD", "EUR", "GBP", "CHF"];
    const rates = {};

    const response = await axios.get("https://open.er-api.com/v6/latest/TRY");
    const data = response.data;

    if (data.result !== "success" || !data.rates) {
      return res.status(500).json({ error: "Kur verisi alınamadı." });
    }

    currencies.forEach((cur) => {
      if (data.rates[cur]) {
        // data.rates[cur] = 1 TRY = x CUR  → ters çeviriyoruz
        rates[cur.toLowerCase()] = + (1 / data.rates[cur]).toFixed(2);
      }
    });

    res.json(rates);
  } catch (err) {
    console.error("❌ Kur verisi alınamadı:", err.message);
    res.status(500).json({ error: "Kur verisi alınamadı." });
  }
});

module.exports = router;
