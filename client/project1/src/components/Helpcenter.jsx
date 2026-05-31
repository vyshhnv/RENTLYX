import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Bar from "./Bar";
import { API_BASE_URL as BASE_URL } from "../config/api";
import {
  LifeBuoy, FileText, Clock, CheckCircle2, AlertCircle,
  Send, CheckCircle, ArrowLeft, ChevronRight, X, RefreshCw
} from "lucide-react";

const COMPLAINT_TYPE_LABELS = {
  incorrect_listing: "Incorrect listing details",
  fraudulent_property: "Fraudulent property",
  agent_misconduct: "Agent misconduct",
  payment_issue: "Payment issue",
  technical_bug: "Technical / app bug",
  other: "Other",
};

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock, msg: "⏳ Our team will review within 48 hours" },
  reviewed: { label: "Reviewed", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: AlertCircle, msg: "👀 Our team is currently looking into this" },
  resolved: { label: "Resolved", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2, msg: "✓ This complaint has been resolved" },
};

export default function HelpCenter() {
  const navigate = useNavigate();

  // Auth
  const token = sessionStorage.getItem("token");
  const userEmail = (() => {
    try { return JSON.parse(sessionStorage.getItem("user") || "{}")?.email || ""; } catch { return ""; }
  })();

  // Form
  const [form, setForm] = useState({ name: "", email: userEmail, type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // My complaints
  const [complaints, setComplaints] = useState([]);
  const [loadingC, setLoadingC] = useState(false);
  const [cError, setCError] = useState("");

  // Manual track (for guests)
  const [trackEmail, setTrackEmail] = useState("");
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResults, setTrackResults] = useState(null);
  const [trackError, setTrackError] = useState("");

  const loadComplaintsByEmail = useCallback(async (email) => {
    setLoadingC(true); setCError("");
    try {
      const res = await fetch(
        `${BASE_URL}/complaints/by-email/?email=${encodeURIComponent(email.trim())}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setComplaints(Array.isArray(data) ? data : data.results || []);
    } catch {
      setCError("Could not load your complaints.");
    } finally {
      setLoadingC(false);
    }
  }, []);

  const fetchUserAndComplaints = useCallback(async () => {
    setLoadingC(true); setCError("");
    try {
      const profileRes = await fetch(`${BASE_URL}/user/profile/`, {
        headers: { Authorization: `Token ${token}` },
      });
      if (profileRes.ok) {
        const profile = await profileRes.json();
        const email = profile.email || "";
        setForm(prev => ({
          ...prev,
          name: prev.name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.username || "",
          email: prev.email || email,
        }));
        if (email) {
          await loadComplaintsByEmail(email);
          return;
        }
      }
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
    setLoadingC(false);
  }, [loadComplaintsByEmail, token]);

  // If logged in, fetch user profile to get email then auto-load complaints
  useEffect(() => {
    if (token) {
      fetchUserAndComplaints();
    }
  }, [fetchUserAndComplaints, token]);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setSubmitError("");
  };

  const handleSubmit = async () => {
    const { name, email, type, message } = form;
    if (!name.trim() || !email.trim() || !type || !message.trim()) {
      setSubmitError("Please fill in all fields."); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSubmitError("Please enter a valid email address."); return;
    }
    setSubmitting(true); setSubmitError("");
    try {
      await fetch(`${BASE_URL}/complaints/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), email: email.trim(),
          complaint_type: type, message: message.trim(),
        }),
      });
      setSubmitted(true);
      setForm(prev => ({ ...prev, type: "", message: "" }));
      // Reload complaints list
      await loadComplaintsByEmail(email.trim());
    } catch {
      setSubmitError("Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Guest manual track
  const handleGuestTrack = async () => {
    const email = trackEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setTrackError("Please enter a valid email address."); return;
    }
    setTrackLoading(true); setTrackError(""); setTrackResults(null);
    try {
      const res = await fetch(
        `${BASE_URL}/complaints/by-email/?email=${encodeURIComponent(email)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.results || [];
      setTrackResults(list);
      if (list.length === 0) setTrackError("No complaints found for this email.");
    } catch {
      setTrackError("Could not fetch complaints. Please try again.");
    } finally {
      setTrackLoading(false);
    }
  };

  const complaintList = token ? complaints : (trackResults || []);

  return (
    <div className="min-h-screen bg-surface-50 font-sans pb-20">
      <Bar forceSolid={true} />

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-surface-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-800 transition">
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500">
              <LifeBuoy size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-surface-900">Help Center</h1>
              <p className="text-xs text-surface-400 font-medium">Register a complaint or track existing ones</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 grid lg:grid-cols-2 gap-8">

        {/* ── LEFT: Register Complaint ── */}
        <div>
          <div className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-100 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brand-100">
                <FileText size={18} className="text-brand-600" />
              </div>
              <div>
                <h2 className="font-display font-bold text-surface-800">Register a Complaint</h2>
                <p className="text-xs text-surface-400 mt-0.5">We'll review it within 48 hours</p>
              </div>
            </div>

            <div className="p-6">
              {submitted ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle size={32} className="text-emerald-500" />
                  </div>
                  <h3 className="font-display font-bold text-surface-800 text-lg mb-2">
                    Complaint Submitted!
                  </h3>
                  <p className="text-surface-500 text-sm leading-relaxed mb-6">
                    We've received your complaint and will get back to you within{" "}
                    <strong className="text-surface-700">48 hours</strong>.
                    Your complaint is now visible in the tracker on the right.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-5 py-2.5 rounded-xl border border-surface-200 text-sm font-semibold text-surface-600 hover:bg-surface-50 transition"
                  >
                    Submit Another
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">Your Name</label>
                      <input type="text" name="name" value={form.name} onChange={handleChange}
                        placeholder="Full name"
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-surface-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition placeholder:text-surface-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">Email</label>
                      <input type="email" name="email" value={form.email} onChange={handleChange}
                        placeholder="you@example.com"
                        className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-surface-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition placeholder:text-surface-300" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">Complaint Type</label>
                    <select name="type" value={form.type} onChange={handleChange}
                      className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-surface-700 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition appearance-none cursor-pointer">
                      <option value="">Select a category</option>
                      {Object.entries(COMPLAINT_TYPE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-surface-400 uppercase tracking-wider block mb-1.5">Description</label>
                    <textarea name="message" value={form.message} onChange={handleChange}
                      placeholder="Describe your issue in detail..." rows={5}
                      className="w-full bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-surface-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition resize-none placeholder:text-surface-300" />
                  </div>
                  {submitError && (
                    <p className="text-rose-500 text-xs font-semibold flex items-center gap-1.5">
                      <AlertCircle size={12} /> {submitError}
                    </p>
                  )}
                  <button onClick={handleSubmit} disabled={submitting}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition">
                    {submitting
                      ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Submitting…</>
                      : <><Send size={14} />Submit Complaint</>}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-surface-100 shadow-sm mt-5 overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-100">
              <h3 className="font-bold text-surface-700 text-sm">Quick Links</h3>
            </div>
            <div className="divide-y divide-surface-50">
              {[
                { label: "Terms & Conditions", href: "#" },
                { label: "Privacy Policy", href: "#" },
                { label: "Refund Policy", href: "#" },
                { label: "FAQ", href: "#" },
              ].map(({ label, href }) => (
                <a key={label} href={href}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-surface-50 transition group">
                  <span className="text-sm text-surface-600 font-medium group-hover:text-brand-600 transition">{label}</span>
                  <ChevronRight size={15} className="text-surface-300 group-hover:text-brand-400 transition" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Complaint Status ── */}
        <div>
          <div className="bg-white rounded-2xl border border-surface-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-surface-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-100">
                  <Clock size={18} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-surface-800">My Complaints</h2>
                  <p className="text-xs text-surface-400 mt-0.5">
                    {token ? "Your submitted complaints" : "Enter your email to check status"}
                  </p>
                </div>
              </div>
              {token && complaints.length > 0 && (
                <button
                  onClick={() => loadComplaintsByEmail(form.email)}
                  className="p-2 rounded-xl hover:bg-surface-100 text-surface-400 hover:text-brand-600 transition"
                  title="Refresh"
                >
                  <RefreshCw size={15} />
                </button>
              )}
            </div>

            <div className="p-6">
              {/* Guest email input */}
              {!token && (
                <div className="mb-5">
                  <div className="flex gap-2">
                    <input type="email" value={trackEmail}
                      onChange={e => { setTrackEmail(e.target.value); setTrackError(""); setTrackResults(null); }}
                      onKeyDown={e => e.key === "Enter" && handleGuestTrack()}
                      placeholder="Enter the email you used"
                      className="flex-1 bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-2.5 text-sm text-surface-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 transition placeholder:text-surface-300" />
                    <button onClick={handleGuestTrack} disabled={trackLoading}
                      className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition flex items-center gap-2 shrink-0">
                      {trackLoading
                        ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        : <Clock size={14} />}
                      Track
                    </button>
                  </div>
                  {trackError && (
                    <p className="text-surface-400 text-xs mt-2 font-semibold">{trackError}</p>
                  )}
                </div>
              )}

              {/* Loading */}
              {loadingC && (
                <div className="space-y-3">
                  {[1, 2].map(i => <div key={i} className="h-24 bg-surface-100 rounded-2xl animate-pulse" />)}
                </div>
              )}

              {/* Error */}
              {!loadingC && cError && (
                <p className="text-rose-400 text-xs font-semibold text-center py-4">{cError}</p>
              )}

              {/* Empty state — logged in */}
              {!loadingC && !cError && token && complaints.length === 0 && (
                <div className="text-center py-12">
                  <div className="inline-flex p-4 rounded-2xl bg-surface-50 mb-3">
                    <LifeBuoy size={28} className="text-surface-300" />
                  </div>
                  <p className="text-surface-500 font-semibold text-sm">No complaints yet</p>
                  <p className="text-surface-400 text-xs mt-1">Your submitted complaints will appear here</p>
                </div>
              )}

              {/* Complaint cards */}
              {!loadingC && complaintList.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs text-surface-400 font-semibold mb-4">
                    {complaintList.length} complaint{complaintList.length !== 1 ? "s" : ""} found
                  </p>
                  {complaintList.map((c) => {
                    const cfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
                    const StatusIcon = cfg.icon;
                    return (
                      <div key={c.id} className={`rounded-2xl border p-4 ${cfg.bg}`}>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <p className="text-xs font-bold text-surface-700">
                              {COMPLAINT_TYPE_LABELS[c.complaint_type] || c.complaint_type}
                            </p>
                            <p className="text-[10px] text-surface-400 mt-0.5">
                              Complaint #{c.id} · {new Date(c.created_at).toLocaleDateString("en-IN", {
                                day: "numeric", month: "short", year: "numeric",
                              })}
                            </p>
                          </div>
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap bg-white/80 border border-white/60 shadow-sm ${cfg.color}`}>
                            <StatusIcon size={11} />{cfg.label}
                          </div>
                        </div>
                        <p className="text-xs text-surface-600 leading-relaxed line-clamp-3 mb-2">
                          {c.message}
                        </p>
                        <p className={`text-[11px] font-semibold ${cfg.color}`}>{cfg.msg}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
