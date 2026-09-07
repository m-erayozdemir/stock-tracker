import axios from 'axios';
import React, { useEffect, useState, useRef } from 'react';
import SymbolAutocomplete from './SymbolAutocomplete';
import api from "../api";


const Dashboard = () => {
  const [weather, setWeather] = useState(null);
  const [cityInput, setCityInput] = useState("İstanbul");
  const [exchange, setExchange] = useState(null);
  const [gold, setGold] = useState(null);
  const [symbol, setSymbol] = useState("");
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");
  const [activeAlarms, setActiveAlarms] = useState([]);
  const FINNHUB_API_KEY = process.env.REACT_APP_FINNHUB_API_KEY;
  const [direction, setDirection] = useState("above");
  const previousExchangeRef = useRef({});
  const previousGoldRef = useRef({});
  const exchangeRef = useRef({ current: null, previous: null });
  const cities = [
  "Adana","Adıyaman","Afyonkarahisar","Ağrı","Aksaray","Amasya","Ankara","Antalya","Ardahan","Artvin","Aydın",
  "Balıkesir","Bartın","Batman","Bayburt","Bilecik","Bingöl","Bitlis","Bolu","Burdur","Bursa",
  "Çanakkale","Çankırı","Çorum","Denizli","Diyarbakır","Düzce","Edirne","Elazığ","Erzincan","Erzurum","Eskişehir",
  "Gaziantep","Giresun","Gümüşhane","Hakkari","Hatay","Iğdır","Isparta","İstanbul","İzmir","Kahramanmaraş",
  "Karabük","Karaman","Kars","Kastamonu","Kayseri","Kilis","Kırıkkale","Kırklareli","Kırşehir","Kocaeli","Konya",
  "Kütahya","Malatya","Manisa","Mardin","Mersin","Muğla","Muş","Nevşehir","Niğde","Ordu","Osmaniye",
  "Rize","Sakarya","Samsun","Siirt","Sinop","Sivas","Şanlıurfa","Şırnak","Tekirdağ","Tokat","Trabzon","Tunceli",
  "Uşak","Van","Yalova","Yozgat","Zonguldak"
];


  useEffect(() => {
    fetchWeather("İstanbul"); // ilk yüklemede İstanbul'u getir
    fetchExchangeRates();
    fetchGoldPrice();
  }, []);

  useEffect(() => {
    loadTradingViewWidget();
  }, [symbol]);

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (!token || activeAlarms.length === 0) return;

    const interval = setInterval(async () => {
      for (const alarm of activeAlarms.filter(a => !a.sent)) {
        try {
          const res = await axios.get(
            `https://finnhub.io/api/v1/quote?symbol=${alarm.symbol}&token=${FINNHUB_API_KEY}`
          );
          const current = res.data.c;
          if (current >= alarm.targetPrice) {
            await api.post("/alarm", {
              symbol: alarm.symbol,
              targetPrice: alarm.targetPrice,
              direction: alarm.direction,
            }, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            alert(`🚨 ${alarm.symbol} hedefe ulaştı → SMS gönderildi`);

            setActiveAlarms((prev) =>
              prev.map((a) =>
                a._id === alarm._id ? { ...a, sent: true, sentAt: new Date() } : a
              )
            );
          }
        } catch (err) {
          console.error("Fiyat kontrol hatası:", err.message);
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [activeAlarms]);

  const handleCityChange = (e) => {
    const value = e.target.value;
    if (/^[a-zA-ZğüşöçıİĞÜŞÖÇ]*$/.test(value)) {
      setCityInput(value);
    }
  };

  const fetchWeather = async (city = "İstanbul") => {
    try {
      const geoRes = await axios.get(`https://geocoding-api.open-meteo.com/v1/search?name=${city}`);
      const location = geoRes.data.results?.[0];

      if (!location) {
        setWeather(null);
        console.warn("Şehir bulunamadı:", city);
        return;
      }

      const { latitude, longitude, name } = location;

      const res = await axios.get(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&timezone=auto`
      );

      setWeather({
        temp: res.data.current.temperature_2m,
        city: name,
      });
    } catch (err) {
      console.error("Hava durumu alınamadı:", err.message);
    }
  };

  useEffect(() => {
    fetchExchangeRates();
    fetchGoldPrice();
    const interval = setInterval(() => {
      fetchExchangeRates();
      fetchGoldPrice();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
  if (exchange) {
    previousExchangeRef.current = exchange;
  }
}, [exchange]);

// 2. Altın değişiminden sonra önceki değeri sakla
useEffect(() => {
  if (gold) {
    previousGoldRef.current = gold;
  }
}, [gold]);

const [exchangeStatus, setExchangeStatus] = useState({
  usd: { color: "text-gray-500", icon: "⏺" },
  eur: { color: "text-gray-500", icon: "⏺" },
  gbp: { color: "text-gray-500", icon: "⏺" },
  chf: { color: "text-gray-500", icon: "⏺" },
});

  const fetchExchangeRates = async () => {
    try {
      const res = await api.get("/kurlar");
      const data = res.data;

      if (data.usd && data.eur && data.gbp && data.chf) {
        exchangeRef.current.previous = exchangeRef.current.current;
        exchangeRef.current.current = data;
        setExchange(data);

        const updatedStatus = {};
        if (exchangeRef.current.previous) {
          ["usd", "eur", "gbp", "chf"].forEach((curr) => {
            const prev = exchangeRef.current.previous[curr];
            const currVal = data[curr];

            if (currVal > prev) {
              updatedStatus[curr] = { color: "text-green-600", icon: "🔼" };
            } else if (currVal < prev) {
              updatedStatus[curr] = { color: "text-red-600", icon: "🔽" };
            } else {
              updatedStatus[curr] = exchangeStatus[curr];
            }
          });
          setExchangeStatus(updatedStatus);
        }
      }
    } catch (err) {
      //console.error("Döviz verisi alınamadı:", err.message);
    }
  };

const [goldStatus, setGoldStatus] = useState({
  gram: { color: "text-gray-500", icon: "⏺" },
  ceyrek: { color: "text-gray-500", icon: "⏺" },
  gumus: { color: "text-gray-500", icon: "⏺" },
});


  const fetchGoldPrice = async () => {
    try {
      const res = await api.get("/altin");
      const newGold = res.data;

      const prev = goldRef.current.current;
      goldRef.current.previous = prev;
      goldRef.current.current = newGold;

      if (prev) {
        const updatedStatus = {};
        ["gram", "ceyrek", "gumus"].forEach((type) => {
          if (newGold[type] > prev[type]) {
            updatedStatus[type] = { color: "text-green-600", icon: "🔼" };
          } else if (newGold[type] < prev[type]) {
            updatedStatus[type] = { color: "text-red-600", icon: "🔽" };
          } else {
            updatedStatus[type] = goldStatus[type];
          }
        });
        setGoldStatus(updatedStatus);
      }

      setGold(newGold);
    } catch (err) {
      console.error("Altın verisi alınamadı:", err.message);
    }
  };



const getColorClass = (curr) => {
  const prev = exchangeRef.current.previous;
  const current = exchangeRef.current.current;
  if (!prev || !current) return "text-black";

  if (current[curr] > prev[curr]) return "text-green-600";
  if (current[curr] < prev[curr]) return "text-red-600";
  return "text-gray-500";
};

const getIcon = (curr) => {
  const prev = exchangeRef.current.previous;
  const current = exchangeRef.current.current;
  if (!prev || !current) return "";
  if (current[curr] > prev[curr]) return "🔼";
  if (current[curr] < prev[curr]) return "🔽";
  return "⏺";
};


const goldRef = useRef({ current: null, previous: null });

const getGoldColor = (type) => {
  const prev = goldRef.current?.previous;
  const current = goldRef.current?.current;
  if (!prev || !current) return "text-black";

  if (current[type] > prev[type]) return "text-green-600";
  if (current[type] < prev[type]) return "text-red-600";
  return "text-gray-500";
};

const getGoldIcon = (type) => {
  const prev = goldRef.current?.previous;
  const current = goldRef.current?.current;
  if (!prev || !current) return "";
  if (current[type] > prev[type]) return "🔼";
  if (current[type] < prev[type]) return "🔽";
  return "⏺";
};

  const formatTradingViewSymbol = (rawSymbol) => {
    if (rawSymbol.includes(".IS") || rawSymbol.includes(".E")) {
      const cleaned = rawSymbol.split(".")[0];
      return `BIST:${cleaned}`;
    } else {
      return `NASDAQ:${rawSymbol}`;
    }
  };

  const loadTradingViewWidget = () => {
    const container = document.getElementById("tv-widget");
    if (!container) return;
    container.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.type = "text/javascript";
    script.async = true;

    const config = {
      symbols: [[symbol]],
      chartOnly: false,
      width: "100%",
      height: 400,
      locale: "tr",
      colorTheme: "light",
      isTransparent: false,
      autosize: true,
      showVolume: true,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "Trebuchet MS, sans-serif",
      fontSize: "12"
    };

    script.innerHTML = JSON.stringify(config);

    const wrapper = document.createElement("div");
    wrapper.appendChild(script);
    container.appendChild(wrapper);
  };


  const handleInputChange = async (e) => {
    const value = e.target.value.toUpperCase();
    setInput(value);

    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await axios.get(`https://finnhub.io/api/v1/search?q=${value}&token=${FINNHUB_API_KEY}`);
      const results = res.data.result.filter(item => item.symbol && item.description).slice(0, 15);
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (err) {
      console.error("Autocomplete hatası:", err.message);
    }
  };

  const handleSuggestionClick = (sym) => {
    setInput(sym);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const res = await axios.get(`https://finnhub.io/api/v1/search?q=${input}&token=${FINNHUB_API_KEY}`);
      const result = res.data.result;

      if (result.length === 0) {
        alert("Sembol bulunamadı.");
        return;
      }

      const match = result.find(item => item.displaySymbol === input || item.symbol === input);
      const selected = match || result[0];
      const formattedSymbol = formatTradingViewSymbol(selected.symbol);

      setSymbol(formattedSymbol);
      setInput("");
      setSuggestions([]);
      setShowSuggestions(false);
    } catch (err) {
      console.error("Finnhub arama hatası:", err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-8">
      <h2 className="text-3xl font-bold mb-6">📊 Anasayfa - Piyasa Bilgileri</h2>

      {/* Bilgi kutuları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {/* Hava */}

<div className="bg-white p-6 rounded shadow-md flex flex-col items-center text-center">
  <h3 className="text-xl font-semibold mb-4">🌦 Hava Durumu</h3>

  {/* Şehir ve sıcaklık gösterimi */}
  {weather === null ? (
    <p className="mb-4 text-red-500">Şehir bulunamadı</p>
  ) : weather ? (
    <>
      <p className="text-lg font-medium">{weather.city}</p>
      <p className="text-3xl font-bold mt-1 mb-4">{weather.temp}°C</p>
    </>
  ) : (
    <p className="mb-4">Yükleniyor...</p>
  )}

  {/* Şehir inputu ve butonu */}
<form
  onSubmit={(e) => {
    e.preventDefault();
    if (cityInput.trim()) {
      fetchWeather(cityInput.trim());
    }
  }}
  className="w-full"
>
  <select
    value={cityInput}
    onChange={(e) => setCityInput(e.target.value)}
    className="border border-gray-300 rounded px-3 py-2 w-full mb-2 text-sm"
  >
    {cities.map((city) => (
      <option key={city} value={city}>
        {city}
      </option>
    ))}
  </select>

  <button
    type="submit"
    className="bg-blue-600 text-white text-sm px-4 py-2 rounded w-full hover:bg-blue-700 transition"
  >
    Göster
  </button>
</form>
</div>


        {/* Döviz */}
<div className="bg-white p-6 rounded shadow-md flex flex-col items-center text-center">
  <h3 className="text-xl font-semibold mb-4">💱 Döviz Kurları</h3>
  {exchange && exchange.usd && exchange.eur && exchange.gbp && exchange.chf ? (
    <>
      <p className="text-lg">
        USD/TRY:{" "}
        <strong className={getColorClass("usd")}>
          {exchange.usd.toFixed(2)} ₺ {getIcon("usd")}
        </strong>
      </p>
      <p className="text-lg mt-2">
        EUR/TRY:{" "}
        <strong className={getColorClass("eur")}>
          {exchange.eur.toFixed(2)} ₺ {getIcon("eur")}
        </strong>
      </p>
      <p className="text-lg mt-2">
        GBP/TRY:{" "}
        <strong className={getColorClass("gbp")}>
          {exchange.gbp.toFixed(2)} ₺ {getIcon("gbp")}
        </strong>
      </p>
      <p className="text-lg mt-2">
        CHF/TRY:{" "}
        <strong className={getColorClass("chf")}>
          {exchange.chf.toFixed(2)} ₺ {getIcon("chf")}
        </strong>
      </p>
    </>
  ) : (
    <p className="text-gray-500">Yükleniyor...</p>
  )}
</div>

        {/* Altın */}
<div className="bg-white p-6 rounded shadow-md flex flex-col items-center text-center">
  <h3 className="text-xl font-semibold mb-4">🪙 Altın ve Gümüş</h3>
  {gold && gold.gram && gold.ceyrek && gold.gumus ? (
    <>
      <p className="text-lg">
        Gram Altın: <strong className={`${goldStatus.gram.color}`}>
          {gold.gram.toFixed(2)} ₺ {goldStatus.gram.icon}
        </strong>
      </p>
      <p className="text-lg mt-2">
        Çeyrek Altın: <strong className={`${goldStatus.ceyrek.color}`}>
          {gold.ceyrek.toFixed(2)} ₺ {goldStatus.ceyrek.icon}
        </strong>
      </p>
      <p className="text-lg mt-2">
        Gümüş (gram): <strong className={`${goldStatus.gumus.color}`}>
          {gold.gumus.toFixed(2)} ₺ {goldStatus.gumus.icon}
        </strong>
      </p>
    </>
  ) : (
    <p>Yükleniyor...</p>
  )}
</div>



      </div>
      {/* Arama */}
<form onSubmit={handleSubmit} className="mt-10 w-full max-w-md relative">
  <SymbolAutocomplete
    symbol={symbol}
    setSymbol={setSymbol}
    onSymbolSelect={setSymbol} // ✅ sadece seçim yapıldığında symbol güncellenir
  />
  <button
    type="submit"
    className="bg-blue-600 text-white p-2 mt-2 w-full"
    disabled={!symbol} // ✅ seçim yapılmadan buton pasif olur
  >
    Grafiği Göster
  </button>
</form>


      {/* Grafik */}
      <div className="w-full max-w-5xl mt-10">
        <div className="bg-white p-6 rounded shadow-md text-center">
          <h3 className="text-xl font-semibold mb-4">📈 {symbol.replace("BIST:", "").replace("NASDAQ:", "")} Hisse Grafiği</h3>
          <div id="tv-widget" />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
