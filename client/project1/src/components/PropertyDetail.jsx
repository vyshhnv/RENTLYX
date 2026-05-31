import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getProperty, getPropertyBookingStatus, analyzeConditionsPDF } from "../api/fetchApi";
import Bar from "./Bar";
import BookingModal from "./BookingModal";
import ImageCarousel from "./ImageCarousel";
import RentlyXMascot from "./RentlyXMascot";
import RentlyXWidget from "./RentlyXWidget";
import L from "leaflet";
import {
  Heart, MapPin, BedDouble, Bath, Maximize,
  Calendar, CheckCircle2, ShieldCheck, Share2, Sparkles,
  FileText, AlertCircle, Star, ChevronDown, ChevronUp,
  MessageSquare, Send, User
} from "lucide-react";
import axios from "axios";
import { API_BASE_URL as BASE_URL } from "../config/api";
import { notifyError } from "../utils/notify";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const leafletZIndexFix = `
  .leaflet-pane, .leaflet-top, .leaflet-bottom { z-index: 1 !important; }
  .leaflet-control { z-index: 2 !important; }
`;

const predictPrice = async (data) => {
  const res = await fetch(`${BASE_URL}/ai/predict-price/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      locality: data.locality,
      property_type: data.property_type,
      bhk: data.bhk || 1,
      floor: data.floor || 1,
    }),
  });
  if (!res.ok) throw new Error(`Server error: ${res.status}`);
  const json = await res.json();
  return {
    data: {
      predicted_price: json.predicted_price,
      range_low: json.range_low,
      range_high: json.range_high,
      confidence: json.confidence,
      locality_known: json.locality_known,
    },
  };
};

const TERM_FIELDS = [
  { label: "Monthly Rent",     key: "rent_amount",                icon: "💰" },
  { label: "Security Deposit", key: "security_deposit",           icon: "🔒" },
  { label: "Lease Duration",   key: "lease_duration",             icon: "📅" },
  { label: "Notice Period",    key: "notice_period",              icon: "📋" },
  { label: "Pets Allowed",     key: "pets_allowed",               icon: "🐾" },
  { label: "Maintenance",      key: "maintenance_responsibility", icon: "🔧" },
];

// ─── Star Rating Input ─────────────────────────────────────────────────────────
function StarInput({ value, onChange, size = 28 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
          style={{ fontSize: size }}
        >
          <span className={`${n <= (hover || value) ? "text-amber-400" : "text-slate-200"} transition-colors`}>★</span>
        </button>
      ))}
    </div>
  );
}

// ─── Static Stars Display ─────────────────────────────────────────────────────
function StarDisplay({ rating, size = "sm" }) {
  const sz = size === "sm" ? 14 : size === "md" ? 18 : 22;
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: sz, color: n <= rating ? "#fbbf24" : "#e2e8f0" }}>★</span>
      ))}
    </div>
  );
}

// ─── Reviews Section ───────────────────────────────────────────────────────────
function ReviewsSection({ propertyId }) {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const isLoggedIn = !!token;
  const headers = token ? { Authorization: `Token ${token}` } : {};

  const [reviews, setReviews]           = useState([]);
  const [avgRating, setAvgRating]       = useState(null);
  const [loading, setLoading]           = useState(true);
  const [myReview, setMyReview]         = useState(null);       // existing review by this user
  const [canReview, setCanReview]       = useState(false);      // has an eligible booking
  const [showForm, setShowForm]         = useState(false);
  const [expanded, setExpanded]         = useState(false);      // show all vs top 3
  const [editMode, setEditMode]         = useState(false);

  // Form state
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  // Fetch reviews + user's review
  const loadReviews = useCallback(async () => {
    const authHeaders = token ? { Authorization: `Token ${token}` } : {};
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}/reviews/property/${propertyId}/`);
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.average_rating);
    } catch {
      setReviews([]);
    }

    if (isLoggedIn) {
      try {
        const myRes = await axios.get(`${BASE_URL}/reviews/my/`, { headers: authHeaders });
        const mine = myRes.data[String(propertyId)];
        if (mine) { setMyReview(mine); setRating(mine.rating); setComment(mine.comment || ""); }
      } catch {
        setMyReview(null);
      }

      // Check if user has a qualifying booking
      try {
        const bookRes = await axios.get(`${BASE_URL}/bookings/my/`, { headers: authHeaders });
        const bookings = Array.isArray(bookRes.data) ? bookRes.data : bookRes.data.results || [];
        const eligible = bookings.some(
          b => String(b.property?.id || b.property) === String(propertyId) &&
               ["accepted", "refunded", "cancelled"].includes(b.status)
        );
        setCanReview(eligible);
      } catch { setCanReview(false); }
    }
    setLoading(false);
  }, [isLoggedIn, propertyId, token]);

  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleSubmit = async () => {
    if (rating === 0) { setFormError("Please select a star rating."); return; }
    setSubmitting(true); setFormError(""); setFormSuccess("");
    try {
      if (editMode && myReview) {
        await axios.patch(`${BASE_URL}/reviews/${myReview.id}/update/`, { rating, comment }, { headers });
        setFormSuccess("Review updated!");
      } else {
        await axios.post(`${BASE_URL}/reviews/submit/`, { property_id: propertyId, rating, comment }, { headers });
        setFormSuccess("Review submitted!");
      }
      setShowForm(false);
      setEditMode(false);
      await loadReviews();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to submit review.");
    } finally { setSubmitting(false); }
  };

  const visibleReviews = expanded ? reviews : reviews.slice(0, 3);

  // Build % bars for rating distribution
  const dist = [5, 4, 3, 2, 1].map(n => ({
    n, count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length ? Math.round(reviews.filter(r => r.rating === n).length / reviews.length * 100) : 0,
  }));

  const distColors = { 5: "#22c55e", 4: "#10b981", 3: "#f59e0b", 2: "#f97316", 1: "#ef4444" };

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare size={24} className="text-violet-500" />
            Reviews
            {reviews.length > 0 && (
              <span className="ml-1 text-sm font-semibold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {reviews.length}
              </span>
            )}
          </h2>
          {avgRating && (
            <div className="flex items-center gap-2 mt-1">
              <StarDisplay rating={Math.round(avgRating)} size="md" />
              <span className="font-black text-slate-700 text-lg">{avgRating}</span>
              <span className="text-slate-400 text-sm">/ 5</span>
            </div>
          )}
        </div>

        {/* CTA — write or edit review */}
        {isLoggedIn && canReview && !myReview && !showForm && (
          <button
            onClick={() => { setShowForm(true); setEditMode(false); setFormError(""); setFormSuccess(""); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-violet-100 transition-all hover:-translate-y-0.5"
          >
            <Star size={16} /> Write a Review
          </button>
        )}
        {isLoggedIn && myReview && !showForm && (
          <button
            onClick={() => { setShowForm(true); setEditMode(true); setRating(myReview.rating); setComment(myReview.comment); setFormError(""); setFormSuccess(""); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
          >
            <Star size={16} /> Edit Your Review
          </button>
        )}
      </div>

      {/* Rating distribution — shown when there are reviews */}
      {reviews.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-center">
          {/* Big average */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <span className="text-6xl font-black text-slate-900 leading-none">{avgRating}</span>
            <StarDisplay rating={Math.round(avgRating)} size="md" />
            <span className="text-xs text-slate-400 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
          </div>
          {/* Bars */}
          <div className="flex-1 w-full space-y-2">
            {dist.map(({ n, count, pct }) => (
              <div key={n} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-5 text-right shrink-0">{n}</span>
                <span className="text-amber-400 text-xs shrink-0">★</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: distColors[n] }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-5 shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review form */}
      {showForm && (
        <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-6 shadow-sm">
          <h4 className="font-bold text-slate-800 mb-4 text-base">
            {editMode ? "Edit Your Review" : "Share Your Experience"}
          </h4>

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Rating</label>
            <StarInput value={rating} onChange={setRating} size={32} />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Comment <span className="text-slate-300 font-normal normal-case">(optional)</span></label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
              placeholder="Describe your experience with this property…"
              className="w-full border border-violet-200 bg-white rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 resize-none transition placeholder:text-slate-300"
            />
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm mb-4">
              <AlertCircle size={15} className="shrink-0" /> {formError}
            </div>
          )}
          {formSuccess && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 text-sm mb-4">
              <CheckCircle2 size={15} className="shrink-0" /> {formSuccess}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-violet-100"
            >
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
                : <><Send size={15} /> {editMode ? "Update Review" : "Submit Review"}</>
              }
            </button>
            <button
              onClick={() => { setShowForm(false); setFormError(""); setFormSuccess(""); }}
              className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Your existing review callout */}
      {myReview && !showForm && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-amber-200 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">You</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-bold text-slate-800 text-sm">Your Review</span>
              <StarDisplay rating={myReview.rating} size="sm" />
            </div>
            {myReview.comment && <p className="text-sm text-slate-600 leading-relaxed">{myReview.comment}</p>}
          </div>
        </div>
      )}

      {/* Not eligible notice */}
      {isLoggedIn && !canReview && !myReview && !loading && (
        <p className="text-xs text-slate-400 italic flex items-center gap-1.5">
          <ShieldCheck size={13} />
          Only guests with a completed booking can leave a review.
        </p>
      )}

      {/* Not logged in */}
      {!isLoggedIn && (
        <p className="text-xs text-slate-400 italic">
          <a href="/login" className="text-violet-500 font-semibold hover:underline">Log in</a> to leave a review.
        </p>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-3 bg-slate-200 rounded w-1/4" />
                  <div className="h-2 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 py-14 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center">
            <Star size={24} className="text-slate-300" />
          </div>
          <p className="font-semibold text-slate-500">No reviews yet</p>
          <p className="text-xs text-slate-400">Be the first to share your experience.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleReviews.map((r, idx) => {
            const isOwn = myReview && r.id === myReview.id;
            const initials = (r.username || "U").slice(0, 2).toUpperCase();
            const avatarColors = [
              "from-violet-400 to-purple-500",
              "from-emerald-400 to-teal-500",
              "from-indigo-400 to-blue-500",
              "from-rose-400 to-pink-500",
              "from-amber-400 to-orange-500",
            ];
            const colorClass = avatarColors[(r.username?.charCodeAt(0) || 0) % avatarColors.length];

            return (
              <div
                key={r.id ?? `rv-${idx}`}
                className={`bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md ${isOwn ? "border-violet-200 ring-1 ring-violet-100" : "border-slate-100"}`}
              >
                {/* Review header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{r.username || "Anonymous"}</span>
                      {isOwn && (
                        <span className="text-[10px] font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                    {r.created_at && (
                      <span className="text-[11px] text-slate-400">
                        {new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <StarDisplay rating={r.rating} size="sm" />
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      r.rating >= 4 ? "bg-emerald-50 text-emerald-600"
                      : r.rating === 3 ? "bg-amber-50 text-amber-600"
                      : "bg-rose-50 text-rose-600"
                    }`}>{r.rating} / 5</span>
                  </div>
                </div>

                {/* Comment */}
                {r.comment ? (
                  <div className="px-5 py-4">
                    <p className="text-sm text-slate-600 leading-relaxed border-l-2 border-violet-100 pl-3">{r.comment}</p>
                  </div>
                ) : (
                  <div className="px-5 py-3">
                    <p className="text-xs text-slate-300 italic">No comment.</p>
                  </div>
                )}
              </div>
            );
          })}

          {/* Show more / less */}
          {reviews.length > 3 && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold rounded-2xl text-sm border border-slate-100 transition-all"
            >
              {expanded
                ? <><ChevronUp size={16} /> Show Less</>
                : <><ChevronDown size={16} /> Show All {reviews.length} Reviews</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(null);
  const isLoggedIn = !!(sessionStorage.getItem("token") || localStorage.getItem("token"));

  // AI Price Estimator
  const [aiPrice, setAiPrice] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Rental Terms Analyzer
  const [rentalTerms, setRentalTerms] = useState(null);
  const [termsLoading, setTermsLoading] = useState(false);
  const [termsError, setTermsError] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await getProperty(id);
        setProperty(res.data);
        const savedFavs = JSON.parse(localStorage.getItem("rentlyx_favorites")) || [];
        if (savedFavs.map(String).includes(String(id))) setIsFavorite(true);
      } catch (err) {
        console.error("Failed to load property", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  useEffect(() => {
    if (!property) return;
    const fetchStatus = async () => {
      try {
        const res = await getPropertyBookingStatus(property.id);
        setBookingStatus(res.data.status);
      } catch { setBookingStatus("available"); }
    };
    fetchStatus();
  }, [property]);

  const toggleFavorite = () => {
    const savedFavs = JSON.parse(localStorage.getItem("rentlyx_favorites")) || [];
    const strId = String(property.id);
    let newFavs;
    if (isFavorite) {
      newFavs = savedFavs.filter(fid => String(fid) !== strId);
      setIsFavorite(false);
    } else {
      newFavs = [...savedFavs, strId];
      setIsFavorite(true);
    }
    localStorage.setItem("rentlyx_favorites", JSON.stringify(newFavs));
  };

  const fetchAIEstimate = async () => {
    setAiLoading(true); setAiError(null); setAiPrice(null);
    try {
      const bhkMatch = String(property.bhk).match(/\d+/);
      const bhkNumber = bhkMatch ? parseInt(bhkMatch[0]) : 1;
      const res = await predictPrice({
        locality: property.property_place,
        property_type: property.property_type,
        bhk: bhkNumber,
        floor: property.floor || 1,
      });
      setAiPrice(res.data);
    } catch (err) {
      console.error("AI prediction failed", err);
      setAiError("Could not get estimate. Make sure the AI server is running.");
    } finally {
      setAiLoading(false);
    }
  };

  const fetchRentalTerms = async () => {
    setTermsLoading(true); setTermsError(null); setRentalTerms(null);
    try {
      const res = await analyzeConditionsPDF({
        property_id: property.id,
        pdf_url: property.conditions_pdf,
      });
      setRentalTerms(res.data);
    } catch (err) {
      console.error("PDF analysis failed", err);
      setTermsError("Could not analyze PDF. Make sure the AI server is running.");
    } finally {
      setTermsLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Loading Property...</div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">Property Not Found</div>;

  const hasLocation = property.latitude && property.longitude;
  const getPurposeDisplay = (p) => p === "sale" ? "For Sale" : "For Rent";
  const getBHKDisplay = (bhk) => ({ "1bhk": "1 BHK", "2bhk": "2 BHK", "3bhk": "3 BHK", "4bhk+": "4+ BHK" }[bhk] || bhk);
  const getFurnishingDisplay = (f) => ({ full: "Fully Furnished", semi: "Semi Furnished", unfurnished: "Unfurnished" }[f] || f);

  const getComparisonText = () => {
    if (!aiPrice) return null;
    const listed = Number(property.price);
    const estimated = Number(aiPrice.predicted_price);
    if (!estimated || isNaN(estimated)) return null;
    const diff = ((listed - estimated) / estimated) * 100;
    if (Math.abs(diff) < 3) return null;
    return diff > 0
      ? { text: `Listed ${Math.abs(diff).toFixed(0)}% above estimated market rate`, color: "text-orange-600", bg: "bg-orange-50" }
      : { text: `Listed ${Math.abs(diff).toFixed(0)}% below estimated market rate`, color: "text-emerald-600", bg: "bg-emerald-50" };
  };
  const comparison = getComparisonText();

  const visibleTerms = rentalTerms
    ? TERM_FIELDS.filter(({ key }) => {
        const val = rentalTerms[key];
        return val && val.trim() !== "" && val.toLowerCase() !== "not specified";
      })
    : [];

  const renderBookingButton = () => {
    if (bookingStatus === null) return <div className="w-full py-4 bg-slate-100 rounded-xl animate-pulse" />;
    if (bookingStatus === "accepted") return (
      <div className="w-full py-4 bg-red-50 border-2 border-red-200 text-red-600 font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2">
        🔒 Property Already Booked
      </div>
    );
    if (bookingStatus === "pending") return (
      <div className="w-full py-4 bg-amber-50 border-2 border-amber-200 text-amber-700 font-bold rounded-xl text-center text-sm flex items-center justify-center gap-2">
        ⏳ Booking Under Review
      </div>
    );
    return (
      <button onClick={() => {
        if (!isLoggedIn) { notifyError("Please log in to book this property."); navigate("/login"); return; }
        setShowBookingModal(true);
      }}
        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-200 transition-all hover:-translate-y-1 flex items-center justify-center gap-2">
        🔐 Book with Token
      </button>
    );
  };

  const extraImages = property.extra_images || [];

  return (
    <>
      <style>{leafletZIndexFix}</style>
      <div className="min-h-screen bg-slate-50 font-sans pb-20">
        <Bar forceSolid={true} />
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-28">

          {/* IMAGE CAROUSEL */}
          <div className="relative">
            <ImageCarousel mainImage={property.property_image} extraImages={extraImages} propertyName={property.name} />
            <div className="absolute top-6 left-6 flex gap-3 flex-wrap z-10 pointer-events-none">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-lg ${property.purpose === "sale" ? "bg-violet-600" : "bg-emerald-500"}`}>
                {getPurposeDisplay(property.purpose)}
              </span>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/30 flex items-center gap-1">
                <ShieldCheck size={14} /> Verified
              </span>
              {bookingStatus === "pending" && <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400/90 backdrop-blur-md text-white">⏳ Booking Pending</span>}
              {bookingStatus === "accepted" && <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-500/90 backdrop-blur-md text-white">🔒 Booked</span>}
            </div>
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 pointer-events-none" style={{ zIndex: 5 }}>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-lg leading-tight">{property.name}</h1>
              <div className="flex items-center gap-2 text-slate-200 font-medium text-lg">
                <MapPin size={20} className="text-violet-400" />{property.property_place}, {property.city}
              </div>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="relative z-10 -mt-8 mx-4 md:mx-12 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 md:p-6 flex flex-wrap justify-between items-center gap-4">
            {[
              { icon: <BedDouble size={24} />, label: "Config", value: getBHKDisplay(property.bhk) },
              { icon: <Bath size={24} />, label: "Baths", value: property.bathrooms },
              { icon: <Maximize size={24} />, label: "Area", value: <>{property.built_up_area} <span className="text-xs font-normal text-slate-400">sq ft</span></> },
              { icon: <CheckCircle2 size={24} />, label: "Status", value: "Active" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 border-r border-slate-100 last:border-0 flex-1 justify-center md:justify-start">
                <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">{icon}</div>
                <div>
                  <p className="text-xs text-slate-400 font-bold uppercase">{label}</p>
                  <p className="text-lg font-extrabold text-slate-800">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* MAIN CONTENT */}
          <div className="grid lg:grid-cols-3 gap-10 mt-12">
            <div className="lg:col-span-2 space-y-10">

              {/* About */}
              <div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">About this property</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-line text-lg">
                  {property.description || "No description provided by the seller."}
                </p>
              </div>

              {/* Highlights */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Property Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  {[
                    { label: <><Sparkles size={16} /> Furnishing</>, value: getFurnishingDisplay(property.furnishing) },
                    { label: <><Calendar size={16} /> Available From</>, value: property.availability_date ? new Date(property.availability_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "Ready to move" },
                    { label: "Property Type", value: <span className="capitalize">{property.property_type}</span> },
                    { label: "Property ID", value: `#${property.id}` },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-slate-500 flex items-center gap-2">{label}</span>
                      <span className="font-bold text-slate-800">{value}</span>
                    </div>
                  ))}
                </div>
                {property.conditions_pdf && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <a href={property.conditions_pdf} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 text-violet-600 font-bold hover:underline hover:text-violet-800 transition">
                      <Share2 size={18} /> View Terms & Conditions Document
                    </a>
                  </div>
                )}
              </div>

              {/* Map */}
              {hasLocation && (
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-6">Location</h3>
                  <div style={{ position: "relative", zIndex: 0 }}>
                    <div className="h-[400px] w-full rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                      <MapContainer center={[property.latitude, property.longitude]} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[property.latitude, property.longitude]}>
                          <Popup>{property.name}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* ── REVIEWS ── */}
              <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                <ReviewsSection propertyId={property.id} />
              </div>

            </div>

            {/* SIDEBAR */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">

                {/* PRICE + ACTIONS */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
                  <p className="text-slate-500 font-semibold mb-2">{property.purpose === "sale" ? "Total Price" : "Monthly Rent"}</p>
                  <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">₹ {Number(property.price).toLocaleString("en-IN")}</h2>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => navigate(`/contact-seller/${property.id}`)}
                      className="w-full py-4 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-lg shadow-violet-200 transition-all hover:-translate-y-1">
                      Contact Seller
                    </button>
                    {renderBookingButton()}
                    <button onClick={toggleFavorite}
                      className={`w-full py-4 font-bold rounded-xl border-2 transition-all flex items-center justify-center gap-2 ${isFavorite ? "border-red-100 bg-red-50 text-red-500" : "border-slate-100 bg-white text-slate-600 hover:border-violet-100 hover:text-violet-600"}`}>
                      <Heart size={20} className={isFavorite ? "fill-red-500" : ""} />
                      {isFavorite ? "Saved" : "Save to Favorites"}
                    </button>
                  </div>
                </div>

                {/* AI ESTIMATOR */}
                <div className="bg-gradient-to-br from-indigo-900 to-violet-800 p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 flex items-center justify-center shrink-0">
                        <RentlyXMascot size="sm" mood={aiLoading ? "thinking" : aiPrice ? "talking" : "idle"} />
                      </div>
                      <h3 className="font-bold text-lg">RentlyX AI Estimator</h3>
                    </div>
                    <p className="text-indigo-200 text-sm mb-6 leading-relaxed">
                      Get an instant fair-price estimate based on real-time market data for {property.property_place}.
                    </p>
                    {!aiPrice && !aiLoading && (
                      <button onClick={fetchAIEstimate} className="w-full py-3 bg-white text-violet-900 font-bold rounded-xl hover:bg-indigo-50 transition shadow-lg">
                        Check Fair Price
                      </button>
                    )}
                    {aiLoading && (
                      <div className="flex items-center justify-center gap-3 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="font-semibold">Analyzing market...</span>
                      </div>
                    )}
                    {aiError && (
                      <div className="text-red-200 text-center text-sm font-medium bg-red-900/20 p-3 rounded-lg">{aiError}</div>
                    )}
                    {aiPrice && (
                      <div className="space-y-4">
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10">
                          <p className="text-indigo-200 text-xs text-center mb-1">Estimated Market Value</p>
                          <div className="text-3xl font-black text-center mb-4">
                            ₹{Number(aiPrice.predicted_price).toLocaleString("en-IN")}
                          </div>
                          <div className="flex justify-between text-xs text-indigo-300 mb-2">
                            <span>Low: ₹{Number(aiPrice.range_low).toLocaleString("en-IN")}</span>
                            <span>High: ₹{Number(aiPrice.range_high).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="h-1.5 bg-black/20 rounded-full mb-4 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 w-3/4 mx-auto rounded-full" />
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded uppercase border border-emerald-500/30">
                              {aiPrice.confidence} Confidence
                            </span>
                            <button onClick={() => setAiPrice(null)} className="text-xs text-indigo-300 hover:text-white underline">Reset</button>
                          </div>
                        </div>
                        {comparison && (
                          <div className={`${comparison.bg} ${comparison.color} p-3 rounded-xl text-xs font-semibold text-center`}>
                            {comparison.text}
                          </div>
                        )}
                        {!aiPrice.locality_known && (
                          <div className="text-xs text-indigo-200 text-center bg-white/5 p-2 rounded-lg">
                            * {property.property_place} not in training data — using Kozhikode averages
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* RENTAL TERMS ANALYZER */}
                {property.conditions_pdf && (
                  <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl">
                        <FileText size={22} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-base">Rental Terms</h3>
                        <p className="text-xs text-slate-400">AI-extracted from agreement PDF</p>
                      </div>
                    </div>

                    {!rentalTerms && !termsLoading && (
                      <button
                        onClick={fetchRentalTerms}
                        className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-100"
                      >
                        <FileText size={16} /> Analyze Agreement
                      </button>
                    )}

                    {termsLoading && (
                      <div className="flex items-center justify-center gap-3 py-4 bg-violet-50 rounded-xl">
                        <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                        <span className="text-violet-700 font-semibold text-sm">Reading agreement...</span>
                      </div>
                    )}

                    {termsError && (
                      <div className="flex items-start gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm">
                        <AlertCircle size={16} className="mt-0.5 shrink-0" />
                        {termsError}
                      </div>
                    )}

                    {rentalTerms && (
                      <div className="space-y-2">
                        {visibleTerms.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-2">
                            No terms could be extracted from this PDF.
                          </p>
                        ) : (
                          visibleTerms.map(({ label, key, icon }) => (
                            <div key={key} className="flex justify-between items-center py-2.5 px-3 bg-slate-50 rounded-xl">
                              <span className="text-slate-500 text-sm flex items-center gap-2">
                                <span>{icon}</span>{label}
                              </span>
                              <span className="font-bold text-slate-800 text-sm text-right max-w-[55%]">
                                {rentalTerms[key]}
                              </span>
                            </div>
                          ))
                        )}
                        <button
                          onClick={() => setRentalTerms(null)}
                          className="w-full text-xs text-slate-400 hover:text-slate-600 underline pt-2"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>

        {showBookingModal && (
          <BookingModal property={property} onClose={() => setShowBookingModal(false)}
            onSuccess={() => { setBookingStatus("pending"); setShowBookingModal(false); }} />
        )}
        <RentlyXWidget />
      </div>
    </>
  );
}

export default PropertyDetail;
