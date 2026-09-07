import React, { useEffect, useState } from 'react';
import axios from 'axios';
import TradeForm from './TradeForm';
import api from "../api";

const Portfolio = ({ userId }) => {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(null);
  const [sellQuantities, setSellQuantities] = useState({});
  const [limitOrders, setLimitOrders] = useState([]);        // Bekleyen
  const [completedOrders, setCompletedOrders] = useState([]); // Gerçekleşen

  const fetchBalance = async () => {
    try {
      const res = await api.get('/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      });
      setBalance(res.data.balance);
    } catch (err) {
      console.error('Bakiye alınamadı:', err);
    }
  };

  const fetchPortfolio = async () => {
    if (!userId) return;
    try {
      const res = await api.get(`/trade/portfolio/${userId}`);
      const portfolioData = res.data;

      const enriched = await Promise.all(
        portfolioData.map(async (item) => {
          try {
            const priceRes = await axios.get('https://api.twelvedata.com/price', {
              params: {
                symbol: item.symbol,
                apikey: process.env.REACT_APP_TWELVE_DATA_API_KEY,
              },
            });

            const rawPrice = priceRes.data?.price;
            if (!rawPrice || isNaN(parseFloat(rawPrice))) {
              return { ...item, currentPrice: null, profitLoss: 'N/A' };
            }

            const currentPrice = parseFloat(rawPrice);
            const profitLoss = ((currentPrice - item.averageBuyPrice) * item.quantity).toFixed(2);

            return {
              ...item,
              currentPrice,
              profitLoss,
            };
          } catch (err) {
            return { ...item, currentPrice: null, profitLoss: 'N/A' };
          }
        })
      );

      setPortfolio(enriched);
      setLoading(false);
    } catch (err) {
      console.error('Portföy yüklenemedi:', err);
      setLoading(false);
    }
  };

  const fetchLimitOrders = async () => {
    try {
      const res = await api.get(`/trade/limit-orders/${userId}`);
      setLimitOrders(res.data);
    } catch (err) {
      console.error('Limit emirleri alınamadı:', err);
    }
  };

  const fetchCompletedOrders = async () => {
    try {
      const res = await api.get(`/trade/limit-orders/completed/${userId}`);
      setCompletedOrders(res.data);
    } catch (err) {
      console.error('Gerçekleşen emirler alınamadı:', err);
    }
  };

  const handleSell = async (item) => {
    const sellQuantity = parseInt(sellQuantities[item.symbol]) || 0;
    if (sellQuantity < 1 || sellQuantity > item.quantity) {
      alert(`Geçersiz miktar. En fazla ${item.quantity} adet satabilirsiniz.`);
      return;
    }

    try {
      const res = await api.post(`/trade/sell`, {
        userId,
        symbol: item.symbol,
        price: item.currentPrice,
        quantity: sellQuantity,
      });

      alert(res.data.message || 'Satış başarılı!');
      fetchPortfolio();
      fetchBalance();
      fetchLimitOrders();
      fetchCompletedOrders();
      setSellQuantities((prev) => ({ ...prev, [item.symbol]: '' }));
    } catch (err) {
      alert(err.response?.data?.message || 'Satış başarısız!');
    }
  };

  const handleDeleteLimitOrder = async (orderId) => {
    if (!window.confirm('Bu limit emrini iptal etmek istediğinizden emin misiniz?')) return;

    try {
      await api.delete(`/trade/limit-order/${orderId}`);
      fetchLimitOrders();
      fetchBalance(); // bakiye iadesi olabilir
    } catch (err) {
      alert(err.response?.data?.message || 'Silme işlemi başarısız.');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPortfolio();
      fetchBalance();
      fetchLimitOrders();
      fetchCompletedOrders();
    }
  }, [userId]);

  if (loading) return <div>⏳ Portföy yükleniyor...</div>;

  return (
    <div className="p-4">
      <TradeForm
        userId={userId}
        balance={balance}
        onTradeSuccess={() => {
          fetchPortfolio();
          fetchBalance();
          fetchLimitOrders();
          fetchCompletedOrders();
        }}
      />

      <h2 className="text-xl font-bold mb-4">📊 Portföy</h2>

      {balance !== null && (
        <p className="mb-2 text-gray-700">
          🪙 Mevcut Bakiye: <strong>${balance.toFixed(2)}</strong>
        </p>
      )}

      <table className="w-full border mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">Sembol</th>
            <th className="p-2 text-right">Miktar</th>
            <th className="p-2 text-right">Alış (Ort)</th>
            <th className="p-2 text-right">Güncel</th>
            <th className="p-2 text-right">Kâr / Zarar</th>
            <th className="p-2 text-center">Satış Miktarı</th>
            <th className="p-2 text-center">İşlem</th>
          </tr>
        </thead>
        <tbody>
          {portfolio.map((item) => (
            <tr key={item.symbol} className="border-t">
              <td className="p-2">{item.symbol}</td>
              <td className="p-2 text-right">{item.quantity}</td>
              <td className="p-2 text-right">${item.averageBuyPrice.toFixed(2)}</td>
              <td className="p-2 text-right">
                {item.currentPrice !== null ? `$${item.currentPrice.toFixed(2)}` : '—'}
              </td>
              <td
                className={`p-2 text-right font-semibold ${
                  parseFloat(item.profitLoss) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {item.profitLoss !== 'N/A' ? `$${item.profitLoss}` : '—'}
              </td>
              <td className="p-2 text-center">
                <input
                  type="number"
                  min="1"
                  max={item.quantity}
                  value={sellQuantities[item.symbol] || ''}
                  onChange={(e) =>
                    setSellQuantities((prev) => ({
                      ...prev,
                      [item.symbol]: e.target.value,
                    }))
                  }
                  className="w-20 border p-1 rounded text-right"
                />
              </td>
              <td className="p-2 text-center">
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
                  onClick={() => handleSell(item)}
                >
                  Sat
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Bekleyen Emirler */}
      <h2 className="text-xl font-bold mb-4">📌 Bekleyen Limit Emirler</h2>

      {limitOrders.length > 0 ? (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Sembol</th>
              <th className="p-2 text-right">Tür</th>
              <th className="p-2 text-right">Hedef Fiyat</th>
              <th className="p-2 text-right">Miktar</th>
              <th className="p-2 text-center">Tarih</th>
              <th className="p-2 text-center">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {limitOrders.map((order) => (
              <tr key={order._id} className="border-t">
                <td className="p-2">{order.symbol}</td>
                <td className="p-2 text-right">
                  {order.type === 'limit_buy' ? '🟢 Alım' : '🔴 Satım'}
                </td>
                <td className="p-2 text-right">${order.price.toFixed(2)}</td>
                <td className="p-2 text-right">{order.quantity}</td>
                <td className="p-2 text-center">
                  {new Date(order.createdAt).toLocaleString()}
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() => handleDeleteLimitOrder(order._id)}
                    className="text-xs bg-gray-300 hover:bg-gray-400 px-2 py-1 rounded"
                  >
                    İptal Et
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600">Aktif bir limit emriniz bulunmamaktadır.</p>
      )}

      {/* Gerçekleşen Emirler */}
      <h2 className="text-xl font-bold mt-10 mb-4">✅ Gerçekleşen Limit Emirler</h2>

      {completedOrders.length > 0 ? (
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Sembol</th>
              <th className="p-2 text-right">Tür</th>
              <th className="p-2 text-right">Fiyat</th>
              <th className="p-2 text-right">Miktar</th>
              <th className="p-2 text-center">İşlem Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {completedOrders.map((order) => (
              <tr key={order._id} className="border-t">
                <td className="p-2">{order.symbol}</td>
                <td className="p-2 text-right">
                  {order.type === 'limit_buy' ? '🟢 Alım' : '🔴 Satım'}
                </td>
                <td className="p-2 text-right">${order.price.toFixed(2)}</td>
                <td className="p-2 text-right">{order.quantity}</td>
                <td className="p-2 text-center">
                  {new Date(order.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-600">Gerçekleşmiş limit emriniz bulunmamaktadır.</p>
      )}
    </div>
  );
};

export default Portfolio;
