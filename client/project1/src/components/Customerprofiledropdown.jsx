import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUserProfile } from "../api/fetchApi";
import {
  User, Mail, AtSign, LogOut, ChevronDown, Loader2,
  ShieldCheck, ExternalLink, Building2, List, BookOpen,
  Heart, MessageSquare, LayoutDashboard
} from "lucide-react";

function CustomerProfileDropdown({ onLogout }) {
  const navigate = useNavigate();
  const token    = sessionStorage.getItem("token") || localStorage.getItem("token");
  const role     = sessionStorage.getItem("role")?.toLowerCase();
  const isSeller = role === "seller";

  const [open,    setOpen]    = useState(false);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const panelRef              = useRef(null);

  // Load profile when dropdown opens (only once)
  useEffect(() => {
    if (!open || profile) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await getUserProfile(token);
        setProfile(res.data);
      } catch (e) { console.error("Failed to load profile", e); }
      finally { setLoading(false); }
    };
    load();
  }, [open, profile, token]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = profile
    ? (profile.first_name || profile.last_name
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim()
        : profile.username)
    : "Account";

  const initials = displayName
    .split(" ")
    .map((w) => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  const profileRoute = isSeller ? "/seller/profile" : "/profile";

  // Quick links based on role
  const quickLinks = isSeller
    ? [
        { label: "My Listings",  icon: <List size={15} />,          to: "/seller/properties", color: "text-violet-600", bg: "bg-violet-50" },
        { label: "Bookings",     icon: <BookOpen size={15} />,       to: "/seller/bookings",   color: "text-amber-600",  bg: "bg-amber-50"  },
        { label: "Messages",     icon: <MessageSquare size={15} />,  to: "/seller/messages",   color: "text-emerald-600",bg: "bg-emerald-50"},
        { label: "Dashboard",    icon: <LayoutDashboard size={15} />,to: "/seller/dashboard",  color: "text-indigo-600", bg: "bg-indigo-50" },
      ]
    : [
        { label: "My Bookings",      icon: <BookOpen size={15} />,      to: "/my-bookings", color: "text-amber-600",   bg: "bg-amber-50"   },
        { label: "Saved Properties", icon: <Heart size={15} />,         to: "/favorites",   color: "text-rose-600",    bg: "bg-rose-50"    },
        { label: "Messages",         icon: <MessageSquare size={15} />, to: "/messages",    color: "text-emerald-600", bg: "bg-emerald-50" },
      ];

  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <div className="relative" ref={panelRef}>

      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur border border-white/20 transition-all"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black shadow-sm shrink-0 ${
          isSeller
            ? "bg-gradient-to-br from-emerald-400 to-emerald-600"
            : "bg-gradient-to-br from-brand-400 to-brand-600"
        }`}>
          {profile ? initials : <User size={14} />}
        </div>
        <span className="text-white text-sm font-semibold max-w-[120px] truncate hidden sm:block">
          {profile ? displayName : "Account"}
        </span>
        <ChevronDown size={14} className={`text-white/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-surface-100 overflow-hidden z-50 animate-scale-in origin-top-right">

          {/* Header banner */}
          <div
            className="px-5 py-4 relative overflow-hidden"
            style={{
              background: isSeller
                ? "linear-gradient(135deg, #064e3b 0%, #059669 100%)"
                : "linear-gradient(135deg, #1e2a5e 0%, #4263eb 100%)",
            }}
          >
            <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 blur-2xl -mr-8 -mt-8" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-base font-bold border border-white/30 shadow-lg shrink-0">
                {loading ? <Loader2 size={16} className="animate-spin" /> : (initials || <User size={16} />)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-white font-bold text-sm leading-tight truncate">
                    {loading ? "Loading..." : displayName}
                  </h3>
                  <ShieldCheck size={12} className={isSeller ? "text-emerald-300 shrink-0" : "text-blue-300 shrink-0"} />
                </div>
                <p className={`text-xs mt-0.5 ${isSeller ? "text-emerald-200" : "text-blue-200"}`}>
                  {profile?.username ? `@${profile.username}` : ""}
                  <span className="ml-1 font-bold">{isSeller ? "· Seller" : "· Customer"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Profile info rows */}
          <div className="px-5 py-4 space-y-2.5">
            {loading ? (
              <div className="flex items-center justify-center py-6 text-surface-400">
                <Loader2 size={18} className="animate-spin mr-2" />
                <span className="text-sm font-medium">Loading...</span>
              </div>
            ) : profile ? (
              <>
                <ProfileRow icon={<AtSign size={13} />}   label="Username" value={profile.username}                                         isSeller={isSeller} />
                <ProfileRow icon={<User size={13} />}     label="Name"     value={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "—"} isSeller={isSeller} />
                <ProfileRow icon={<Mail size={13} />}     label="Email"    value={profile.email}                                             isSeller={isSeller} />
                {isSeller && (
                  <ProfileRow icon={<Building2 size={13} />} label="Role" value="Seller Account" isSeller={isSeller} />
                )}
              </>
            ) : (
              <p className="text-sm text-surface-400 text-center py-3">Could not load profile.</p>
            )}

            {/* View full profile button */}
            <button
              onClick={() => go(profileRoute)}
              className={`w-full mt-1 py-2.5 rounded-xl text-white text-sm font-semibold transition flex items-center justify-center gap-2 shadow-md ${
                isSeller
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  : "bg-brand-600 hover:bg-brand-700 shadow-brand-600/20"
              }`}
            >
              <User size={14} /> View Full Profile <ExternalLink size={12} className="opacity-70" />
            </button>
          </div>

          {/* Quick links */}
          <div className="px-3 pb-3 border-t border-surface-100 pt-3">
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider px-2 mb-2">Quick Links</p>
            {quickLinks.map(({ label, icon, to, color, bg }) => (
              <button key={to} onClick={() => go(to)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-surface-50 transition group text-left">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}>{icon}</div>
                <span className="text-sm font-semibold text-surface-600 group-hover:text-surface-900 flex-1">{label}</span>
              </button>
            ))}
          </div>

          {/* Logout */}
          <div className="border-t border-surface-100 px-4 py-3">
            <button
              onClick={() => { setOpen(false); onLogout?.(); }}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-rose-500 hover:bg-rose-50 text-sm font-semibold transition"
            >
              <LogOut size={14} /> Log Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileRow({ icon, label, value, isSeller }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
        isSeller ? "bg-emerald-50 text-emerald-600" : "bg-brand-50 text-brand-500"
      }`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-surface-800 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

export default CustomerProfileDropdown;
