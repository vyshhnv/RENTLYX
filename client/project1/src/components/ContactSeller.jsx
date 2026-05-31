import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Phone, MessageCircle, ArrowLeft, AlertCircle,
  MapPin, ShieldCheck, Home, CheckCircle2
} from "lucide-react";
import axios from "axios";
import { getProperty } from "../api/fetchApi";
import { buildApiUrl } from "../config/api";
import { getErrorMessage, notifyError } from "../utils/notify";
import Bar from "./Bar";

function ContactSeller() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [seller, setSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const propRes = await getProperty(propertyId);
        setProperty(propRes.data);
        setSeller(propRes.data.seller);
      } catch (err) {
        console.error("Failed to load property", err);
        setError("Failed to load property details.");
      } finally { setLoading(false); }
    };
    fetchProperty();
  }, [propertyId]);

  const handleCallSeller = () => {
    if (seller?.phone) window.location.href = `tel:${seller.phone}`;
    else notifyError("Phone number not available. Please use chat instead.");
  };

  const handleChatWithSeller = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) { notifyError("Please log in to chat with the seller."); navigate("/login"); return; }
    const sellerId = seller?.id || seller?.user?.id;
    if (!sellerId) { notifyError("Seller information is not available."); return; }
    try {
      const response = await axios.post(buildApiUrl("/chat/rooms/get_or_create/"),
        { property_id: propertyId, seller_id: sellerId },
        { headers: { Authorization: `Token ${token}` } }
      );
      navigate(`/chat-room/${response.data.id}`);
    } catch (err) {
      console.error("Chat error:", err.response?.data);
      notifyError(getErrorMessage(err, "Failed to start chat. Please try again later."));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-surface-400">
          <div className="w-5 h-5 border-2 border-surface-300 border-t-brand-600 rounded-full animate-spin" />
          <span className="font-medium text-sm">Connecting to seller...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface-50 font-sans">
        <Bar forceSolid={true} />
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <div className="card p-8 text-center max-w-md w-full border border-rose-100">
            <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} />
            </div>
            <h2 className="text-lg font-display font-bold text-surface-900 mb-2">Unavailable</h2>
            <p className="text-surface-500 text-sm mb-6">{error}</p>
            <button onClick={() => navigate(-1)} className="w-full btn-secondary py-3 text-sm">Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />

      <div className="max-w-5xl mx-auto px-6 pt-28 pb-12">
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600 font-medium mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Property
        </button>

        <div className="grid md:grid-cols-5 gap-6 items-start">
          {/* Left: Property context */}
          <div className="md:col-span-2 card p-6 sticky top-28">
            <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Home size={12} /> You are inquiring about
            </h3>
            <div className="rounded-xl overflow-hidden mb-4 relative h-44 group">
              {property?.property_image ? (
                <img src={property.property_image} alt={property.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-surface-100 flex items-center justify-center text-surface-400 text-sm">No Image</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-3 left-3 text-white">
                <p className="text-xs font-medium opacity-90">{property?.property_type}</p>
              </div>
            </div>
            <h2 className="text-base font-display font-bold text-surface-900 mb-1.5">{property?.name}</h2>
            <div className="flex items-center gap-1.5 text-surface-500 text-sm mb-4">
              <MapPin size={14} className="text-brand-500 shrink-0" /> {property?.property_place}, {property?.city}
            </div>
            <div className="pt-4 border-t border-surface-100 flex justify-between items-center">
              <span className="text-surface-400 text-sm font-medium">Price</span>
              <span className="text-lg font-display font-bold text-brand-700">₹ {Number(property?.price).toLocaleString()}</span>
            </div>
          </div>

          {/* Right: Seller action */}
          <div className="md:col-span-3 card p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-56 h-56 bg-brand-50 rounded-full blur-[60px] -mr-24 -mt-24 opacity-50 pointer-events-none" />

            <div className="relative z-10 text-center">
              <div className="relative inline-block mb-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center text-2xl font-display font-bold text-brand-700 border-4 border-white shadow-xl">
                  {seller?.name?.charAt(0) || "S"}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-lg border-2 border-white" title="Verified Seller">
                  <ShieldCheck size={12} />
                </div>
              </div>

              <h1 className="text-xl font-display font-bold text-surface-900 mb-1">
                Connect with {seller?.name || "Seller"}
              </h1>
              <p className="text-surface-500 text-sm mb-8 max-w-xs mx-auto">
                Verified Owner • Typically responds within an hour
              </p>

              <div className="flex flex-col gap-4 max-w-sm mx-auto">
                <button onClick={handleChatWithSeller}
                  className="group w-full bg-brand-600 hover:bg-brand-700 text-white p-1 rounded-2xl transition-all shadow-lg shadow-brand-600/20 hover:-translate-y-0.5">
                  <div className="flex items-center justify-between px-6 py-4">
                    <div className="text-left">
                      <span className="block font-bold text-lg">Start Chat</span>
                      <span className="text-brand-200 text-xs font-medium group-hover:text-white transition-colors">Instant Message</span>
                    </div>
                    <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center group-hover:bg-white/25 transition-colors">
                      <MessageCircle size={20} />
                    </div>
                  </div>
                </button>

                <div className="relative flex items-center gap-4 my-1">
                  <div className="h-px bg-surface-100 flex-1" />
                  <span className="text-[10px] text-surface-400 font-bold uppercase">Or</span>
                  <div className="h-px bg-surface-100 flex-1" />
                </div>

                <button onClick={handleCallSeller}
                  className="group w-full bg-white border border-surface-200 hover:border-emerald-400 hover:bg-emerald-50 text-surface-700 hover:text-emerald-700 p-1 rounded-2xl transition-all">
                  <div className="flex items-center justify-between px-6 py-4">
                    <div className="text-left">
                      <span className="block font-bold text-lg">Call Now</span>
                      <span className="text-surface-400 text-xs font-medium group-hover:text-emerald-600 transition-colors">
                        {seller?.phone || "View Number"}
                      </span>
                    </div>
                    <div className="w-10 h-10 bg-surface-100 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 group-hover:text-emerald-800 transition-colors">
                      <Phone size={20} />
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-8 bg-surface-50 rounded-xl p-4 flex items-start gap-3 text-left border border-surface-100">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-surface-800 mb-0.5">Safe Interaction Tips</h4>
                  <p className="text-xs text-surface-500 leading-relaxed">
                    Never share your OTPs or bank passwords. RentlyX agents will never ask for payment details over chat.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}

export default ContactSeller;
