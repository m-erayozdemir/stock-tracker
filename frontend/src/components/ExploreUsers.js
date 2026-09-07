import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from "../api"; // ✅ axios yerine api instance kullanıyoruz

function ExploreUsers() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const navigate = useNavigate();

  // 🔹 Token kontrolü
  useEffect(() => {
    const token = localStorage.getItem('jwt');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // 🔹 Mevcut kullanıcı bilgisini çek
useEffect(() => {
  const fetchCurrentUser = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCurrentUser(res.data);

      const followingSet = new Set();
      res.data.following?.forEach(user => {
        const userId = typeof user === 'object' ? user._id : user;
        followingSet.add(userId);
      });
      setFollowingUsers(followingSet);
    } catch (err) {
      console.error('❌ Kullanıcı bilgisi alınamadı:', err);
      navigate('/login');
    }
  };
  fetchCurrentUser();
}, [navigate]);


  // 🔹 Kullanıcı arama
  const fetchUsers = async (searchTerm = search) => {
    if (!currentUser) return;

    try {
      setSearchLoading(true);
      const res = await api.get(`/users?search=${searchTerm}`); // ✅ api ile çağır

      const filteredUsers = res.data.filter(
        user => user && user._id && user._id !== currentUser._id
      );
      setUsers(filteredUsers);
    } catch (err) {
      console.error('🔴 Kullanıcılar alınamadı:', err);
      setUsers([]);
    } finally {
      setSearchLoading(false);
      setLoading(false);
    }
  };

  // 🔹 Search debounce
  useEffect(() => {
    if (!currentUser) return;

    const debounceTimer = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search, currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchUsers('');
    }
  }, [currentUser]);

  // 🔹 Takip / Takipten çık
  const handleFollowToggle = async (userId, isFollowing) => {
    try {
      const endpoint = isFollowing ? 'unfollow' : 'follow';
      const res = await api.post(`/users/${userId}/${endpoint}`); // ✅ api ile çağır

      if (res.data.me?.following) {
        const newFollowingSet = new Set();
        res.data.me.following.forEach(user => {
          const id = typeof user === 'object' ? user._id : user;
          newFollowingSet.add(id);
        });
        setFollowingUsers(newFollowingSet);
        setCurrentUser(res.data.me);
      }
    } catch (err) {
      console.error('❌ Takip işlemi başarısız:', err);
      alert(err.response?.data?.message || 'Takip işlemi başarısız.');
    }
  };

  const handleMessageUser = (userId) => {
    navigate(`/messages?to=${userId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Kullanıcılar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">🔍 Kullanıcıları Keşfet</h2>
          <p className="text-gray-600">Yeni insanlarla tanışın ve takip edin</p>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="İsim ile kullanıcı ara..."
              className="w-full p-4 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {searchLoading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              ) : (
                <span className="text-gray-400 text-xl">🔍</span>
              )}
            </div>
          </div>
          
          {search && (
            <div className="mt-2 text-sm text-gray-600">
              "<strong>{search}</strong>" için {users.length} sonuç bulundu
            </div>
          )}
        </div>

        {/* Users Grid */}
        {users.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              {search ? 'Kullanıcı bulunamadı' : 'Henüz kimse yok'}
            </h3>
            <p className="text-gray-600">
              {search 
                ? 'Arama kriterlerinizi değiştirip tekrar deneyin'
                : 'Şu anda sistemde başka kullanıcı bulunmuyor'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {users.map((user) => {
              const isFollowing = followingUsers.has(user._id);
              
              return (
                <div key={user._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                  <div className="p-6">
                    {/* User Avatar & Name */}
                    <div className="text-center mb-4">
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">👤</span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 truncate">
                        {user.name || user.phoneNumber || 'Bilinmeyen Kullanıcı'}
                      </h3>
                      {user.phoneNumber && user.name && (
                        <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                      )}
                    </div>

                    {/* User Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center bg-blue-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-blue-600">
                          {user.following?.length || 0}
                        </p>
                        <p className="text-xs text-gray-600">Takip</p>
                      </div>
                      <div className="text-center bg-green-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-green-600">
                          {user.followers?.length || 0}
                        </p>
                        <p className="text-xs text-gray-600">Takipçi</p>
                      </div>
                    </div>

                    {/* Favorite Stocks */}
                    {user.favoriteStocks && user.favoriteStocks.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-600 mb-2">⭐ Favori Hisseler:</p>
                        <div className="flex flex-wrap gap-1">
                          {user.favoriteStocks.slice(0, 3).map((stock, i) => (
                            <span key={i} className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                              {stock}
                            </span>
                          ))}
                          {user.favoriteStocks.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{user.favoriteStocks.length - 3} daha
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Link
                        to={`/profile/${user._id}`}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors duration-200 text-center block"
                      >
                        👤 Profili Görüntüle
                      </Link>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleFollowToggle(user._id, isFollowing)}
                          className={`py-2 px-3 rounded-lg font-medium transition-colors duration-200 text-sm ${
                            isFollowing
                              ? 'bg-red-500 hover:bg-red-600 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {isFollowing ? '👋 Bırak' : '➕ Takip'}
                        </button>
                        
                        <button
                          onClick={() => handleMessageUser(user._id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-lg font-medium transition-colors duration-200 text-sm"
                        >
                          💬 Mesaj
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Statistics */}
        {users.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-4">
            <div className="text-center text-sm text-gray-600">
              <p>
                Toplam <strong>{users.length}</strong> kullanıcı bulundu. 
                Bunlardan <strong>{Array.from(followingUsers).length}</strong> tanesini takip ediyorsunuz.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExploreUsers;