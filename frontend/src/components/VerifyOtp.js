import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import api from "../api";

const VerifyOtp = () => {
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const phoneNumber = location.state?.phoneNumber;
  const token = localStorage.getItem('jwt'); // 🔐 Token yerel depodan alınır

  const handleVerify = async (e) => {
    e.preventDefault();

    if (!otp) {
      setMessage('Kod gerekli.');
      return;
    }

    if (!phoneNumber || !token) {
      setMessage('Oturum bulunamadı. Lütfen tekrar giriş yapın.');
      return;
    }

    try {
      const response = await api.post(
        '/auth/verify-otp',
        { otp },
        {
          headers: {
            Authorization: `Bearer ${token}`, // ✅ Token gönderiliyor
          },
        }
      );

      setMessage(response.data.message || 'Doğrulama başarılı.');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || 'Doğrulama başarısız.');
    }
  };

  if (!phoneNumber) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
        <p className="text-red-600 text-center font-medium">
          Telefon numarası alınamadı. Lütfen kayıt işlemini tekrar yapın.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">SMS Kodunu Gir</h2>
      <form onSubmit={handleVerify}>
        <input
          type="text"
          placeholder="6 haneli kod"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />
        <button
          type="submit"
          className="w-full bg-green-600 text-white p-3 rounded hover:bg-green-700"
        >
          Doğrula
        </button>
      </form>
      {message && <p className="mt-4 text-center text-sm text-gray-700">{message}</p>}
    </div>
  );
};

export default VerifyOtp;
