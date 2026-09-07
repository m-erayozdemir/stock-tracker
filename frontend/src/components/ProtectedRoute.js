import React from 'react';
import { Navigate } from 'react-router-dom';
import api from "../api";

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('jwt');

  if (!token) {
    // Token yoksa login sayfasına yönlendir
    return <Navigate to="/login" />;
  }

  // Token varsa child bileşeni (örneğin <Favorites />) göster
  return children;
};

export default ProtectedRoute;
