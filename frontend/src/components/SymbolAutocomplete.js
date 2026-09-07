import React, { useState } from 'react';
import axios from 'axios';
import api from "../api";

const SymbolAutocomplete = ({ symbol, setSymbol, onSymbolSelect }) => {
  const [suggestions, setSuggestions] = useState([]);

const handleChange = async (e) => {
  const rawValue = e.target.value.toUpperCase();
  if (!/^[A-ZĞÜŞİÖÇ]*$/.test(rawValue)) return; // sadece harf

  setSymbol(rawValue); // sadece inputu güncelliyoruz, seçilmiş sayılmıyor

  if (rawValue.length >= 2) {
    try {
      const res = await axios.get('https://api.twelvedata.com/symbol_search', {
        params: { symbol: rawValue, apikey: process.env.REACT_APP_TWELVE_DATA_API_KEY },
      });
      setSuggestions((res.data?.data || []).slice(0, 5));
    } catch (err) {
      console.error("Autocomplete error:", err);
      setSuggestions([]);
    }
  } else {
    setSuggestions([]);
  }
};

const handleSelect = (val) => {
  setSymbol(val);         // inputu seçilen değere güncelle
  setSuggestions([]);     
  if (onSymbolSelect) {   // ✅ yalnızca seçimde üst bileşene bildir
    onSymbolSelect(val);
  }
};


  return (
    <div className="relative">
      <input
        type="text"
        value={symbol}
        onChange={handleChange}
        placeholder="Hisse (örn: ASELS, AAPL)"
        className="w-full border p-2 rounded"
      />
      {suggestions.length > 0 && (
        <ul className="absolute z-10 bg-white border w-full max-h-48 overflow-auto rounded shadow">
          {suggestions.map((item, idx) => (
            <li
              key={idx}
              className="p-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => handleSelect(item.symbol)}
            >
              {item.symbol} — {item.instrument_name} ({item.exchange})
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SymbolAutocomplete;
