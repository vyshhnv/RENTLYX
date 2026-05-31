import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Bar from "./Bar";
import { API_BASE_URL } from "../config/api";
import {
  PlusCircle, List, Home, ArrowRight,
  ShieldCheck, User, MessageCircle, Bookmark, AlertCircle,
  Clock, CheckCircle2, XCircle, ChevronRight, ClipboardList
} from "lucide-react";

function SellerDashboard() {
  const navigate = useNavigate();
  const [verificationStatus, setVerificationStatus] = useState("loading");
  const [sellerName, setSellerName] = useState("Seller");
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);

  const [listingStats, setListingStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [recentListings, setRecentListings] = useState([]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const sellerId = sessionStorage.getItem("seller_id");
    if (!token || !sellerId) { navigate("/seller/login"); return; }

    const fetchSellerStatus = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/seller/${sellerId}/`,
          { headers: { Authorization: `Token ${token}` } }
        );
        if (res.data) {
          const name = res.data.user?.first_name || res.data.user?.username || res.data.name || "Seller";
          setSellerName(name);
          const panVal = res.data.pan_verified;
          const verified = panVal === true || panVal === "true" || panVal === 1 || panVal === "1";
          setVerificationStatus(verified ? "verified" : "not_verified");
          if (verified) sessionStorage.setItem("seller_verified", "true");
          else sessionStorage.removeItem("seller_verified");
        }
      } catch (err) {
        console.error("Failed to load seller verification status:", err);
        const cached = sessionStorage.getItem("seller_verified");
        setVerificationStatus(cached === "true" ? "verified" : "not_verified");
      }
    };

    const fetchUnreadCount = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/chat/rooms/`, { headers: { Authorization: `Token ${token}` } });
        const total = res.data.reduce((sum, room) => sum + (room.unread_count || 0), 0);
        setUnreadCount(total);
      } catch (err) {
        console.error("Failed to load unread message count:", err);
      }
    };

    const fetchPendingBookings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/bookings/seller/`, { headers: { Authorization: `Token ${token}` } });
        const pending = res.data.filter((b) => b.status === "pending").length;
        setPendingBookingsCount(pending);
      } catch (err) {
        console.error("Failed to load pending bookings:", err);
      }
    };

    const fetchListingStatuses = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/seller/my-properties/`, {
          headers: { Authorization: `Token ${token}` }
        });
        const props = Array.isArray(res.data) ? res.data : res.data.results || [];
        setListingStats({
          pending:  props.filter(p => p.listing_status === "pending").length,
          approved: props.filter(p => p.listing_status === "approved").length,
          rejected: props.filter(p => p.listing_status === "rejected").length,
        });
        setRecentListings(props.slice(0, 3));
      } catch (err) {
        console.error("Failed to load listing statuses:", err);
      }
    };

    fetchSellerStatus();
    fetchUnreadCount();
    fetchPendingBookings();
    fetchListingStatuses();
  }, [navigate]);

  const statusIcon = (s) => {
    if (s === "approved") return <CheckCircle2 size={13} className="text-emerald-500" />;
    if (s === "rejected") return <XCircle size={13} className="text-red-500" />;
    return <Clock size={13} className="text-amber-500" />;
  };

  const statusPill = (s) => {
    if (s === "approved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  // desc for approval card — dynamic based on stats
  const approvalDesc = () => {
    if (listingStats.rejected > 0)
      return `${listingStats.rejected} listing${listingStats.rejected > 1 ? "s" : ""} rejected — action needed`;
    if (listingStats.pending > 0)
      return `${listingStats.pending} listing${listingStats.pending > 1 ? "s" : ""} awaiting admin approval`;
    if (listingStats.approved > 0)
      return `All ${listingStats.approved} listing${listingStats.approved > 1 ? "s" : ""} approved and live`;
    return "Track approval status of your listings";
  };

  const cards = [
    {
      label: "Post Property",
      desc: "Create a new listing to reach thousands of potential buyers.",
      cta: "Start Listing",
      icon: <PlusCircle size={26} />,
      to: "/add",
      bg: "bg-brand-50", text: "text-brand-600", iconBg: "bg-brand-100",
      hoverBorder: "hover:border-brand-200",
    },
    {
      label: "My Listings",
      desc: "View, edit, or delete your active property listings.",
      cta: "Manage Listings",
      icon: <List size={26} />,
      to: "/seller/properties",
      bg: "bg-blue-50", text: "text-blue-600", iconBg: "bg-blue-100",
      hoverBorder: "hover:border-blue-200",
    },
    {
      label: "Messages",
      desc: unreadCount > 0
        ? `${unreadCount} unread message${unreadCount > 1 ? "s" : ""} from buyers`
        : "View messages from interested buyers",
      cta: "View Messages",
      icon: <MessageCircle size={26} />,
      to: "/seller/messages",
      bg: "bg-emerald-50", text: "text-emerald-600", iconBg: "bg-emerald-100",
      hoverBorder: "hover:border-emerald-200",
      badge: unreadCount,
    },
    {
      label: "Bookings",
      desc: pendingBookingsCount > 0
        ? `${pendingBookingsCount} pending booking request${pendingBookingsCount > 1 ? "s" : ""}`
        : "View and manage token booking requests",
      cta: "Manage Bookings",
      icon: <Bookmark size={26} />,
      to: "/seller/bookings",
      bg: "bg-amber-50", text: "text-amber-600", iconBg: "bg-amber-100",
      hoverBorder: "hover:border-amber-200",
      badge: pendingBookingsCount,
    },
  ];

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />

      <main className="max-w-5xl mx-auto px-6 pt-28 pb-12 flex justify-center">
        <div className="w-full max-w-3xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-display font-extrabold text-surface-900">Dashboard</h1>
            <p className="text-surface-500 mt-1 flex items-center gap-2 text-sm">
              <User size={15} /> Welcome back, {sellerName}
            </p>
          </div>

          {/* Verification Banner */}
          {verificationStatus === "loading" && (
            <div className="h-20 bg-surface-100 rounded-2xl animate-pulse mb-8" />
          )}
          {verificationStatus === "verified" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4 mb-8">
              <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600"><ShieldCheck size={28} /></div>
              <div>
                <h3 className="text-emerald-800 font-bold">Account Verified</h3>
                <p className="text-emerald-600 text-sm">Your PAN is verified. You have full access to listing properties.</p>
              </div>
            </div>
          )}
          {verificationStatus === "not_verified" && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4 mb-8">
              <div className="bg-amber-100 p-3 rounded-xl text-amber-600"><AlertCircle size={28} /></div>
              <div className="flex-1">
                <h3 className="text-amber-800 font-bold">PAN Verification Pending</h3>
                <p className="text-amber-600 text-sm">Verify your PAN to start listing properties on RentlyX.</p>
              </div>
              <button onClick={() => navigate("/seller/panverify")}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition shrink-0">
                Verify Now
              </button>
            </div>
          )}

          {/* Cards Grid */}
          <div className="grid md:grid-cols-2 gap-5">

            {/* Regular action cards */}
            {cards.map((c) => (
              <button key={c.label} onClick={() => navigate(c.to)}
                className={`group relative bg-white rounded-2xl p-6 border border-surface-100 shadow-sm hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden ${c.hoverBorder}`}>
                <div className={`absolute top-0 right-0 w-28 h-28 ${c.bg} rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500`} />
                <div className="relative z-10">
                  <div className={`w-11 h-11 ${c.iconBg} ${c.text} rounded-xl flex items-center justify-center mb-4 relative`}>
                    {c.icon}
                    {c.badge > 0 && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {c.badge > 9 ? "9+" : c.badge}
                      </div>
                    )}
                  </div>
                  <h3 className={`text-lg font-bold text-surface-800 mb-1 group-hover:${c.text} transition-colors`}>
                    {c.label}
                  </h3>
                  <p className="text-surface-500 text-sm mb-5">{c.desc}</p>
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${c.text}`}>
                    {c.cta} <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </button>
            ))}

            {/* ── LISTING APPROVAL STATUS — same card style ── */}
            <button onClick={() => navigate("/seller/properties")}
              className="group relative bg-white rounded-2xl p-6 border border-surface-100 shadow-sm hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden hover:border-violet-200 md:col-span-2">
              <div className="absolute top-0 right-0 w-28 h-28 bg-violet-50 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left: icon + title + desc + cta */}
                  <div className="flex-1 min-w-0">
                    <div className="w-11 h-11 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mb-4 relative">
                      <ClipboardList size={26} />
                      {listingStats.pending > 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {listingStats.pending > 9 ? "9+" : listingStats.pending}
                        </div>
                      )}
                      {listingStats.rejected > 0 && listingStats.pending === 0 && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                          {listingStats.rejected}
                        </div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-surface-800 mb-1 group-hover:text-violet-600 transition-colors">
                      Listing Approval Status
                    </h3>
                    <p className="text-surface-500 text-sm mb-5">{approvalDesc()}</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-600">
                      View Listings <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>

                  {/* Right: status counters */}
                  <div className="flex gap-3 shrink-0">
                    {[
                      { label: "Pending",  count: listingStats.pending,  icon: <Clock size={14} />,        bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-100" },
                      { label: "Approved", count: listingStats.approved, icon: <CheckCircle2 size={14} />, bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
                      { label: "Rejected", count: listingStats.rejected, icon: <XCircle size={14} />,      bg: "bg-red-50",     text: "text-red-500",     border: "border-red-100" },
                    ].map(({ label, count, icon, bg, text, border }) => (
                      <div key={label} className={`${bg} ${border} border rounded-xl px-4 py-3 text-center min-w-[72px]`}>
                        <div className={`flex items-center justify-center gap-1 ${text} mb-1`}>
                          {icon}
                          <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                        </div>
                        <div className={`text-2xl font-black ${text}`}>{count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent listings preview */}
                {recentListings.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-surface-100 space-y-2">
                    {recentListings.map(p => (
                      <div key={p.id} className="flex items-center gap-3 p-2.5 bg-surface-50 rounded-xl border border-surface-100">
                        {p.property_image
                          ? <img src={p.property_image} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                          : <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center text-base shrink-0">🏠</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-surface-800 truncate">{p.name}</p>
                          <p className="text-xs text-surface-400 truncate">{p.property_place}, {p.city}</p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold shrink-0 ${statusPill(p.listing_status)}`}>
                          {statusIcon(p.listing_status)}
                          <span className="capitalize">{p.listing_status}</span>
                        </div>
                      </div>
                    ))}
                    {/* Rejection notes */}
                    {recentListings.some(p => p.listing_status === "rejected" && p.admin_rejection_note) && (
                      <div className="mt-1 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <p className="text-xs font-bold text-red-700 mb-1">Rejection Note:</p>
                        {recentListings
                          .filter(p => p.listing_status === "rejected" && p.admin_rejection_note)
                          .map(p => (
                            <p key={p.id} className="text-xs text-red-600">
                              <span className="font-semibold">{p.name}:</span> {p.admin_rejection_note}
                            </p>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </button>

            {/* Browse Properties */}
            <button onClick={() => navigate("/")}
              className="group relative bg-white rounded-2xl p-6 border border-surface-100 shadow-sm hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 text-left overflow-hidden hover:border-violet-200 md:col-span-2">
              <div className="absolute top-0 right-0 w-28 h-28 bg-violet-50 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
              <div className="relative z-10">
                <div className="w-11 h-11 bg-violet-100 text-violet-600 rounded-xl flex items-center justify-center mb-4">
                  <Home size={26} />
                </div>
                <h3 className="text-lg font-bold text-surface-800 mb-1 group-hover:text-violet-600 transition-colors">
                  Browse Properties
                </h3>
                <p className="text-surface-500 text-sm mb-5">Explore available properties in the marketplace.</p>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-violet-600">
                  View Market <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </button>

          </div>
        </div>
      </main>
    </div>
  );
}

export default SellerDashboard;
