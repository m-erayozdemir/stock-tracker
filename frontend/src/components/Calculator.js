import React, { useState } from 'react'
import api from "../api";
import SymbolAutocomplete from './SymbolAutocomplete'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

const Calculator = () => {
  const [symbol, setSymbol] = useState('')
  const [mode, setMode] = useState('quantity')
  const [quantity, setQuantity] = useState('')
  const [investmentAmount, setInvestmentAmount] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [result, setResult] = useState(null)
  const [chartData, setChartData] = useState([])
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const [errorMsg, setErrorMsg] = useState("")

  const todayStr = new Date().toISOString().split("T")[0]

  const showError = (msg) => {
    setErrorMsg(msg)
    setTimeout(() => setErrorMsg(""), 2000)
  }

  const handleCalculate = async () => {
    if (!selectedSymbol) return showError("⚠️ Lütfen listeden bir hisse seçin.")
    if (!startDate || !endDate) return showError("⚠️ Lütfen başlangıç ve bitiş tarihini seçin.")
    if (startDate >= todayStr) return showError("⚠️ Başlangıç tarihi bugünden ileri olamaz.")
    if (endDate > todayStr) return showError("⚠️ Bitiş tarihi bugünden ileri olamaz.")
    if (endDate < startDate) return showError("⚠️ Bitiş tarihi başlangıçtan önce olamaz.")

    try {
      const res = await api.get(`/price-history`, {
        params: { symbol: selectedSymbol, start: startDate, end: endDate }
      })

      const prices = res.data.prices
      if (prices.length < 2) return showError("⚠️ Yetersiz veri.")

      const startPrice = prices[0].price
      const endPrice = prices[prices.length - 1].price
      const currency = selectedSymbol.endsWith(".IS") ? "₺" : "$"

      let shares = 0
      let gain = 0

      if (mode === "quantity") {
        if (!quantity || quantity <= 0) return showError("⚠️ Hisse adedi giriniz.")
        shares = parseFloat(quantity)
        gain = (endPrice - startPrice) * shares
      } else {
        if (!investmentAmount || investmentAmount <= 0) return showError("⚠️ Yatırım tutarı giriniz.")
        shares = parseFloat(investmentAmount) / startPrice
        gain = (endPrice - startPrice) * shares
      }

      setResult({
        startPrice,
        endPrice,
        gain: gain.toFixed(2),
        currency,
        shares: shares.toFixed(2),
        startValue: (startPrice * shares).toFixed(2),
        totalEndValue: (endPrice * shares).toFixed(2)
      })

      setChartData(prices)
    } catch (error) {
      console.error(error)
      showError("⚠️ Veri alınamadı.")
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📈 Kazanç / Zarar Hesaplayıcı</h1>

      <div className="space-y-4">
        <SymbolAutocomplete
          symbol={symbol}
          setSymbol={(val) => {
            setSymbol(val)
            setSelectedSymbol(null)
          }}
          onSymbolSelect={(val) => setSelectedSymbol(val)}
        />

        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="quantity"
              checked={mode === 'quantity'}
              onChange={() => setMode('quantity')}
            />
            Hisse adedi
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              value="investment"
              checked={mode === 'investment'}
              onChange={() => setMode('investment')}
            />
            Yatırılan miktar
          </label>
        </div>

        {mode === 'quantity' && (
          <input
            type="text"
            value={quantity}
            onChange={(e) => /^[0-9]*$/.test(e.target.value) && setQuantity(e.target.value)}
            placeholder="Hisse adedi (örn: 100)"
            className="w-full border p-2 rounded"
          />
        )}

        {mode === 'investment' && (
          <input
            type="text"
            value={investmentAmount}
            onChange={(e) => {
              const val = e.target.value.replace(',', '.')
              if (/^[0-9]*[.]?[0-9]*$/.test(val)) setInvestmentAmount(val)
            }}
            placeholder="Yatırılan miktar (örn: 10000)"
            className="w-full border p-2 rounded"
          />
        )}

        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          max={todayStr}
          className="w-full border p-2 rounded"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          min={startDate || ""}
          max={todayStr}
          disabled={!startDate}  // ✅ Başlangıç seçilmeden kapalı
          className="w-full border p-2 rounded"
        />

        <button
          onClick={handleCalculate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Hesapla
        </button>

        {errorMsg && (
          <p className="text-red-600 font-semibold flex items-center gap-2">
            ⚠️ {errorMsg}
          </p>
        )}
      </div>

      {result && (
        <div className={`mt-6 p-4 rounded shadow text-white font-semibold text-lg ${result.gain >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
          <p>📌 Başlangıç Fiyatı: {result.startPrice} {result.currency}</p>
          <p>🏁 Bitiş Fiyatı: {result.endPrice} {result.currency}</p>
          <p>🔄 Hisse Sayısı: {result.shares}</p>
          <p>📥 Başlangıç Değeri: {result.startValue} {result.currency}</p>
          <p>📊 Son Değer: {result.totalEndValue} {result.currency}</p>
          <p>💰 {result.gain >= 0 ? 'Kâr' : 'Zarar'}: {result.gain} {result.currency}</p>
        </div>
      )}

      {chartData.length > 0 && (
        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="price" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default Calculator
