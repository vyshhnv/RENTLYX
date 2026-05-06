import React, { useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, Link } from "react-router-dom";
import { sellerForgotPassword, sellerResetPassword } from "../api/fetchApi";
import { Eye, EyeOff, ArrowRight, Mail, Loader2, CheckCircle2 } from "lucide-react";

function SellerForgotPassword() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const sendOtp = async () => {
    setLoading(true);
    try {
      await sellerForgotPassword({ email });
      toast.success("OTP sent to email");
      setStep(2);
    } catch { toast.error("Email not found"); }
    finally { setLoading(false); }
  };

  const resetPassword = async () => {
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    try {
      await sellerResetPassword({ email, otp, password });
      toast.success("Password reset successful");
      navigate("/seller/login");
    } catch { toast.error("Invalid OTP or expired"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-4 font-sans">
      <div className="card p-8 w-full max-w-md animate-fade-in">
        <Link to="/seller/login" className="flex items-center gap-1.5 text-sm text-surface-400 hover:text-emerald-600 font-medium mb-6 transition-colors">
          <ArrowRight size={14} className="rotate-180" /> Back to seller login
        </Link>

        {step === 1 && (
          <>
            <h2 className="text-xl font-display font-bold text-surface-900 mb-2">Forgot Password</h2>
            <p className="text-surface-500 text-sm mb-6">Enter your seller email to receive a reset OTP.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">Email Address</label>
                <input type="email" placeholder="seller@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-premium focus:border-emerald-500 focus:ring-emerald-500/10" />
              </div>
              <button onClick={sendOtp} disabled={loading}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm flex items-center justify-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Mail size={16} /> Send OTP</>}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-xl font-display font-bold text-surface-900 mb-2">Reset Password</h2>
            <p className="text-surface-500 text-sm mb-6">Enter the OTP and your new password.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">OTP</label>
                <input placeholder="Enter OTP" value={otp} onChange={(e) => setOtp(e.target.value)}
                  className="input-premium text-center tracking-[0.3em] font-semibold focus:border-emerald-500 focus:ring-emerald-500/10" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">New Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="New password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    className="input-premium pr-11 focus:border-emerald-500 focus:ring-emerald-500/10" />
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
                    className={`input-premium pr-11 focus:border-emerald-500 focus:ring-emerald-500/10 ${confirmPassword ? (password === confirmPassword ? "border-emerald-400" : "border-rose-400") : ""
                      }`} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {confirmPassword && password === confirmPassword && (
                  <p className="text-xs text-emerald-500 mt-1 font-medium flex items-center gap-1"><CheckCircle2 size={12} /> Passwords match</p>
                )}
              </div>
              <button onClick={resetPassword}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all text-sm">
                Reset Password
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default SellerForgotPassword;
