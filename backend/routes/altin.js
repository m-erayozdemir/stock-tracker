const express = require("express");
const axios = require("axios");
const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // 🔹 1. Ons altın fiyatı (USD)
    const altinRes = await axios.get("https://api.gold-api.com/price/XAU");
    const altinUSD = parseFloat(altinRes.data.price);

    // 🔹 2. Ons gümüş fiyatı (USD)
    const gumusRes = await axios.get("https://api.gold-api.com/price/XAG");
    const gumusUSD = parseFloat(gumusRes.data.price);

    // 🔹 3. USD/TRY kuru
    const kurRes = await axios.get("https://hasanadiguzel.com.tr/api/kurgetir");
    const usdKur = kurRes.data.TCMB_AnlikKurBilgileri.find(kur => kur.CurrencyName === "US DOLLAR")?.ForexSelling;

    // 🔎 Veriler eksikse hata döndür
    if (!altinUSD || !gumusUSD || !usdKur) {
      return res.status(404).json({ error: "Gerekli veriler eksik" });
    }

    // 🔹 4. TL cinsinden dönüşümler
    const onsToGram = 31.1035;
    const gramAltinTL = (altinUSD / onsToGram) * usdKur;
    const ceyrekAltinTL = gramAltinTL * 1.75;
    const gramGumusTL = (gumusUSD / onsToGram) * usdKur;

    // 🔎 Log (isteğe bağlı)
    console.log("Gram Altın:", gramAltinTL.toFixed(2));
    console.log("Çeyrek Altın:", ceyrekAltinTL.toFixed(2));
    console.log("Gram Gümüş:", gramGumusTL.toFixed(2));

    // ✅ Yanıtı döndür
    return res.json({
      gram: parseFloat(gramAltinTL.toFixed(2)),
      ceyrek: parseFloat(ceyrekAltinTL.toFixed(2)),
      gumus: parseFloat(gramGumusTL.toFixed(2))
    });

  } catch (err) {
    console.error("🔴 Altın/Gümüş API hatası:", err.message);
    return res.status(500).json({ error: "Altın veya gümüş verisi alınamadı" });
  }
});

module.exports = router;
