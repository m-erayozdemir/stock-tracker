import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SymbolAutocomplete from './SymbolAutocomplete';
import api from "../api";

const TradeForm = ({ userId, balance, onTradeSuccess }) => {
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState('buy');
  const [message, setMessage] = useState('');
  const [isLimit, setIsLimit] = useState(false); // Limit emri için kontrol
  const [selectedSymbol, setSelectedSymbol] = useState(null);


  // ✅ Symbol veya isLimit değiştiğinde uygun fiyatı ayarla
  useEffect(() => {
    const fetchPrice = async () => {
      if (symbol && !isLimit) {
        try {
          const res = await axios.get('https://api.twelvedata.com/price', {
            params: {
              symbol,
              apikey: process.env.REACT_APP_TWELVE_DATA_API_KEY,
            },
          });
          setPrice(res.data?.price || '');
        } catch (err) {
          console.error('Fiyat alınamadı:', err);
          setPrice('');
        }
      } else if (isLimit) {
        setPrice('');
      }
    };

    fetchPrice();
  }, [symbol, isLimit]);

const handleSubmit = async (e) => {
  e.preventDefault();
  setMessage('');

  if (!selectedSymbol) {
    setMessage('⚠️ Lütfen listeden bir hisse seçin.');
    return;
  }

  const parsedPrice = parseFloat(price.toString().replace(',', '.'));
  const parsedQuantity = parseInt(quantity);

  if (isNaN(parsedPrice) || isNaN(parsedQuantity) || parsedQuantity < 1) {
    setMessage('Tüm alanlar gereklidir.');
    return;
  }

  const tradeType = isLimit ? `limit_${type}` : type;

  try {
    const res = await api.post(`/trade/${tradeType}`, {
      userId,
      symbol: selectedSymbol.toUpperCase(), // ✅ sadece seçilen sembol
      price: parsedPrice,
      quantity: parsedQuantity,
    });

    setMessage(res.data.message || 'İşlem başarılı.');
    setSymbol('');
    setSelectedSymbol(null); // ✅ seçim sıfırlansın
    setPrice('');
    setQuantity('');
    setIsLimit(false);

    if (onTradeSuccess) onTradeSuccess();
  } catch (err) {
    setMessage(err.response?.data?.message || 'İşlem hatası');
  }
};


  const parsedPrice = parseFloat((price || '').toString().replace(',', '.'));
  const parsedQuantity = parseInt(quantity);
  const total =
    !isNaN(parsedPrice) && !isNaN(parsedQuantity)
      ? parsedPrice * parsedQuantity
      : 0;

  return (
    <div className="p-4 border rounded-xl shadow mb-6">
      <h2 className="text-xl font-bold mb-2">💹 Al / Sat İşlemi</h2>
      <p className="mb-2">
        🪙 Mevcut Bakiye: <strong>${(balance || 0).toFixed(2)}</strong>
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
<SymbolAutocomplete
  symbol={symbol}
  setSymbol={(val) => {
    setSymbol(val);          // sadece inputu güncelle
    setSelectedSymbol(null); // manuel yazınca seçimi sıfırla
  }}
  onSymbolSelect={(val) => setSelectedSymbol(val)} // sadece seçim yapılınca atanır
/>


<input
  type="text"
  value={quantity}
  onChange={(e) => {
    const val = e.target.value;
    if (/^[0-9]*$/.test(val)) {
      setQuantity(val);
    }
  }}
  placeholder="Miktar"
  className="w-full border p-2 rounded"
/>


        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full border p-2 rounded"
        >
          <option value="buy">📥 AL</option>
          <option value="sell">📤 SAT</option>
        </select>

        <label className="flex items-center space-x-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isLimit}
            onChange={(e) => setIsLimit(e.target.checked)}
          />
          <span>Limit Emir (Fiyat gir)</span>
        </label>

<input
  type="text"
  value={price}
  onChange={(e) => {
    if (!isLimit) return; // ✅ Limit seçili değilse değişikliğe izin verme

    let val = e.target.value.replace(',', '.'); // Virgülü noktaya çevir
    if (/^[0-9]*[.]?[0-9]*$/.test(val)) {
      setPrice(val);
    }
  }}
  placeholder="Fiyat"
  className={`w-full border p-2 rounded ${
    !isLimit ? 'bg-gray-100 text-gray-500' : ''
  }`}
  readOnly={!isLimit}
/>


        {!isNaN(total) && total > 0 && (
          <p className="text-left text-sm text-gray-600">
            💰 Toplam Tutar: <strong>${total.toFixed(2)}</strong>
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          İşlemi Gönder
        </button>
      </form>

      {message && (
        <div className="mt-3 text-sm text-gray-800">{message}</div>
      )}
    </div>
  );
};

export default TradeForm;
