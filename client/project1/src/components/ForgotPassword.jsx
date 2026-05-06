import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { userForgotPassword } from "../api/fetchApi";
import { ArrowRight, Mail, Loader2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { toast.error("Please enter your email"); return; }
    setLoading(true);
    try {
      const res = await userForgotPassword({ email: email.trim() });
      if (res?.error) { toast.error(res.error || "Email not found"); return; }
      sessionStorage.setItem("resetEmail", email.trim());
      toast.success("OTP sent to your email");
      navigate("/reset-password");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4 font-sans">
      <div className="card p-8 w-full max-w-md animate-fade-in">
        <Link to="/login" className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-brand-600 font-medium mb-6 transition-colors">
          <ArrowRight size={14} className="rotate-180" /> Back to login
        </Link>
        <h2 className="text-xl font-display font-bold text-surface-900 mb-2">Forgot Password</h2>
        <p className="text-surface-500 text-sm mb-6">Enter your email and we'll send you an OTP to reset your password.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">Email Address</label>
            <input type="email" placeholder="name@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} className="input-premium" />
          </div>
          <button disabled={loading} className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Mail size={16} /> Send OTP</>}
          </button>
        </form>
      </div>
    </div>
  );
}