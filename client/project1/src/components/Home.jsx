import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Bar from "./Bar";
import RentlyXWidget from "./RentlyXWidget";
import {
  Search, MapPin, Filter, ArrowRight, Star,
  Layout, ShieldCheck, Heart,
  ChevronDown, ChevronUp, Building2, TrendingUp, Users,
  Trees, Layers, House, LifeBuoy
} from "lucide-react";
import { listAllProperty } from "../api/fetchApi";
import { API_BASE_URL as BASE_URL } from "../config/api";

const INITIAL_VISIBLE = 12;
// ── All localities in Kozhikode ───────────────────────────────────────────────
const KOZHIKODE_LOCALITIES = [
  "Balussery", "Beach Road", "Bilathikulam", "Calicut University",
  "Chevayur", "Eranhipalam", "Feroke", "Koduvally", "Kottuli",
  "Koyilandy Road", "Kunnamangalam", "Kuthiravattom", "Malaparamba",
  "Mankave", "Mathara", "Mavoor Road", "Medical College", "Mukkam",
  "Nadakkavu", "Palayam", "Panniyankara", "Puthiyara",
  "Thiruvannur", "Thondayad", "Ulliyeri", "Vellimadukunnu",
];

const PROPERTY_TYPES = [
  { key: "apartment", label: "Apartment", icon: Building2,
    lightBg: "bg-brand-50 border-brand-200 text-brand-700",
    activeBg: "bg-gradient-to-br from-brand-500 to-violet-500 text-white border-transparent shadow-lg shadow-brand-500/30" },
  { key: "villa",     label: "Villa",     icon: Trees,
    lightBg: "bg-emerald-50 border-emerald-200 text-emerald-700",
    activeBg: "bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/30" },
  { key: "house",     label: "House",     icon: House,
    lightBg: "bg-amber-50 border-amber-200 text-amber-700",
    activeBg: "bg-gradient-to-br from-amber-500 to-orange-500 text-white border-transparent shadow-lg shadow-amber-500/30" },
  { key: "flat",      label: "Flat",      icon: Layers,
    lightBg: "bg-rose-50 border-rose-200 text-rose-700",
    activeBg: "bg-gradient-to-br from-rose-500 to-pink-500 text-white border-transparent shadow-lg shadow-rose-500/30" },
];

// ── Location Autocomplete Input ───────────────────────────────────────────────
function LocationInput({ value, onChange, onSelect, onKeyDown }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex]  = useState(-1);
  const wrapperRef = useRef(null);
  const suggestions = value.trim()
    ? KOZHIKODE_LOCALITIES.filter((loc) =>
        loc.toLowerCase().includes(value.trim().toLowerCase())
      ).slice(0, 6)
    : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleKeyDownInternal = (e) => {
    if (!showDropdown) { onKeyDown?.(e); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        onSelect(suggestions[activeIndex]);
        setShowDropdown(false);
      } else {
        onKeyDown?.(e);
        setShowDropdown(false);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    } else {
      onKeyDown?.(e);
    }
  };

  const handleSelect = (loc) => {
    onSelect(loc);
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  // Highlight matching part
  const highlight = (text, query) => {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1 || !query) return <span>{text}</span>;
    return (
      <>
        <span>{text.slice(0, idx)}</span>
        <span className="font-bold text-brand-600">{text.slice(idx, idx + query.length)}</span>
        <span>{text.slice(idx + query.length)}</span>
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="flex-1 w-full relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-500 pointer-events-none z-10">
        <MapPin size={18} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const nextValue = e.target.value;
          onChange(nextValue);
          setActiveIndex(-1);
          setShowDropdown(nextValue.trim().length > 0);
        }}
        onKeyDown={handleKeyDownInternal}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder="Search locality in Kozhikode..."
        autoComplete="off"
        className="w-full h-13 pl-11 pr-4 bg-surface-50 border border-transparent rounded-xl outline-none text-surface-800 font-medium focus:bg-white focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-surface-400"
      />

      {/* Dropdown */}
      {showDropdown && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-xl shadow-glass-lg border border-surface-100 overflow-hidden z-50">
          <div className="px-3 py-1.5 border-b border-surface-50">
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">
              Kozhikode localities
            </p>
          </div>
          {suggestions.map((loc, i) => (
            <button
              key={loc}
              onMouseDown={() => handleSelect(loc)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-left transition-colors ${
                i === activeIndex
                  ? "bg-brand-50 text-brand-700"
                  : "text-surface-700 hover:bg-surface-50"
              }`}
            >
              <MapPin size={13} className="text-brand-400 shrink-0" />
              <span>{highlight(loc, value.trim())}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Home Component ───────────────────────────────────────────────────────
function Home() {
  const navigate = useNavigate();

  const [locationInput, setLocationInput] = useState("");
  const [bhk,           setBhk]           = useState("");
  const [propertyType,  setPropertyType]  = useState("");
  const [budget,        setBudget]        = useState("");
  const [properties,    setProperties]    = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [favorites,     setFavorites]     = useState([]);
  const [visibleCount,  setVisibleCount]  = useState(INITIAL_VISIBLE);
  const [showingAll,    setShowingAll]    = useState(false);

  useEffect(() => {
    fetchProperties();
    const savedFavs = JSON.parse(localStorage.getItem("rentlyx_favorites")) || [];
    setFavorites(savedFavs);
  }, []);

  useEffect(() => { setVisibleCount(INITIAL_VISIBLE); setShowingAll(false); }, [properties]);

  const fetchProperties = async (queryParams = "") => {
    try {
      setLoading(true);
      const url = queryParams ? `${BASE_URL}/properties/?${queryParams}` : undefined;
      const res  = await listAllProperty(url);
      const data = res.data || res;
      setProperties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading properties:", err);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const buildAndFetch = (overrides = {}) => {
    const params = new URLSearchParams();
    const loc  = (overrides.locationInput ?? locationInput).trim();
    const type = overrides.propertyType   ?? propertyType;
    const b    = overrides.bhk            ?? bhk;
    const bud  = overrides.budget         ?? budget;
    if (loc) params.append("property_place", loc);
    if (type) params.append("property_type", type);
    if (b)    params.append("bhk", b);
    if (bud)  params.append("price_range", bud);
    fetchProperties(params.toString());
  };

  const handleTypeClick = (key) => {
    const next = propertyType === key ? "" : key;
    setPropertyType(next);
    buildAndFetch({ propertyType: next });
    setTimeout(() => document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Called when user selects a suggestion
  const handleLocalitySelect = (loc) => {
    setLocationInput(loc);
    buildAndFetch({ locationInput: loc });
    setTimeout(() => document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" }), 150);
  };

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    const updated = favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id];
    setFavorites(updated);
    localStorage.setItem("rentlyx_favorites", JSON.stringify(updated));
  };

  const handleSearch       = () => buildAndFetch();
  const handleKeyDown      = (e) => { if (e.key === "Enter") handleSearch(); };
  const handleClearFilters = () => { setLocationInput(""); setBhk(""); setPropertyType(""); setBudget(""); fetchProperties(); };
  const handleShowMore     = () => { setVisibleCount(properties.length); setShowingAll(true); };
  const handleShowLess     = () => {
    setVisibleCount(INITIAL_VISIBLE); setShowingAll(false);
    document.getElementById("listings-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const visibleProperties = properties.slice(0, visibleCount);

  return (
    <div className="min-h-screen bg-surface-50 font-sans flex flex-col">
      <Bar />

      {/* ── HERO ── */}
      <div className="relative w-full min-h-[640px] flex flex-col items-center justify-center text-center px-4 overflow-visible mb-36">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
            alt="Hero" className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-surface-950/70 via-surface-900/60 to-surface-950/80" />
          <div className="absolute top-20 left-10 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px] animate-pulse-soft" />
          <div className="absolute bottom-20 right-10 w-80 h-80 bg-violet-500/15 rounded-full blur-[80px] animate-pulse-soft" style={{ animationDelay: "1.5s" }} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto -mt-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-white/90 text-xs font-semibold uppercase tracking-wider mb-6 shadow-lg animate-fade-in">
            <Star size={12} className="text-amber-400 fill-amber-400" /> Rated #1 in Kozhikode
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-black text-white mb-6 drop-shadow-xl tracking-tight leading-[1.1] animate-slide-up">
            Find Your <span className="text-gradient-hero">Sanctuary</span>
          </h1>
          <p className="text-lg md:text-xl text-surface-300 max-w-2xl mx-auto font-medium animate-slide-up" style={{ animationDelay: "0.15s" }}>
            Discover thousands of verified homes, apartments, and luxury villas.
          </p>
        </div>

        <div className="absolute -bottom-28 w-full max-w-5xl px-4 z-20 animate-slide-up flex flex-col gap-3" style={{ animationDelay: "0.3s" }}>
          {/* Quick type buttons */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {PROPERTY_TYPES.map((typeOption) => {
              const isActive = propertyType === typeOption.key;
              return (
                <button key={typeOption.key} onClick={() => handleTypeClick(typeOption.key)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-200 active:scale-95 ${
                    isActive ? typeOption.activeBg : `${typeOption.lightBg} hover:scale-105 bg-white/90 backdrop-blur-sm`
                  }`}>
                  {React.createElement(typeOption.icon, { size: 16 })}
                  {typeOption.label}
                  {isActive && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-white/70 inline-block" />}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="bg-white rounded-2xl shadow-glass-xl p-3 border border-surface-100 flex flex-col md:flex-row items-center gap-2.5">

            {/* ── Location with autocomplete ── */}
            <LocationInput
              value={locationInput}
              onChange={setLocationInput}
              onSelect={handleLocalitySelect}
              onKeyDown={handleKeyDown}
            />

            <div className="relative w-full md:w-36">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-surface-400"><Layout size={16} /></div>
              <select value={bhk} onChange={e => setBhk(e.target.value)}
                className="w-full h-13 pl-10 pr-4 bg-surface-50 border border-transparent rounded-xl outline-none text-surface-700 font-medium cursor-pointer focus:bg-white focus:border-brand-400 hover:bg-surface-100 transition appearance-none">
                <option value="">Any BHK</option>
                <option value="1bhk">1 BHK</option><option value="2bhk">2 BHK</option>
                <option value="3bhk">3 BHK</option><option value="4bhk+">4+ BHK</option>
              </select>
            </div>
            <div className="relative w-full md:w-40">
              <select value={budget} onChange={e => setBudget(e.target.value)}
                className="w-full h-13 px-4 bg-surface-50 border border-transparent rounded-xl outline-none text-surface-700 font-medium cursor-pointer focus:bg-white focus:border-brand-400 hover:bg-surface-100 transition appearance-none">
                <option value="">Any Budget</option>
                <option value="1L">Up to ₹1L</option><option value="10L">Up to ₹10L</option>
                <option value="50L">Up to ₹50L</option><option value="1C">Up to ₹1Cr</option>
              </select>
            </div>
            <button onClick={handleSearch}
              className="w-full md:w-auto h-13 px-7 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-base shadow-lg shadow-brand-600/20 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] flex-shrink-0">
              <Search size={20} /><span>Search</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── TRUST BADGES ── */}
      <div className="max-w-5xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: <Building2 size={22} />, num: "2,500+",  label: "Properties Listed" },
            { icon: <Users size={22} />,      num: "10,000+", label: "Happy Users" },
            { icon: <ShieldCheck size={22} />, num: "100%",   label: "Verified Listings" },
            { icon: <TrendingUp size={22} />,  num: "#1",     label: "In Kozhikode" },
          ].map(({ icon, num, label }) => (
            <div key={label} className="flex items-center gap-3 p-4 rounded-xl bg-white border border-surface-100 shadow-sm">
              <div className="p-2.5 rounded-lg bg-brand-50 text-brand-600">{icon}</div>
              <div>
                <p className="font-display font-bold text-surface-900 text-lg leading-tight">{num}</p>
                <p className="text-xs text-surface-400 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── LISTINGS ── */}
      <div id="listings-section" className="max-w-7xl mx-auto px-6 pb-16 w-full flex-grow">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-display font-extrabold text-surface-900 mb-1">
              {propertyType ? `${PROPERTY_TYPES.find(t => t.key === propertyType)?.label}s` : "Featured Listings"}
            </h2>
            <p className="text-surface-500 font-medium">
              {properties.length > 0 ? `${properties.length} properties found` : "Top picks for you in Kozhikode"}
            </p>
          </div>
          {(locationInput || bhk || propertyType || budget) && (
            <button onClick={handleClearFilters}
              className="flex items-center gap-2 px-4 py-2.5 bg-surface-100 hover:bg-surface-200 text-surface-600 rounded-xl font-semibold text-sm transition-colors">
              <Filter size={15} /> Clear Filters
            </button>
          )}
        </div>

        {/* Active filters display */}
        {(locationInput || propertyType) && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {locationInput && (
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border bg-brand-50 border-brand-200 text-brand-700">
                <MapPin size={12} />{locationInput}
                <button onClick={() => { setLocationInput(""); buildAndFetch({ locationInput: "" }); }} className="ml-1 opacity-60 hover:opacity-100 font-bold">✕</button>
              </span>
            )}
            {propertyType && (() => {
              const t = PROPERTY_TYPES.find(t => t.key === propertyType);
              const ActiveTypeIcon = t?.icon;
              return (
                <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border ${t?.lightBg}`}>
                  {ActiveTypeIcon && <ActiveTypeIcon size={13} />}{t?.label}
                  <button onClick={() => { setPropertyType(""); buildAndFetch({ propertyType: "" }); }} className="ml-1 opacity-60 hover:opacity-100 font-bold">✕</button>
                </span>
              );
            })()}
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="rounded-2xl overflow-hidden">
                <div className="h-56 bg-surface-200 animate-pulse" />
                <div className="p-5 space-y-3 bg-white border border-surface-100 border-t-0 rounded-b-2xl">
                  <div className="h-5 bg-surface-100 rounded-lg w-3/4 animate-pulse" />
                  <div className="h-4 bg-surface-100 rounded-lg w-1/2 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && visibleProperties.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleProperties.map((p) => {
                const isFav = favorites.includes(p.id);
                return (
                  <div key={p.id} onClick={() => navigate(`/property/${p.id}`)}
                    className="group bg-white rounded-2xl border border-surface-100 shadow-sm hover:shadow-glass-lg hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
                    <div className="relative h-56 overflow-hidden bg-surface-100">
                      <img src={p.property_image || "https://via.placeholder.com/600x400"} alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      <div className="absolute bottom-3 left-3 glass rounded-xl px-3.5 py-2 shadow-lg">
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-wider">Price</p>
                        <p className="text-lg font-display font-extrabold text-surface-900">₹{Number(p.price).toLocaleString()}</p>
                      </div>
                      <button onClick={(e) => toggleFavorite(e, p.id)}
                        className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-md transition-all duration-200 active:scale-90 hover:bg-white z-10 group/fav">
                        <Heart size={18} className={`transition-colors duration-200 ${isFav ? "fill-rose-500 text-rose-500" : "text-surface-400 group-hover/fav:text-rose-400"}`} />
                      </button>
                      <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-[11px] font-bold text-white shadow-md uppercase tracking-wide ${p.purpose === "sale" ? "bg-brand-600" : "bg-emerald-500"}`}>
                        {p.purpose === "sale" ? "Buy" : "Rent"}
                      </div>
                    </div>
                    <div className="p-5 flex flex-col flex-grow">
                      <div className="flex justify-between items-start mb-1.5">
                        <h3 className="text-base font-bold text-surface-900 line-clamp-1 group-hover:text-brand-600 transition-colors">{p.name}</h3>
                        <ShieldCheck size={18} className="text-emerald-500 shrink-0 ml-2" />
                      </div>
                      <div className="flex items-center gap-1.5 text-surface-500 text-sm font-medium mb-5">
                        <MapPin size={14} className="text-brand-400" />
                        <span className="truncate">{p.property_place}, {p.city}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mt-auto">
                        <div className="bg-surface-50 rounded-xl py-2.5 px-3 text-center border border-surface-100 group-hover:border-brand-100 group-hover:bg-brand-50/50 transition-colors">
                          <span className="block text-sm font-bold text-surface-800">{p.bhk ? p.bhk.toUpperCase() : "N/A"}</span>
                          <span className="text-[10px] font-semibold text-surface-400 uppercase">Config</span>
                        </div>
                        <div className="bg-surface-50 rounded-xl py-2.5 px-3 text-center border border-surface-100 group-hover:border-brand-100 group-hover:bg-brand-50/50 transition-colors">
                          <span className="block text-sm font-bold text-surface-800 capitalize truncate">{p.property_type}</span>
                          <span className="text-[10px] font-semibold text-surface-400 uppercase">Type</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {properties.length > INITIAL_VISIBLE && (
              <div className="flex flex-col items-center mt-14">
                {!showingAll ? (
                  <button onClick={handleShowMore}
                    className="group flex flex-col items-center gap-1.5 px-8 py-3.5 bg-white hover:bg-brand-600 border border-surface-200 hover:border-brand-600 text-surface-600 hover:text-white rounded-xl font-semibold text-sm transition-all duration-300 shadow-sm">
                    <span>View More Properties</span><ChevronDown size={18} className="animate-bounce" />
                  </button>
                ) : (
                  <button onClick={handleShowLess}
                    className="flex flex-col items-center gap-1.5 px-8 py-3.5 bg-white hover:bg-surface-50 border border-surface-200 text-surface-500 rounded-xl font-semibold text-sm transition-all duration-200 shadow-sm">
                    <ChevronUp size={18} /><span>Show Less</span>
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {!loading && properties.length === 0 && (
          <div className="text-center py-24 bg-white rounded-2xl border border-dashed border-surface-200">
            <div className="inline-flex p-4 rounded-2xl bg-surface-50 mb-4"><Filter size={28} className="text-surface-400" /></div>
            <h3 className="text-lg font-bold text-surface-900">No properties found</h3>
            <p className="text-surface-500 mt-2 mb-6 text-sm">We couldn't find any matches for your search.</p>
            <button onClick={handleClearFilters} className="btn-primary text-sm">Clear Filters</button>
          </div>
        )}
      </div>

      {/* ── FOOTER ── */}
      <footer className="bg-surface-900 text-surface-400 py-16 border-t border-surface-800 mt-auto">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1">
            <h2 className="text-2xl font-display font-extrabold text-white mb-5">Rently<span className="text-brand-400">X</span></h2>
            <p className="text-surface-500 leading-relaxed max-w-sm mb-6 text-sm">
              RentlyX is the fastest growing real estate platform in Kerala.
              We connect buyers, sellers, and renters with transparency and trust.
            </p>
            <div className="flex gap-3">
              {[1,2,3].map(i => (
                <div key={i} className="w-9 h-9 rounded-lg bg-surface-800 hover:bg-brand-600 transition-colors cursor-pointer flex items-center justify-center text-white/70 hover:text-white">
                  <ArrowRight size={14} className="-rotate-45" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Platform</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-brand-400 transition-colors">Browse Homes</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">List Your Property</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Success Stories</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Pricing Plans</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-3 text-sm">
              <li><a href="#" className="hover:text-brand-400 transition-colors">Terms & Conditions</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Cookie Policy</a></li>
              <li><a href="#" className="hover:text-brand-400 transition-colors">Refund Policy</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Help Center</h4>
            <p className="text-surface-500 text-sm leading-relaxed mb-5">
              Need help? Register a complaint or track the status of an existing one.
            </p>
            <button
              onClick={() => navigate("/help")}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-lg shadow-brand-600/20 hover:shadow-brand-600/30"
            >
              <LifeBuoy size={16} />
              Open Help Center
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-14 pt-8 border-t border-surface-800 flex items-center justify-between flex-wrap gap-4">
          <p className="text-xs font-medium text-surface-600">&copy; 2026 RentlyX Inc. Designed with passion in Kozhikode.</p>
          <a href="/admin"
            className="flex items-center gap-1.5 text-xs font-medium text-surface-600 hover:text-brand-400 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A8.966 8.966 0 0112 15a8.966 8.966 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Admin Access
          </a>
        </div>
      </footer>

      <RentlyXWidget />
    </div>
  );
}

export default Home;
