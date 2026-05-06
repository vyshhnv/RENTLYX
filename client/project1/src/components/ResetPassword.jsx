import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { userResetPassword } from "../api/fetchApi";
import { Eye, EyeOff, ArrowRight, CheckCircle2 } from "lucide-react";

export default function ResetPassword() {
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const email = sessionStorage.getItem("resetEmail");

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) { toast.error("Session expired. Try again."); navigate("/forgot-password"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    try {
      const res = await userResetPassword({ email, otp, password });
      if (res?.error) { toast.error(res.error || "Invalid OTP"); return; }
      toast.success("Password reset successful");
      sessionStorage.removeItem("resetEmail");
      navigate("/login");
    } catch { toast.error("Network error"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4 font-sans">
      <div className="card p-8 w-full max-w-md animate-fade-in">
        <Link to="/forgot-password" className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-brand-600 font-medium mb-6 transition-colors">
          <ArrowRight size={14} className="rotate-180" /> Back
        </Link>
        <h2 className="text-xl font-display font-bold text-surface-900 mb-2">Reset Password</h2>
        <p className="text-surface-500 text-sm mb-6">Enter the OTP sent to your email and choose a new password.</p>

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">OTP</label>
            <input placeholder="Enter OTP" value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="input-premium text-center tracking-[0.3em] font-semibold" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">New Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="New password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-premium pr-11" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-surface-700 mb-1.5">Confirm Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="Confirm password"
                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className={`input-premium pr-11 ${confirmPassword ? (password === confirmPassword ? "border-emerald-400" : "border-rose-400") : ""}`} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && password === confirmPassword && (
              <p className="text-xs text-emerald-500 mt-1 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Passwords match</p>
            )}
          </div>
          <button className="w-full btn-primary py-3.5 text-sm">Reset Password</button>
        </form>
      </div>
    </div>
  );
}