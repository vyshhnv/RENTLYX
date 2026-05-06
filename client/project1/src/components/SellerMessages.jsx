import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare, ArrowLeft, Search, ChevronRight,
  Clock, CheckCircle2
} from "lucide-react";
import axios from "axios";
import Bar from "./Bar";

function SellerMessages() {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchChatRooms = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) { navigate("/seller/login"); return; }
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/chat/rooms/", { headers: { Authorization: `Token ${token}` } });
        setChatRooms(res.data);
      } catch (err) { console.error("Failed to load chat rooms", err); }
      finally { setLoading(false); }
    };

    fetchChatRooms();
  }, [navigate]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const filteredChatRooms = chatRooms.filter((room) => {
    const otherUser = room.other_user || {};
    const fullName = `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.toLowerCase();
    const username = (otherUser.username || "").toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) || username.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />

      <main className="max-w-4xl mx-auto px-6 pt-28 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-800 transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-display font-extrabold text-surface-900">Inbox</h1>
              <p className="text-surface-500 font-medium mt-1 text-sm">
                {chatRooms.length} active conversation{chatRooms.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" size={17} />
            <input type="text" placeholder="Search messages..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/10 focus:border-brand-500 transition-all text-sm font-medium" />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-8 h-8 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4" />
            <p className="text-surface-500 font-medium text-sm">Loading conversations...</p>
          </div>
        ) : filteredChatRooms.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <MessageSquare size={28} className="text-surface-300" />
            </div>
            <h3 className="text-lg font-display font-bold text-surface-900 mb-2">No messages found</h3>
            <p className="text-surface-500 max-w-xs mx-auto text-sm">
              {searchTerm
                ? "No conversations match your search."
                : "When buyers express interest, chats will appear here."}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filteredChatRooms.map((room) => {
              const otherUser = room.other_user || {};
              const displayName = otherUser.first_name
                ? `${otherUser.first_name} ${otherUser.last_name || ""}`.trim()
                : otherUser.username || "User";
              const initial = displayName.charAt(0).toUpperCase();
              const isUnread = room.unread_count > 0;

              return (
                <div key={room.id} onClick={() => navigate(`/chat-room/${room.id}`)}
                  className={`group relative p-4 flex items-center gap-4 cursor-pointer transition-all hover:bg-surface-50 border-b border-surface-100 last:border-0 ${isUnread ? "bg-brand-50/30" : ""
                    }`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-display font-bold text-white shadow-sm shrink-0 transition-transform group-hover:scale-105 ${isUnread
                    ? "bg-gradient-to-br from-brand-600 to-brand-700"
                    : "bg-gradient-to-br from-surface-400 to-surface-500"
                    }`}>{initial}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className={`text-sm truncate pr-2 ${isUnread ? "font-bold text-surface-900" : "font-semibold text-surface-700"}`}>
                        {displayName}
                      </h3>
                      <span className={`text-xs whitespace-nowrap flex items-center gap-1 ${isUnread ? "text-brand-600 font-bold" : "text-surface-400"}`}>
                        <Clock size={10} /> {formatTime(room.last_message?.timestamp)}
                      </span>
                    </div>
                    <p className={`text-sm truncate pr-8 ${isUnread ? "text-surface-700 font-medium" : "text-surface-500"}`}>
                      {room.last_message?.content || <span className="italic opacity-70">No messages yet</span>}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-surface-500 bg-surface-100 px-2 py-0.5 rounded border border-surface-200">
                        Property #{room.property_id}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 pl-2">
                    {isUnread && (
                      <span className="min-w-[1.4rem] h-5 px-1.5 flex items-center justify-center bg-brand-600 text-white text-[10px] font-bold rounded-full shadow-md">
                        {room.unread_count > 9 ? "9+" : room.unread_count}
                      </span>
                    )}
                    <ChevronRight size={17} className="text-surface-300 group-hover:text-brand-500 transition-colors opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default SellerMessages;
