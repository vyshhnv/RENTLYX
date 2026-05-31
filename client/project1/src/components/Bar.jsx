import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  BookOpen,
  Building2,
  CheckCheck,
  ChevronDown,
  Heart,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  MessageSquare,
  Trash2,
  User,
  X,
} from "lucide-react";
import { API_BASE_URL as BASE_URL } from "../config/api";

const NOTIF_ICONS = {
  booking_received: "📋",
  booking_accepted: "✅",
  booking_rejected: "❌",
  booking_cancelled: "🚫",
  booking_refunded: "💰",
  review_received: "⭐",
  complaint_update: "📣",
  message_received: "💬",
  listing_approved: "🏠",
  listing_rejected: "⚠️",
};

function NotificationBell({ showSolid }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const token = sessionStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      setOpen(false);
      setNotifs([]);
      setUnread(0);
      return undefined;
    }

    const pollUnreadCount = async () => {
      try {
        const res = await fetch(`${BASE_URL}/notifications/unread-count/`, {
          headers: { Authorization: `Token ${sessionStorage.getItem("token")}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUnread(data.unread_count || 0);
        }
      } catch (err) {
        console.error("Failed to poll unread notifications:", err);
      }
    };

    pollUnreadCount();
    const interval = setInterval(pollUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const fetchNotifications = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/notifications/`, {
        headers: { Authorization: `Token ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notifications || []);
        setUnread(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (event) => {
    event.stopPropagation();
    if (!open) {
      fetchNotifications();
    }
    setOpen((value) => !value);
  };

  const markRead = async (id) => {
    if (!token) return;

    try {
      await fetch(`${BASE_URL}/notifications/${id}/read/`, {
        method: "PATCH",
        headers: { Authorization: `Token ${token}` },
      });
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }

    setNotifs((prev) => prev.map((notif) => (
      notif.id === id ? { ...notif, is_read: true } : notif
    )));
    setUnread((prev) => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    if (!token) return;

    try {
      await fetch(`${BASE_URL}/notifications/mark-all-read/`, {
        method: "PATCH",
        headers: { Authorization: `Token ${token}` },
      });
      setNotifs((prev) => prev.map((notif) => ({ ...notif, is_read: true })));
      setUnread(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  const deleteNotif = async (event, id) => {
    event.stopPropagation();
    if (!token) return;

    try {
      await fetch(`${BASE_URL}/notifications/${id}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Token ${token}` },
      });
      setNotifs((prev) => prev.filter((notif) => notif.id !== id));
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  const handleNotifClick = (notif) => {
    if (!notif.is_read) {
      markRead(notif.id);
    }
    if (notif.link) {
      navigate(notif.link);
    }
    setOpen(false);
  };

  const fmtTime = (value) => {
    const diff = (Date.now() - new Date(value)) / 1000;
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  };

  if (!token) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          showSolid
            ? "text-surface-600 hover:bg-surface-100 hover:text-surface-900"
            : "text-white/80 hover:text-white hover:bg-white/10"
        }`}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-glass-lg border border-surface-100 overflow-hidden animate-scale-in origin-top-right z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 bg-surface-50">
            <div>
              <p className="text-sm font-bold text-surface-800">Notifications</p>
              {unread > 0 && <p className="text-xs text-surface-400">{unread} unread</p>}
            </div>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto">
            {loading && (
              <div className="flex flex-col gap-2 p-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-14 bg-surface-100 rounded-xl animate-pulse" />
                ))}
              </div>
            )}

            {!loading && notifs.length === 0 && (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">🔔</div>
                <p className="text-sm font-semibold text-surface-600">No notifications yet</p>
                <p className="text-xs text-surface-400 mt-1">You&apos;re all caught up!</p>
              </div>
            )}

            {!loading && notifs.map((notif) => (
              <div
                key={notif.id}
                onClick={() => handleNotifClick(notif)}
                className={`group flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-surface-50 transition-colors border-b border-surface-50 last:border-0 ${
                  !notif.is_read ? "bg-brand-50/40" : ""
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 mt-0.5 ${
                    !notif.is_read ? "bg-brand-100" : "bg-surface-100"
                  }`}
                >
                  {NOTIF_ICONS[notif.type] || "🔔"}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs leading-snug mb-0.5 ${
                      !notif.is_read
                        ? "font-bold text-surface-900"
                        : "font-semibold text-surface-700"
                    }`}
                  >
                    {notif.title}
                  </p>
                  <p className="text-[11px] text-surface-500 leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-[10px] text-surface-400 mt-1">{fmtTime(notif.created_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {!notif.is_read && <span className="w-2 h-2 rounded-full bg-brand-500 mt-1" />}
                  <button
                    onClick={(event) => deleteNotif(event, notif.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-50 text-surface-400 hover:text-rose-500 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ forceSolid = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [role, setRole] = useState(() => sessionStorage.getItem("role")?.toLowerCase() || null);
  const [username, setUsername] = useState(() => sessionStorage.getItem("username") || null);

  const token = sessionStorage.getItem("token");
  const isSeller = role === "seller";
  const profileRoute = isSeller ? "/seller/profile" : "/profile";

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleAuthChange = () => {
      setUsername(sessionStorage.getItem("username") || null);
      setRole(sessionStorage.getItem("role")?.toLowerCase() || null);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("auth-change", handleAuthChange);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  useEffect(() => {
    const close = (event) => {
      if (!event.target.closest("#profile-dropdown")) {
        setProfileOpen(false);
      }
    };

    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleLogout = () => {
    sessionStorage.clear();
    window.dispatchEvent(new Event("auth-change"));
    navigate("/");
    window.location.reload();
  };

  const showSolid = isScrolled || forceSolid;
  const initials = username ? username.slice(0, 2).toUpperCase() : "U";

  const navLinks = [
    { to: "/", label: "Home", show: true },
    { to: "/favorites", label: "Saved", show: !!token && !isSeller },
    { to: "/my-bookings", label: "Bookings", show: !!token && !isSeller },
    {
      to: "/seller/dashboard",
      label: "Dashboard",
      show: isSeller,
      icon: <LayoutDashboard size={15} />,
    },
    { to: "/sellerreg", label: "Become a Seller", show: !token },
  ].filter((item) => item.show);

  const profileMenuItems = isSeller
    ? [
        { label: "My Profile", icon: <User size={16} />, to: "/seller/profile" },
        { label: "My Listings", icon: <List size={16} />, to: "/seller/properties" },
        { label: "Bookings", icon: <BookOpen size={16} />, to: "/seller/bookings" },
        { label: "Messages", icon: <MessageSquare size={16} />, to: "/seller/messages" },
        { label: "Dashboard", icon: <Building2 size={16} />, to: "/seller/dashboard" },
      ]
    : [
        { label: "My Profile", icon: <User size={16} />, to: "/profile" },
        { label: "Saved Properties", icon: <Heart size={16} />, to: "/favorites" },
        { label: "My Bookings", icon: <BookOpen size={16} />, to: "/my-bookings" },
        { label: "Messages", icon: <MessageSquare size={16} />, to: "/messages" },
      ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-[100] transition-all duration-500 ${
        showSolid
          ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.05)] py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 ${
              showSolid
                ? "bg-gradient-to-br from-brand-600 to-brand-700 text-white shadow-lg shadow-brand-600/20"
                : "bg-white text-brand-600 shadow-lg"
            }`}
          >
            R
          </div>
          <span
            className={`text-xl font-display font-extrabold tracking-tight transition-colors duration-300 ${
              showSolid ? "text-surface-900" : "text-white"
            }`}
          >
            Rently
            <span className={showSolid ? "text-brand-600" : "text-brand-300"}>X</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                location.pathname === to
                  ? showSolid
                    ? "bg-brand-50 text-brand-700"
                    : "bg-white/15 text-white"
                  : showSolid
                    ? "text-surface-600 hover:text-brand-600 hover:bg-surface-50"
                    : "text-white/80 hover:text-white hover:bg-white/10"
              }`}
            >
              {icon}
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-2">
          {!token ? (
            <>
              <Link
                to="/login"
                className={`px-4 py-2 font-semibold text-sm rounded-lg transition-all duration-200 ${
                  showSolid
                    ? "text-surface-600 hover:text-brand-600 hover:bg-surface-50"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                Log In
              </Link>
              <Link
                to="/reg"
                className="px-5 py-2.5 font-semibold text-sm rounded-xl bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-600/25 hover:shadow-brand-600/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                Sign Up
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <NotificationBell showSolid={showSolid} />

              <div id="profile-dropdown" className="relative">
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setProfileOpen(!profileOpen);
                  }}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-200 ${
                    showSolid
                      ? "hover:bg-surface-50 border border-surface-200"
                      : "hover:bg-white/10 border border-white/20"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-inner ${
                      isSeller
                        ? "bg-gradient-to-br from-emerald-500 to-emerald-700"
                        : "bg-gradient-to-br from-brand-500 to-brand-700"
                    }`}
                  >
                    {initials}
                  </div>
                  <span
                    className={`text-sm font-semibold max-w-[100px] truncate ${
                      showSolid ? "text-surface-700" : "text-white"
                    }`}
                  >
                    {username || "User"}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      profileOpen ? "rotate-180" : ""
                    } ${showSolid ? "text-surface-400" : "text-white/60"}`}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-xl shadow-glass-lg border border-surface-100 overflow-hidden animate-scale-in origin-top-right z-50">
                    <div className="p-3 border-b border-surface-100 bg-surface-50">
                      <p className="text-sm font-bold text-surface-800 truncate">{username}</p>
                      <p
                        className={`text-xs font-semibold capitalize ${
                          isSeller ? "text-emerald-600" : "text-brand-600"
                        }`}
                      >
                        {isSeller ? "Seller Account" : "Customer Account"}
                      </p>
                    </div>

                    <div className="p-1.5">
                      {profileMenuItems.map(({ label, icon, to }) => (
                        <button
                          key={to}
                          onClick={() => {
                            navigate(to);
                            setProfileOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-surface-600 hover:bg-surface-50 hover:text-surface-900 rounded-lg transition-colors"
                        >
                          {icon}
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="p-1.5 border-t border-surface-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <LogOut size={16} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          className={`md:hidden p-2 rounded-lg transition-colors ${
            showSolid ? "text-surface-700 hover:bg-surface-100" : "text-white hover:bg-white/10"
          }`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border-t border-surface-100 shadow-glass-lg py-3 px-4 flex flex-col gap-1 animate-slide-down">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
            onClick={() => setMobileMenuOpen(false)}
          >
            Home
          </Link>

          {token && (
            <>
              <button
                onClick={() => {
                  navigate(profileRoute);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors text-left w-full"
              >
                <User size={16} />
                {username || "My Profile"}
              </button>

              {isSeller ? (
                <>
                  <Link
                    to="/seller/properties"
                    className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <List size={16} />
                    My Listings
                  </Link>
                  <Link
                    to="/seller/bookings"
                    className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen size={16} />
                    Bookings
                  </Link>
                  <Link
                    to="/seller/messages"
                    className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageSquare size={16} />
                    Messages
                  </Link>
                  <Link
                    to="/seller/dashboard"
                    className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} />
                    Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to="/favorites"
                    className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart size={16} />
                    Saved Properties
                  </Link>
                  <Link
                    to="/my-bookings"
                    className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <BookOpen size={16} />
                    My Bookings
                  </Link>
                  <Link
                    to="/messages"
                    className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageSquare size={16} />
                    Messages
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                className="flex items-center gap-2.5 px-4 py-3 text-rose-600 font-semibold rounded-xl hover:bg-rose-50 transition-colors w-full text-left mt-1"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </>
          )}

          {!token && (
            <>
              <Link
                to="/sellerreg"
                className="flex items-center gap-2.5 px-4 py-3 text-surface-700 font-semibold rounded-xl hover:bg-surface-50 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Become a Seller
              </Link>
              <div className="flex gap-2 mt-2 px-2">
                <Link
                  to="/login"
                  className="flex-1 text-center py-3 border border-surface-200 rounded-xl font-semibold text-surface-700 hover:bg-surface-50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/reg"
                  className="flex-1 text-center py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </nav>
  );
}

export default Bar;
