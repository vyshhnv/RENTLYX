import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, Trash2, X } from "lucide-react";
import RentlyXMascot from "./RentlyXMascot";
import { buildApiUrl } from "../config/api";

const AI_ASK_URL = buildApiUrl("/ai/ask/");
const CHAT_HISTORY_URL = buildApiUrl("/ai/chat-history/");

const getSessionId = () => {
  const token = sessionStorage.getItem("token");
  const user_id = sessionStorage.getItem("user_id");
  if (!token) return null;
  if (user_id) return `user_${user_id}`;
  return `token_${token.slice(-10)}`;
};

export default function RentlyXWidget() {
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([
    { role: "bot", text: "Hi! Ask me anything about rentals in Kozhikode 👋" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const handleAuthChange = () => setSessionId(getSessionId());
    window.addEventListener("auth-change", handleAuthChange);
    const interval = setInterval(() => {
      setSessionId(prev => {
        const next = getSessionId();
        return next !== prev ? next : prev;
      });
    }, 500);
    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    setHistoryLoaded(false);
    setMessages([{ role: "bot", text: "Hi! Ask me anything about rentals in Kozhikode 👋" }]);

    const loadHistory = async () => {
      if (!sessionId) { setHistoryLoaded(true); return; }
      try {
        const res = await fetch(`${CHAT_HISTORY_URL}?session_id=${sessionId}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data.map(m => ({ role: m.role, text: m.message })));
        } else {
          setMessages([{ role: "bot", text: "Hi! Ask me anything about rentals in Kozhikode 👋" }]);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      } finally {
        setHistoryLoaded(true);
      }
    };
    loadHistory();
  }, [sessionId]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);
    try {
      if (sessionId) {
        await fetch(CHAT_HISTORY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, role: "user", message: q }),
        });
      }

      const res = await fetch(AI_ASK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, session_id: sessionId || "guest" }),
      });
      const data = await res.json();
      const answer = data.answer || "Sorry, I couldn't find an answer right now.";
      setMessages(m => [...m, { role: "bot", text: answer }]);
      if (sessionId) {
        await fetch(CHAT_HISTORY_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId, role: "bot", message: answer }),
        });
      }
    } catch {
      setMessages(m => [...m, { role: "bot", text: "Sorry, I couldn't connect to the server." }]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    if (!sessionId) return;
    try {
      await fetch(`${CHAT_HISTORY_URL}?session_id=${sessionId}`, { method: "DELETE" });
      setMessages([{ role: "bot", text: "Hi! Ask me anything about rentals in Kozhikode 👋" }]);
    } catch (err) {
      console.error("Failed to clear history:", err);
    }
  };

  return (
    <>
      {/* Toggle Button Container */}
      <div className="fixed bottom-4 right-6 z-50 flex flex-col items-center pointer-events-none">

        {/* Speech Bubble Popup */}
        {!open && showBubble && (
          <div className="relative mb-2 animate-bounce pointer-events-auto z-10 transition-all">
            <div
              onClick={() => { setOpen(true); setShowBubble(false); }}
              className="bg-white border border-surface-100 text-surface-800 text-sm font-bold py-3 px-5 pr-10 rounded-[1.25rem] shadow-2xl shadow-brand-900/10 cursor-pointer hover:-translate-y-1 transition-transform"
            >
              Hi, how can I help you? 👋
            </div>
            {/* Close Bubble Button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowBubble(false); }}
              className="absolute top-1/2 -translate-y-1/2 right-3 p-1 text-surface-400 hover:text-surface-700 bg-surface-50 hover:bg-surface-100 rounded-full transition-colors"
              title="Dismiss"
            >
              <X size={14} />
            </button>
            {/* Little Triangle Pointer - Centered pointing down */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-surface-100 transform rotate-45 pointer-events-none" />
          </div>
        )}

        {/* 3D Mascot / Close Button */}
        <div
          onClick={() => { setOpen(!open); setShowBubble(false); }}
          className="cursor-pointer transition-all duration-300 pointer-events-auto flex items-end justify-center"
          style={{ width: 120, height: 150 }}
          title="Chat with RentlyX AI"
        >
          {open
            ? <div className="w-16 h-16 rounded-2xl bg-surface-800 hover:bg-surface-700 flex items-center justify-center shadow-glass-lg transition-all mb-4">
              <X size={24} className="text-white" />
            </div>
            : <RentlyXMascot size="lg" mood={loading ? "talking" : "waving"} />
          }
        </div>
      </div>

      {/* Chat Panel */}
      <div className={`fixed bottom-44 right-6 z-50 w-96 rounded-2xl overflow-hidden shadow-glass-xl border border-surface-200/50 transition-all duration-300 origin-bottom-right ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-95 opacity-0 pointer-events-none'
        }`}
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)' }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 flex items-center justify-center">
                <RentlyXMascot size="sm" mood={loading ? "talking" : "idle"} />
              </div>
              <div>
                <p className="text-white font-semibold text-sm leading-tight">RentlyX Assistant</p>
                <p className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block animate-pulse" />
                  Online
                </p>
              </div>
            </div>
            {sessionId && (
              <button onClick={clearHistory} title="Clear chat history"
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-rose-500/20 flex items-center justify-center transition group">
                <Trash2 size={13} className="text-white/40 group-hover:text-rose-400 transition" />
              </button>
            )}
          </div>
        </div>

        {/* Chat Body */}
        <div className="p-4 flex flex-col">
          <div className="overflow-y-auto space-y-2.5 pr-1 mb-3" style={{ maxHeight: 260 }}>
            {!historyLoaded && (
              <div className="space-y-2 animate-pulse">
                <div className="h-8 bg-white/5 rounded-xl w-3/4" />
                <div className="h-8 bg-white/5 rounded-xl w-1/2 ml-auto" />
                <div className="h-8 bg-white/5 rounded-xl w-2/3" />
              </div>
            )}

            {historyLoaded && messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && (
                  <div className="w-7 h-7 mr-1.5 mt-0.5 shrink-0 flex items-center justify-center">
                    <RentlyXMascot size="sm" mood="idle" />
                  </div>
                )}
                <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${m.role === "user"
                  ? "bg-brand-600 text-white rounded-br-md"
                  : "bg-white/8 text-surface-200 rounded-bl-md border border-white/5"
                  }`}>
                  {m.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 shrink-0 flex items-center justify-center">
                  <RentlyXMascot size="sm" mood="thinking" />
                </div>
                <div className="bg-white/8 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span key={i}
                      className="w-1.5 h-1.5 bg-surface-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {historyLoaded && !sessionId && (
              <p className="text-surface-500 text-xs text-center mt-2">
                <a href="/login" className="text-brand-400 hover:underline font-semibold">Log in</a>{" "}
                to save your chat history
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 items-center">
            <input type="text" value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Ask about rent, locality…"
              className="flex-1 bg-white/5 border border-white/10 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition placeholder:text-surface-500"
            />
            <button onClick={send} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 flex items-center justify-center transition shrink-0 shadow-lg shadow-brand-900/30">
              <Send size={15} className="text-white" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
