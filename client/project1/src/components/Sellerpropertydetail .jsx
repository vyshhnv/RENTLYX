import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getProperty } from "../api/fetchApi";
import { buildApiUrl } from "../config/api";
import Bar from "./Bar";
import ImageCarousel from "./ImageCarousel";
import RentlyXMascot from "./RentlyXMascot";
import RentlyXWidget from "./RentlyXWidget";
import L from "leaflet";
import {
  MapPin, BedDouble, Bath, Maximize,
  Calendar, CheckCircle2, ShieldCheck, Share2, Sparkles, ArrowLeft, Edit,
  Star, MessageSquare, User, FileText, ExternalLink, Clock, XCircle
} from "lucide-react";

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

// ── Star display ──────────────────────────────────────────────────────────────
function StarDisplay({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= rating ? "fill-amber-400 text-amber-400" : "fill-surface-100 text-surface-200"}
        />
      ))}
    </div>
  );
}

// ── Reviews Section ───────────────────────────────────────────────────────────
function ReviewsSection({ propertyId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvg] = useState(null);

  useEffect(() => {
    if (!propertyId) return;
    fetch(buildApiUrl(`/reviews/property/${propertyId}/`))
      .then((r) => r.json())
      .then((data) => {
        setReviews(data.reviews || []);
        setAvg(data.average_rating);
      })
      .catch(() => { })
      .finally(() => setLoading(false));
  }, [propertyId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-surface-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-surface-900">Customer Reviews</h3>
        {reviews.length > 0 && (
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl">
            <StarDisplay rating={Math.round(avgRating)} size={16} />
            <span className="text-amber-700 font-bold text-sm">{avgRating} / 5</span>
            <span className="text-surface-400 text-xs">({reviews.length} review{reviews.length !== 1 ? "s" : ""})</span>
          </div>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-surface-200">
          <div className="inline-flex p-4 rounded-2xl bg-surface-50 mb-3">
            <MessageSquare size={24} className="text-surface-300" />
          </div>
          <p className="text-surface-500 font-semibold text-sm">No reviews yet</p>
          <p className="text-surface-400 text-xs mt-1">Reviews from buyers will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-2xl border border-surface-100 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                    <User size={16} className="text-brand-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-surface-900">{review.username}</p>
                    <p className="text-xs text-surface-400">
                      {new Date(review.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StarDisplay rating={review.rating} />
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][review.rating]}
                  </span>
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-surface-600 leading-relaxed bg-surface-50 rounded-xl px-4 py-3 border border-surface-100">
                  "{review.comment}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Document Link Row ─────────────────────────────────────────────────────────
function DocRow({ href, label, sublabel, iconEl, iconBg }) {
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl border border-surface-100 bg-surface-50 hover:bg-white hover:shadow-sm transition group"
    >
      <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>{iconEl}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-surface-800 group-hover:text-brand-600 transition">{label}</p>
        <p className="text-xs text-surface-400 truncate">{sublabel}</p>
      </div>
      <ExternalLink size={15} className="text-surface-300 group-hover:text-brand-500 transition shrink-0" />
    </a>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function SellerPropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const res = await getProperty(id);
        setProperty(res.data);
      } catch (err) {
        console.error("Failed to load property", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProperty();
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-500 font-medium">
        Loading Property...
      </div>
    );
  if (!property)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500 font-bold">
        Property Not Found
      </div>
    );

  const hasLocation = property.latitude && property.longitude;

  const getPurposeDisplay = (p) => (p === "sale" ? "For Sale" : "For Rent");
  const getBHKDisplay = (bhk) => ({ "1bhk": "1 BHK", "2bhk": "2 BHK", "3bhk": "3 BHK", "4bhk+": "4+ BHK" }[bhk] || bhk);
  const getFurnishingDisplay = (f) => ({ full: "Fully Furnished", semi: "Semi Furnished", unfurnished: "Unfurnished" }[f] || f);

  const extraImages = property.extra_images || [];

  // Listing status helpers
  const statusConfig = {
    approved: { label: "Approved — Live", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", icon: <CheckCircle2 size={15} className="text-emerald-500" /> },
    rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: <XCircle size={15} className="text-red-500" /> },
    pending: { label: "Pending Approval", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", icon: <Clock size={15} className="text-amber-500" /> },
  };
  const sc = statusConfig[property.listing_status] || statusConfig.pending;

  return (
    <>
      <style>{leafletZIndexFix}</style>
      <div className="min-h-screen bg-surface-50 font-sans pb-20">
        <Bar forceSolid={true} />

        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-28">

          {/* IMAGE CAROUSEL */}
          <div className="relative">
            <ImageCarousel
              mainImage={property.property_image}
              extraImages={extraImages}
              propertyName={property.name}
            />
            <div className="absolute top-6 left-6 flex gap-3 flex-wrap z-10 pointer-events-none">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-white shadow-lg ${property.purpose === "sale" ? "bg-brand-600" : "bg-emerald-500"}`}>
                {getPurposeDisplay(property.purpose)}
              </span>
              <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-md text-white border border-white/30 flex items-center gap-1">
                <ShieldCheck size={14} /> Verified
              </span>
            </div>
            <div className="absolute bottom-0 left-0 w-full p-6 md:p-8 pointer-events-none" style={{ zIndex: 5 }}>
              <h1 className="text-3xl md:text-5xl font-black text-white mb-2 drop-shadow-lg leading-tight">
                {property.name}
              </h1>
              <div className="flex items-center gap-2 text-slate-200 font-medium text-lg">
                <MapPin size={20} className="text-violet-400" />
                {property.property_place}, {property.city}
              </div>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="relative z-10 -mt-8 mx-4 md:mx-12 bg-white rounded-2xl shadow-xl border border-surface-100 p-4 md:p-6 flex flex-wrap justify-between items-center gap-4">
            {[
              { icon: <BedDouble size={24} />, label: "Config", value: getBHKDisplay(property.bhk) },
              { icon: <Bath size={24} />, label: "Baths", value: property.bathrooms },
              { icon: <Maximize size={24} />, label: "Area", value: <>{property.built_up_area} <span className="text-xs font-normal text-surface-400">sq ft</span></> },
              { icon: <CheckCircle2 size={24} />, label: "Status", value: "Active" },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 border-r border-surface-100 last:border-0 flex-1 justify-center md:justify-start">
                <div className="p-2.5 bg-violet-50 text-brand-600 rounded-xl">{icon}</div>
                <div>
                  <p className="text-xs text-surface-400 font-bold uppercase">{label}</p>
                  <p className="text-lg font-extrabold text-surface-800">{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* MAIN CONTENT */}
          <div className="grid lg:grid-cols-3 gap-10 mt-12">

            {/* Left: Details */}
            <div className="lg:col-span-2 space-y-10">

              <div>
                <h2 className="text-2xl font-bold text-surface-900 mb-4">About this property</h2>
                <p className="text-surface-600 leading-relaxed whitespace-pre-line text-lg">
                  {property.description || "No description provided."}
                </p>
              </div>

              {/* Property Highlights */}
              <div className="bg-white rounded-3xl p-8 border border-surface-100 shadow-sm">
                <h3 className="text-xl font-bold text-surface-900 mb-6">Property Highlights</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                  {[
                    { label: <><Sparkles size={16} /> Furnishing</>, value: getFurnishingDisplay(property.furnishing) },
                    { label: <><Calendar size={16} /> Available From</>, value: property.availability_date ? new Date(property.availability_date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "Ready to move" },
                    { label: "Property Type", value: <span className="capitalize">{property.property_type}</span> },
                    { label: "Property ID", value: `#${property.id}` },
                  ].map(({ label, value }, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50">
                      <span className="text-surface-500 flex items-center gap-2">{label}</span>
                      <span className="font-bold text-surface-800">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Documents section inside highlights */}
                {(property.conditions_pdf || property.legal_document) && (
                  <div className="mt-8 pt-6 border-t border-surface-100 space-y-3">
                    <p className="text-sm font-bold text-surface-700 mb-3">Documents</p>
                    <DocRow
                      href={property.conditions_pdf}
                      label="Terms & Conditions"
                      sublabel={property.conditions_pdf ? property.conditions_pdf.split("/").pop() : ""}
                      iconEl={<FileText size={18} className="text-red-500" />}
                      iconBg="bg-red-50"
                    />
                    <DocRow
                      href={property.legal_document}
                      label="Legal Document"
                      sublabel={property.legal_document ? property.legal_document.split("/").pop() : ""}
                      iconEl={<ShieldCheck size={18} className="text-emerald-600" />}
                      iconBg="bg-emerald-50"
                    />
                  </div>
                )}
              </div>

              {/* Customer Reviews */}
              <ReviewsSection propertyId={property.id} />

              {/* Location Map */}
              {hasLocation && (
                <div>
                  <h3 className="text-xl font-bold text-surface-900 mb-6">Location</h3>
                  <div style={{ position: "relative", zIndex: 0 }}>
                    <div className="h-[400px] w-full rounded-3xl overflow-hidden shadow-sm border border-surface-200">
                      <MapContainer
                        center={[property.latitude, property.longitude]}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[property.latitude, property.longitude]}>
                          <Popup>{property.name}</Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28 space-y-6">

                {/* Price + Actions */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-surface-100">
                  <p className="text-surface-500 font-semibold mb-2">
                    {property.purpose === "sale" ? "Listed Price" : "Monthly Rent"}
                  </p>
                  <h2 className="text-4xl font-black text-surface-900 mb-6 tracking-tight">
                    ₹ {Number(property.price).toLocaleString("en-IN")}
                  </h2>

                  {/* Approval status badge */}
                  <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border mb-6 ${sc.bg} ${sc.border}`}>
                    {sc.icon}
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${sc.text}`}>{sc.label}</p>
                      {property.listing_status === "rejected" && property.admin_rejection_note && (
                        <p className="text-xs text-red-500 mt-0.5 truncate" title={property.admin_rejection_note}>
                          {property.admin_rejection_note}
                        </p>
                      )}
                      {property.listing_status === "pending" && (
                        <p className="text-xs text-amber-500 mt-0.5">Awaiting admin review</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => navigate(`/property/${property.id}/edit`)}
                      className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-lg shadow-brand-600/20 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                      <Edit size={20} /> Edit Listing
                    </button>
                    <button
                      onClick={() => navigate(-1)}
                      className="w-full py-4 border-2 border-surface-100 bg-white text-surface-600 font-bold rounded-xl hover:bg-surface-50 hover:border-surface-200 transition flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={20} /> Back to My Properties
                    </button>
                  </div>
                </div>

                {/* Documents sidebar card */}
                {(property.conditions_pdf || property.legal_document) && (
                  <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-surface-100">
                    <h3 className="font-bold text-surface-800 text-sm mb-4 flex items-center gap-2">
                      <FileText size={16} className="text-surface-400" />
                      Uploaded Documents
                    </h3>
                    <div className="space-y-2">
                      <DocRow
                        href={property.conditions_pdf}
                        label="Terms & Conditions"
                        sublabel="Click to view PDF"
                        iconEl={<FileText size={16} className="text-red-500" />}
                        iconBg="bg-red-50"
                      />
                      <DocRow
                        href={property.legal_document}
                        label="Legal Document"
                        sublabel="Tax receipt / Ownership proof"
                        iconEl={<ShieldCheck size={16} className="text-emerald-600" />}
                        iconBg="bg-emerald-50"
                      />
                    </div>
                    {!property.legal_document && (
                      <div className="mt-3 flex items-center gap-2 text-amber-600 text-xs font-semibold bg-amber-50 px-3 py-2 rounded-xl border border-amber-100">
                        <Clock size={12} />
                        No legal document uploaded — adding one speeds up approval.
                      </div>
                    )}
                  </div>
                )}

                {/* No documents at all — nudge card */}
                {!property.conditions_pdf && !property.legal_document && (
                  <div className="bg-amber-50 border border-amber-200 p-5 rounded-[2rem]">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-xl shrink-0">
                        <ShieldCheck size={18} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-amber-800 font-bold text-sm">No documents uploaded</p>
                        <p className="text-amber-600 text-xs mt-0.5 leading-relaxed">
                          Upload a legal document (tax receipt, ownership proof) to speed up admin approval.
                        </p>
                        <button
                          onClick={() => navigate(`/property/${property.id}/edit`)}
                          className="mt-3 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg transition">
                          Upload Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Listing Summary */}
                <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4 relative z-10">
                    <div className="w-12 h-12 flex items-center justify-center shrink-0">
                      <RentlyXMascot size="sm" mood="idle" />
                    </div>
                    <h3 className="font-bold text-lg">Listing Summary</h3>
                  </div>
                  <div className="space-y-3 text-sm relative z-10">
                    {[
                      { label: "Purpose", value: getPurposeDisplay(property.purpose) },
                      { label: "Type", value: property.property_type },
                      { label: "Config", value: getBHKDisplay(property.bhk) },
                      { label: "Area", value: `${property.built_up_area} sq ft` },
                      { label: "Furnishing", value: getFurnishingDisplay(property.furnishing) },
                      { label: "Property ID", value: `#${property.id}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-surface-400">{label}</span>
                        <span className="font-bold capitalize">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
        <RentlyXWidget />
      </div>
    </>
  );
}

export default SellerPropertyDetail;
