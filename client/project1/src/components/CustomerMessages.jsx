import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  Search,
  ChevronRight,
  Clock,
  ArrowLeft
} from "lucide-react";
import Bar from "./Bar";
import { getUserChatRooms } from "../api/fetchApi";

function CustomerMessages() {
  const navigate = useNavigate();
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchChatRooms = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const res = await getUserChatRooms(token);
        setChatRooms(res.data);
      } catch (err) {
        console.error("Failed to load chat rooms", err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatRooms();
  }, [navigate]);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const filteredChatRooms = chatRooms.filter((room) => {
    const otherUser = room.other_user || {};
    const name = `${otherUser.first_name || ""} ${otherUser.last_name || ""}`.toLowerCase();
    const username = (otherUser.username || "").toLowerCase();
    return (
      name.includes(searchTerm.toLowerCase()) ||
      username.includes(searchTerm.toLowerCase())
    );
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
              <h1 className="text-2xl font-extrabold text-surface-900">
                My Messages
              </h1>
              <p className="text-surface-500 mt-1 text-sm">
                {chatRooms.length} conversation
                {chatRooms.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-400" size={17} />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm"
            />
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
          </div>
        ) : filteredChatRooms.length === 0 ? (
          <div className="text-center py-20">
            <MessageSquare size={40} className="mx-auto text-surface-300 mb-4" />
            <p className="text-surface-500 text-sm">
              {searchTerm
                ? "No conversations match your search."
                : "Start chatting with sellers to see messages here."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow border border-surface-100 overflow-hidden">
            {filteredChatRooms.map((room) => {
              const otherUser = room.other_user || {};
              const displayName =
                otherUser.first_name
                  ? `${otherUser.first_name} ${otherUser.last_name || ""}`
                  : otherUser.username || "Seller";

              const initial = displayName.charAt(0).toUpperCase();
              const isUnread = room.unread_count > 0;

              return (
                <div
                  key={room.id}
                  onClick={() => navigate(`/chat-room/${room.id}`)}
                  className={`p-4 flex items-center gap-4 cursor-pointer border-b border-surface-100 hover:bg-surface-50 ${isUnread ? "bg-brand-50/30" : ""
                    }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold ${isUnread
                      ? "bg-brand-600"
                      : "bg-surface-400"
                      }`}
                  >
                    {initial}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between">
                      <h3 className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"
                        }`}>
                        {displayName}
                      </h3>

                      <span className="text-xs text-surface-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatTime(room.last_message?.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm truncate text-surface-500">
                      {room.last_message?.content || "No messages yet"}
                    </p>

                    <span className="text-[10px] font-bold uppercase text-surface-500">
                      Property #{room.property_id}
                    </span>
                  </div>

                  {isUnread && (
                    <span className="min-w-[1.4rem] h-5 px-1.5 flex items-center justify-center bg-brand-600 text-white text-[10px] font-bold rounded-full">
                      {room.unread_count > 9 ? "9+" : room.unread_count}
                    </span>
                  )}

                  <ChevronRight size={16} className="text-surface-300" />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default CustomerMessages;
