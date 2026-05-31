import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMapEvents, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { createProperty } from "../api/fetchApi";
import { buildApiUrl } from "../config/api";
import Bar from "./Bar";
import { Upload, MapPin, FileText, Image as ImageIcon, CheckCircle2, Calendar, Search, X, Loader2, Plus, Trash2, ShieldCheck, ArrowLeft } from "lucide-react";
import L from "leaflet";

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function FlyToLocation({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.latitude, target.longitude], 16, { duration: 1.2 });
  }, [map, target]);
  return null;
}

function LocationPicker({ onLocationSelect, selectedLocation }) {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      onLocationSelect({ latitude: lat, longitude: lng });
    },
  });
  return selectedLocation ? (
    <Marker position={[selectedLocation.latitude, selectedLocation.longitude]}>
      <Popup>📍 Selected Location</Popup>
    </Marker>
  ) : null;
}

function MapSearchBar({ onLocationSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowResults(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchPlaces = async (value) => {
    if (!value.trim() || value.length < 3) { setResults([]); setShowResults(false); return; }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&limit=6&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      setResults(data);
      setShowResults(true);
    } catch (err) { console.error("Geocode error:", err); }
    finally { setSearching(false); }
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(val), 400);
  };

  const handleSelect = (place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    onLocationSelect({ latitude: lat, longitude: lng });
    setQuery(place.display_name.split(",").slice(0, 3).join(", "));
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={wrapperRef} className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
      <div className="relative flex items-center">
        <div className="absolute left-3 text-surface-400 pointer-events-none">
          {searching ? <Loader2 size={16} className="animate-spin text-brand-500" /> : <Search size={16} />}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search place or address..."
          className="w-full pl-9 pr-9 py-2.5 bg-white border border-surface-200 rounded-xl shadow-lg text-sm font-medium text-surface-800 placeholder:text-surface-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-brand-400/20 transition"
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setShowResults(false); }}
            className="absolute right-3 text-surface-400 hover:text-surface-600 transition">
            <X size={14} />
          </button>
        )}
      </div>
      {showResults && results.length > 0 && (
        <div className="mt-1.5 bg-white border border-surface-100 rounded-xl shadow-2xl overflow-hidden">
          {results.map((place, i) => (
            <button key={place.place_id} onClick={() => handleSelect(place)}
              className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-violet-50 transition ${i !== results.length - 1 ? "border-b border-slate-50" : ""}`}>
              <MapPin size={14} className="text-violet-400 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-surface-800 truncate">{place.display_name.split(",")[0]}</p>
                <p className="text-[10px] text-surface-400 truncate mt-0.5">{place.display_name.split(",").slice(1, 4).join(",")}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Multi-Image Upload ────────────────────────────────────────────────────────
function MultiImageUpload({ images, onAdd, onRemove }) {
  const fileInputRef = useRef(null);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files);
    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      id: Math.random().toString(36).slice(2),
    }));
    onAdd(newImages);
    e.target.value = "";
  };

  return (
    <div>
      <label className="block text-sm font-bold text-surface-700 mb-2">
        Property Images
        <span className="ml-2 text-xs font-normal text-surface-400">(First image = cover photo)</span>
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-3">
          {images.map((img, idx) => (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-surface-200">
              <img src={img.preview} alt="" className="w-full h-full object-cover" />
              {idx === 0 && (
                <div className="absolute top-1.5 left-1.5 bg-brand-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  COVER
                </div>
              )}
              <button
                type="button"
                onClick={() => onRemove(img.id)}
                className="absolute top-1.5 right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
              >
                <X size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-violet-400 hover:bg-violet-50 flex flex-col items-center justify-center gap-1 transition text-surface-400 hover:text-brand-500"
          >
            <Plus size={20} />
            <span className="text-[10px] font-bold">Add More</span>
          </button>
        </div>
      )}

      {images.length === 0 && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-surface-200 rounded-2xl p-6 text-center hover:bg-surface-50 hover:border-violet-300 transition cursor-pointer"
        >
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-violet-50 text-brand-600 rounded-full">
              <ImageIcon size={24} />
            </div>
            <p className="text-sm font-bold text-surface-600">Click to upload images</p>
            <p className="text-xs text-surface-400">SVG, PNG, JPG — select multiple at once</p>
          </div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" />
    </div>
  );
}

// ── File Upload Row ───────────────────────────────────────────────────────────
function FileUploadRow({ label, accept, file, onFile, icon, hint, iconBg = "bg-red-50 text-red-500" }) {
  return (
    <div>
      <label className="block text-sm font-bold text-surface-700 mb-2">{label}</label>
      <div className="border border-surface-200 rounded-xl p-4 flex items-center justify-between bg-surface-50">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${iconBg} rounded-lg`}>{icon}</div>
          <div>
            <p className="text-sm font-bold text-surface-700">{file ? "File Selected" : `Upload ${label}`}</p>
            <p className="text-xs text-surface-400 truncate max-w-[160px]">{file ? file.name : hint}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {file && (
            <button
              type="button"
              onClick={() => onFile(null)}
              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <X size={14} />
            </button>
          )}
          <label className="px-4 py-2 bg-white border border-surface-200 text-surface-600 text-xs font-bold rounded-lg hover:bg-surface-50 cursor-pointer transition">
            Browse
            <input
              type="file"
              accept={accept}
              onChange={(e) => {
                const f = e.target.files[0];
                if (f) onFile(f);
                e.target.value = null;
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SellerAddProperty() {
  const navigate = useNavigate();

  const [location, setLocation] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    property_place: "",
    city: "Kozhikode",
    price: "",
    description: "",
    purpose: "sale",
    property_type: "apartment",
    bhk: "1bhk",
    bathrooms: "1",
    built_up_area: "",
    furnishing: "unfurnished",
    availability_date: "",
  });

  const [galleryImages, setGalleryImages] = useState([]);
  const [pdfFile, setPdfFile] = useState(null);
  const [legalDocFile, setLegalDocFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role = sessionStorage.getItem("role");
    if (!token || role !== "seller") {
      toast.error("Access Denied: Sellers only.");
      navigate("/seller/login");
    }
  }, [navigate]);

  useEffect(() => {
    return () => galleryImages.forEach(img => URL.revokeObjectURL(img.preview));
  }, [galleryImages]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleAddImages = (newImgs) => setGalleryImages(prev => [...prev, ...newImgs]);
  const handleRemoveImage = (id) => {
    setGalleryImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };

  const handlePdfChange = (file) => {
    if (file && file.type !== "application/pdf") {
      toast.error("Please upload a valid PDF file only.");
      return;
    }
    setPdfFile(file);
  };

  const handleLegalDocChange = (file) => {
    if (file) {
      const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowed.includes(file.type)) {
        toast.error("Legal document must be PDF, JPG, or PNG.");
        return;
      }
    }
    setLegalDocFile(file);
  };

  const handleSearchSelect = (loc) => { setLocation(loc); setFlyTarget(loc); };
  const handleMapClick = (loc) => { setLocation(loc); };

  const handleSave = async () => {
    const requiredFields = ["name", "property_place", "price", "bhk", "built_up_area"];
    for (let field of requiredFields) {
      if (!formData[field]) { toast.error(`Please fill in: ${field.replace(/_/g, " ")}`); return; }
    }
    if (!location) { toast.error("Please pin the location on the map!"); return; }

    try {
      setLoading(true);
      const token = sessionStorage.getItem("token");
      const data = new FormData();

      Object.entries(formData).forEach(([key, value]) => { if (value !== "") data.append(key, value); });
      data.append("latitude", location.latitude);
      data.append("longitude", location.longitude);

      if (galleryImages.length > 0) data.append("property_image", galleryImages[0].file);
      if (pdfFile) data.append("conditions_pdf", pdfFile);
      if (legalDocFile) data.append("legal_document", legalDocFile);

      const res = await createProperty(data, token);
      const propertyId = res.data?.id;

      if (propertyId && galleryImages.length > 1) {
        const galleryForm = new FormData();
        galleryImages.slice(1).forEach(img => galleryForm.append("images", img.file));
        await fetch(buildApiUrl(`/properties/${propertyId}/images/`), {
          method: "POST",
          headers: { Authorization: `Token ${token}` },
          body: galleryForm,
        });
      }

      toast.success("Property submitted! Awaiting admin approval before going live.");
      setTimeout(() => navigate("/seller/properties"), 1500);
    } catch (error) {
      console.error("Save Error:", error);
      toast.error("Failed to save property. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-surface-900">
      <Bar forceSolid={true} />

      <div className="max-w-7xl mx-auto px-6 py-12 pt-32">
        <div className="mb-10">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-surface-500 hover:text-emerald-600 font-semibold mb-4 transition text-sm">
            <ArrowLeft size={18} /> Back to Dashboard
          </button>
          <h1 className="text-3xl font-extrabold text-surface-900 mb-2">Add New Listing</h1>
          <p className="text-surface-500 font-medium">Fill in the details below to publish your property.</p>

          {/* Approval notice banner */}
          <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-xl shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-amber-800 font-bold text-sm">Listing requires admin approval</p>
              <p className="text-amber-600 text-xs mt-0.5">Your property will be reviewed by our team before it goes live. This usually takes a few hours.</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* LEFT: FORM */}
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-surface-100 h-fit">
            <h2 className="text-xl font-bold text-surface-800 mb-6 flex items-center gap-3 border-b border-surface-100 pb-4">
              <span className="bg-violet-100 text-brand-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">1</span>
              Property Details
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-surface-700 mb-2">Property Title *</label>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="e.g. Luxury Sea View Apartment"
                  className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Locality *</label>
                  <input name="property_place" value={formData.property_place} onChange={handleChange} placeholder="e.g. Mavoor Road"
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">City</label>
                  <input name="city" value={formData.city} onChange={handleChange}
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Price (₹) *</label>
                  <input name="price" type="number" value={formData.price} onChange={handleChange} placeholder="e.g. 5000000"
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Config *</label>
                  <select name="bhk" value={formData.bhk} onChange={handleChange}
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium cursor-pointer">
                    <option value="1bhk">1 BHK</option>
                    <option value="2bhk">2 BHK</option>
                    <option value="3bhk">3 BHK</option>
                    <option value="4bhk+">4+ BHK</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Bathrooms</label>
                  <input name="bathrooms" type="number" min="1" value={formData.bathrooms} onChange={handleChange}
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Area (sq. ft.) *</label>
                  <input name="built_up_area" type="number" value={formData.built_up_area} onChange={handleChange} placeholder="e.g. 1200"
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Action</label>
                  <select name="purpose" value={formData.purpose} onChange={handleChange}
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium cursor-pointer">
                    <option value="sale">For Sale</option>
                    <option value="rent">For Rent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Type</label>
                  <select name="property_type" value={formData.property_type} onChange={handleChange}
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium cursor-pointer">
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="villa">Villa</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Furnishing</label>
                  <select name="furnishing" value={formData.furnishing} onChange={handleChange}
                    className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium cursor-pointer">
                    <option value="full">Fully Furnished</option>
                    <option value="semi">Semi Furnished</option>
                    <option value="unfurnished">Unfurnished</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-surface-700 mb-2 flex items-center gap-2">
                  <Calendar size={16} /> Available From
                </label>
                <input name="availability_date" type="date" value={formData.availability_date} onChange={handleChange}
                  className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition font-medium" />
                <p className="text-xs text-surface-400 mt-1 ml-1">Leave blank if immediately available</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-surface-700 mb-2">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="3"
                  placeholder="Describe amenities, nearby places, etc."
                  className="w-full p-3.5 bg-surface-50 border border-surface-200 rounded-xl focus:bg-white focus:border-brand-500 outline-none transition font-medium resize-none" />
              </div>

              {/* Multi Image Upload */}
              <MultiImageUpload images={galleryImages} onAdd={handleAddImages} onRemove={handleRemoveImage} />

              {/* Terms & Conditions PDF */}
              <FileUploadRow
                label="Terms & Conditions (PDF)"
                accept=".pdf"
                file={pdfFile}
                onFile={handlePdfChange}
                icon={<FileText size={20} />}
                hint="Optional — rental agreement terms"
                iconBg="bg-red-50 text-red-500"
              />

              {/* Legal Document — NEW */}
              <div>
                <FileUploadRow
                  label="Legal Document"
                  accept=".pdf,.jpg,.jpeg,.png"
                  file={legalDocFile}
                  onFile={handleLegalDocChange}
                  icon={<ShieldCheck size={20} />}
                  hint="Tax receipt, ownership proof, NOC…"
                  iconBg="bg-emerald-50 text-emerald-600"
                />
                <p className="text-xs text-surface-400 mt-1.5 ml-1 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-500" />
                  Uploading a legal document helps speed up admin approval.
                  Accepted: PDF, JPG, PNG.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: MAP & SUBMIT */}
          <div className="flex flex-col h-full gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-surface-100 flex-1 flex flex-col">
              <h2 className="text-xl font-bold text-surface-800 mb-2 flex items-center gap-3">
                <span className="bg-violet-100 text-brand-700 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold">2</span>
                Pin Location
              </h2>
              <p className="text-sm text-surface-500 mb-6 pl-11">Search for a place or click on the map to pin the location.</p>

              <div className="flex-1 min-h-[400px] rounded-2xl border-2 border-surface-100 relative">
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-[88%] max-w-sm">
                  <MapSearchBar onLocationSelect={handleSearchSelect} />
                </div>
                <div className="absolute inset-0 rounded-2xl overflow-hidden">
                  <MapContainer center={[11.2588, 75.7804]} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker onLocationSelect={handleMapClick} selectedLocation={location} />
                    <FlyToLocation target={flyTarget} />
                  </MapContainer>
                </div>
                {location && (
                  <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-lg text-xs font-bold text-violet-800 border border-violet-100 flex items-center gap-2">
                    <MapPin size={14} className="text-brand-500" />
                    {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                  </div>
                )}
                {!location && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-black/60 backdrop-blur text-white text-xs font-semibold px-4 py-2 rounded-full flex items-center gap-2 pointer-events-none">
                    <MapPin size={12} /> Search above or click map to pin
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-surface-100">
              <div className="flex items-start gap-3 mb-6">
                <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-surface-500 leading-relaxed">
                  By submitting, you agree that all information provided is accurate. Your listing will be reviewed by admin before going live.
                </p>
              </div>
              <button onClick={handleSave} disabled={loading}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-violet-300 text-white font-bold text-lg py-4 rounded-xl shadow-xl shadow-brand-600/20 transition-all transform hover:-translate-y-1 active:scale-[0.99] flex items-center justify-center gap-2">
                {loading ? "Submitting..." : "Submit for Approval"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
