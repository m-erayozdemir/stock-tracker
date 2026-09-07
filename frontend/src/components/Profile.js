import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import api from "../api";

const Profile = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [activeTab, setActiveTab] = useState('info');
  const [error, setError] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);

  const { id: profileId } = useParams();
  const isOwnProfile = !profileId;
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) return navigate('/login');

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const headers = { Authorization: `Bearer ${token}` };

        // Önce kendi bilgilerimi al
        const meRes = await api.get('/users/me', { headers });
        setMe(meRes.data);

        if (isOwnProfile) {
          // Kendi profilimse aynı veriyi kullan
          setUserInfo(meRes.data);
        } else {
          // Başka birinin profiliyse onu getir
          const profileRes = await api.get(`/users/${profileId}`, { headers });
          setUserInfo(profileRes.data);
        }
      } catch (err) {
        console.error("❌ Profil yükleme hatası:", err);
        if (err.response?.status === 404) {
          setError('Kullanıcı bulunamadı.');
        } else {
          setError('Kullanıcı bilgisi alınamadı.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [profileId, isOwnProfile, navigate]);

  // Takip durumunu kontrol et
  const isFollowing = me?.following?.some((u) => {
    if (!u || !profileId) return false;
    // u bir object ise _id'sini al, string ise direkt karşılaştır
    const userId = typeof u === 'object' ? u._id : u;
    return userId === profileId;
  });

  const handleFollowToggle = async () => {
    if (!profileId || followLoading) return;
    
    const token = localStorage.getItem('jwt');
    const endpoint = isFollowing ? 'unfollow' : 'follow';

    try {
      setFollowLoading(true);
      const res = await api.post(
        `/users/${profileId}/${endpoint}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Backend'den dönen güncellenmiş verileri kullan
      if (res.data.targetUser && res.data.me) {
        setUserInfo(res.data.targetUser);
        setMe(res.data.me);
      }
    } catch (err) {
      console.error('❌ Takip işlem hatası:', err);
      alert(err.response?.data?.message || 'Takip işlemi başarısız.');
    } finally {
      setFollowLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordMsg('Lütfen tüm alanları doldurun.');
      return;
    }

    const token = localStorage.getItem('jwt');
    try {
      const res = await api.post(
        '/auth/change-password',
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPasswordMsg('✅ ' + res.data.message);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg('❌ ' + (err.response?.data?.message || 'Şifre güncellenemedi.'));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    navigate('/');
  };

  const handleMessageUser = () => {
    navigate(`/messages?to=${profileId}`);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p>Profil yükleniyor...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-md text-center">
        <div className="text-red-500 text-4xl mb-4">❌</div>
        <p className="text-red-500 text-lg">{error}</p>
        <button 
          onClick={() => navigate('/explore')} 
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Kullanıcıları Keşfet
        </button>
      </div>
    </div>
  );

  if (!userInfo) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-6">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        {isOwnProfile ? '👤 Profilim' : `👤 ${userInfo.name}`}
      </h2>

      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md space-y-6">
        {/* Tab Navigation - Sadece kendi profilinde */}
        {isOwnProfile && (
          <div className="flex justify-center gap-2">
            {[
              { key: 'info', label: 'Bilgiler', icon: '📋' },
              { key: 'password', label: 'Şifre', icon: '🔒' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  activeTab === tab.key 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Profil Bilgileri */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="text-center pb-4 border-b">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">👤</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">{userInfo.name}</h3>
              {userInfo.bio && <p className="text-gray-600 mt-2">{userInfo.bio}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{userInfo.following?.length || 0}</p>
                <p className="text-sm text-gray-600">Takip Edilen</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{userInfo.followers?.length || 0}</p>
                <p className="text-sm text-gray-600">Takipçi</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xl">📧</span>
                <span className="text-gray-700">{userInfo.email}</span>
              </div>
              
              {isOwnProfile && userInfo.phoneNumber && (
                <div className="flex items-center gap-3">
                  <span className="text-xl">📱</span>
                  <span className="text-gray-700">{userInfo.phoneNumber}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <span className="text-xl">✅</span>
                <span className={userInfo.isVerified ? 'text-green-600' : 'text-red-500'}>
                  {userInfo.isVerified ? 'Doğrulanmış Hesap' : 'Doğrulanmamış Hesap'}
                </span>
              </div>
            </div>

            {/* Favori Hisseler */}
            {userInfo.favoriteStocks?.length > 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <span>⭐</span> Favori Hisseler
                </h4>
                <div className="flex flex-wrap gap-2">
                  {userInfo.favoriteStocks.map((stock, i) => (
                    <span key={i} className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded text-sm">
                      {stock}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 space-y-3">
              {!isOwnProfile && (
                <div className="flex gap-3">
                  <button
                    onClick={handleFollowToggle}
                    disabled={followLoading}
                    className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 ${
                      isFollowing 
                        ? 'bg-red-500 hover:bg-red-600 text-white' 
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {followLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        İşleniyor...
                      </span>
                    ) : (
                      <>
                        {isFollowing ? '👋 Takibi Bırak' : '➕ Takip Et'}
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={handleMessageUser}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-200"
                  >
                    💬 Mesaj Gönder
                  </button>
                </div>
              )}

              {isOwnProfile && (
                <button 
                  onClick={handleLogout} 
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-all duration-200"
                >
                  🚪 Çıkış Yap
                </button>
              )}
            </div>
          </div>
        )}

        {/* Şifre Değiştirme */}
        {activeTab === 'password' && isOwnProfile && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center text-gray-800">🔒 Şifre Değiştir</h3>
            
            <input
              type="password"
              placeholder="Mevcut Şifre"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            
            <input
              type="password"
              placeholder="Yeni Şifre"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            
            <button
              onClick={handlePasswordChange}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold transition-all duration-200"
            >
              🔄 Şifreyi Güncelle
            </button>
            
            {passwordMsg && (
              <div className={`text-center text-sm p-3 rounded-lg ${
                passwordMsg.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {passwordMsg}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;