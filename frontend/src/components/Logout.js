import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../api";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Token'ı sil
    localStorage.removeItem('jwt');

    // Login sayfasına yönlendir
    navigate('/login');
  }, [navigate]);

  return null; // Sayfa hiçbir şey göstermesin
};

export default Logout;
