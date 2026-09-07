import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import Favorites from './components/Favorites';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import VerifyOtp from './components/VerifyOtp';
import Alarms from './components/Alarms';
import Profile from './components/Profile';
import Calculator from './components/Calculator';
import Portfolio from './components/Portfolio';
import Messages from './components/Messages';
import ExploreUsers from './components/ExploreUsers';
import axios from 'axios';
import socket from './socket';
import api from "./api";

axios.defaults.baseURL = 'http://localhost:5001';

function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt'));
  const [user, setUser] = useState(null);
  const [hasUnread, setHasUnread] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const location = useLocation();
  const [hasNotification, setHasNotification] = useState(false);


  // 🔄 LocalStorage değişimini takip et
  useEffect(() => {
    const syncToken = () => {
      const newToken = localStorage.getItem('jwt');
      setToken(newToken);
    };
    
    syncToken();
    window.addEventListener('storage', syncToken);
    return () => window.removeEventListener('storage', syncToken);
  }, []);

  // 🧠 Token varsa kullanıcıyı getir
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        setIsLoadingUser(true);
        try {
          const res = await api.get('/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(res.data);
        } catch (err) {
          console.error('Kullanıcı alınamadı:', err);
          // Token geçersizse temizle
          if (err.response?.status === 401) {
            localStorage.removeItem('jwt');
            setToken(null);
          }
        } finally {
          setIsLoadingUser(false);
        }
      } else {
        setUser(null);
        setIsLoadingUser(false);
      }
    };

    fetchUser();
  }, [token]);

  // ✅ Kullanıcı yüklendikten sonra socket bağlantısı
  useEffect(() => {
    if (user?._id) {
      const emitUser = () => {
        if (socket.connected) {
          socket.emit('addUser', user._id);
        }
      };

      socket.on('connect', emitUser);
      emitUser(); // İlk bağlantı için

      return () => {
        socket.off('connect', emitUser);
      };
    }
  }, [user]);

  // 🛎 Yeni mesaj bildirimi
  useEffect(() => {
    const handleIncomingMessage = (data) => {
      // Mesaj sayfasında değilsek bildirim göster
      if (location.pathname !== '/messages') {
        setHasUnread(true);
      }
    };

    socket.on('receiveMessage', handleIncomingMessage);
    return () => socket.off('receiveMessage', handleIncomingMessage);
  }, [location.pathname]);

  // 📭 Mesaj sayfasına girince bildirimi sıfırla
  useEffect(() => {
    if (location.pathname === '/messages') {
      setHasUnread(false);
    }
  }, [location.pathname]);

  useEffect(() => {
  if (Notification.permission === "default") {
    Notification.requestPermission();
  }
}, []);


useEffect(() => {
  const handleIncomingNotification = (data) => {
    console.log("🔔 Yeni bildirim:", data);
    setHasNotification(true);
    document.title = "🔴 Piyasa Takip"; // Sekme başlığı değişiyor

    // ✅ Tarayıcı bildirimi
    if (Notification.permission === "granted" && document.hidden) {
      new Notification("📩 Yeni Bildirim", {
        body: data.message || "Yeni bir bildiriminiz var!",
        icon: "/favicon.ico", // isteğe bağlı
      });
    }
  };

  socket.on("notification", handleIncomingNotification);

  return () => socket.off("notification", handleIncomingNotification);
}, []);


useEffect(() => {
  if (location.pathname === "/notifications") {
    setHasNotification(false);
    document.title = "Piyasa Takip"; // Eski haline döner
  }
}, [location.pathname]);


  // 🔐 Çıkış işlemi
  const handleLogout = () => {
    localStorage.removeItem('jwt');
    setToken(null);
    setUser(null);
    setHasUnread(false);
    
    // Socket bağlantısını temizle
    if (socket.connected) {
      socket.disconnect();
    }
    
    window.location.href = '/';
  };

  return (
    <>
      <nav className="p-4 bg-gray-100 flex gap-4 justify-center text-sm relative">
        <Link to="/" className="hover:text-blue-600 transition-colors">
          Ana Sayfa
        </Link>

        {token ? (
          <>
            <Link to="/favorites" className="hover:text-blue-600 transition-colors">
              Favorilerim
            </Link>
            <Link to="/alarms" className="hover:text-blue-600 transition-colors">
              Alarmlar
            </Link>
            <Link to="/calculator" className="hover:text-blue-600 transition-colors">
              Hesaplayıcı
            </Link>
            <Link to="/portfolio" className="hover:text-blue-600 transition-colors">
              Alım-Satım
            </Link>

<Link to="/messages" className="relative hover:text-blue-600 transition-colors flex items-center gap-1">
  <span>Mesajlar</span>
  {hasUnread && (
    <span className="text-red-500 text-sm ml-1">●</span> // ufak kırmızı nokta
  )}
</Link>

            <Link to="/explore" className="hover:text-blue-600 transition-colors">
              Keşfet
            </Link>
            <Link to="/profilim" className="hover:text-blue-600 transition-colors">
              Profilim
            </Link>
            <button 
              onClick={handleLogout} 
              className="text-red-500 hover:text-red-700 hover:underline transition-colors"
            >
              Çıkış Yap
              {user?.name 
                ? ` (${user.name})` 
                : user?.phoneNumber 
                ? ` (${user.phoneNumber})` 
                : isLoadingUser 
                ? ' (Yükleniyor...)' 
                : ''
              }
            </button>
          </>
        ) : (
          <>
            <Link to="/register" className="hover:text-blue-600 transition-colors">
              Kayıt Ol
            </Link>
            <Link to="/login" className="hover:text-blue-600 transition-colors">
              Giriş Yap
            </Link>
          </>
        )}
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/explore" element={<ExploreUsers />} />
        
        {/* Protected Routes */}
        <Route 
          path="/favorites" 
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/alarms" 
          element={
            <ProtectedRoute>
              <Alarms />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/calculator" 
          element={
            <ProtectedRoute>
              <Calculator />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profilim" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile/:id" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/portfolio"
          element={
            <ProtectedRoute>
              {user ? (
                <Portfolio userId={user._id} />
              ) : isLoadingUser ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-lg">⏳ Kullanıcı yükleniyor...</div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <div className="text-lg text-red-500">❌ Kullanıcı bilgisi alınamadı</div>
                </div>
              )}
            </ProtectedRoute>
          }
        />
        <Route
          path="/messages"
          element={
            <ProtectedRoute>
              {user ? (
                <Messages userId={user._id} />
              ) : isLoadingUser ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-lg">⏳ Kullanıcı yükleniyor...</div>
                </div>
              ) : (
                <div className="flex justify-center items-center h-64">
                  <div className="text-lg text-red-500">❌ Kullanıcı bilgisi alınamadı</div>
                </div>
              )}
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

export default function WrappedApp() {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}