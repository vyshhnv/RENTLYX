import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000/api";

const fmt = (n) => Number(n || 0).toLocaleString("en-IN");
const fmtPrice = (n) => {
  const v = Number(n || 0);
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  return `₹${fmt(v)}`;
};

const COMPLAINT_LABELS = {
  incorrect_listing:   "Incorrect listing",
  fraudulent_property: "Fraudulent property",
  agent_misconduct:    "Agent misconduct",
  payment_issue:       "Payment issue",
  technical_bug:       "Technical bug",
  other:               "Other",
};

const Stars = ({ rating, size = "sm" }) => {
  const sz = size === "sm" ? "text-xs" : "text-sm";
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`${sz} ${i <= rating ? "text-amber-400" : "text-slate-200"}`}>★</span>
      ))}
    </div>
  );
};

const Badge = ({ children, color = "indigo" }) => {
  const map = {
    indigo:  "bg-indigo-100 text-indigo-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber:   "bg-amber-100 text-amber-700",
    rose:    "bg-rose-100 text-rose-700",
    slate:   "bg-slate-100 text-slate-600",
    blue:    "bg-blue-100 text-blue-700",
    orange:  "bg-orange-100 text-orange-700",
  };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${map[color] || map.slate}`}>
      {children}
    </span>
  );
};

const StatCard = ({ icon, label, value, sub, accent }) => (
  <div className="relative overflow-hidden rounded-2xl p-5 bg-white shadow-sm border border-slate-100 flex flex-col gap-1">
    <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -mr-6 -mt-6" style={{ background: accent }} />
    <div className="flex items-center gap-3 mb-1">
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
    <div className="text-3xl font-black text-slate-900 leading-none">{value}</div>
    {sub && <div className="text-xs text-slate-400 font-medium mt-0.5">{sub}</div>}
  </div>
);

const ConfirmModal = ({ item, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
      <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <h3 className="text-center font-black text-slate-800 text-lg mb-1">Confirm Delete</h3>
      <p className="text-center text-slate-500 text-sm mb-6">
        Delete <span className="font-bold text-slate-700">"{item}"</span>?<br />
        <span className="text-rose-500 text-xs">This cannot be undone.</span>
      </p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition">Cancel</button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm transition">Delete</button>
      </div>
    </div>
  </div>
);

const Toast = ({ message, type, onClose }) => {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl font-semibold text-sm
      ${type === "success" ? "bg-emerald-500" : "bg-rose-500"} text-white`}>
      <span>{type === "success" ? "✓" : "✕"}</span>{message}
    </div>
  );
};

const DeleteBtn = ({ onClick }) => (
  <button onClick={onClick}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-xs font-bold transition border border-rose-100">
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
    Delete
  </button>
);

const TH = ({ children, center }) => (
  <th className={`px-5 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${center ? "text-center" : "text-left"}`}>
    {children}
  </th>
);

const RatingBar = ({ n, count, total }) => {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const colors = { 5: "#22c55e", 4: "#10b981", 3: "#f59e0b", 2: "#f97316", 1: "#ef4444" };
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-6 text-right shrink-0">{n}★</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: colors[n] }} />
      </div>
      <span className="text-xs text-slate-400 w-5 shrink-0">{count}</span>
    </div>
  );
};

const rvUsername  = (r) => r.username      || r.user?.username  || "Unknown";
const rvPropName  = (r) => r.property_name || r.property?.name  || `Property #${r.property_id ?? r.property}`;
const rvPropId    = (r) => r.property_id   ?? r.property?.id    ?? r.property;

// ─── Login ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [un, setUn]         = useState("");
  const [pw, setPw]         = useState("");
  const [err, setErr]       = useState("");
  const [loading, setLoad]  = useState(false);
  const [showPw, setShowPw] = useState(false);

  const submit = async () => {
    if (!un || !pw) { setErr("Enter username and password."); return; }
    setErr(""); setLoad(true);
    try {
      const res   = await axios.post(`${BASE_URL}/auth/login/`, { username: un, password: pw });
      const token = res.data?.token;
      if (!token) throw new Error();
      onLogin(token);
    } catch {
      setErr("Invalid credentials. Use your Django superuser account.");
    } finally { setLoad(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: "linear-gradient(rgba(99,102,241,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.08) 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="relative z-10 w-full max-w-sm px-6">
        <div className="text-center mb-8">
          <div className="text-4xl font-black text-white">
            Rently<span className="text-indigo-400">X</span>
            <span className="ml-2 text-xs font-bold text-indigo-400 border border-indigo-500/40 rounded-md px-2 py-0.5 align-middle">ADMIN</span>
          </div>
          <p className="text-slate-500 text-sm mt-2">Superuser access only</p>
        </div>
        <div className="bg-slate-800/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
          {err && <div className="mb-4 text-rose-300 text-xs font-semibold bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5">{err}</div>}
          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Username</label>
            <input value={un} onChange={e => setUn(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
              placeholder="admin" />
          </div>
          <div className="mb-6 relative">
            <label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">Password</label>
            <input type={showPw ? "text" : "password"} value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()}
              className="w-full bg-slate-900/80 border border-slate-600/50 rounded-xl px-4 py-3 pr-11 text-white text-sm outline-none focus:border-indigo-500 transition placeholder:text-slate-600"
              placeholder="••••••••" />
            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 bottom-3 text-slate-500 hover:text-slate-300 transition">
              {showPw
                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              }
            </button>
          </div>
          <button onClick={submit} disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl py-3 transition flex items-center justify-center gap-2">
            {loading ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Signing in…</> : "Sign In →"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ token, onLogout }) {
  const [tab, setTab]               = useState("overview");
  const [sellers, setSellers]       = useState([]);
  const [users, setUsers]           = useState([]);
  const [allProperties, setAllProps] = useState([]);   // ALL props (admin view)
  const [properties, setProps]      = useState([]);    // approved only (for overview stats)
  const [bookings, setBookings]     = useState([]);
  const [reviews, setReviews]       = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bookingErr, setBkErr]      = useState("");
  const [reviewErr, setRvErr]       = useState("");
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [deleteTarget, setDT]       = useState(null);
  const [toast, setToast]           = useState(null);
  const [rvFilter, setRvFilter]     = useState("all");
  const [propStatusFilter, setPropStatusFilter] = useState("pending"); // default to pending
  const [cFilter, setCFilter]       = useState("all");
  const [cTypeFilter, setCTypeFilter] = useState("all");

  const H = { Authorization: `Token ${token}` };
  const showToast = (msg, type = "success") => setToast({ message: msg, type });

  const loadAll = useCallback(async () => {
    setLoading(true); setBkErr(""); setRvErr("");
    const headers = { Authorization: `Token ${token}` };
    const [sR, uR, pR, pAllR, bR, rvR, cR] = await Promise.allSettled([
      axios.get(`${BASE_URL}/seller/`,                    { headers }),
      axios.get(`${BASE_URL}/user/`,                      { headers }),
      axios.get(`${BASE_URL}/properties/?page_size=1000`, { headers }),
      axios.get(`${BASE_URL}/properties/admin/all/`,      { headers }),
      axios.get(`${BASE_URL}/bookings/admin/all/`,        { headers }),
      axios.get(`${BASE_URL}/reviews/admin/all/`,         { headers }),
      axios.get(`${BASE_URL}/complaints/admin/all/`,      { headers }),
    ]);
    if (sR.status === "fulfilled")    { const d = sR.value.data;    setSellers(Array.isArray(d) ? d : d.results || []); }
    if (uR.status === "fulfilled")    { const d = uR.value.data;    setUsers(Array.isArray(d) ? d : d.results || []); }
    if (pR.status === "fulfilled")    { const d = pR.value.data;    setProps(Array.isArray(d) ? d : d.results || []); }
    if (pAllR.status === "fulfilled") { const d = pAllR.value.data; setAllProps(Array.isArray(d) ? d : d.results || []); }
    if (bR.status === "fulfilled")    { const d = bR.value.data;    setBookings(Array.isArray(d) ? d : d.results || []); }
    else setBkErr(bR.reason?.response?.status === 403 ? "403 — Add AdminAllBookingsView." : `Bookings error: ${bR.reason?.message}`);
    if (rvR.status === "fulfilled")   { const d = rvR.value.data;   setReviews(Array.isArray(d) ? d : d.results || []); }
    else setRvErr(rvR.reason?.response?.status === 403 ? "403 — Add AdminAllReviewsView." : `Reviews error: ${rvR.reason?.message}`);
    if (cR.status === "fulfilled")    { const d = cR.value.data;    setComplaints(Array.isArray(d) ? d : d.results || []); }
    setLoading(false);
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Property approval ──────────────────────────────────────────────────────
  const approveProperty = async (id, name) => {
    try {
      const res = await axios.patch(`${BASE_URL}/properties/${id}/approval/`, { action: "approve" }, { headers: H });
      setAllProps(prev => prev.map(p => p.id === id ? res.data : p));
      showToast(`"${name}" approved and now live.`);
    } catch (err) {
      showToast(err.response?.data?.error || "Approval failed.", "error");
    }
  };

  const rejectProperty = async (id, name, note = "") => {
    try {
      const res = await axios.patch(`${BASE_URL}/properties/${id}/approval/`, { action: "reject", note }, { headers: H });
      setAllProps(prev => prev.map(p => p.id === id ? res.data : p));
      showToast(`"${name}" rejected.`);
    } catch (err) {
      showToast(err.response?.data?.error || "Rejection failed.", "error");
    }
  };

  // ── Delete review ──────────────────────────────────────────────────────────
  const deleteReview = async (reviewId, label) => {
    try {
      await axios.delete(`${BASE_URL}/reviews/${reviewId}/delete/`, { headers: H });
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      showToast(`Review by "${label}" deleted.`);
    } catch (err) {
      showToast(err.response?.data?.detail || "Delete failed.", "error");
    }
  };

  // ── Complaint actions ──────────────────────────────────────────────────────
  const updateComplaintStatus = async (id, newStatus) => {
    try {
      const res = await axios.patch(`${BASE_URL}/complaints/${id}/status/`, { status: newStatus }, { headers: H });
      setComplaints(prev => prev.map(c => c.id === id ? res.data : c));
      showToast(`Complaint marked as "${newStatus}".`);
    } catch (err) {
      showToast(err.response?.data?.error || "Update failed.", "error");
    }
  };

  const deleteComplaint = async (id, name) => {
    try {
      await axios.delete(`${BASE_URL}/complaints/${id}/delete/`, { headers: H });
      setComplaints(prev => prev.filter(c => c.id !== id));
      showToast(`Complaint from "${name}" deleted.`);
    } catch (err) {
      showToast(err.response?.data?.detail || "Delete failed.", "error");
    }
  };

  // ── Delete user/seller ─────────────────────────────────────────────────────
  const executeDelete = async () => {
    if (!deleteTarget) return;
    const { type, id, userId, name } = deleteTarget;
    try {
      if (type === "user") {
        await axios.delete(`${BASE_URL}/user/${id}/`, { headers: H });
        setUsers(prev => prev.filter(u => u.id !== id));
        showToast(`User "${name}" deleted.`);
      } else if (type === "seller") {
        const endpoint = userId ? `${BASE_URL}/user/${userId}/` : `${BASE_URL}/seller/${id}/`;
        await axios.delete(endpoint, { headers: H });
        setSellers(prev => prev.filter(s => s.id !== id));
        showToast(`Seller "${name}" deleted.`);
      }
    } catch (err) {
      showToast(err.response?.data?.detail || err.message || "Delete failed.", "error");
    } finally { setDT(null); }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const verifiedSellers   = sellers.filter(s => s.pan_verified);
  const forRent           = properties.filter(p => p.purpose === "rent").length;
  const forSale           = properties.filter(p => p.purpose === "sale").length;
  const pendingCount      = bookings.filter(b => b.status === "pending").length;
  const lowReviewCount    = reviews.filter(r => r.rating <= 2).length;
  const pendingComplaints = complaints.filter(c => c.status === "pending").length;
  const pendingListings   = allProperties.filter(p => p.listing_status === "pending").length;
  const avgRating         = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const enrichedSellers = sellers
    .map(s => ({ ...s, propCount: properties.filter(p => p.seller?.id === s.id).length }))
    .sort((a, b) => b.propCount - a.propCount);

  const typeBreak = ["apartment", "house", "villa", "flat"].map(t => ({
    type: t, count: properties.filter(p => p.property_type === t).length,
  }));

  const bColor = s => {
    if (s === "confirmed" || s === "accepted") return "emerald";
    if (s === "pending")                        return "amber";
    if (s === "rejected" || s === "cancelled")  return "rose";
    return "slate";
  };
  const ratingColor  = r => r >= 4 ? "emerald" : r === 3 ? "amber" : "rose";
  const statusColor  = s => s === "resolved" ? "emerald" : s === "reviewed" ? "blue" : "amber";

  // ── Filters ────────────────────────────────────────────────────────────────
  const q = search.toLowerCase();
  const fSell = enrichedSellers.filter(s => !q ||
    s.user?.username?.toLowerCase().includes(q) ||
    s.user?.email?.toLowerCase().includes(q) ||
    s.phone?.includes(q));
  const fUser = users.filter(u => !q ||
    u.username?.toLowerCase().includes(q) ||
    u.email?.toLowerCase().includes(q));

  // Properties tab uses allProperties (admin view) + status filter
  const fPropAdmin = allProperties.filter(p => {
    const matchSearch = !q ||
      p.name?.toLowerCase().includes(q) ||
      p.city?.toLowerCase().includes(q) ||
      p.property_place?.toLowerCase().includes(q) ||
      p.seller?.user?.username?.toLowerCase().includes(q);
    const matchStatus = propStatusFilter === "all" || p.listing_status === propStatusFilter;
    return matchSearch && matchStatus;
  });

  const fBook = bookings.filter(b => !q ||
    b.user?.username?.toLowerCase().includes(q) ||
    b.buyer_name?.toLowerCase().includes(q) ||
    b.property?.name?.toLowerCase().includes(q));
  const fReviews = reviews.filter(r => {
    const matchSearch = !q ||
      rvUsername(r).toLowerCase().includes(q) ||
      rvPropName(r).toLowerCase().includes(q) ||
      (r.comment || "").toLowerCase().includes(q);
    const matchStar = rvFilter === "all" || String(r.rating) === rvFilter;
    return matchSearch && matchStar;
  });
  const fComplaints = complaints.filter(c => {
    const matchSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.message?.toLowerCase().includes(q);
    const matchStatus = cFilter === "all" || c.status === cFilter;
    const matchType   = cTypeFilter === "all" || c.complaint_type === cTypeFilter;
    return matchSearch && matchStatus && matchType;
  });

  const navItems = [
    { id: "overview",   icon: "📊", label: "Overview" },
    { id: "sellers",    icon: "🏢", label: "Sellers" },
    { id: "users",      icon: "👤", label: "Users" },
    { id: "properties", icon: "🏠", label: "Properties" },
    { id: "bookings",   icon: "📋", label: "Bookings" },
    { id: "reviews",    icon: "⭐", label: "Reviews" },
    { id: "complaints", icon: "📣", label: "Complaints" },
  ];

  return (
    <div className="min-h-screen bg-[#f4f5f9] flex font-sans">

      {/* Sidebar */}
      <aside className="w-60 bg-[#0b0f19] text-white flex flex-col shrink-0 fixed h-full z-20">
        <div className="px-6 py-6 border-b border-slate-800">
          <div className="text-2xl font-black">Rently<span className="text-indigo-400">X</span></div>
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Admin Panel</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setTab(item.id); setSearch(""); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition
                ${tab === item.id ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === "bookings"   && pendingCount > 0 && <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
              {item.id === "reviews"    && lowReviewCount > 0 && <span className="ml-auto bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{lowReviewCount}</span>}
              {item.id === "complaints" && pendingComplaints > 0 && <span className="ml-auto bg-orange-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingComplaints}</span>}
              {item.id === "properties" && pendingListings > 0 && <span className="ml-auto bg-amber-400 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingListings}</span>}
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-800 space-y-1">
          <button onClick={loadAll} className="w-full text-left text-xs font-semibold text-slate-500 hover:text-indigo-400 transition px-3 py-2 rounded-lg hover:bg-slate-800">↻ Refresh</button>
          <button onClick={onLogout} className="w-full text-left text-xs font-semibold text-slate-500 hover:text-rose-400 transition px-3 py-2 rounded-lg hover:bg-slate-800">→ Sign Out</button>
        </div>
      </aside>

      {/* Main */}
      <main className="ml-60 flex-1 min-h-screen">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200 px-8 py-4 flex items-center justify-between">
          <h1 className="text-lg font-black text-slate-900 capitalize">{tab}</h1>
          <div className="flex items-center gap-3">
            {tab !== "overview" && (
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={`Search ${tab}…`}
                className="bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-indigo-400 focus:bg-white transition w-56" />
            )}
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">A</div>
          </div>
        </header>

        <div className="px-8 py-8">
          {loading ? (
            <div className="grid grid-cols-4 gap-5">
              {[0,1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* ══ OVERVIEW ══════════════════════════════════════════════════ */}
              {tab === "overview" && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard icon="🏢" label="Sellers"    value={sellers.length}          sub={`${verifiedSellers.length} verified`}         accent="#6366f1" />
                    <StatCard icon="👤" label="Users"      value={users.length}            sub="Registered buyers"                            accent="#10b981" />
                    <StatCard icon="🏠" label="Properties" value={allProperties.length}    sub={`${pendingListings} pending approval`}         accent="#f59e0b" />
                    <StatCard icon="📣" label="Complaints" value={complaints.length}       sub={`${pendingComplaints} pending`}               accent="#f97316" />
                  </div>

                  {/* Pending approvals quick view */}
                  {pendingListings > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-amber-800 text-sm uppercase tracking-wider">⏳ Pending Listing Approvals</h3>
                          <p className="text-amber-600 text-xs mt-0.5">{pendingListings} propert{pendingListings !== 1 ? "ies" : "y"} waiting for review</p>
                        </div>
                        <button onClick={() => { setTab("properties"); setPropStatusFilter("pending"); }}
                          className="text-xs font-bold text-amber-700 hover:text-amber-900 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition">
                          Review Now →
                        </button>
                      </div>
                      <div className="space-y-2">
                        {allProperties.filter(p => p.listing_status === "pending").slice(0, 3).map(p => (
                          <div key={p.id} className="flex items-center gap-3 bg-white rounded-xl p-3 border border-amber-100">
                            {p.property_image
                              ? <img src={p.property_image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                              : <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg shrink-0">🏠</div>
                            }
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-800 truncate">{p.name}</p>
                              <p className="text-xs text-slate-400">by {p.seller?.user?.username} · {p.property_place}</p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <button onClick={() => approveProperty(p.id, p.name)}
                                className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition">
                                ✓ Approve
                              </button>
                              <button onClick={() => { const n = window.prompt("Rejection reason? (optional)"); if (n !== null) rejectProperty(p.id, p.name, n); }}
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition border border-red-200">
                                ✕ Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Property Types</h3>
                      <div className="space-y-3">
                        {typeBreak.map(({ type, count }) => {
                          const pct = properties.length ? Math.round((count / properties.length) * 100) : 0;
                          const colors = { apartment: "#6366f1", house: "#10b981", villa: "#f59e0b", flat: "#ef4444" };
                          return (
                            <div key={type}>
                              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1 capitalize">
                                <span>{type}</span><span>{count} ({pct}%)</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: colors[type] }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <h3 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Top Sellers</h3>
                      <div className="space-y-3">
                        {enrichedSellers.slice(0, 5).map((s, i) => (
                          <div key={s.id} className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-black">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-800 truncate">{s.user?.username || "—"}</div>
                              <div className="text-xs text-slate-400 truncate">{s.user?.email || "—"}</div>
                            </div>
                            <Badge color={s.propCount > 0 ? "indigo" : "slate"}>{s.propCount} listing{s.propCount !== 1 ? "s" : ""}</Badge>
                          </div>
                        ))}
                        {sellers.length === 0 && <p className="text-slate-400 text-sm">No sellers yet.</p>}
                      </div>
                    </div>
                  </div>

                  {complaints.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Recent Complaints</h3>
                        <button onClick={() => setTab("complaints")} className="text-xs font-bold text-indigo-500 hover:text-indigo-700">View All →</button>
                      </div>
                      <div className="space-y-3">
                        {complaints.slice(0, 4).map(c => (
                          <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50">
                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold shrink-0">
                              {c.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-slate-800">{c.name}</span>
                                <Badge color="orange">{COMPLAINT_LABELS[c.complaint_type] || c.complaint_type}</Badge>
                                <Badge color={statusColor(c.status)}>{c.status}</Badge>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5 truncate">{c.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reviews.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Review Snapshot</h3>
                        <button onClick={() => setTab("reviews")} className="text-xs font-bold text-indigo-500 hover:text-indigo-700">View All →</button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div className="text-5xl font-black text-slate-900">{avgRating}</div>
                          <Stars rating={Math.round(parseFloat(avgRating))} size="md" />
                          <div className="text-xs text-slate-400 mt-1">{reviews.length} total reviews</div>
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                          {[5,4,3,2,1].map(n => (
                            <RatingBar key={n} n={n} count={reviews.filter(r => r.rating === n).length} total={reviews.length} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-5">
                    <div className="bg-indigo-600 rounded-2xl p-6 text-white">
                      <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">For Sale</div>
                      <div className="text-5xl font-black">{forSale}</div>
                      <div className="text-sm opacity-70 mt-1">properties listed</div>
                    </div>
                    <div className="bg-emerald-500 rounded-2xl p-6 text-white">
                      <div className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">For Rent</div>
                      <div className="text-5xl font-black">{forRent}</div>
                      <div className="text-sm opacity-70 mt-1">properties listed</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ══ SELLERS ════════════════════════════════════════════════════ */}
              {tab === "sellers" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{fSell.length} seller{fSell.length !== 1 ? "s" : ""} found</p>
                    <div className="flex gap-2">
                      <Badge color="emerald">{verifiedSellers.length} Verified</Badge>
                      <Badge color="amber">{sellers.length - verifiedSellers.length} Pending</Badge>
                    </div>
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <TH>Seller</TH><TH>Email</TH><TH>Phone</TH>
                          <TH center>Listings</TH><TH center>PAN</TH><TH center>Action</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {fSell.map((s, i) => (
                          <tr key={`seller-${s.id}`} className={`border-b border-slate-50 hover:bg-slate-50 transition ${i % 2 ? "bg-slate-50/30" : ""}`}>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                  {(s.user?.username || "?")[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800">{s.user?.username || "—"}</div>
                                  <div className="text-xs text-slate-400">ID: {s.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-slate-500 text-xs">{s.user?.email || "—"}</td>
                            <td className="px-5 py-4 text-slate-500 text-xs">{s.phone || "—"}</td>
                            <td className="px-5 py-4 text-center">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black ${s.propCount > 0 ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}>
                                {s.propCount}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {s.pan_verified ? <Badge color="emerald">✓ Verified</Badge> : <Badge color="amber">Pending</Badge>}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <DeleteBtn onClick={() => setDT({ type: "seller", id: s.id, userId: s.user?.id, name: s.user?.username || `Seller #${s.id}` })} />
                            </td>
                          </tr>
                        ))}
                        {fSell.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No sellers found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ══ USERS ══════════════════════════════════════════════════════ */}
              {tab === "users" && (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">{fUser.length} user{fUser.length !== 1 ? "s" : ""} found</p>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <TH>User</TH><TH>Email</TH><TH>Name</TH>
                          <TH center>Role</TH><TH center>Status</TH><TH center>Action</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {fUser.map((u, i) => {
                          const uid = u.id;
                          const canDel = uid != null && !u.is_staff;
                          return (
                            <tr key={uid != null ? `user-${uid}` : `user-${u.username}`} className={`border-b border-slate-50 hover:bg-slate-50 transition ${i % 2 ? "bg-slate-50/30" : ""}`}>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                    {(u.username || "?")[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-800">{u.username}</div>
                                    <div className="text-xs text-slate-400">{uid != null ? `ID: ${uid}` : <span className="text-amber-500">⚠ No ID</span>}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-slate-500 text-xs">{u.email || "—"}</td>
                              <td className="px-5 py-4 text-slate-500 text-xs">
                                {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}`.trim() : "—"}
                              </td>
                              <td className="px-5 py-4 text-center">
                                {u.is_staff ? <Badge color="indigo">Staff</Badge> : <Badge color="slate">User</Badge>}
                              </td>
                              <td className="px-5 py-4 text-center">
                                {u.is_active !== false ? <Badge color="emerald">Active</Badge> : <Badge color="rose">Inactive</Badge>}
                              </td>
                              <td className="px-5 py-4 text-center">
                                {u.is_staff ? <span className="text-xs text-slate-300 font-semibold">Protected</span>
                                  : !canDel ? <span className="text-xs text-amber-400 font-semibold">No ID</span>
                                  : <DeleteBtn onClick={() => setDT({ type: "user", id: uid, name: u.username })} />
                                }
                              </td>
                            </tr>
                          );
                        })}
                        {fUser.length === 0 && <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400">No users found.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ══ PROPERTIES (with approval) ════════════════════════════════ */}
              {tab === "properties" && (
                <div className="space-y-6">
                  {/* Status filter tabs */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {["all", "pending", "approved", "rejected"].map(s => (
                      <button key={s} onClick={() => setPropStatusFilter(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition border capitalize ${propStatusFilter === s
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                        {s === "all" ? "All" : s}
                        <span className="ml-1.5 text-xs opacity-60">
                          ({s === "all" ? allProperties.length : allProperties.filter(p => p.listing_status === s).length})
                        </span>
                      </button>
                    ))}
                    <span className="ml-auto text-xs text-slate-400">{fPropAdmin.length} shown</span>
                  </div>

                  {/* Property detail cards */}
                  <div className="space-y-4">
                    {fPropAdmin.map(p => (
                      <div key={`prop-${p.id}`} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition overflow-hidden">
                        <div className="flex flex-col md:flex-row">
                          {/* Image */}
                          <div className="md:w-52 shrink-0">
                            {p.property_image
                              ? <img src={p.property_image} alt={p.name} className="w-full h-48 md:h-full object-cover" />
                              : <div className="w-full h-48 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-4xl">🏠</div>
                            }
                          </div>

                          {/* Details */}
                          <div className="flex-1 p-5">
                            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                              <div>
                                <h3 className="font-black text-slate-800 text-lg leading-tight">{p.name}</h3>
                                <p className="text-sm text-slate-400 mt-0.5">📍 {p.property_place}, {p.city}</p>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                  p.listing_status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : p.listing_status === "rejected" ? "bg-red-50 text-red-600 border-red-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                  {p.listing_status === "approved" ? "✓ Approved"
                                   : p.listing_status === "rejected" ? "✕ Rejected"
                                   : "⏳ Pending"}
                                </span>
                                <Badge color={p.purpose === "sale" ? "indigo" : "emerald"}>{p.purpose}</Badge>
                              </div>
                            </div>

                            {/* Specs grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                              {[
                                { label: "Price",   value: fmtPrice(p.price) },
                                { label: "Config",  value: p.bhk?.toUpperCase() },
                                { label: "Type",    value: p.property_type },
                                { label: "Area",    value: `${p.built_up_area} sq ft` },
                                { label: "Baths",   value: `${p.bathrooms} bath` },
                                { label: "Furnish", value: p.furnishing },
                                { label: "Seller",  value: p.seller?.user?.username || "—" },
                                { label: "Listed",  value: p.created_at ? new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—" },
                              ].map(({ label, value }) => (
                                <div key={label} className="bg-slate-50 rounded-xl p-2.5">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</div>
                                  <div className="text-xs font-bold text-slate-700 capitalize truncate">{value}</div>
                                </div>
                              ))}
                            </div>

                            {/* Description */}
                            {p.description && (
                              <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2 border-l-2 border-slate-200 pl-2">
                                {p.description}
                              </p>
                            )}

                            {/* Documents */}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {p.conditions_pdf && (
                                <a href={p.conditions_pdf} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition border border-red-100">
                                  📄 Terms PDF
                                </a>
                              )}
                              {p.legal_document && (
                                <a href={p.legal_document} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition border border-emerald-100">
                                  🛡 Legal Document
                                </a>
                              )}
                              {!p.legal_document && (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-400 rounded-lg text-xs font-medium border border-slate-100">
                                  ⚠ No legal doc
                                </span>
                              )}
                            </div>

                            {/* Rejection note */}
                            {p.listing_status === "rejected" && p.admin_rejection_note && (
                              <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <p className="text-xs font-bold text-red-700 mb-0.5">Rejection Note:</p>
                                <p className="text-xs text-red-600">{p.admin_rejection_note}</p>
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {p.listing_status !== "approved" && (
                                <button onClick={() => approveProperty(p.id, p.name)}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition shadow-sm">
                                  ✓ Approve
                                </button>
                              )}
                              {p.listing_status !== "rejected" && (
                                <button onClick={() => { const note = window.prompt(`Reason for rejecting "${p.name}"? (optional)`); if (note !== null) rejectProperty(p.id, p.name, note); }}
                                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition border border-red-200">
                                  ✕ Reject
                                </button>
                              )}
                              {p.listing_status === "approved" && (
                                <span className="text-xs text-emerald-500 font-semibold">✓ Live on platform</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {fPropAdmin.length === 0 && (
                      <div className="py-20 text-center bg-white rounded-2xl border border-slate-100">
                        <p className="text-4xl mb-3">🏠</p>
                        <p className="text-slate-500 font-semibold">No {propStatusFilter !== "all" ? propStatusFilter : ""} properties found.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══ BOOKINGS ══════════════════════════════════════════════════ */}
              {tab === "bookings" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-slate-500">{fBook.length} booking{fBook.length !== 1 ? "s" : ""} found</p>
                    <div className="flex gap-2 flex-wrap">
                      <Badge color="amber">{bookings.filter(b => b.status === "pending").length} Pending</Badge>
                      <Badge color="emerald">{bookings.filter(b => b.status === "confirmed" || b.status === "accepted").length} Confirmed</Badge>
                      <Badge color="rose">{bookings.filter(b => b.status === "rejected" || b.status === "cancelled").length} Rejected</Badge>
                    </div>
                  </div>
                  {bookingErr && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800"><p className="font-bold text-sm">⚠️ {bookingErr}</p></div>}
                  {!bookingErr && fBook.length === 0 && <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center"><p className="text-slate-500 font-semibold">No bookings found</p></div>}
                  {!bookingErr && fBook.length > 0 && (
                    <div className="space-y-3">
                      {fBook.map((b, idx) => (
                        <div key={b.id != null ? `booking-${b.id}` : `booking-idx-${idx}`}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                          <div className="flex items-start gap-4 flex-wrap">
                            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0">#{b.id}</div>
                            <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                  {(b.user?.username || b.buyer_name || "U")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Buyer</div>
                                  <div className="font-bold text-slate-800 text-sm truncate">{b.user?.username || b.buyer_name || "—"}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-base shrink-0">🏠</div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Property</div>
                                  <div className="font-bold text-slate-800 text-sm truncate">{b.property?.name || "—"}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                  {(b.property?.seller?.user?.username || "S")[0].toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Seller</div>
                                  <div className="font-bold text-slate-800 text-sm truncate">{b.property?.seller?.user?.username || "—"}</div>
                                </div>
                              </div>
                            </div>
                            <Badge color={bColor(b.status)}>{b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "—"}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══ REVIEWS ═══════════════════════════════════════════════════ */}
              {tab === "reviews" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard icon="⭐" label="Total Reviews" value={reviews.length} sub={`across ${[...new Set(reviews.map(r => rvPropId(r)))].length} properties`} accent="#f59e0b" />
                    <StatCard icon="📈" label="Avg Rating"    value={avgRating ?? "—"} sub="out of 5" accent="#10b981" />
                    <StatCard icon="🏆" label="5-Star"        value={reviews.filter(r => r.rating === 5).length} sub={`${reviews.length ? Math.round(reviews.filter(r => r.rating === 5).length / reviews.length * 100) : 0}%`} accent="#6366f1" />
                    <StatCard icon="⚠️"  label="Low (1–2 ★)"  value={lowReviewCount} sub="need attention" accent="#ef4444" />
                  </div>
                  {reviewErr && <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-amber-800"><p className="font-bold text-sm">⚠️ {reviewErr}</p></div>}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap bg-slate-50/50">
                      {["all","5","4","3","2","1"].map(v => (
                        <button key={v} onClick={() => setRvFilter(v)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition border ${rvFilter === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                          {v === "all" ? "All" : `${v} ★`}
                        </button>
                      ))}
                      <span className="ml-auto text-xs text-slate-400">{fReviews.length} result{fReviews.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="p-5 space-y-4">
                      {fReviews.map((r, idx) => {
                        const uname = rvUsername(r);
                        const pname = rvPropName(r);
                        return (
                          <div key={r.id ?? `rv-${idx}`} className="border border-slate-100 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-3 px-5 py-4 bg-slate-50/60 border-b border-slate-100">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                                {uname[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 text-sm">{uname}</div>
                                <div className="text-xs text-slate-400 truncate">{pname}</div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Stars rating={r.rating} size="sm" />
                                <Badge color={ratingColor(r.rating)}>{r.rating} / 5</Badge>
                              </div>
                            </div>
                            <div className="px-5 py-4">
                              {r.comment ? <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3">{r.comment}</p>
                                : <p className="text-sm text-slate-300 italic">No comment provided.</p>}
                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 flex-wrap">
                                {r.created_at && <span className="text-[11px] text-slate-400">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                                <button onClick={() => { if (window.confirm(`Delete review by "${uname}"?`)) deleteReview(r.id, uname); }}
                                  className="ml-auto inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-xs font-bold transition border border-rose-100">
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {fReviews.length === 0 && <div className="py-16 text-center text-slate-400">No reviews match your filter.</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* ══ COMPLAINTS ════════════════════════════════════════════════ */}
              {tab === "complaints" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard icon="📣" label="Total"    value={complaints.length}                                      sub="all time"        accent="#f97316" />
                    <StatCard icon="⏳" label="Pending"  value={complaints.filter(c => c.status === "pending").length}  sub="awaiting review" accent="#f59e0b" />
                    <StatCard icon="👀" label="Reviewed" value={complaints.filter(c => c.status === "reviewed").length} sub="in progress"     accent="#3b82f6" />
                    <StatCard icon="✅" label="Resolved" value={complaints.filter(c => c.status === "resolved").length} sub="closed"         accent="#10b981" />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap bg-slate-50/50">
                      <div className="flex gap-1.5 flex-wrap">
                        {["all","pending","reviewed","resolved"].map(v => (
                          <button key={v} onClick={() => setCFilter(v)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition border capitalize ${cFilter === v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}>
                            {v === "all" ? "All" : v}
                          </button>
                        ))}
                      </div>
                      <select value={cTypeFilter} onChange={e => setCTypeFilter(e.target.value)}
                        className="ml-auto text-xs border border-slate-200 rounded-lg px-3 py-1.5 text-slate-600 outline-none focus:border-indigo-400 bg-white cursor-pointer">
                        <option value="all">All types</option>
                        {Object.entries(COMPLAINT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                      <span className="text-xs text-slate-400">{fComplaints.length} result{fComplaints.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="p-5 space-y-4">
                      {fComplaints.length === 0 && (
                        <div className="py-20 text-center"><div className="text-4xl mb-3">📣</div><p className="text-slate-500 font-semibold">No complaints found.</p></div>
                      )}
                      {fComplaints.map(c => (
                        <div key={`complaint-${c.id}`} className="border border-slate-100 rounded-2xl overflow-hidden">
                          <div className="flex items-center gap-3 px-5 py-4 bg-slate-50/60 border-b border-slate-100">
                            <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold shrink-0">
                              {c.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-slate-800 text-sm">{c.name}</div>
                              <div className="text-xs text-slate-400">{c.email}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                              <Badge color="orange">{COMPLAINT_LABELS[c.complaint_type] || c.complaint_type}</Badge>
                              <Badge color={statusColor(c.status)}>{c.status}</Badge>
                              {c.created_at && <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>}
                            </div>
                          </div>
                          <div className="px-5 py-4">
                            <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-orange-200 pl-3">{c.message}</p>
                            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50 flex-wrap">
                              {c.status !== "resolved" && (
                                <>
                                  {c.status === "pending" && (
                                    <button onClick={() => updateComplaintStatus(c.id, "reviewed")}
                                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-bold transition border border-blue-100">
                                      Mark Reviewed
                                    </button>
                                  )}
                                  <button onClick={() => updateComplaintStatus(c.id, "resolved")}
                                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold transition border border-emerald-100">
                                    Mark Resolved
                                  </button>
                                </>
                              )}
                              {c.status === "resolved" && <span className="text-xs text-emerald-500 font-semibold">✓ Resolved</span>}
                              <button onClick={() => { if (window.confirm(`Delete complaint from "${c.name}"?`)) deleteComplaint(c.id, c.name); }}
                                className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg text-xs font-bold transition border border-rose-100">
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {deleteTarget && <ConfirmModal item={deleteTarget.name} onConfirm={executeDelete} onCancel={() => setDT(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem("admin_token") || "");
  const login  = tok => { sessionStorage.setItem("admin_token", tok); setToken(tok); };
  const logout = ()  => { sessionStorage.removeItem("admin_token"); setToken(""); };
  if (!token) return <LoginScreen onLogin={login} />;
  return <Dashboard token={token} onLogout={logout} />;
}
