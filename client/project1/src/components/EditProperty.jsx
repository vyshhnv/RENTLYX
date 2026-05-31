import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { getProperty, updateProperty } from "../api/fetchApi";
import Bar from "./Bar";
import { API_BASE_URL as BASE_URL } from "../config/api";
import { notifyError } from "../utils/notify";
import {
  ArrowLeft, Upload, Save, Loader2, MapPin, Home, IndianRupee,
  CheckCircle, Calendar, FileText, X, Trash2, ImagePlus,
  AlertTriangle, Eye, Grid3X3, ShieldCheck
} from "lucide-react";
import L from "leaflet";
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon, shadowUrl: iconShadow,
  iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

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

// ── Inline API helpers ────────────────────────────────────────────────────────
const getGalleryImages = (propertyId, token) =>
  fetch(`${BASE_URL}/properties/${propertyId}/images/`, {
    headers: { Authorization: `Token ${token}` },
  }).then(r => r.json());

const uploadGalleryImages = (propertyId, files, token) => {
  const fd = new FormData();
  files.forEach(f => fd.append("images", f));
  return fetch(`${BASE_URL}/properties/${propertyId}/images/`, {
    method: "POST",
    headers: { Authorization: `Token ${token}` },
    body: fd,
  }).then(r => r.json());
};

const deleteGalleryImage = (imageId, token) =>
  fetch(`${BASE_URL}/properties/images/${imageId}/`, {
    method: "DELETE",
    headers: { Authorization: `Token ${token}` },
  });

// ── Reusable File Upload Row ──────────────────────────────────────────────────
function FileUploadRow({
  label, accept, hint,
  currentUrl, pendingFile, deleteFlag,
  onFileSelect, onDelete, onClearPending,
  iconEl, iconBg = "bg-red-50 text-red-500",
  pendingBg = "bg-violet-50 border-violet-200",
  pendingText = "text-brand-600",
}) {
  const inputRef = useRef();

  return (
    <div>
      <label className="block text-sm font-bold text-surface-700 mb-3 flex items-center gap-2">
        {iconEl}
        {label}
      </label>

      {/* Current file */}
      {currentUrl && !deleteFlag && !pendingFile && (
        <div className="flex items-center justify-between bg-slate-50 border border-surface-100 rounded-xl px-4 py-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 ${iconBg} rounded-lg shrink-0`}>{iconEl}</div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-surface-700 truncate">Current file</p>
              <p className="text-xs text-surface-400 truncate max-w-[180px]">
                {currentUrl.split("/").pop()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href={currentUrl} target="_blank" rel="noreferrer"
              className="p-2 text-surface-400 hover:text-brand-600 hover:bg-violet-50 rounded-lg transition" title="View">
              <Eye size={16} />
            </a>
            <button type="button" onClick={onDelete}
              className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
              <Trash2 size={16} />
            </button>
            <button type="button" onClick={() => inputRef.current.click()}
              className="px-3 py-1.5 text-xs font-bold bg-white border border-surface-200 text-surface-600 rounded-lg hover:bg-surface-50 transition">
              Replace
            </button>
          </div>
        </div>
      )}

      {/* Pending new file */}
      {pendingFile && (
        <div className={`flex items-center justify-between border rounded-xl px-4 py-3 mb-3 ${pendingBg}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 ${iconBg} rounded-lg shrink-0`}>{iconEl}</div>
            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-wide mb-0.5 ${pendingText}`}>New file ready to upload</p>
              <p className="text-sm font-bold text-surface-700 truncate max-w-[200px]">{pendingFile.name}</p>
            </div>
          </div>
          <button type="button" onClick={onClearPending}
            className="p-2 text-surface-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Delete flag warning */}
      {deleteFlag && !pendingFile && (
        <div className="flex items-center gap-2 text-amber-600 text-xs font-semibold bg-amber-50 px-3 py-2 rounded-xl border border-amber-100 mb-3">
          <AlertTriangle size={13} />
          File will be removed when you save changes.
          <button type="button" onClick={onClearPending}
            className="ml-auto underline hover:no-underline">Undo</button>
        </div>
      )}

      {/* Upload zone (no current file, no pending, no delete flag) */}
      {!currentUrl && !pendingFile && !deleteFlag && (
        <div onClick={() => inputRef.current.click()}
          className="border-2 border-dashed border-surface-200 rounded-xl p-5 text-center hover:bg-surface-50 hover:border-violet-300 transition cursor-pointer">
          <div className="flex flex-col items-center gap-2">
            <div className={`p-2.5 rounded-full ${iconBg}`}>{iconEl}</div>
            <p className="text-sm font-bold text-surface-500">Click to upload {label}</p>
            <p className="text-xs text-surface-400">{hint}</p>
          </div>
        </div>
      )}

      {/* Re-upload button after delete flag if no current */}
      {deleteFlag && !pendingFile && (
        <button type="button" onClick={() => inputRef.current.click()}
          className="w-full py-2.5 border-2 border-dashed border-surface-200 hover:border-violet-300 rounded-xl text-sm font-bold text-surface-400 hover:text-brand-600 transition">
          + Upload new file instead
        </button>
      )}

      <input ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => {
          const f = e.target.files[0];
          if (f) onFileSelect(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// ── Gallery Section ───────────────────────────────────────────────────────────
function GallerySection({ propertyId, token, existingImages, onImagesChange }) {
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [newFiles, setNewFiles] = useState([]);
  const [newPreviews, setNewPreviews] = useState([]);
  const inputRef = useRef();

  const handleFilePick = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const previews = files.map(f => URL.createObjectURL(f));
    setNewFiles(prev => [...prev, ...files]);
    setNewPreviews(prev => [...prev, ...previews]);
    e.target.value = "";
  };

  const removeNewFile = (idx) => {
    URL.revokeObjectURL(newPreviews[idx]);
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
    setNewPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (!newFiles.length) return;
    setUploading(true);
    try {
      const result = await uploadGalleryImages(propertyId, newFiles, token);
      if (result.images) {
        onImagesChange([...existingImages, ...result.images]);
        newPreviews.forEach(url => URL.revokeObjectURL(url));
        setNewFiles([]);
        setNewPreviews([]);
      }
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    setDeletingId(imageId);
    try {
      await deleteGalleryImage(imageId, token);
      onImagesChange(existingImages.filter(img => img.id !== imageId));
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <label className="block text-sm font-bold text-surface-700 mb-3 flex items-center gap-2">
        <Grid3X3 size={15} className="text-violet-400" />
        Gallery Images
        <span className="ml-auto text-xs font-medium text-surface-400">{existingImages.length} uploaded</span>
      </label>

      {existingImages.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          {existingImages.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-surface-100 border border-surface-100">
              <img src={img.image_url || img.image} alt={img.caption || "Gallery"} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center">
                <button type="button" onClick={() => handleDelete(img.id)} disabled={deletingId === img.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg">
                  {deletingId === img.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {newPreviews.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-wide mb-2">Ready to upload ({newPreviews.length})</p>
          <div className="grid grid-cols-3 gap-2.5">
            {newPreviews.map((url, idx) => (
              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-violet-50 border-2 border-dashed border-violet-200">
                <img src={url} alt="" className="w-full h-full object-cover opacity-90" />
                <button type="button" onClick={() => removeNewFile(idx)}
                  className="absolute top-1.5 right-1.5 p-1 bg-white/90 hover:bg-red-500 hover:text-white text-surface-600 rounded-full shadow transition">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => inputRef.current.click()}
          className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-surface-200 hover:border-violet-400 hover:bg-violet-50 rounded-xl text-sm font-bold text-surface-500 hover:text-brand-600 transition">
          <ImagePlus size={18} /> Add Photos
        </button>
        {newFiles.length > 0 && (
          <button type="button" onClick={handleUpload} disabled={uploading}
            className="flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-violet-300 text-white text-sm font-bold rounded-xl transition shadow-md shadow-brand-600/20">
            {uploading ? <><Loader2 size={15} className="animate-spin" /> Uploading...</> : <><Upload size={15} /> Upload {newFiles.length}</>}
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilePick} />
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function EditProperty() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [location, setLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([11.2588, 75.7804]);

  // Conditions PDF state
  const [currentPdfUrl, setCurrentPdfUrl] = useState(null);
  const [pendingPdfFile, setPendingPdfFile] = useState(null);
  const [deletePdf, setDeletePdf] = useState(false);

  // Legal Document state — NEW
  const [currentLegalUrl, setCurrentLegalUrl] = useState(null);
  const [pendingLegalFile, setPendingLegalFile] = useState(null);
  const [deleteLegal, setDeleteLegal] = useState(false);

  // Gallery state
  const [galleryImages, setGalleryImages] = useState([]);

  const token = sessionStorage.getItem("token");

  const [formData, setFormData] = useState({
    name: "", property_place: "", purpose: "rent",
    property_type: "apartment", bhk: "1bhk", price: "",
    built_up_area: "", bathrooms: "1", furnishing: "unfurnished",
    availability_date: "", description: "", property_image: null,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!token) { navigate("/seller/login"); return; }

    const load = async () => {
      try {
        setLoading(true);
        const res = await getProperty(id);
        const p = res.data;

        setFormData({
          name: p.name || "", property_place: p.property_place || "",
          purpose: p.purpose || "rent", property_type: p.property_type || "apartment",
          bhk: p.bhk || "1bhk", price: p.price || "",
          built_up_area: p.built_up_area || "", bathrooms: p.bathrooms || "1",
          furnishing: p.furnishing || "unfurnished",
          availability_date: p.availability_date || "",
          description: p.description || "", property_image: null,
        });

        setImagePreview(p.property_image || null);
        setCurrentPdfUrl(p.conditions_pdf || null);
        setCurrentLegalUrl(p.legal_document || null);

        if (p.latitude && p.longitude) {
          setLocation({ latitude: p.latitude, longitude: p.longitude });
          setMapCenter([p.latitude, p.longitude]);
        }

        try {
          const imgs = await getGalleryImages(id, token);
          setGalleryImages(Array.isArray(imgs) ? imgs : []);
        } catch (galleryErr) {
          console.error("Failed to load gallery images:", galleryErr);
        }

      } catch (err) {
        console.error(err);
        navigate("/seller/properties");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFormData(prev => ({ ...prev, property_image: file }));
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = "Property name is required";
    if (!formData.property_place.trim()) errs.property_place = "Location is required";
    if (!formData.price || formData.price <= 0) errs.price = "Valid price is required";
    if (!formData.built_up_area || formData.built_up_area <= 0) errs.built_up_area = "Valid area is required";
    if (!formData.description.trim()) errs.description = "Description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!token) { navigate("/seller/login"); return; }

    try {
      setSubmitting(true);
      const data = new FormData();

      const fields = [
        "name", "property_place", "purpose", "property_type",
        "bhk", "price", "built_up_area", "bathrooms", "furnishing", "description"
      ];
      fields.forEach(f => data.append(f, formData[f]));
      if (formData.availability_date) data.append("availability_date", formData.availability_date);
      if (location) {
        data.append("latitude", location.latitude);
        data.append("longitude", location.longitude);
      }
      if (formData.property_image instanceof File) {
        data.append("property_image", formData.property_image);
      }

      // Conditions PDF
      if (pendingPdfFile) {
        data.append("conditions_pdf", pendingPdfFile);
      } else if (deletePdf) {
        data.append("conditions_pdf", "");
      }

      // Legal Document — NEW
      if (pendingLegalFile) {
        data.append("legal_document", pendingLegalFile);
      } else if (deleteLegal) {
        data.append("legal_document", "");
      }

      await updateProperty(id, data, token);
      setShowSuccessModal(true);

    } catch (err) {
      console.error(err);
      const status = err.response?.status;
      if (status === 403) {
        notifyError("Permission denied.");
        navigate("/seller/properties");
      } else if (status === 401) {
        notifyError("Session expired.");
        navigate("/seller/login");
      } else {
        notifyError("Failed to update. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-50">
        <Bar forceSolid />
        <div className="flex items-center justify-center pt-32">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-brand-600 animate-spin" />
            <p className="text-surface-600 font-medium">Loading property...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-surface-900">
      <Bar forceSolid />

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-16">

        {/* Header */}
        <div className="mb-8">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-surface-500 hover:text-brand-600 font-semibold mb-4 transition text-sm">
            <ArrowLeft size={18} /> Back to Properties
          </button>
          <h1 className="text-3xl font-extrabold text-surface-900 mb-1">Edit Property</h1>
          <p className="text-surface-500 text-sm">Update your listing details, images and documents.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">

          {/* ── LEFT: FORM ── */}
          <div className="space-y-6">

            {/* Cover Image */}
            <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-surface-700 mb-4 flex items-center gap-2">
                <span className="bg-violet-100 text-brand-600 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">1</span>
                Cover Image
              </h2>
              <div className="flex flex-col items-center gap-4">
                {imagePreview && (
                  <div className="w-full h-52 rounded-2xl overflow-hidden bg-surface-100 relative">
                    <img src={imagePreview} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-lg">Cover Photo</div>
                  </div>
                )}
                <label className="cursor-pointer flex items-center gap-2 px-5 py-2.5 bg-violet-50 border-2 border-dashed border-violet-200 rounded-xl text-brand-600 font-bold hover:bg-violet-100 transition text-sm">
                  <Upload size={16} />
                  {imagePreview ? "Replace Cover" : "Upload Cover"}
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Gallery */}
            <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-surface-700 mb-4 flex items-center gap-2">
                <span className="bg-violet-100 text-brand-600 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">2</span>
                Gallery Photos
              </h2>
              <GallerySection
                propertyId={id}
                token={token}
                existingImages={galleryImages}
                onImagesChange={setGalleryImages}
              />
            </div>

            {/* Documents card — both PDF and Legal Doc */}
            <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-6 space-y-6">
              <h2 className="text-base font-bold text-surface-700 flex items-center gap-2">
                <span className="bg-violet-100 text-brand-600 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">3</span>
                Documents
              </h2>

              {/* Terms & Conditions PDF */}
              <FileUploadRow
                label="Terms & Conditions PDF"
                accept=".pdf"
                hint="Optional — rental agreement / T&C document"
                currentUrl={currentPdfUrl}
                pendingFile={pendingPdfFile}
                deleteFlag={deletePdf}
                onFileSelect={(f) => { setPendingPdfFile(f); setDeletePdf(false); }}
                onDelete={() => { setDeletePdf(true); setCurrentPdfUrl(null); setPendingPdfFile(null); }}
                onClearPending={() => { setPendingPdfFile(null); setDeletePdf(false); setCurrentPdfUrl(currentPdfUrl); }}
                iconEl={<FileText size={15} className="text-red-400" />}
                iconBg="bg-red-50 text-red-500"
                pendingBg="bg-violet-50 border-violet-200"
                pendingText="text-brand-600"
              />

              {/* Divider */}
              <div className="border-t border-surface-100" />

              {/* Legal Document — NEW */}
              <div>
                <FileUploadRow
                  label="Legal Document"
                  accept=".pdf,.jpg,.jpeg,.png"
                  hint="Tax receipt, ownership proof, NOC — PDF / JPG / PNG"
                  currentUrl={currentLegalUrl}
                  pendingFile={pendingLegalFile}
                  deleteFlag={deleteLegal}
                  onFileSelect={(f) => { setPendingLegalFile(f); setDeleteLegal(false); }}
                  onDelete={() => { setDeleteLegal(true); setCurrentLegalUrl(null); setPendingLegalFile(null); }}
                  onClearPending={() => { setPendingLegalFile(null); setDeleteLegal(false); setCurrentLegalUrl(currentLegalUrl); }}
                  iconEl={<ShieldCheck size={15} className="text-emerald-500" />}
                  iconBg="bg-emerald-50 text-emerald-600"
                  pendingBg="bg-emerald-50 border-emerald-200"
                  pendingText="text-emerald-700"
                />
                <p className="text-xs text-surface-400 mt-2 flex items-center gap-1">
                  <ShieldCheck size={11} className="text-emerald-400" />
                  Uploading a legal document helps speed up admin approval.
                </p>
              </div>
            </div>

            {/* Property Details Form */}
            <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-6">
              <h2 className="text-base font-bold text-surface-700 mb-5 flex items-center gap-2">
                <span className="bg-violet-100 text-brand-600 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">4</span>
                Property Details
              </h2>

              <form id="edit-form" onSubmit={handleSubmit} className="space-y-5">

                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Property Name *</label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                    <input type="text" name="name" value={formData.name} onChange={handleChange}
                      placeholder="e.g., Luxury 3BHK Apartment"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium ${errors.name ? "border-red-300 bg-red-50" : "border-surface-200"} focus:outline-none focus:ring-2 focus:ring-brand-400 transition`} />
                  </div>
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Locality *</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                    <input type="text" name="property_place" value={formData.property_place} onChange={handleChange}
                      placeholder="e.g., Kozhikode, Kerala"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium ${errors.property_place ? "border-red-300 bg-red-50" : "border-surface-200"} focus:outline-none focus:ring-2 focus:ring-brand-400 transition`} />
                  </div>
                  {errors.property_place && <p className="text-red-500 text-xs mt-1">{errors.property_place}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Purpose", name: "purpose", options: [["rent", "For Rent"], ["sale", "For Sale"]] },
                    { label: "Property Type", name: "property_type", options: [["apartment", "Apartment"], ["villa", "Villa"], ["house", "House"], ["flat", "Flat"]] },
                  ].map(({ label, name, options }) => (
                    <div key={name}>
                      <label className="block text-sm font-bold text-surface-700 mb-2">{label}</label>
                      <select name={name} value={formData[name]} onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 transition appearance-none bg-white cursor-pointer">
                        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-2">BHK</label>
                    <select name="bhk" value={formData.bhk} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 transition appearance-none bg-white cursor-pointer">
                      {[["1bhk", "1 BHK"], ["2bhk", "2 BHK"], ["3bhk", "3 BHK"], ["4bhk+", "4+ BHK"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-2">Bathrooms</label>
                    <input type="number" name="bathrooms" min="1" value={formData.bathrooms} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 transition" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-2">Price (₹) *</label>
                    <div className="relative">
                      <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400" size={16} />
                      <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="5000000"
                        className={`w-full pl-11 pr-4 py-3 rounded-xl border text-sm font-medium ${errors.price ? "border-red-300 bg-red-50" : "border-surface-200"} focus:outline-none focus:ring-2 focus:ring-brand-400 transition`} />
                    </div>
                    {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-2">Area (sq ft) *</label>
                    <input type="number" name="built_up_area" value={formData.built_up_area} onChange={handleChange} placeholder="1200"
                      className={`w-full px-4 py-3 rounded-xl border text-sm font-medium ${errors.built_up_area ? "border-red-300 bg-red-50" : "border-surface-200"} focus:outline-none focus:ring-2 focus:ring-brand-400 transition`} />
                    {errors.built_up_area && <p className="text-red-500 text-xs mt-1">{errors.built_up_area}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-2">Furnishing</label>
                    <select name="furnishing" value={formData.furnishing} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 transition appearance-none bg-white cursor-pointer">
                      <option value="full">Fully Furnished</option>
                      <option value="semi">Semi Furnished</option>
                      <option value="unfurnished">Unfurnished</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-surface-700 mb-2 flex items-center gap-1.5">
                      <Calendar size={13} /> Available From
                    </label>
                    <input name="availability_date" type="date" value={formData.availability_date} onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-400 transition" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-surface-700 mb-2">Description *</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} rows={4}
                    placeholder="Describe your property..."
                    className={`w-full px-4 py-3 rounded-xl border text-sm font-medium resize-none ${errors.description ? "border-red-300 bg-red-50" : "border-surface-200"} focus:outline-none focus:ring-2 focus:ring-brand-400 transition`} />
                  {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                </div>

              </form>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button type="button" onClick={() => navigate("/seller/properties")} disabled={submitting}
                className="flex-1 px-6 py-3.5 rounded-2xl border border-surface-200 bg-white text-surface-700 font-bold hover:bg-surface-50 transition disabled:opacity-50 text-sm">
                Cancel
              </button>
              <button type="submit" form="edit-form" disabled={submitting}
                className="flex-1 px-6 py-3.5 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm shadow-lg shadow-brand-600/20">
                {submitting
                  ? <><Loader2 className="animate-spin" size={16} /> Saving...</>
                  : <><Save size={16} /> Save Changes</>
                }
              </button>
            </div>
          </div>

          {/* ── RIGHT: MAP ── */}
          <div className="bg-white rounded-3xl border border-surface-100 shadow-sm p-6 sticky top-24 h-fit">
            <h2 className="text-base font-bold text-surface-800 mb-1 flex items-center gap-2">
              <span className="bg-violet-100 text-brand-600 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center">📍</span>
              Update Location
            </h2>
            <p className="text-xs text-surface-500 mb-5 pl-8">Click on the map to update the pinned location.</p>

            <div className="h-96 rounded-2xl overflow-hidden border-2 border-surface-100 relative">
              <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker onLocationSelect={setLocation} selectedLocation={location} />
              </MapContainer>
              {location && (
                <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-lg text-xs font-bold text-violet-800 border border-violet-100 flex items-center gap-2">
                  <MapPin size={13} className="text-brand-500" />
                  {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </div>
              )}
            </div>
            {!location && (
              <p className="text-xs text-amber-600 mt-3 text-center bg-amber-50 py-2 px-3 rounded-xl border border-amber-100">
                ⚠ No location set — click the map to pin one.
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="text-emerald-500" size={32} />
            </div>
            <h3 className="text-xl font-extrabold text-surface-900 mb-2">Updated!</h3>
            <p className="text-surface-500 text-sm mb-6">Your property has been updated successfully.</p>
            <button onClick={() => { setShowSuccessModal(false); navigate("/seller/properties"); }}
              className="w-full py-3 rounded-2xl bg-brand-600 text-white font-bold hover:bg-brand-700 transition">
              Back to Properties
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProperty;
