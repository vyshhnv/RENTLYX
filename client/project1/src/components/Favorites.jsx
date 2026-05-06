import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Bar from "./Bar";
import { listAllProperty } from "../api/fetchApi";
import {
  Heart, MapPin, BedDouble, Bath, Maximize,
  UserCircle2, ArrowRight, CheckCircle2, Ghost, ArrowLeft
} from "lucide-react";

function Favorites() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFavorites(); }, []);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const savedFavs = JSON.parse(localStorage.getItem("rentlyx_favorites")) || [];
      if (savedFavs.length === 0) { setProperties([]); setLoading(false); return; }
      const res = await listAllProperty();
      const allProperties = res.data || res;
      const favProperties = allProperties.filter(p => savedFavs.map(String).includes(String(p.id)));
      setProperties(favProperties);
    } catch (err) {
      console.error("Error loading favorites:", err);
    } finally { setLoading(false); }
  };

  const removeFavorite = (e, id) => {
    e.stopPropagation();
    const savedFavs = JSON.parse(localStorage.getItem("rentlyx_favorites")) || [];
    const updatedFavs = savedFavs.filter(favId => String(favId) !== String(id));
    localStorage.setItem("rentlyx_favorites", JSON.stringify(updatedFavs));
    setProperties(prev => prev.filter(p => p.id !== id));
  };

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "https://via.placeholder.com/400";
    if (imagePath.startsWith("http")) return imagePath;
    return `http://127.0.0.1:8000${imagePath}`;
  };

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-12">
        {/* Back */}
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-brand-600 font-medium mb-6 transition-colors">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-surface-900 mb-1">Your Saved Homes</h1>
          <p className="text-surface-500 font-medium text-sm">
            {properties.length} {properties.length === 1 ? 'property' : 'properties'} saved for later
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="h-52 bg-surface-200 animate-pulse" />
                <div className="p-5 space-y-3 bg-white border border-surface-100 border-t-0 rounded-b-2xl">
                  <div className="h-5 bg-surface-100 rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-surface-100 rounded-lg w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-dashed border-surface-200 text-center">
            <div className="p-5 bg-brand-50 rounded-2xl mb-5">
              <Ghost size={40} className="text-brand-300" />
            </div>
            <h3 className="text-lg font-bold text-surface-900 mb-2">No favorites yet</h3>
            <p className="text-surface-500 mb-6 max-w-sm text-sm">
              Start exploring and click the heart icon to save properties you love.
            </p>
            <button onClick={() => navigate('/')} className="btn-primary text-sm">
              Browse Properties
            </button>
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <div key={p.id} onClick={() => navigate(`/property/${p.id}`)}
              className="group bg-white rounded-2xl border border-surface-100 shadow-sm hover:shadow-glass-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col">
              {/* Image */}
              <div className="relative h-52 overflow-hidden bg-surface-100">
                <img src={getImageUrl(p.property_image)} alt={p.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <button onClick={(e) => removeFavorite(e, p.id)}
                  className="absolute top-3 right-3 bg-white p-2 rounded-full shadow-md hover:bg-surface-50 transition z-10"
                  title="Remove from favorites">
                  <Heart size={18} className="fill-rose-500 text-rose-500" />
                </button>
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-[11px] font-bold text-white shadow-md uppercase tracking-wide ${p.purpose === 'sale' ? 'bg-brand-600' : 'bg-emerald-500'
                  }`}>
                  {p.purpose === 'sale' ? 'Buy' : 'Rent'}
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-display font-bold text-surface-900">₹ {Number(p.price).toLocaleString()}</h3>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 size={11} /> Verified
                  </span>
                </div>
                <h4 className="text-sm font-bold text-surface-800 mb-1 truncate">{p.name}</h4>
                <div className="flex items-center gap-1.5 text-surface-500 text-sm mb-4">
                  <MapPin size={14} className="text-surface-400" />
                  <span className="truncate">{p.property_place}, {p.city}</span>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 border-t border-surface-100 pt-4 mb-4">
                  {[
                    { icon: <BedDouble size={13} />, label: 'Config', val: p.bhk ? p.bhk.toUpperCase() : "N/A" },
                    { icon: <Bath size={13} />, label: 'Baths', val: p.bathrooms || 1 },
                    { icon: <Maximize size={13} />, label: 'Area', val: p.built_up_area || 1200 },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <div className="flex items-center justify-center gap-1 text-surface-400 text-[10px] font-bold uppercase mb-0.5">{s.icon} {s.label}</div>
                      <span className="text-surface-800 font-bold text-sm">{s.val}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600"><UserCircle2 size={16} /></div>
                    <span className="text-xs font-semibold text-surface-500">Rently Agent</span>
                  </div>
                  <span className="text-sm font-semibold text-brand-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                    Details <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Favorites;