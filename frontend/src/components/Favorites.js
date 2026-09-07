import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SymbolAutocomplete from './SymbolAutocomplete';
import api from "../api";

const Favorites = () => {
  const [favorites, setFavorites] = useState([]);
  const [prices, setPrices] = useState({});
  const [searchInput, setSearchInput] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [message, setMessage] = useState('');

  const cleanSymbolForTV = (sym) => {
    if (sym.includes('BIST:')) return `BIST-${sym.split(':')[1]}`;
    if (sym.includes('NASDAQ:')) return sym.split(':')[1];
    return sym;
  };

  const fetchFavorites = async () => {
    const token = localStorage.getItem('jwt');
    if (!token) return setMessage('🔐 Giriş yapmanız gerekiyor.');
    try {
      const res = await api.get('/favorites', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites(res.data);
    } catch (err) {
      console.error("Favoriler alınamadı:", err.response?.data || err.message);
      setMessage('Favoriler alınamadı.');
    }
  };

// Favorites.js içindeki fetchPrice fonksiyonunu bu versiyonla değiştirin

const fetchPrice = async (symbol) => {
  console.log("🔄 Fiyat alınıyor:", symbol);
  console.log("📡 İstek URL'i:", `${api.defaults.baseURL}/prices/${symbol}`);
  
  try {
    const res = await api.get(`/prices/${symbol}`);
    console.log("✅ Fiyat alındı:", symbol, "=>", res.data.price);
    return res.data.price;
  } catch (err) {
    console.error(`❌ Fiyat alınamadı (${symbol}):`, {
      message: err.message,
      status: err.response?.status,
      statusText: err.response?.statusText,
      data: err.response?.data,
      config: {
        url: err.config?.url,
        method: err.config?.method,
        baseURL: err.config?.baseURL
      }
    });
    return null;
  }
};

  const fetchAllPrices = async () => {
    const updated = {};
    for (const sym of favorites) {
      const price = await fetchPrice(sym);
      if (price !== null) updated[sym] = price;
    }
    setPrices(updated);
  };

const handleAddFavorite = async () => {
  const token = localStorage.getItem('jwt');
  if (!token) return setMessage('🔐 Giriş yapmanız gerekiyor.');

  // ✅ Sadece autocomplete'ten seçilen sembol eklenebilir
  if (!selectedSymbol) {
    return setMessage('⚠️ Lütfen listeden bir hisse seçin.');
  }

  const symbol = selectedSymbol.toUpperCase();

  if (favorites.includes(symbol)) {
    return setMessage('⭐ Bu hisse zaten favorilerde.');
  }

  try {
    await api.post(
      '/favorites',
      { symbol },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setFavorites((prev) => [...prev, symbol]);
    setSearchInput('');
    setSelectedSymbol(null);
    setMessage('✅ Favoriye eklendi');
  } catch (err) {
    console.error("Favori ekleme hatası:", err.response?.data || err.message);
    setMessage(err.response?.data?.message || '❌ Favori eklenemedi.');
  }
};


  const handleDelete = async (sym) => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    try {
      await api.delete(`/favorites/${encodeURIComponent(sym)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFavorites((prev) => prev.filter((f) => f !== sym));
    } catch (err) {
      console.error("Favori silme hatası:", err.message);
      setMessage('Favori silinemedi.');
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000); // 3 saniye sonra mesaj silinir
      return () => clearTimeout(timer); // component unmount olursa temizle
    }
  }, [message]);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchAllPrices();
      const interval = setInterval(fetchAllPrices, 60000);
      return () => clearInterval(interval);
    }
  }, [favorites]);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto bg-white shadow-md rounded p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">⭐ Favori Hisseler</h2>

        <div className="flex flex-col gap-2 mb-4 relative">
  <SymbolAutocomplete
    symbol={searchInput}
    setSymbol={(val) => {
      setSearchInput(val);      // sadece input değerini güncelle
      setSelectedSymbol(null);  // manuel yazınca seçimi sıfırla
    }}
    onSymbolSelect={(val) => setSelectedSymbol(val)} // sadece listeden seçince değer ata
  />
  <button
    onClick={handleAddFavorite}
    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
    disabled={!selectedSymbol} // ✅ Seçim yapılmadıkça buton pasif olur
  >
    Ekle
  </button>
  {!selectedSymbol && (
  <p className="text-sm text-gray-500">⚠️ Önce listeden bir hisse seçmelisiniz.</p>
)}

</div>


        {message && (
          <div className="mb-4 bg-red-100 text-red-700 p-3 rounded">{message}</div>
        )}

        <table className="w-full table-auto border-collapse mt-4">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="px-4 py-2">Sembol</th>
              <th className="px-4 py-2">Fiyat</th>
              <th className="px-4 py-2">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {favorites.map((sym) => (
              <tr key={sym} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium flex items-center gap-2">
                  {sym}
                  <a
                    href={`https://tr.tradingview.com/symbols/${cleanSymbolForTV(sym)}/`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    Grafik
                  </a>
                </td>
                <td className="px-4 py-3">
                  {prices[sym] !== undefined ? `${prices[sym]} ₺` : 'Yükleniyor...'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleDelete(sym)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
            {favorites.length === 0 && (
              <tr>
                <td colSpan="3" className="text-center py-4 text-gray-500">
                  Favori hisseleriniz burada görünecek.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Favorites;
