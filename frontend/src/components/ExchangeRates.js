import React, { useEffect, useState } from "react";
import axios from "axios";
import api from "../api";

const ExchangeRates = () => {
  const [exchange, setExchange] = useState({});
  const [previousExchange, setPreviousExchange] = useState({});

  const fetchExchangeRates = async () => {
    try {
      const res = await api.get("/kurlar");
      const kurListesi = res.data.TCMB_AnlikKurBilgileri;

      const usd = parseFloat(
        kurListesi.find(kur => kur.CurrencyName === "US DOLLAR")?.ForexSelling
      );
      const eur = parseFloat(
        kurListesi.find(kur => kur.CurrencyName === "EURO")?.ForexSelling
      );
      const gbp = parseFloat(
        kurListesi.find(kur => kur.CurrencyName === "POUND STERLING")?.ForexSelling
      );
      const chf = parseFloat(
        kurListesi.find(kur => kur.CurrencyName === "SWISS FRANK")?.ForexSelling
      );

      if (usd && eur && gbp && chf) {
        setPreviousExchange(exchange); // önceki veriyi kaydet
        setExchange({ usd, eur, gbp, chf }); // yeni veriyi güncelle
      } else {
        console.warn("❗ Döviz verileri eksik olabilir");
      }
    } catch (err) {
      console.error("Döviz alınamadı:", err.message);
    }
  };

  useEffect(() => {
    fetchExchangeRates(); // ilk çağrı
    const interval = setInterval(fetchExchangeRates, 10000); // her 10 sn'de bir güncelle
    return () => clearInterval(interval);
  }, );

  const getColor = (curr) => {
    if (!previousExchange[curr]) return "text-black";
    if (exchange[curr] > previousExchange[curr]) return "text-green-500";
    if (exchange[curr] < previousExchange[curr]) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <div className="p-4 bg-white shadow rounded-lg w-full max-w-sm">
      <h2 className="text-xl font-semibold mb-3">💱 Döviz Kurları</h2>
      <ul className="space-y-2">
        <li className="flex justify-between">
          <span>USD</span>
          <span className={`font-bold ${getColor("usd")}`}>
            {exchange.usd?.toFixed(2)}
          </span>
        </li>
        <li className="flex justify-between">
          <span>EUR</span>
          <span className={`font-bold ${getColor("eur")}`}>
            {exchange.eur?.toFixed(2)}
          </span>
        </li>
        <li className="flex justify-between">
          <span>GBP</span>
          <span className={`font-bold ${getColor("gbp")}`}>
            {exchange.gbp?.toFixed(2)}
          </span>
        </li>
        <li className="flex justify-between">
          <span>CHF</span>
          <span className={`font-bold ${getColor("chf")}`}>
            {exchange.chf?.toFixed(2)}
          </span>
        </li>
      </ul>
    </div>
  );
};

export default ExchangeRates;
