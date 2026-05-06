import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listSellerProperties, deleteProperty } from "../api/fetchApi";
import Bar from "./Bar";
import { MapPin, Plus, Edit, ImageOff, Trash2, AlertTriangle, X } from "lucide-react";

function SellerProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const token = sessionStorage.getItem("token");
      if (!token) { navigate("/seller/login"); return; }
      try {
        setLoading(true);
        const res = await listSellerProperties(token);
        setProperties(res.data);
      } catch (err) {
        console.error("Failed to load seller properties:", err);
        if (err.response?.status === 401) navigate("/seller/login");
      } finally { setLoading(false); }
    };
    fetchData();
  }, [navigate]);

  const openDeleteModal = (property) => { setPropertyToDelete(property); setShowDeleteModal(true); };
  const closeDeleteModal = () => { setShowDeleteModal(false); setPropertyToDelete(null); };

  const confirmDelete = async () => {
    if (!propertyToDelete) return;
    const token = sessionStorage.getItem("token");
    if (!token) { alert("Please log in again to delete properties"); navigate("/seller/login"); return; }
    try {
      setDeleting(propertyToDelete.id);
      await deleteProperty(propertyToDelete.id, token);
      setProperties(properties.filter(p => p.id !== propertyToDelete.id));
      closeDeleteModal();
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete property. Please try again.");
    } finally { setDeleting(null); }
  };

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />

      <div className="max-w-7xl mx-auto px-6 pt-28 pb-16">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-extrabold text-surface-900 mb-1">My Properties</h1>
            <p className="text-surface-500 text-sm font-medium">Manage your active listings and track their performance.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => navigate(-1)} className="btn-secondary py-2.5 px-5 text-sm">Back to Dashboard</button>
            <button onClick={() => navigate("/add")} className="btn-primary py-2.5 px-5 text-sm flex items-center gap-2">
              <Plus size={18} /> Add New Property
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-72 bg-white rounded-2xl border border-surface-100 animate-pulse" />)}
          </div>
        )}

        {/* Empty */}
        {!loading && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-surface-200 text-center">
            <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mb-5">
              <Plus size={28} className="text-surface-400" />
            </div>
            <h2 className="text-lg font-display font-bold text-surface-900 mb-2">No properties listed yet</h2>
            <p className="text-surface-500 text-sm mb-6 max-w-md mx-auto">Start by creating your first listing. It takes less than 5 minutes.</p>
            <button onClick={() => navigate("/add")} className="btn-primary text-sm">Create Listing</button>
          </div>
        )}

        {/* Properties Grid */}
        {!loading && properties.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((p) => (
              <div key={p.id} className="group card overflow-hidden flex flex-col hover:shadow-glass-lg hover:-translate-y-0.5 transition-all duration-300">
                <div className="relative h-48 w-full overflow-hidden bg-surface-100">
                  {p.property_image ? (
                    <img src={p.property_image} alt={p.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-surface-400">
                      <ImageOff size={28} className="mb-1 opacity-50" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">No Image</span>
                    </div>
                  )}
                  <div className={`absolute top-3 left-3 px-3 py-1 rounded-lg text-[11px] font-bold text-white uppercase tracking-wide shadow-md ${p.purpose === 'sale' ? 'bg-brand-600' : 'bg-emerald-500'
                    }`}>
                    {p.purpose === 'sale' ? 'For Sale' : 'For Rent'}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-surface-900/70 backdrop-blur text-white px-3 py-1 rounded-lg font-display font-bold text-sm">
                    ₹ {Number(p.price).toLocaleString()}
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="font-display font-bold text-base text-surface-900 line-clamp-1 mb-1 group-hover:text-brand-600 transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-1 text-surface-500 text-sm">
                      <MapPin size={14} className="text-surface-400" /> <span className="truncate">{p.property_place}</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-4 border-t border-surface-100 flex items-center gap-2">
                    <button onClick={() => navigate(`/seller/property/${p.id}`)}
                      className="flex-1 py-2 rounded-lg bg-surface-50 text-surface-700 text-sm font-semibold hover:bg-surface-100 transition">
                      View
                    </button>
                    <button onClick={() => navigate(`/property/${p.id}/edit`)}
                      className="flex-1 py-2 rounded-lg border border-surface-200 text-surface-600 text-sm font-semibold hover:border-brand-200 hover:text-brand-600 hover:bg-brand-50 transition flex items-center justify-center gap-1.5">
                      <Edit size={14} /> Edit
                    </button>
                    <button onClick={() => openDeleteModal(p)} disabled={deleting === p.id}
                      className={`p-2 rounded-lg border transition ${deleting === p.id ? 'border-rose-200 bg-rose-50 text-rose-400 cursor-not-allowed' : 'border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300'
                        }`} title="Delete property">
                      {deleting === p.id ? <div className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && propertyToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-rose-600" size={22} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-display font-bold text-surface-900 mb-0.5">Delete Property?</h3>
                <p className="text-surface-500 text-sm">This action cannot be undone.</p>
              </div>
              <button onClick={closeDeleteModal} className="text-surface-400 hover:text-surface-600 transition"><X size={18} /></button>
            </div>

            <div className="bg-surface-50 rounded-xl p-4 mb-5 border border-surface-100">
              <p className="text-xs text-surface-400 font-bold uppercase mb-1">Property Name</p>
              <p className="font-bold text-surface-900 text-sm">{propertyToDelete.name}</p>
              <div className="flex items-center gap-1 text-surface-500 text-xs mt-1.5"><MapPin size={12} /> {propertyToDelete.property_place}</div>
            </div>

            <div className="flex gap-3">
              <button onClick={closeDeleteModal} disabled={deleting === propertyToDelete.id}
                className="flex-1 btn-secondary py-3 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={confirmDelete} disabled={deleting === propertyToDelete.id}
                className="flex-1 px-6 py-3 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {deleting === propertyToDelete.id ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deleting...</> : <><Trash2 size={16} /> Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerProperties;