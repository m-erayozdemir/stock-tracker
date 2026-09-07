import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import InputMask from 'react-input-mask';
import api from "../api";

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordValid, setPasswordValid] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    special: false,
  });

  const navigate = useNavigate();

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    setPasswordValid({
      length: value.length >= 8,
      upper: /[A-Z]/.test(value),
      lower: /[a-z]/.test(value),
      number: /\d/.test(value),
      special: /[!@#$%^&*]/.test(value),
    });
  };

  const handleRegister = async (e) => {
    e.preventDefault();


    // Basit validasyonlar
    const nameRegex = /^[a-zA-ZğüşöçıİĞÜŞÖÇ\s]+$/;
    if (!nameRegex.test(name.trim())) {
      setMessage('Ad Soyad sadece harf ve boşluk içerebilir.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setMessage('Geçerli bir e-posta adresi giriniz.');
      return;
    }

    const digitsOnlyPhone = phoneNumber.replace(/\D/g, '');
    if (digitsOnlyPhone.length !== 10) {
      setMessage('Telefon numarası 10 haneli olmalıdır.');
      return;
    }

    // Şifre regex kontrolü
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setMessage(
        'Şifre en az 8 karakter olmalı, büyük/küçük harf, rakam ve özel karakter içermelidir.'
      );
      return;
    }

    try {
      const response = await api.post('/auth/register', {
        name,
        email,
        password,
        phoneNumber: digitsOnlyPhone,
      });

      if (response.data.token) {
        localStorage.setItem('jwt', response.data.token);
      }

      setMessage(
        response.data.message ||
          'Kayıt başarılı! Giriş yapabilirsiniz.'
      );

      navigate('/login');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Kayıt sırasında bir hata oluştu.');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-6 text-center">Kayıt Ol</h2>
      <form onSubmit={handleRegister}>
        <input
          type="text"
          placeholder="Ad Soyad"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />

        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded mb-4"
          required
        />

        <div className="w-full mb-4">
          <label
            htmlFor="phone"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Telefon Numarası
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-700 text-base font-medium">+90</span>
            </div>
            <InputMask
              mask="(999) 999 99 99"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="(___) ___ __ __"
              maskChar="_"
            >
              {(inputProps) => (
                <input
                  {...inputProps}
                  type="tel"
                  id="phone"
                  className="w-full pl-11 pr-3 py-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                  required
                />
              )}
            </InputMask>
          </div>
        </div>

        {/* Şifre alanı */}
<div className="relative w-full mb-2">
  <input
    type={showPassword ? "text" : "password"}
    placeholder="Şifre"
    value={password}
    onChange={handlePasswordChange}
    className="w-full p-3 border rounded pr-16"
    required
  />

  <button
    type="button"
    onClick={() => setShowPassword(!showPassword)}
    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600"
  >
    {showPassword ? "Gizle" : "Göster"}
  </button>
</div>


        {/* Şifre kuralları */}
        <div className="text-sm mb-4">
          <p className={passwordValid.length ? 'text-green-600' : 'text-red-600'}>
            • En az 8 karakter
          </p>
          <p className={passwordValid.upper ? 'text-green-600' : 'text-red-600'}>
            • En az 1 büyük harf
          </p>
          <p className={passwordValid.lower ? 'text-green-600' : 'text-red-600'}>
            • En az 1 küçük harf
          </p>
          <p className={passwordValid.number ? 'text-green-600' : 'text-red-600'}>
            • En az 1 rakam
          </p>
          <p className={passwordValid.special ? 'text-green-600' : 'text-red-600'}>
            • En az 1 özel karakter (!@#$%^&*)
          </p>
        </div>

        <p className="my-4 text-sm text-gray-500">Bu sürümde SMS ve reCAPTCHA doğrulaması kapalıdır.</p>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
        >
          Kayıt Ol
        </button>
      </form>

      {message && (
        <p className="mt-4 text-center text-sm text-gray-700">{message}</p>
      )}
    </div>
  );
};

export default Register;
