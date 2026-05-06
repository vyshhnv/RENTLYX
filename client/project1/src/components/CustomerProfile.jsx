import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Bar from "./Bar";
import { getUserProfile, updateUserProfile } from "../api/fetchApi";
import {
  User, Mail, AtSign, Edit3, Check, X,
  Loader2, ShieldCheck, LogOut, BookOpen,
  Heart, ArrowLeft, Save
} from "lucide-react";
import { MessageSquare } from "lucide-react";

function CustomerProfile() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "" });

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    const load = async () => {
      try {
        const res = await getUserProfile(token);
        setProfile(res.data);
        setForm({
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          email: res.data.email || "",
        });
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally { setLoading(false); }
    };
    load();
  }, [navigate, token]);

  const handleSave = async () => {
    setSaving(true); setSaveError("");
    try {
      const res = await updateUserProfile(form, token);
      setProfile({ ...profile, ...res.data });
      setSaveSuccess(true); setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch { setSaveError("Failed to save changes. Please try again."); }
    finally { setSaving(false); }
  };

  const handleCancel = () => {
    setEditing(false); setSaveError("");
    if (profile) setForm({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      email: profile.email || "",
    });
  };

  const handleLogout = () => {
    sessionStorage.clear();
    navigate("/");
    window.location.reload();
  };

  const displayName = profile
    ? ((profile.first_name || profile.last_name)
      ? `${profile.first_name} ${profile.last_name}`.trim()
      : profile.username)
    : "";

  const initials = displayName
    .split(" ")
    .map(w => w[0]?.toUpperCase())
    .slice(0, 2)
    .join("");

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />

      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
            <p className="text-surface-500 font-medium text-sm">Loading your profile…</p>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-28 pb-16">
          {/* Back button */}
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600 font-medium mb-6 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>

          {/* Hero Banner */}
          <div className="relative rounded-2xl overflow-hidden mb-0 shadow-glass">
            <div className="h-44 relative"
              style={{ background: 'linear-gradient(135deg, #1e2a5e 0%, #4263eb 50%, #7c3aed 100%)' }}>
              <div className="absolute top-0 right-0 w-56 h-56 bg-white/10 rounded-full blur-[60px] -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-40 h-40 bg-brand-300/20 rounded-full blur-[40px] -ml-10 -mb-10" />
            </div>

            {/* Avatar overlapping banner */}
            <div className="bg-white px-7 pb-7">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-10 mb-5">
                <div className="relative inline-block">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-2xl font-display font-black shadow-xl border-4 border-white">
                    {initials || <User size={32} />}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 rounded-lg border-2 border-white flex items-center justify-center">
                    <ShieldCheck size={12} className="text-white" />
                  </div>
                </div>

                <div className="flex items-center gap-2 pb-1">
                  {!editing ? (
                    <button onClick={() => setEditing(true)}
                      className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2">
                      <Edit3 size={14} /> Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={handleCancel}
                        className="btn-secondary py-2.5 px-4 text-sm flex items-center gap-1.5">
                        <X size={14} /> Cancel
                      </button>
                      <button onClick={handleSave} disabled={saving}
                        className="btn-primary py-2.5 px-5 text-sm flex items-center gap-1.5 disabled:opacity-60">
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h1 className="text-xl font-display font-bold text-surface-900 leading-tight">{displayName || "—"}</h1>
                <p className="text-surface-500 font-medium text-sm mt-0.5">@{profile?.username}</p>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid md:grid-cols-3 gap-5 mt-5">
            {/* Left: Profile details */}
            <div className="md:col-span-2 space-y-5">
              {saveSuccess && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-5 py-3 rounded-xl font-medium text-sm animate-slide-down">
                  <Check size={16} className="text-emerald-500" /> Profile updated successfully!
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-600 px-5 py-3 rounded-xl font-medium text-sm">
                  <X size={16} /> {saveError}
                </div>
              )}

              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-surface-100">
                  <h2 className="font-display font-bold text-surface-900 text-sm">Personal Information</h2>
                  <p className="text-surface-400 text-xs mt-0.5">Your basic account details</p>
                </div>
                <div className="p-6 space-y-4">
                  {/* Username */}
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                      <AtSign size={11} /> Username
                    </label>
                    <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-surface-50 border border-surface-100 text-surface-500 font-medium text-sm">
                      <span className="text-surface-400">@</span>
                      {profile?.username}
                      <span className="ml-auto text-[10px] font-bold text-surface-300 uppercase tracking-wider">Cannot change</span>
                    </div>
                  </div>

                  {/* Editable fields */}
                  {[
                    { key: 'first_name', label: 'First Name', icon: <User size={11} />, form: 'first_name' },
                    { key: 'last_name', label: 'Last Name', icon: <User size={11} />, form: 'last_name' },
                    { key: 'email', label: 'Email Address', icon: <Mail size={11} />, form: 'email', type: 'email' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                        {f.icon} {f.label}
                      </label>
                      {editing ? (
                        <input type={f.type || "text"} value={form[f.form]}
                          onChange={e => setForm({ ...form, [f.form]: e.target.value })}
                          placeholder={`Enter ${f.label.toLowerCase()}`}
                          className="input-premium h-11 text-sm" />
                      ) : (
                        <div className="h-11 px-4 rounded-xl bg-surface-50 border border-surface-100 flex items-center text-surface-800 font-medium text-sm gap-2">
                          {profile?.[f.key] || <span className="text-surface-300">Not set</span>}
                          {f.key === 'email' && <ShieldCheck size={14} className="text-emerald-500 ml-auto flex-shrink-0" />}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-5">
              {/* Account type card */}
              <div className="rounded-2xl p-6 text-white relative overflow-hidden"
                style={{ background: 'linear-gradient(135deg, #1e2a5e 0%, #4263eb 100%)' }}>
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-6 -mt-6" />
                <div className="relative z-10">
                  <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center mb-3 border border-white/10">
                    <ShieldCheck size={18} className="text-emerald-300" />
                  </div>
                  <p className="text-brand-200 text-[10px] font-bold uppercase tracking-wider mb-0.5">Account Type</p>
                  <p className="text-white font-display font-bold text-lg">Customer</p>
                  <p className="text-brand-200 text-xs mt-1.5">Verified member since joining RentlyX</p>
                </div>
              </div>

              {/* Quick actions */}
              {/* Quick actions */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3.5 border-b border-surface-100">
                  <h3 className="font-bold text-surface-900 text-sm">Quick Actions</h3>
                </div>

                <div className="p-2 space-y-0.5">
                  {[
                    {
                      icon: <BookOpen size={15} />,
                      label: "My Bookings",
                      to: "/my-bookings",
                      color: "text-brand-600 bg-brand-50"
                    },
                    {
                      icon: <Heart size={15} />,
                      label: "Saved Properties",
                      to: "/favorites",
                      color: "text-rose-500 bg-rose-50"
                    },
                    {
                      icon: <MessageSquare size={15} />,
                      label: "Messages",
                      to: "/messages",
                      color: "text-emerald-600 bg-emerald-50"
                    },
                    {
                      icon: <User size={15} />,
                      label: "Browse Listings",
                      to: "/",
                      color: "text-violet-600 bg-violet-50"
                    }
                  ].map(a => (
                    <button
                      key={a.label}
                      onClick={() => navigate(a.to)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition group text-left"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${a.color}`}>
                        {a.icon}
                      </div>

                      <span className="text-sm font-medium text-surface-700 group-hover:text-surface-900 transition-colors">
                        {a.label}
                      </span>

                      <svg
                        className="ml-auto w-4 h-4 text-surface-300 group-hover:text-surface-500 group-hover:translate-x-0.5 transition-all"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-rose-200 text-rose-500 hover:bg-rose-50 font-semibold text-sm transition">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerProfile;
