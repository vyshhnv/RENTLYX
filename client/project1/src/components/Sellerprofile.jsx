import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Bar from "./Bar";
import { API_BASE_URL as BASE_URL } from "../config/api";
import {
  User, Mail, AtSign, Edit3, Save, X, Phone, MapPin,
  ShieldCheck, Building2, Home, BookOpen, MessageSquare,
  ArrowRight, CheckCircle2, Loader2, List, AlertCircle, ArrowLeft
} from "lucide-react";

function SellerProfile() {
  const navigate = useNavigate();
  const token = sessionStorage.getItem("token");
  const sellerId = sessionStorage.getItem("seller_id");

  const [profile, setProfile] = useState(null);   // Django user
  const [sellerInfo, setSellerInfo] = useState(null);   // Seller model
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    first_name: "", last_name: "", email: "",
  });

  const fetchAll = useCallback(async () => {
    try {
      const [userRes, sellerRes] = await Promise.all([
        axios.get(`${BASE_URL}/user/profile/`, { headers: { Authorization: `Token ${token}` } }),
        axios.get(`${BASE_URL}/seller/${sellerId}/`, { headers: { Authorization: `Token ${token}` } }),
      ]);
      setProfile(userRes.data);
      setSellerInfo(sellerRes.data);
      setFormData({
        first_name: userRes.data.first_name || "",
        last_name: userRes.data.last_name || "",
        email: userRes.data.email || "",
      });
    } catch { setError("Failed to load profile."); }
    finally { setLoading(false); }
  }, [sellerId, token]);

  useEffect(() => {
    if (!token || !sellerId) { navigate("/seller/login"); return; }
    fetchAll();
  }, [fetchAll, navigate, sellerId, token]);

  const handleSave = async () => {
    setSaving(true); setError("");
    try {
      const res = await axios.patch(`${BASE_URL}/user/profile/`, formData, {
        headers: { Authorization: `Token ${token}` },
      });
      setProfile(res.data);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { setError("Failed to save changes."); }
    finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setFormData({
      first_name: profile.first_name || "",
      last_name: profile.last_name || "",
      email: profile.email || "",
    });
    setEditing(false);
    setError("");
  };

  const getInitials = () => {
    if (profile?.first_name && profile?.last_name)
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    return (profile?.username || "S").slice(0, 2).toUpperCase();
  };

  const getDisplayName = () => {
    if (profile?.first_name || profile?.last_name)
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
    return profile?.username || "Seller";
  };

  if (loading) return (
    <div className="min-h-screen bg-surface-50">
      <Bar forceSolid />
      <div className="flex items-center justify-center pt-40">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
          <p className="text-surface-500 font-medium text-sm">Loading profile...</p>
        </div>
      </div>
    </div>
  );

  const panVerified = sellerInfo?.pan_verified;

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid />

      {/* Banner */}
      <div className="h-48 w-full relative"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)" }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-16 pb-16 relative z-10">

        {/* Back button */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-white/80 hover:text-white font-semibold mb-4 transition text-sm">
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        {/* Header card */}
        <div className="bg-white rounded-3xl shadow-xl border border-surface-100 p-6 mb-6">
          <div className="flex items-end justify-between flex-wrap gap-4">
            <div className="flex items-end gap-5">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-xl border-4 border-white"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                  {getInitials()}
                </div>
                <div className={`absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg flex items-center justify-center border-2 border-white shadow-md ${panVerified ? "bg-emerald-500" : "bg-amber-400"}`}>
                  {panVerified
                    ? <ShieldCheck size={14} className="text-white" />
                    : <AlertCircle size={14} className="text-white" />
                  }
                </div>
              </div>
              <div className="mb-1">
                <h1 className="text-2xl font-black text-surface-900 leading-tight">{getDisplayName()}</h1>
                <p className="text-surface-400 text-sm font-medium">@{profile?.username?.toUpperCase()}</p>
                <div className={`inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${panVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {panVerified ? <><CheckCircle2 size={11} /> PAN Verified</> : <><AlertCircle size={11} /> PAN Pending</>}
                </div>
              </div>
            </div>

            {!editing ? (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5">
                <Edit3 size={16} /> Edit Profile
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={cancelEdit}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-sm border border-surface-200 text-surface-600 hover:bg-surface-50 transition">
                  <X size={15} /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 transition-all hover:-translate-y-0.5 disabled:opacity-60">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {saved && (
            <div className="mt-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-xl text-sm font-semibold">
              <CheckCircle2 size={16} /> Profile updated successfully!
            </div>
          )}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-semibold">{error}</div>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-6">

          {/* Left: forms */}
          <div className="md:col-span-2 space-y-5">

            {/* Personal Info */}
            <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-base font-bold text-surface-800">Personal Information</h2>
                <p className="text-surface-400 text-xs mt-0.5">Your account details — first/last name and email are editable</p>
              </div>

              <div className="space-y-5">

                {/* Username */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                    <AtSign size={11} /> Username
                  </label>
                  <div className="flex items-center bg-surface-50 border border-surface-100 rounded-xl px-4 py-3">
                    <AtSign size={15} className="text-surface-300 mr-3 shrink-0" />
                    <span className="text-surface-700 font-semibold text-sm flex-1">{profile?.username}</span>
                    <span className="text-[10px] font-bold text-surface-300 uppercase tracking-wider">Cannot change</span>
                  </div>
                </div>

                {/* First Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                    <User size={11} /> First Name
                  </label>
                  {editing ? (
                    <input value={formData.first_name}
                      onChange={e => setFormData(p => ({ ...p, first_name: e.target.value }))}
                      placeholder="Enter first name"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium text-surface-800 focus:outline-none focus:ring-2 focus:border-emerald-400 focus:ring-emerald-400/10 transition" />
                  ) : (
                    <div className="flex items-center bg-surface-50 border border-surface-100 rounded-xl px-4 py-3">
                      <User size={15} className="text-surface-300 mr-3 shrink-0" />
                      <span className={`text-sm font-medium ${profile?.first_name ? "text-surface-700" : "text-surface-300 italic"}`}>
                        {profile?.first_name || "Not set"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                    <User size={11} /> Last Name
                  </label>
                  {editing ? (
                    <input value={formData.last_name}
                      onChange={e => setFormData(p => ({ ...p, last_name: e.target.value }))}
                      placeholder="Enter last name"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium text-surface-800 focus:outline-none focus:ring-2 focus:border-emerald-400 focus:ring-emerald-400/10 transition" />
                  ) : (
                    <div className="flex items-center bg-surface-50 border border-surface-100 rounded-xl px-4 py-3">
                      <User size={15} className="text-surface-300 mr-3 shrink-0" />
                      <span className={`text-sm font-medium ${profile?.last_name ? "text-surface-700" : "text-surface-300 italic"}`}>
                        {profile?.last_name || "Not set"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                    <Mail size={11} /> Email Address
                  </label>
                  {editing ? (
                    <input type="email" value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                      placeholder="Enter email address"
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium text-surface-800 focus:outline-none focus:ring-2 focus:border-emerald-400 focus:ring-emerald-400/10 transition" />
                  ) : (
                    <div className="flex items-center bg-surface-50 border border-surface-100 rounded-xl px-4 py-3">
                      <Mail size={15} className="text-surface-300 mr-3 shrink-0" />
                      <span className={`text-sm font-medium flex-1 ${profile?.email ? "text-surface-700" : "text-surface-300 italic"}`}>
                        {profile?.email || "Not set"}
                      </span>
                      {profile?.email && (
                        <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Business Info — read only from seller model */}
            <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-base font-bold text-surface-800">Business Information</h2>
                <p className="text-surface-400 text-xs mt-0.5">Details from your seller registration — contact support to update</p>
              </div>

              <div className="space-y-4">
                {/* Phone */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                    <Phone size={11} /> Phone Number
                  </label>
                  <div className="flex items-center bg-surface-50 border border-surface-100 rounded-xl px-4 py-3">
                    <Phone size={15} className="text-surface-300 mr-3 shrink-0" />
                    <span className={`text-sm font-medium ${sellerInfo?.phone ? "text-surface-700" : "text-surface-300 italic"}`}>
                      {sellerInfo?.phone || "Not provided"}
                    </span>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                    <MapPin size={11} /> Office Address
                  </label>
                  <div className="flex items-start bg-surface-50 border border-surface-100 rounded-xl px-4 py-3">
                    <MapPin size={15} className="text-surface-300 mr-3 shrink-0 mt-0.5" />
                    <span className={`text-sm font-medium leading-relaxed ${sellerInfo?.address ? "text-surface-700" : "text-surface-300 italic"}`}>
                      {sellerInfo?.address || "Not provided"}
                    </span>
                  </div>
                </div>

                {/* PAN Status */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-surface-400 uppercase tracking-wider mb-2">
                    <ShieldCheck size={11} /> PAN Verification
                  </label>
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${panVerified ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${panVerified ? "bg-emerald-100" : "bg-amber-100"}`}>
                        <ShieldCheck size={18} className={panVerified ? "text-emerald-600" : "text-amber-600"} />
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${panVerified ? "text-emerald-700" : "text-amber-700"}`}>
                          {panVerified ? "PAN Verified" : "PAN Not Verified"}
                        </p>
                        <p className={`text-xs ${panVerified ? "text-emerald-500" : "text-amber-500"}`}>
                          {panVerified ? "Your identity is verified" : "Verification required to list properties"}
                        </p>
                      </div>
                    </div>
                    {!panVerified && (
                      <button onClick={() => navigate("/seller/panverify")}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition shrink-0">
                        Verify Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">

            {/* Account Type */}
            <div className="rounded-3xl p-6 text-white relative overflow-hidden shadow-lg"
              style={{ background: "linear-gradient(135deg, #064e3b 0%, #059669 100%)" }}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl bg-emerald-400/20 flex items-center justify-center mb-4">
                  <Building2 size={22} className="text-white" />
                </div>
                <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Account Type</p>
                <h3 className="text-2xl font-black mb-1">Seller</h3>
                <p className="text-white/70 text-xs leading-relaxed">Verified seller on RentlyX</p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-surface-700 mb-4">Quick Actions</h3>
              <div className="space-y-1.5">
                {[
                  { label: "My Listings", icon: <List size={18} />, to: "/seller/properties", color: "text-violet-600", bg: "bg-violet-50" },
                  { label: "Bookings", icon: <BookOpen size={18} />, to: "/seller/bookings", color: "text-amber-600", bg: "bg-amber-50" },
                  { label: "Messages", icon: <MessageSquare size={18} />, to: "/seller/messages", color: "text-emerald-600", bg: "bg-emerald-50" },
                  { label: "Dashboard", icon: <Building2 size={18} />, to: "/seller/dashboard", color: "text-indigo-600", bg: "bg-indigo-50" },
                  { label: "Add Property", icon: <Home size={18} />, to: "/add", color: "text-brand-600", bg: "bg-brand-50" },
                ].map(({ label, icon, to, color, bg }) => (
                  <button key={to} onClick={() => navigate(to)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-surface-50 transition group text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg} ${color}`}>{icon}</div>
                    <span className="text-sm font-semibold text-surface-700 group-hover:text-surface-900 flex-1">{label}</span>
                    <ArrowRight size={14} className="text-surface-300 group-hover:text-surface-500 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default SellerProfile;
