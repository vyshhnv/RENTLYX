import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Send, ArrowLeft, Phone, MoreVertical, Paperclip } from "lucide-react";
import axios from "axios";
import Bar from "./Bar";

function ChatRoom() {
  const { chatRoomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatRoom, setChatRoom] = useState(null);
  const [otherUser, setOtherUser] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  const [resolvedUserId, setResolvedUserId] = useState(
    sessionStorage.getItem("user_id") ? parseInt(sessionStorage.getItem("user_id")) : null
  );
  const resolvedUserIdRef = useRef(resolvedUserId);
  useEffect(() => { resolvedUserIdRef.current = resolvedUserId; }, [resolvedUserId]);

  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const fetchChatData = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) { navigate("/login"); return; }
      try {
        const roomRes = await axios.get(`http://127.0.0.1:8000/api/chat/rooms/${chatRoomId}/`, { headers: { Authorization: `Token ${token}` } });
        const roomData = roomRes.data;
        setChatRoom(roomData);
        setOtherUser(roomData.other_user);

        let myUserId = sessionStorage.getItem("user_id") ? parseInt(sessionStorage.getItem("user_id")) : null;
        if (!myUserId && roomData.other_user) {
          const otherUserId = roomData.other_user.id;
          const roomUserId = roomData.user;
          const roomSellerId = roomData.seller;
          if (roomUserId !== otherUserId) myUserId = roomUserId;
          else if (roomSellerId !== otherUserId) myUserId = roomSellerId;
          if (myUserId) sessionStorage.setItem("user_id", String(myUserId));
        }
        if (myUserId) setResolvedUserId(myUserId);

        const messagesRes = await axios.get(`http://127.0.0.1:8000/api/chat/messages/?chat_room=${chatRoomId}`, { headers: { Authorization: `Token ${token}` } });
        setMessages(messagesRes.data);
        await axios.post(`http://127.0.0.1:8000/api/chat/rooms/${chatRoomId}/mark_read/`, {}, { headers: { Authorization: `Token ${token}` } });
      } catch (err) { console.error("Failed to load chat data", err); }
      finally { setLoading(false); }
    };
    fetchChatData();
  }, [chatRoomId, navigate]);

  useEffect(() => {
    const wsToken = sessionStorage.getItem("token");
    if (!wsToken) return;
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${chatRoomId}/?token=${wsToken}`);
    ws.onopen = () => { setWsConnected(true); };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages((prev) => [...prev, { id: data.message_id, sender: data.sender_id, sender_name: data.sender_name, content: data.message, timestamp: data.timestamp, is_read: false }]);
        if (data.sender_id !== resolvedUserIdRef.current) {
          const markToken = sessionStorage.getItem("token");
          axios.post(`http://127.0.0.1:8000/api/chat/rooms/${chatRoomId}/mark_read/`, {}, { headers: { Authorization: `Token ${markToken}` } });
        }
      } else if (data.type === "typing") {
        if (data.user_id !== resolvedUserIdRef.current) setIsTyping(data.is_typing);
      }
    };
    ws.onerror = () => { setWsConnected(false); };
    ws.onclose = () => { setWsConnected(false); };
    wsRef.current = ws;
    return () => { if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close(); };
  }, [chatRoomId]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", message: newMessage, sender_id: resolvedUserIdRef.current }));
    } else {
      const fallbackToken = sessionStorage.getItem("token");
      axios.post(`http://127.0.0.1:8000/api/chat/messages/`, { chat_room: chatRoomId, content: newMessage }, { headers: { Authorization: `Token ${fallbackToken}` } })
        .then((res) => setMessages((prev) => [...prev, res.data]))
        .catch((err) => console.error("Failed to send message", err));
    }
    setNewMessage("");
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "typing", user_id: resolvedUserIdRef.current, is_typing: true }));
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: "typing", user_id: resolvedUserIdRef.current, is_typing: false }));
        }
      }, 2000);
    }
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = formatDate(message.timestamp);
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50">
        <Bar forceSolid={true} />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex items-center gap-3 text-surface-400">
            <div className="w-5 h-5 border-2 border-surface-300 border-t-brand-600 rounded-full animate-spin" />
            <span className="font-medium text-sm">Loading chat...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 flex flex-col font-sans">
      <Bar forceSolid={true} />

      {/* Header */}
      <div className="bg-white border-b border-surface-100 sticky top-16 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-800 transition">
                <ArrowLeft size={18} />
              </button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-brand-700 rounded-xl flex items-center justify-center text-white font-display font-bold">
                    {otherUser?.first_name?.charAt(0) || otherUser?.username?.charAt(0) || "U"}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${wsConnected ? "bg-emerald-500" : "bg-surface-400"}`} />
                </div>
                <div>
                  <h2 className="font-semibold text-surface-900 text-sm">
                    {otherUser?.first_name && otherUser?.last_name
                      ? `${otherUser.first_name} ${otherUser.last_name}`
                      : otherUser?.username || "Chat"}
                  </h2>
                  <p className="text-xs text-surface-400">
                    Property #{chatRoom?.property_id}
                    {!wsConnected && <span className="ml-2 text-amber-400">● Reconnecting...</span>}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 text-surface-400 hover:bg-surface-100 rounded-xl transition"><Phone size={17} /></button>
              <button className="p-2 text-surface-400 hover:bg-surface-100 rounded-xl transition"><MoreVertical size={17} /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-brand-50 rounded-2xl flex items-center justify-center mb-4">
                <Send size={24} className="text-brand-400" />
              </div>
              <p className="text-surface-500 text-sm">No messages yet. Say hello!</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="flex items-center justify-center my-5">
                  <div className="bg-surface-200 text-surface-500 text-[11px] font-semibold px-3 py-1 rounded-full">{date}</div>
                </div>
                {msgs.map((message) => {
                  const isSender = resolvedUserId !== null && message.sender === resolvedUserId;
                  return (
                    <div key={message.id} className={`flex mb-3 ${isSender ? "justify-end" : "justify-start"}`}>
                      {!isSender && (
                        <div className="w-7 h-7 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white text-[10px] font-bold mr-2 mt-auto mb-1 flex-shrink-0">
                          {otherUser?.first_name?.charAt(0) || otherUser?.username?.charAt(0) || "U"}
                        </div>
                      )}
                      <div className={`max-w-md px-4 py-2.5 rounded-2xl text-sm ${isSender
                        ? "bg-brand-600 text-white rounded-br-md"
                        : "bg-white text-surface-800 rounded-bl-md shadow-sm border border-surface-100"
                        }`}>
                        <p className="break-words">{message.content}</p>
                        <p className={`text-[10px] mt-1 ${isSender ? "text-brand-200" : "text-surface-400"}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {isTyping && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-surface-100">
                {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />)}
              </div>
              <span className="text-xs text-surface-400">{otherUser?.first_name || "User"} is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-surface-100 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <button type="button" className="p-2.5 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-xl transition">
              <Paperclip size={18} />
            </button>
            <div className="flex-1">
              <textarea value={newMessage} onChange={handleTyping}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                placeholder="Type a message..."
                rows="1"
                className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl resize-none focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 focus:bg-white transition text-sm"
                style={{ maxHeight: "120px" }}
              />
            </div>
            <button type="submit" disabled={!newMessage.trim()}
              className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md">
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ChatRoom;
