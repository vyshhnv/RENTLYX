import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Bar from "./Bar";
import { API_BASE_URL as BASE_URL, buildMediaUrl } from "../config/api";
import { getErrorMessage, notifyError } from "../utils/notify";
import {
  CheckCircle2, XCircle, Clock, Phone, Mail,
  Home, ChevronLeft, AlertCircle, RefreshCw, Ban, AlertTriangle
} from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "bg-rose-100 text-rose-600 border-rose-200", icon: XCircle },
  refunded: { label: "Refunded", color: "bg-blue-100 text-blue-600 border-blue-200", icon: RefreshCw },
  cancelled: { label: "Cancelled by Buyer", color: "bg-surface-100 text-surface-600 border-surface-200", icon: Ban },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.cancelled;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold border ${cfg.color}`}>
      <Icon size={12} /> {cfg.label}
    </span>
  );
}

function SellerBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState("all");
  const [confirmReject, setConfirmReject] = useState(null); // booking id awaiting reject confirmation
  const token = sessionStorage.getItem("token");

  const fetchBookings = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/bookings/seller/`, {
        headers: { Authorization: `Token ${token}` },
      });
      setBookings(res.data);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) { navigate("/seller/login"); return; }
    fetchBookings();
  }, [fetchBookings, navigate, token]);

  const handleAction = async (bookingId, action) => {
    setActionLoading(bookingId);
    try {
      await axios.post(
        `${BASE_URL}/bookings/${bookingId}/action/`,
        { action },
        { headers: { Authorization: `Token ${token}` } }
      );
      await fetchBookings();
    } catch (err) {
      notifyError(getErrorMessage(err, "Action failed."));
    } finally {
      setActionLoading(null);
      setConfirmReject(null);
    }
  };

  const filters = ["all", "pending", "accepted", "rejected", "refunded", "cancelled"];
  const filteredBookings = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});
  const totalTokensCollected = bookings
    .filter((b) => b.status === "accepted")
    .reduce((sum, b) => sum + Number(b.token_amount), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center text-surface-500 font-sans">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-surface-300 border-t-brand-600 rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading bookings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 font-sans pb-20">
      <Bar forceSolid={true} />

      {/* ── Reject Confirmation Modal ── */}
      {confirmReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-100 max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <AlertTriangle size={20} className="text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-surface-900">Reject Accepted Booking?</h3>
                <p className="text-xs text-surface-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-surface-600 mb-5 leading-relaxed">
              The booking will be rejected and the buyer will receive a{" "}
              <span className="font-semibold text-surface-800">full refund</span> of their token amount
              within 5–7 business days.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmReject(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition"
              >
                Keep Accepted
              </button>
              <button
                onClick={() => handleAction(confirmReject, "reject")}
                disabled={actionLoading === confirmReject}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {actionLoading === confirmReject ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <XCircle size={14} />
                )}
                Yes, Reject & Refund
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pt-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 bg-white border border-surface-200 rounded-xl hover:bg-surface-50 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-display font-bold text-surface-900">Bookings</h1>
            <p className="text-surface-500 text-sm">Manage token booking requests from buyers</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="card p-4">
            <p className="text-[10px] text-surface-400 font-bold uppercase mb-0.5">Total</p>
            <p className="text-xl font-display font-bold text-surface-900">{bookings.length}</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
            <p className="text-[10px] text-amber-600 font-bold uppercase mb-0.5">Pending</p>
            <p className="text-xl font-display font-bold text-amber-700">{counts.pending || 0}</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
            <p className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Accepted</p>
            <p className="text-xl font-display font-bold text-emerald-700">{counts.accepted || 0}</p>
          </div>
          <div className="bg-brand-50 rounded-2xl p-4 border border-brand-100">
            <p className="text-[10px] text-brand-600 font-bold uppercase mb-0.5">Tokens Received</p>
            <p className="text-lg font-display font-bold text-brand-700">
              ₹{totalTokensCollected.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition capitalize border ${filter === f
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-surface-600 border-surface-200 hover:border-brand-300"
                }`}
            >
              {f === "all" ? `All (${bookings.length})` : `${f} (${counts[f] || 0})`}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-20 text-surface-400">
            <AlertCircle size={36} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold text-sm">No bookings found</p>
            <p className="text-xs mt-1">Booking requests from buyers will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map((booking) => {
              const isExpired = booking.status === "pending" && new Date(booking.expires_at) < new Date();
              const remaining = Number(booking.property_price) - Number(booking.token_amount);
              const displayStatus = isExpired ? "cancelled" : booking.status;

              return (
                <div
                  key={booking.id}
                  className={`card overflow-hidden hover:shadow-glass-lg transition-all duration-300 ${displayStatus === "cancelled" ? "opacity-80" : ""
                    }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between p-5 pb-4">
                    <div className="flex gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-100 shrink-0">
                        {booking.property_image ? (
                          <img
                            src={
                              booking.property_image.startsWith("http")
                                ? booking.property_image
                                : buildMediaUrl(booking.property_image)
                            }
                            alt={booking.property_name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.style.display = "none";
                              e.target.nextSibling.style.display = "flex";
                            }}
                          />
                        ) : null}
                        <div
                          className="w-full h-full flex items-center justify-center text-surface-300"
                          style={{ display: booking.property_image ? "none" : "flex" }}
                        >
                          <Home size={22} />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-surface-900 text-base leading-tight">
                          {booking.property_name}
                        </h3>
                        <p className="text-surface-500 text-sm">{booking.property_place}</p>
                        <p className="text-surface-400 text-xs mt-0.5">
                          Booking #{booking.id} ·{" "}
                          {new Date(booking.created_at).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={displayStatus} />
                  </div>

                  {/* Buyer Info + Payment */}
                  <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                      <p className="text-[10px] text-surface-400 font-bold uppercase mb-1.5">Buyer</p>
                      <p className="font-semibold text-surface-800 text-sm">{booking.user_name}</p>
                      <div className="flex items-center gap-1.5 text-surface-500 text-xs mt-1">
                        <Phone size={11} /> {booking.user_phone}
                      </div>
                      <div className="flex items-center gap-1.5 text-surface-500 text-xs mt-0.5">
                        <Mail size={11} /> {booking.buyer_email}
                      </div>
                    </div>
                    <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                      <p className="text-[10px] text-surface-400 font-bold uppercase mb-1.5">Payment Breakdown</p>
                      <div className="flex justify-between text-sm">
                        <span className="text-surface-500">Property Price</span>
                        <span className="font-bold text-surface-800">
                          ₹{Number(booking.property_price).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-surface-500 flex items-center gap-1">
                          Token Paid{" "}
                          <span className="text-[9px] bg-brand-100 text-brand-600 px-1 rounded font-bold">5%</span>
                        </span>
                        <span className="font-bold text-brand-700">
                          ₹{Number(booking.token_amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="border-t border-surface-200 mt-2 pt-2 flex justify-between text-sm font-bold">
                        <span className="text-emerald-600">Remaining Due</span>
                        <span className="text-emerald-700">₹{remaining.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Buyer Message */}
                  {booking.user_message && (
                    <div className="px-5 pb-4">
                      <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-sm text-brand-700">
                        <p className="font-semibold text-[10px] text-brand-400 uppercase mb-1">
                          Message from buyer
                        </p>
                        {booking.user_message}
                      </div>
                    </div>
                  )}

                  {/* Expiry Warning */}
                  {booking.status === "pending" && !isExpired && (
                    <div className="px-5 pb-4">
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 flex items-center gap-2">
                        <Clock size={13} />
                        Expires{" "}
                        {new Date(booking.expires_at).toLocaleString("en-IN", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}{" "}
                        — Auto-rejected if no action taken
                      </div>
                    </div>
                  )}

                  {/* ── Pending: Accept + Reject actions ── */}
                  {booking.status === "pending" && !isExpired && (
                    <div className="px-5 pb-5 flex gap-3">
                      <button
                        onClick={() => handleAction(booking.id, "accept")}
                        disabled={actionLoading === booking.id}
                        className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 text-sm"
                      >
                        {actionLoading === booking.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 size={16} />
                        )}
                        Accept Booking
                      </button>
                      <button
                        onClick={() => setConfirmReject(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="flex-1 py-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 font-semibold rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-60 text-sm"
                      >
                        <XCircle size={16} /> Reject & Refund
                      </button>
                    </div>
                  )}

                  {/* ── Accepted: Confirmed banner + Reject option ── */}
                  {booking.status === "accepted" && (
                    <div className="px-5 pb-5 flex flex-col gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm text-emerald-700 flex items-start gap-3">
                        <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm">Booking Confirmed</p>
                          <p className="text-xs text-emerald-600 mt-0.5">
                            Token of ₹{Number(booking.token_amount).toLocaleString("en-IN")} received.
                            Buyer still owes ₹{remaining.toLocaleString("en-IN")} — coordinate directly.
                          </p>
                        </div>
                      </div>
                      {/* Reject even after accepting */}
                      <button
                        onClick={() => setConfirmReject(booking.id)}
                        disabled={actionLoading === booking.id}
                        className="flex items-center justify-center gap-2 py-2.5 px-4 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 font-semibold rounded-xl transition disabled:opacity-60 text-sm w-fit"
                      >
                        <XCircle size={14} /> Reject & Refund Buyer
                      </button>
                    </div>
                  )}

                  {/* Rejected / Refunded Banner */}
                  {(booking.status === "rejected" || booking.status === "refunded") && (
                    <div className="px-5 pb-5">
                      <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs text-surface-500 flex items-center gap-2">
                        <RefreshCw size={12} />
                        Full refund of ₹{Number(booking.token_amount).toLocaleString("en-IN")} initiated to the buyer
                      </div>
                    </div>
                  )}

                  {/* Cancelled by Buyer Banner */}
                  {(booking.status === "cancelled" || isExpired) && (
                    <div className="px-5 pb-5">
                      <div className="bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs text-surface-500 flex items-center gap-2">
                        <Ban size={12} className="shrink-0" />
                        <span>
                          {isExpired && booking.status === "pending"
                            ? "This booking expired before you responded — it has been auto-cancelled."
                            : "The buyer cancelled this booking. Any token paid has been refunded to them."}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SellerBookings;
