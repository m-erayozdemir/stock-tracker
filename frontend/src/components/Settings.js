import React, { useEffect, useState } from 'react';
import axios from 'axios';
import api from "../api";

const Settings = () => {
  const [emailVisible, setEmailVisible] = useState(false);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const token = localStorage.getItem("jwt");
        const res = await api.get("/me", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setEmailVisible(res.data.privacy?.emailVisible || false);
        setPhoneVisible(res.data.privacy?.phoneVisible || false);
      } catch (err) {
        console.error("Gizlilik bilgisi alınamadı:", err);
      }
    };

    fetchPrivacy();
  }, []);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await api.post("/users/privacy", {
        emailVisible,
        phoneVisible
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage(res.data.message);
    } catch (err) {
      setMessage("Kaydedilemedi.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">⚙️ Gizlilik Ayarları</h2>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={emailVisible}
              onChange={() => setEmailVisible(!emailVisible)}
            />
            E-posta adresim diğer kullanıcılara görünsün
          </label>
        </div>

        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={phoneVisible}
              onChange={() => setPhoneVisible(!phoneVisible)}
            />
            Telefon numaram diğer kullanıcılara görünsün
          </label>
        </div>

        <button
          onClick={handleSave}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Kaydet
        </button>

        {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
      </div>
    </div>
  );
};

export default Settings;
