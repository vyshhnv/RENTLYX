import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Bar from "./Bar";
import {
  MapPin, Clock, CheckCircle2, XCircle, RefreshCw,
  IndianRupee, Home, ArrowLeft, Hourglass, ShieldCheck,
  CalendarDays, Phone, MessageSquare, Layers, AlertTriangle,
  Star, Edit2, Send
} from "lucide-react";

const STATUS_CONFIG = {
  pending: { label: "Pending Approval", icon: Hourglass, badge: "bg-amber-100 text-amber-700 border border-amber-200", dot: "bg-amber-400", pulse: true, border: "border-amber-200" },
  accepted: { label: "Booking Accepted", icon: CheckCircle2, badge: "bg-emerald-100 text-emerald-700 border border-emerald-200", dot: "bg-emerald-500", pulse: false, border: "border-emerald-200" },
  rejected: { label: "Booking Rejected", icon: XCircle, badge: "bg-rose-100 text-rose-600 border border-rose-200", dot: "bg-rose-400", pulse: false, border: "border-rose-100" },
  refunded: { label: "Refund Initiated", icon: RefreshCw, badge: "bg-blue-100 text-blue-600 border border-blue-200", dot: "bg-blue-400", pulse: false, border: "border-blue-100" },
  cancelled: { label: "Cancelled", icon: XCircle, badge: "bg-surface-100 text-surface-600 border border-surface-200", dot: "bg-surface-400", pulse: false, border: "border-surface-200" },
};

const fmt = (num) => Number(num).toLocaleString("en-IN");
const fmtDate = (str) => new Date(str).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtTime = (str) => new Date(str).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

// ── Star Rating Component ─────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 22 }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={size}
            className={`transition-colors ${star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "fill-surface-100 text-surface-300"
              }`}
          />
        </button>
      ))}
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ booking, existingReview, onClose, onSubmitted }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const token = sessionStorage.getItem("token");

  const isEdit = !!existingReview;

  const handleSubmit = async () => {
    if (!rating) { setError("Please select a rating."); return; }
    setSubmitting(true);
    setError("");
    try {
      let res;
      if (isEdit) {
        res = await fetch(`http://127.0.0.1:8000/api/reviews/${existingReview.id}/update/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": `Token ${token}` },
          body: JSON.stringify({ rating, comment }),
        });
      } else {
        res = await fetch(`http://127.0.0.1:8000/api/reviews/submit/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Token ${token}` },
          body: JSON.stringify({
            property_id: booking.property?.id,
            booking_id: booking.id,
            rating,
            comment,
          }),
        });
      }
      const data = await res.json();
      if (res.ok) {
        onSubmitted({ id: data.review_id || existingReview?.id, rating, comment });
        onClose();
      } else {
        setError(data?.error || "Failed to submit review.");
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  const LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-surface-100 max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-base font-display font-bold text-surface-900">
              {isEdit ? "Edit Your Review" : "Write a Review"}
            </h3>
            <p className="text-xs text-surface-400 mt-0.5">
              {booking.property_name || booking.property?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 transition"
          >
            <XCircle size={18} />
          </button>
        </div>

        {/* Star Rating */}
        <div className="mb-4">
          <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
            Your Rating
          </p>
          <div className="flex items-center gap-3">
            <StarRating value={rating} onChange={setRating} size={28} />
            {rating > 0 && (
              <span className="text-sm font-semibold text-amber-600">{LABELS[rating]}</span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-5">
          <p className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">
            Your Experience <span className="text-surface-300 font-normal">(optional)</span>
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your experience with this property..."
            rows={4}
            className="w-full px-3.5 py-3 rounded-xl border border-surface-200 text-sm text-surface-800 placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 resize-none transition"
          />
          <p className="text-[10px] text-surface-300 mt-1 text-right">{comment.length}/500</p>
        </div>

        {error && (
          <p className="text-rose-500 text-xs font-semibold mb-3 flex items-center gap-1.5">
            <AlertTriangle size={12} /> {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !rating}
            className="flex-1 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <RefreshCw size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
            {isEdit ? "Update Review" : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);  // booking object
  // myReviews: { [property_id]: { id, rating, comment } }
  const [myReviews, setMyReviews] = useState({});

  const getUserToken = () => sessionStorage.getItem("token");

  const fetchBookings = useCallback(async (token) => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/bookings/my/", {
        headers: { "Content-Type": "application/json", "Authorization": `Token ${token}` },
      });
      if (res.status === 401) { setError("Session expired or logged in as seller."); setLoading(false); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Booking fetch error:", err);
      setError("Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMyReviews = useCallback(async (token) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/reviews/my/", {
        headers: { "Authorization": `Token ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyReviews(data);
      }
    } catch { /* silently fail */ }
  }, []);

  useEffect(() => {
    const token = getUserToken();
    if (!token) { navigate("/login"); return; }
    fetchBookings(token);
    fetchMyReviews(token);
  }, [fetchBookings, fetchMyReviews, navigate]);

  const handleCancelConfirm = async () => {
    const bookingId = confirmId;
    setConfirmId(null);
    const token = getUserToken();
    setCancelling(bookingId);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/bookings/${bookingId}/cancel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Token ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: data.status } : b))
        );
      } else {
        alert(data?.error || "Failed to cancel booking.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setCancelling(null);
    }
  };

  const handleReviewSubmitted = (propertyId, review) => {
    setMyReviews((prev) => ({ ...prev, [String(propertyId)]: review }));
  };

  // Review allowed for accepted, refunded, cancelled bookings
  const canReview = (b) => ['accepted', 'refunded', 'cancelled'].includes(b.status);

  const filtered = filter === "all" ? bookings : bookings.filter((b) => b.status === filter);
  const counts = bookings.reduce((acc, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {});
  const filters = ["all", "pending", "accepted", "rejected", "refunded"];

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />

      {/* ── Cancel Confirmation Modal ── */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-xl border border-surface-100 max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-50">
                <AlertTriangle size={20} className="text-rose-500" />
              </div>
              <div>
                <h3 className="text-sm font-display font-bold text-surface-900">Cancel Booking?</h3>
                <p className="text-xs text-surface-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-surface-600 mb-5 leading-relaxed">
              Your token amount will be refunded to your original payment method within{" "}
              <span className="font-semibold text-surface-800">5–7 business days</span>.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition">
                Keep Booking
              </button>
              <button onClick={handleCancelConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition">
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewModal && (
        <ReviewModal
          booking={reviewModal}
          existingReview={myReviews[String(reviewModal.property?.id)]}
          onClose={() => setReviewModal(null)}
          onSubmitted={(review) => {
            handleReviewSubmitted(reviewModal.property?.id, review);
          }}
        />
      )}

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-surface-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)}
              className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-800 transition">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-display font-bold text-surface-900">My Bookings</h1>
              <p className="text-xs text-surface-400 font-medium">
                {bookings.length} total booking{bookings.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          {/* Desktop Filter Tabs */}
          <div className="hidden md:flex items-center gap-1 bg-surface-100 p-1 rounded-xl">
            {filters.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${filter === f ? "bg-white text-brand-700 shadow-sm" : "text-surface-500 hover:text-surface-800"
                  }`}>
                {f}
                {f !== "all" && counts[f] ? (
                  <span className="ml-1.5 bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-full text-[10px]">
                    {counts[f]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Mobile Filter */}
        <div className="flex md:hidden items-center gap-2 mb-6 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-all border ${filter === f ? "bg-brand-600 text-white border-brand-600" : "bg-white text-surface-500 border-surface-200"
                }`}>
              {f} {f !== "all" && counts[f] ? `(${counts[f]})` : ""}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid gap-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 bg-surface-100 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-20">
            <p className="text-rose-500 font-semibold text-sm">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-surface-200">
            <div className="inline-flex p-5 rounded-2xl bg-brand-50 mb-5">
              <Home size={32} className="text-brand-300" />
            </div>
            <h3 className="text-lg font-display font-bold text-surface-800 mb-2">No bookings found</h3>
            <p className="text-surface-400 mb-6 text-sm">
              {filter === "all" ? "You haven't made any bookings yet." : `No ${filter} bookings to show.`}
            </p>
            <button onClick={() => navigate("/")} className="btn-primary text-sm">Browse Properties</button>
          </div>
        )}

        {/* Booking Cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid gap-5">
            {filtered.map((b) => {
              const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.cancelled;
              const StatusIcon = cfg.icon;
              const img = b.property?.property_image || b.property_image ||
                "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&auto=format";
              const isCancellingThis = cancelling === b.id;
              const canCancel = b.status === "pending" || b.status === "accepted";
              const propertyId = b.property?.id;
              const existingReview = myReviews[String(propertyId)];
              const reviewable = canReview(b);

              return (
                <div key={b.id}
                  className={`bg-white rounded-2xl border ${cfg.border} shadow-sm hover:shadow-glass transition-all duration-300 overflow-hidden`}>
                  <div className="flex flex-col md:flex-row">
                    {/* Property Image */}
                    <div className="relative md:w-52 h-44 md:h-auto cursor-pointer flex-shrink-0 overflow-hidden bg-surface-100"
                      onClick={() => navigate(`/property/${propertyId}`)}>
                      <img src={img} alt={b.property_name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className="text-xs font-semibold text-white bg-black/30 backdrop-blur-sm px-2 py-1 rounded-lg">
                          View Property →
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      {/* Title + Badge */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Verified Property</span>
                          </div>
                          <h2 className="text-base font-display font-bold text-surface-900 truncate cursor-pointer hover:text-brand-600 transition"
                            onClick={() => navigate(`/property/${propertyId}`)}>
                            {b.property_name || b.property?.name}
                          </h2>
                          <div className="flex items-center gap-1.5 text-surface-500 text-sm mt-1">
                            <MapPin size={12} className="text-brand-400 shrink-0" />
                            <span className="truncate">
                              {b.property_place || b.property?.property_place}
                              {b.property?.city ? `, ${b.property.city}` : ""}
                            </span>
                          </div>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap ${cfg.badge}`}>
                          {cfg.pulse ? (
                            <span className="relative flex h-1.5 w-1.5">
                              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
                              <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cfg.dot}`} />
                            </span>
                          ) : (
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          )}
                          <StatusIcon size={11} /> {cfg.label}
                        </div>
                      </div>

                      {/* Financial */}
                      <div className="grid grid-cols-3 gap-2.5 mb-4">
                        <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-0.5">Property Price</p>
                          <p className="text-sm font-bold text-surface-900 flex items-center gap-0.5">
                            <IndianRupee size={12} className="text-surface-400" />{fmt(b.property_price)}
                          </p>
                        </div>
                        <div className="bg-brand-50 rounded-xl p-3 border border-brand-100">
                          <p className="text-[10px] font-bold text-brand-400 uppercase tracking-wider mb-0.5">Token Paid (5%)</p>
                          <p className="text-sm font-bold text-brand-700 flex items-center gap-0.5">
                            <IndianRupee size={12} />{fmt(b.token_amount)}
                          </p>
                        </div>
                        <div className="bg-surface-50 rounded-xl p-3 border border-surface-100">
                          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-0.5">Remaining</p>
                          <p className="text-sm font-bold text-surface-700 flex items-center gap-0.5">
                            <IndianRupee size={12} className="text-surface-400" />{fmt(b.remaining_amount)}
                          </p>
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-surface-500 font-medium">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-brand-300" />
                          {fmtDate(b.created_at)} at {fmtTime(b.created_at)}
                        </span>
                        {b.user_phone && (
                          <span className="flex items-center gap-1.5"><Phone size={12} className="text-brand-300" />{b.user_phone}</span>
                        )}
                        {b.user_message && (
                          <span className="flex items-center gap-1.5 max-w-xs truncate">
                            <MessageSquare size={12} className="text-brand-300 shrink-0" />{b.user_message}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5 ml-auto">
                          <Layers size={12} className="text-brand-300" />Booking #{b.id}
                        </span>
                      </div>

                      {/* Status Banners */}
                      {b.status === "pending" && b.expires_at && (
                        <div className="mt-3 flex items-center gap-2 text-amber-600 text-xs font-semibold bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                          <Clock size={12} /> Seller has until {fmtDate(b.expires_at)} to respond
                        </div>
                      )}
                      {b.status === "accepted" && (
                        <div className="mt-3 flex items-center gap-2 text-emerald-600 text-xs font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={12} /> Booking confirmed — seller will contact you at {b.user_phone}. You may still cancel if needed.
                        </div>
                      )}
                      {b.status === "refunded" && (
                        <div className="mt-3 flex items-center gap-2 text-blue-600 text-xs font-semibold bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                          <RefreshCw size={12} /> Refund of ₹{fmt(b.token_amount)} will reflect in 5–7 business days
                        </div>
                      )}
                      {b.status === "cancelled" && (
                        <div className="mt-3 flex items-center gap-2 text-surface-500 text-xs font-semibold bg-surface-50 px-3 py-2 rounded-xl border border-surface-200">
                          <XCircle size={12} /> This booking was cancelled
                        </div>
                      )}

                      {/* ── Bottom Action Row ── */}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        {/* Cancel Button */}
                        {canCancel && (
                          <button
                            onClick={() => setConfirmId(b.id)}
                            disabled={isCancellingThis}
                            className="flex items-center gap-2 text-rose-600 text-xs font-semibold bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 hover:bg-rose-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isCancellingThis ? (
                              <><RefreshCw size={12} className="animate-spin" /> Cancelling...</>
                            ) : (
                              <><XCircle size={12} /> Cancel Booking</>
                            )}
                          </button>
                        )}

                        {/* ── Review Button ── */}
                        {reviewable && (
                          existingReview ? (
                            /* Already reviewed — show stars + edit button */
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1 bg-amber-50 border border-amber-100 px-3 py-2 rounded-xl">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Star key={s} size={12}
                                    className={s <= existingReview.rating
                                      ? "fill-amber-400 text-amber-400"
                                      : "fill-surface-100 text-surface-300"} />
                                ))}
                                <span className="text-xs font-bold text-amber-700 ml-1">Your review</span>
                              </div>
                              <button
                                onClick={() => setReviewModal(b)}
                                className="flex items-center gap-1.5 text-brand-600 text-xs font-semibold bg-brand-50 px-3 py-2 rounded-xl border border-brand-100 hover:bg-brand-100 transition"
                              >
                                <Edit2 size={11} /> Edit
                              </button>
                            </div>
                          ) : (
                            /* Not yet reviewed */
                            <button
                              onClick={() => setReviewModal(b)}
                              className="flex items-center gap-2 text-amber-700 text-xs font-semibold bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 hover:bg-amber-100 transition"
                            >
                              <Star size={12} className="fill-amber-400 text-amber-400" />
                              Write a Review
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
