import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import socket from "../socket";
import { Trash2, MoreVertical, Check, CheckCheck, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from "../api";
import EmojiPicker from "emoji-picker-react";

const Messages = React.memo(() => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const navigate = useNavigate();
  const messagesContainerRef = useRef(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const messageInputRef = useRef(null);


  const formatNameWithSuffix = useCallback((name) => {
    if (!name) return "";
    
    const vowels = ['a', 'e', 'ı', 'i', 'o', 'ö', 'u', 'ü'];
    const backVowels = ['a', 'ı', 'o', 'u'];
    const frontVowels = ['e', 'i', 'ö', 'ü'];
    
    // Son harfi al
    const lastChar = name.charAt(name.length - 1).toLowerCase();
    
    if (vowels.includes(lastChar)) {
      // Son harf sesli ise
      return backVowels.includes(lastChar)
        ? `${name}'ya mesaj yazın...`
        : `${name}'ye mesaj yazın...`;
    } else {
      // Son harf sessiz ise, son sesli harfi bul
      const nameChars = [...name.toLowerCase()];
      let lastVowel = null;
      
      for (let i = nameChars.length - 1; i >= 0; i--) {
        if (vowels.includes(nameChars[i])) {
          lastVowel = nameChars[i];
          break;
        }
      }
      
      if (lastVowel && backVowels.includes(lastVowel)) {
        return `${name}'a mesaj yazın...`;
      } else {
        return `${name}'e mesaj yazın...`;
      }
    }
  }, []);

  // Token'ı localStorage'dan al
  const getToken = useCallback(() => {
    return localStorage.getItem('jwt');
  }, []);

  // Scroll to bottom fonksiyonu
  const scrollToBottom = useCallback((behavior = 'smooth') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior,
        block: 'end'
      });
    }
  }, []);

  // Kullanıcının scroll pozisyonunu kontrol et
  const isUserNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const threshold = 100;
    return scrollHeight - scrollTop - clientHeight < threshold;
  }, []);

  // Tüm menüleri kapat
  const closeAllMenus = useCallback(() => {
    setShowDeleteMenu(null);
    setShowEmojiPicker(false);
  }, []);

  // ESC tuşu ve dış tıklama ile menüleri kapat
  useEffect(() => {
    const handleEscKey = (e) => e.key === 'Escape' && closeAllMenus();
    const handleClickOutside = (e) => {
      if (!e.target.closest('.delete-menu-container') && !e.target.closest('.delete-menu-trigger'))
        setShowDeleteMenu(null);
      
      // Emoji picker için özel kontrol
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(e.target) && !e.target.closest('.emoji-picker-trigger')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [closeAllMenus, showEmojiPicker]);

  // Mevcut kullanıcı bilgilerini al
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        const res = await api.get('/users/me');
        setCurrentUser(res.data);

        // Socket bağlantısını kur
        if (socket.connected) {
          socket.emit('addUser', res.data._id);
        } else {
          socket.on('connect', () => socket.emit('addUser', res.data._id));
        }
      } catch (err) {
        console.error('❌ Kullanıcı alınamadı:', err);
        if (err.response?.status === 401) {
          navigate('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, [getToken, navigate]);

  // Tek mesajı okundu olarak işaretle
  const markMessageAsRead = useCallback(async (messageId) => {
    if (!currentUser) return;

    try {
      await api.put(`/messages/${messageId}/read`);
      socket.emit('messageRead', {
        messageId,
        readBy: currentUser._id
      });

      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, read: true, readAt: new Date() } : msg
      ));
    } catch (error) {
      console.error('❌ Mesaj okundu olarak işaretlenemedi:', error);
    }
  }, [currentUser]);

  const handleMessageDeleted = useCallback(({ messageId, deletedBy, deleteType, receiverId }) => {
  if (deleteType === 'forEveryone') {
    setMessages(prev =>
      prev.map(msg =>
        msg._id === messageId ? { ...msg, content: "Bu mesaj silindi", deleted: true } : msg
      )
    );

    setUsers(prevUsers =>
      prevUsers.map(user => {
        if (user.lastMessage && user.lastMessage._id === messageId) {
          return {
            ...user,
            lastMessage: {
              ...user.lastMessage,
              content: "Bu mesaj silindi"
            }
          };
        }
        return user;
      })
    );
  }
  setShowDeleteMenu(null);
}, []);

  // Socket event listeners
  useEffect(() => {
    if (!currentUser) return;

    const handleOnlineUsers = (userIds) => {
      console.log('👥 Online kullanıcılar güncellendi:', userIds);
      setOnlineUserIds(userIds);
    };

    const handleReceiveMessage = (message) => {
      console.log('📨 Yeni mesaj alındı:', message);
      const messageSenderId = message.senderId._id || message.senderId;

      // Sadece aktif sohbetteki mesajları göster
      if (selectedUser && messageSenderId === selectedUser._id) {
        const wasNearBottom = isUserNearBottom();
        setMessages(prev => [...prev, message]);
        if (wasNearBottom) {
          setShouldScrollToBottom(true);
        }
        // Mesajı otomatik okundu olarak işaretle
        markMessageAsRead(message._id);
      }

      // Kullanıcı listesini güncelle
      setUsers(prev => prev.map(user => {
        const messageReceiverId = message.receiverId._id || message.receiverId;
        if (user._id === messageSenderId || user._id === messageReceiverId) {
          const isFromCurrentUser = messageSenderId === currentUser._id;
          const shouldIncrementUnread = !isFromCurrentUser && (!selectedUser || selectedUser._id !== messageSenderId);
          return {
            ...user,
            lastMessage: {
              content: message.content,
              timestamp: message.timestamp,
              isOwn: isFromCurrentUser,
              _id: message._id
            },
            unreadCount: shouldIncrementUnread ? (user.unreadCount || 0) + 1 : user.unreadCount
          };
        }
        return user;
      }));
    };

    const handleMessageRead = ({ messageId, readBy }) => {
      console.log('✅ Mesaj okundu bildirimi:', { messageId, readBy });
      if (readBy !== currentUser._id) {
        setMessages(prev => prev.map(msg =>
          msg._id === messageId ? { ...msg, read: true, readAt: new Date() } : msg
        ));
      }
    };

    const handleUserTyping = ({ userId, isTyping }) => {
      console.log('⌨️ Typing durumu:', { userId, isTyping });
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(userId);
          if (selectedUser && userId === selectedUser._id && isUserNearBottom()) {
            setShouldScrollToBottom(true);
          }
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    // Socket event listeners
    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageRead', handleMessageRead);
    socket.on('userTyping', handleUserTyping);
    socket.on('messageDeleted', handleMessageDeleted);

    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageRead', handleMessageRead);
      socket.off('userTyping', handleUserTyping);
      socket.off('messageDeleted', handleMessageDeleted);
    };
  }, [currentUser, selectedUser, isUserNearBottom, markMessageAsRead, handleMessageDeleted]);

  // Mesajlaşma kullanıcılarını al
  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser) return;

      try {
        console.log("🔄 Kullanıcılar getiriliyor...");
        const response = await api.get('/messages/conversation-users');
        const usersData = response.data;
        console.log('👥 Kullanıcılar yüklendi:', usersData);
        setUsers(usersData);
      } catch (error) {
        console.error('❌ Kullanıcılar alınamadı:', error);
      }
    };

    fetchUsers();
  }, [currentUser]);

  // Mesajları getir
  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedUser || !currentUser) return;

      try {
        console.log("💬 Mesajlar getiriliyor:", selectedUser._id);
        const response = await api.get(`/messages/${selectedUser._id}`);
        const messagesData = response.data;
        console.log("💬 Mesajlar yüklendi:", messagesData);
        setMessages(messagesData);

        // Mesajları aldıktan sonra scroll'u en alta kaydır
        setTimeout(() => {
          scrollToBottom('auto');
        }, 100);

        // Okunmamış mesajları işaretle
        const unreadMessages = messagesData.filter(
          (msg) => {
            const receiverId = msg.receiverId._id || msg.receiverId;
            return !msg.read && receiverId === currentUser._id;
          }
        );

        if (unreadMessages.length > 0) {
          unreadMessages.forEach(msg => {
            markMessageAsRead(msg._id);
          });
        }
      } catch (error) {
        console.error("❌ Mesajlar alınamadı:", error);
      }
    };

    fetchMessages();
  }, [selectedUser, currentUser, scrollToBottom]);

  // Scroll trigger effect - mesaj eklendiğinde scroll
  useEffect(() => {
    if (shouldScrollToBottom) {
      setTimeout(() => {
        scrollToBottom('smooth');
        setShouldScrollToBottom(false);
      }, 50);
    }
  }, [messages, shouldScrollToBottom, scrollToBottom]);

  // Kullanıcı seçildiğinde okunmamış sayıyı sıfırla
  useEffect(() => {
    if (selectedUser) {
      setUsers(prev => prev.map(user =>
        user._id === selectedUser._id
          ? { ...user, unreadCount: 0 }
          : user
      ));
    }
  }, [selectedUser]);

  // Typing eventi gönder
  const handleTyping = useCallback(() => {
    if (selectedUser && currentUser) {
      socket.emit('typing', {
        senderId: currentUser._id,
        receiverId: selectedUser._id,
        isTyping: true
      });

      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', {
          senderId: currentUser._id,
          receiverId: selectedUser._id,
          isTyping: false
        });
      }, 1500);
    }
  }, [selectedUser, currentUser]);

  // Mesaj gönder
  const sendMessage = useCallback(async () => {
    if (!newMsg.trim() || !selectedUser || !currentUser || sendingMessage) return;

    setSendingMessage(true);
    const messageContent = newMsg.trim();
    setNewMsg(''); // Input'u hemen temizle

    try {
      const response = await api.post('/messages', {
        receiverId: selectedUser._id,
        content: messageContent
      });

      const newMessage = response.data;
      console.log('📤 Mesaj gönderildi:', newMessage);

      // Mesajı ekle
      setMessages(prev => [...prev, newMessage]);
      setShouldScrollToBottom(true);

      // Socket'e gönder
      socket.emit('sendMessage', {
        ...newMessage,
        receiverId: selectedUser._id
      });

      // Kullanıcı listesini güncelle
      setUsers(prev => prev.map(user =>
        user._id === selectedUser._id
          ? {
              ...user,
              lastMessage: {
                content: newMessage.content,
                timestamp: newMessage.timestamp,
                isOwn: true,
                _id: newMessage._id
              }
            }
          : user
      ));
    } catch (error) {
      console.error('❌ Mesaj gönderilemedi:', error);
      setNewMsg(messageContent); // Hata durumunda mesajı geri koy
      alert(error.response?.data?.error || 'Mesaj gönderilemedi');
    } finally {
      setSendingMessage(false);
        if (messageInputRef.current) {
    messageInputRef.current.focus(); // 🔥 Gönderince tekrar focus
  }
    }
  }, [newMsg, selectedUser, currentUser, sendingMessage]);

  // Enter tuşu ile mesaj gönder
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Mesaj sil fonksiyonu - DÜZELTİLMİŞ VERSİYON
const deleteMessage = useCallback(async (messageId, deleteType) => {
  try {
    if (deleteType === 'forMe') {
      await api.put(`/messages/${messageId}/hide`);

      // Mesajı local state'den kaldır
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

      // ✅ Kullanıcı listesini güncelle
      setUsers((prevUsers) =>
        prevUsers.map((user) => {
          if (user.lastMessage && user.lastMessage._id === messageId) {
            const remainingMessages = messages.filter(
              (msg) =>
                msg._id !== messageId &&
                ((msg.senderId === currentUser._id &&
                  msg.receiverId === user._id) ||
                  (msg.senderId === user._id &&
                    msg.receiverId === currentUser._id))
            );

            if (remainingMessages.length > 0) {
              const lastMsg = remainingMessages[remainingMessages.length - 1];
              return {
                ...user,
                lastMessage: {
                  content: lastMsg.content,
                  timestamp: lastMsg.timestamp,
                  isOwn: lastMsg.senderId === currentUser._id,
                  _id: lastMsg._id,
                },
              };
            } else {
              // ✅ Kullanıcıyı listede tut ama lastMessage'ı temizle
              return {
                ...user,
                lastMessage: null,
                unreadCount: 0,
              };
            }
          }
          return user;
        })
      );
    } else if (deleteType === 'forEveryone') {
      await api.delete(`/messages/${messageId}/for-everyone`);

      // Önce kendi local state'ini güncelle
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, content: 'Bu mesaj silindi', deleted: true }
            : msg
        )
      );

      // Kullanıcı listesini güncelle
      setUsers((prev) =>
        prev.map((user) => {
          if (user.lastMessage && user.lastMessage._id === messageId) {
            return {
              ...user,
              lastMessage: {
                ...user.lastMessage,
                content: 'Bu mesaj silindi',
              },
            };
          }
          return user;
        })
      );

      // Socket'e bildir
      socket.emit('deleteMessage', {
        messageId,
        deletedBy: currentUser._id,
        deleteType: 'forEveryone',
        receiverId: selectedUser._id,
        senderId: currentUser._id,
      });
    }

    setShowDeleteMenu(null);
  } catch (error) {
    console.error('❌ Mesaj silinemedi:', error);
    alert(error.response?.data?.error || 'Mesaj silinemedi');
    setShowDeleteMenu(null);
  }
}, [currentUser, selectedUser, messages]);

  // Kullanıcı online kontrolü
  const isUserOnline = useCallback((userId) => {
    return onlineUserIds.includes(userId);
  }, [onlineUserIds]);

  // Zaman formatı
  const formatTime = useCallback((timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const msgTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - msgTime) / (1000 * 60));

    if (diffInMinutes < 1) return 'Şimdi';
    if (diffInMinutes < 60) return `${diffInMinutes} dk önce`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} sa önce`;
    return msgTime.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Typing kontrolü
  const isCurrentUserTyping = useMemo(() => {
    return selectedUser && typingUsers.has(selectedUser._id);
  }, [selectedUser, typingUsers]);

  // Loading state
 if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 text-sm">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white">
      <div className="max-w-7xl mx-auto h-full">
        <div className="flex h-full">
          {/* Sol Panel - Kullanıcı Listesi */}
          <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <h1 className="text-lg font-semibold text-gray-900">Mesajlar</h1>
              <p className="text-sm text-gray-500 mt-1">
                {users.length} kişi
              </p>
            </div>

            {/* Kullanıcı Listesi */}
            <div className="flex-1 overflow-y-auto">
              {users.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    Henüz mesaj yok
                  </h3>
                  <p className="text-xs text-gray-500">
                    Takip ettiğiniz kişilere mesaj gönderebilirsiniz
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {users.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        setIsInitialLoad(true);
                      }}
                      className={`mx-3 mb-1 p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white hover:shadow-sm ${
                        selectedUser?._id === user._id 
                          ? 'bg-blue-50 border border-blue-100 shadow-sm' 
                          : 'hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {(user.name || user.phoneNumber).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {isUserOnline(user._id) && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-gray-900 truncate">
                              {user.name || user.phoneNumber}
                            </h3>
                            {user.lastMessage && (
                              <span className="text-xs text-gray-400 ml-2">
                                {formatTime(user.lastMessage.timestamp)}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex-1 min-w-0">
                              {typingUsers.has(user._id) ? (
                                <p className="text-xs text-blue-500 italic">
                                  yazıyor...
                                </p>
                              ) : user.lastMessage ? (
                                <p className="text-xs text-gray-500 truncate">
                                  {user.lastMessage.isOwn ? 'Sen: ' : ''}
                                  {user.lastMessage.content}
                                </p>
                              ) : null}
                            </div>
                            
                            {user.unreadCount > 0 && (
                              <div className="ml-2 flex-shrink-0">
                                <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-xs font-medium rounded-full">
                                  {user.unreadCount > 99 ? '99+' : user.unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sağ Panel - Mesaj Alanı */}
          <div className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {(selectedUser.name || selectedUser.phoneNumber).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {isUserOnline(selectedUser._id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        {selectedUser.name || selectedUser.phoneNumber}
                      </h2>
                      <p className="text-xs text-gray-500">
                        {isUserOnline(selectedUser._id) ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Mesajlar */}
<div 
  ref={messagesContainerRef}
  className="flex-1 overflow-y-auto px-6 py-4"
  onClick={() => setShowDeleteMenu(null)}
  style={{
    scrollBehavior: 'smooth',
    backgroundImage: currentUser?.name === "Cansu" 
      ? "url('/background.png')"
      : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    maxHeight: "calc(100vh - 200px)"
  }}
>
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-gray-900 mb-1">
                        İlk mesajı gönderin
                      </h3>
                      <p className="text-xs text-gray-500">
                        Konuşmayı başlatmak için bir mesaj yazın
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwnMessage = (msg.senderId === currentUser?._id) ||
                          (msg.senderId?._id === currentUser?._id);
                        return (
                          <div
                            key={msg._id}
                            className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className="relative group">
                              <div
                                className={`max-w-xs lg:max-w-sm px-4 py-2.5 rounded-2xl shadow-sm ${
                                  isOwnMessage
                                    ? 'bg-blue-500 text-white rounded-br-md'
                                    : 'bg-white text-gray-900 rounded-bl-md border border-gray-100'
                                }`}
                              >
                                {msg.deleted ? (
                                  <span className="italic text-gray-400 text-sm">Bu mesaj silindi</span>
                                ) : (
                                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                                )}
                                
                                {/* Mesaj bilgileri */}
                                <div className="flex items-center justify-end gap-1 mt-1">
                                  <span className={`text-xs ${
                                    isOwnMessage ? 'text-blue-100' : 'text-gray-400'
                                  }`}>
                                    {formatTime(msg.timestamp)}
                                  </span>
                                  {isOwnMessage && (
                                    <div className="ml-1">
                                      {msg.read ? (
                                        <CheckCheck className="w-3 h-3 text-blue-200" />
                                      ) : (
                                        <Check className="w-3 h-3 text-blue-200" />
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Mesaj seçenekleri */}
                              {isOwnMessage && !msg.deleted && (
                                <div className="absolute -top-2 -right-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowDeleteMenu(showDeleteMenu === msg._id ? null : msg._id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1.5 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-all duration-200 delete-menu-trigger"
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </button>
                                  
                                  {showDeleteMenu === msg._id && (
                                    <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[150px] delete-menu-container">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteMessage(msg._id, 'forMe');
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Benim için sil
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteMessage(msg._id, 'forEveryone');
                                        }}
                                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 text-red-600 flex items-center gap-2"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                        Herkes için sil
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Yazıyor göstergesi */}
                      {isCurrentUserTyping && (
                        <div className="flex justify-start">
                          <div className="bg-white px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                            <div className="flex items-center space-x-1">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Mesaj Gönderme Alanı */}
                <div className="px-6 py-4 bg-white border-t border-gray-200">
                  <div className="flex items-end space-x-3">
                    <div className="relative">
                      <button
  onClick={(e) => {
    e.stopPropagation();
    setShowEmojiPicker((prev) => !prev);
  }}
  className="p-2 text-lg hover:scale-110 transition-transform emoji-picker-trigger"
>
  😉
</button>

                      
                      {showEmojiPicker && (
                        <div ref={emojiPickerRef} className="absolute bottom-14 left-0 z-50 emoji-picker-container">
                          <EmojiPicker
                            onEmojiClick={(emoji) => {
                              setNewMsg((prev) => prev + emoji.emoji);
                            }}
                            
                            width={300}
                            height={400}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 relative">
                      <textarea
                        ref={messageInputRef}
                        value={newMsg}
                        onChange={(e) => {
                          setNewMsg(e.target.value);
                          handleTyping();
                        }}
                        onKeyDown={handleKeyPress}
                        placeholder={formatNameWithSuffix(selectedUser?.name || selectedUser?.phoneNumber)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-gray-50 focus:bg-white transition-colors"
                        rows="1"
                        style={{ minHeight: "44px", maxHeight: "120px" }}
                        disabled={sendingMessage}
                      />
                    </div>
                    
                    <button
                      onClick={sendMessage}
                      disabled={!newMsg.trim() || sendingMessage}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-3 rounded-xl font-medium transition-colors flex items-center justify-center"
                    >
                      {sendingMessage ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center bg-gray-50">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Bir konuşma seçin
                </h3>
                <p className="text-sm text-gray-500">
                  Mesajlaşmaya başlamak için sol taraftan bir kişi seçin
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

Messages.displayName = 'Messages';
export default Messages;