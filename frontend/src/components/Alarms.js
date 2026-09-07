import React, { useEffect, useState } from 'react';
import axios from 'axios';
import SymbolAutocomplete from './SymbolAutocomplete';
import api from "../api";


const Alarms = () => {
  const [pendingAlarms, setPendingAlarms] = useState([]);
  const [sentAlarms, setSentAlarms] = useState([]);
  const [targetPrice, setTargetPrice] = useState('');
  const [direction, setDirection] = useState('above');
  const [symbol, setSymbol] = useState(''); // varsayılan sembol
  const [message, setMessage] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState(null);


  useEffect(() => {
    fetchAlarms();
  }, []);

  // Kullanıcının doğrulama durumunu kontrol et
  const checkUserVerification = async () => {
    const token = localStorage.getItem('jwt');
    if (!token) return false;

    try {
      const res = await api.get('/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = res.data;
      return user.phoneNumber && user.isVerified;
    } catch (err) {
      console.error("Kullanıcı kontrol hatası:", err.message);
      return false;
    }
  };

  const fetchAlarms = async () => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      setMessage('Giriş yapmalısınız.');
      return;
    }

    try {
      const res = await api.get('/alarms', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const pending = res.data.filter((alarm) => !alarm.sent);
      const sent = res.data.filter((alarm) => alarm.sent);

      setPendingAlarms(pending);
      setSentAlarms(sent);
    } catch (err) {
      console.error('Alarm verisi hatası:', err.response?.data || err.message);
      setMessage('Alarm verileri alınamadı.');
    }
  };

  const deleteAlarm = async (id) => {
    const token = localStorage.getItem('jwt');
    if (!token) return;

    try {
      await api.delete(`/alarms/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPendingAlarms((prev) => prev.filter((a) => a._id !== id));
      setSentAlarms((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      console.error('Silme hatası:', err.message);
    }
  };

const handleAlarmSubmit = async (e) => {
  e.preventDefault();

  const token = localStorage.getItem('jwt');
  if (!token) return alert('Giriş yapmalısınız.');

  if (!selectedSymbol) {
    return alert('⚠️ Lütfen listeden bir hisse seçin.');
  }

  if (!targetPrice) {
    return alert('Hedef fiyat giriniz.');
  }

  const isUserVerified = await checkUserVerification();
  if (!isUserVerified) {
    alert("Alarm kurabilmek için telefon numaranızı doğrulamalısınız.");
    window.location.href = "/profilim";
    return;
  }

  // ✅ Sadece seçilen sembol üzerinden işlem yapılır
  const rawSymbol = selectedSymbol.includes("BIST:")
    ? `${selectedSymbol.replace("BIST:", "")}.IS`
    : selectedSymbol.replace("NASDAQ:", "");

  try {
    const res = await api.post(
      '/alarms',
      {
        symbol: rawSymbol,
        targetPrice: parseFloat(targetPrice),
        direction: direction,
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setPendingAlarms((prev) => [res.data.alarm, ...prev]);
    setTargetPrice('');
    setSelectedSymbol(null); // ✅ işlem sonrası sıfırlansın
    setSymbol(''); // input temizlensin

    alert(
      `📌 ${rawSymbol} takip ediliyor! Hedef: ${targetPrice} ₺ (${direction === 'above' ? '↑' : '↓'})`
    );
  } catch (err) {
    console.error('Alarm kurulamadı:', err.message);
    alert('Alarm kurulamadı.');
  }
};


  const renderAlarm = (alarm) => (
    <li
      key={alarm._id}
      className="border rounded px-4 py-3 flex justify-between items-center bg-white shadow"
    >
      <span>
        <strong>{alarm.symbol}</strong> → {alarm.targetPrice} ₺
        <br />
        Yön: {alarm.direction === 'above' ? 'Yukarı (≥)' : 'Aşağı (≤)'}
        {alarm.sent && (
          <>
            <br />
            <small className="text-gray-500">
              Gönderildi: {new Date(alarm.sentAt).toLocaleString()}
            </small>
          </>
        )}
      </span>
      <button
        onClick={() => deleteAlarm(alarm._id)}
        className="text-sm bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
      >
        Sil
      </button>
    </li>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-center">🔔 Alarmlar</h2>

        {message && <p className="text-red-500 text-center">{message}</p>}

        {/* Alarm Kurma Formu */}
        <form onSubmit={handleAlarmSubmit} className="mb-8">
          <label className="block text-sm font-medium text-gray-700">Sembol (örn: BIST:ASELS veya NASDAQ:AAPL)</label>
          <SymbolAutocomplete
  symbol={symbol}
  setSymbol={(val) => {
    setSymbol(val);       // sadece inputu güncelle
    setSelectedSymbol(null); // manuel yazınca seçim sıfırlanır
  }}
  onSymbolSelect={(val) => setSelectedSymbol(val)} // sadece seçim yapılınca değer atanır
/>



<input
  type="text"
  value={targetPrice}
  onChange={(e) => {
    let val = e.target.value.replace(',', '.'); // virgülü noktaya çevir
    // Sadece sayı ve nokta kabul et
    if (/^[0-9]*[.]?[0-9]*$/.test(val)) {
      setTargetPrice(val);
    }
  }}
  placeholder="Hedef Fiyat (örn: 180.5)"
  className="border p-2 w-full mt-2"
/>

          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            className="border p-2 w-full mt-2"
          >
            <option value="above">Fiyat Yükselince (≥)</option>
            <option value="below">Fiyat Düşünce (≤)</option>
          </select>

          <button
            type="submit"
            className="p-2 mt-3 w-full bg-green-600 text-white rounded hover:bg-green-700"
          >
            Fiyat Alarmı Kur
          </button>
        </form>

        {/* Bekleyen Alarmlar */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">⏳ Bekleyen Alarmlar</h3>
          <ul className="space-y-3">
            {pendingAlarms.length > 0
              ? pendingAlarms.map(renderAlarm)
              : <p>Bekleyen alarm yok.</p>}
          </ul>
        </div>

        {/* Gönderilmiş Alarmlar */}
        <div>
          <h3 className="text-lg font-semibold mb-2">✅ Gönderilmiş Alarmlar</h3>
          <ul className="space-y-3">
            {sentAlarms.length > 0
              ? sentAlarms.map(renderAlarm)
              : <p>Gönderilmiş alarm yok.</p>}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Alarms;