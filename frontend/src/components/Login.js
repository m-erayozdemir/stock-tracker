import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import api from "../api";

const Login = ({ setToken }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false); // ✅ yeni state
  const navigate = useNavigate();

  const handleLogin = async () => {
    setMessage("");


    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      const token = response.data.token;
      localStorage.setItem('jwt', token);
      setToken(token);
      navigate('/');
    } catch (error) {
      const msg = error.response?.data?.message;

      if (msg === "Şifre hatalı.") {
        setMessage("Şifre hatalı. Lütfen tekrar deneyin.");
      } else if (msg === "Kullanıcı bulunamadı.") {
        setMessage("Kullanıcı bulunamadı.");
      } else if (msg === "Telefon doğrulaması gerekli.") {
        setMessage("Telefon doğrulaması tamamlanmamış.");
      } else if (msg === "CAPTCHA doğrulaması başarısız.") {
        setMessage("CAPTCHA doğrulaması başarısız.");
      } else {
        setMessage("Giriş başarısız. Lütfen tekrar deneyin.");
      }


    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/auth/google', {
        token: credentialResponse.credential,
      });

      const jwt = res.data.token;
      localStorage.setItem('jwt', jwt);
      setToken(jwt);
      navigate('/');
    } catch (error) {
      console.error('Google giriş hatası:', error);
      setMessage('Google ile giriş başarısız.');
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center mb-6">Giriş Yap</h2>

        {/* E-posta */}
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Şifre + Göster/Gizle */}
        <div className="relative w-full mb-4">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600"
          >
            {showPassword ? "Gizle" : "Göster"}
          </button>
        </div>

        {/* CAPTCHA */}
        <p className="my-4 text-sm text-gray-500">Bu sürümde SMS ve reCAPTCHA doğrulaması kapalıdır.</p>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Giriş Yap
        </button>

        <div className="my-4 border-t border-gray-300" />

        {/* Google ile Giriş */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setMessage('Google ile giriş başarısız.')}
          />
        </div>

        {message && (
          <p className="text-center text-red-500 mt-4 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
};

export default Login;
