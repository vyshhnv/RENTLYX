import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from "react-router-dom";
import { sellerLogin } from '../api/fetchApi';
import { Eye, EyeOff, ArrowRight, Building2 } from 'lucide-react';

function SellerLogin() {
  const [user, setUser] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user.username || !user.password) {
      toast.error("Please fill in all fields");
      return;
    }
    setIsLoading(true);
    try {
      const res = await sellerLogin(user);
      const token = res.data.token;
      const sellerId = res.data.seller_id;
      const userId = res.data.user_id;
      const panVerified = res.data.pan_verified;

      sessionStorage.setItem("token", token);
      sessionStorage.setItem("seller_id", sellerId);
      sessionStorage.setItem("user_id", userId);
      sessionStorage.setItem("username", user.username);
      sessionStorage.setItem("role", "seller");
      window.dispatchEvent(new Event("auth-change"));

      toast.success("Login successful");
      if (panVerified) {
        navigate("/seller/dashboard");
      } else {
        navigate("/seller/panverify");
      }
    } catch {
      toast.error("Invalid Seller Credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans overflow-hidden">

      {/* LEFT — Decorative Panel */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)' }}>

        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-[80px] animate-pulse-soft" />
        <div className="absolute bottom-32 left-16 w-48 h-48 bg-emerald-300/20 rounded-full blur-[60px] animate-pulse-soft" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 text-center px-12 animate-fade-in">
          <div className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl animate-float">
            <Building2 size={48} className="text-white/90" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-3 leading-tight">
            Seller Central
          </h1>
          <p className="text-emerald-200 text-base max-w-sm mx-auto leading-relaxed">
            Track sales, manage properties, and grow your real estate portfolio.
          </p>
        </div>

        <div className="absolute bottom-8 left-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-display font-bold text-sm">R</div>
          <span className="text-white/60 font-display font-semibold text-sm">RentlyX</span>
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 relative">
        <Link to="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-surface-400 hover:text-emerald-600 font-medium transition-colors">
          <ArrowRight size={14} className="rotate-180" /> Back to home
        </Link>

        <div className="absolute top-6 right-6 hidden md:flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm shadow-md">R</div>
          <span className="font-display font-bold text-lg text-surface-800">RentlyX</span>
        </div>

        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
              <Building2 size={12} /> Seller Portal
            </div>
            <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">Seller Sign In</h2>
            <p className="text-surface-400 text-sm">Welcome back. Access your dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Username</label>
              <input name="username" type="text" value={user.username} onChange={handleChange}
                placeholder="Enter your username"
                className="input-premium focus:border-emerald-500 focus:ring-emerald-500/10" />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"} value={user.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="input-premium pr-11 focus:border-emerald-500 focus:ring-emerald-500/10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="flex justify-end mt-1.5">
                <Link to="/seller/forgot-password" className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot Password?
                </Link>
              </div>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all duration-200 active:scale-[0.98] text-sm flex items-center justify-center gap-2">
              {isLoading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</>
              ) : 'Sign In'}
            </button>

            <div className="mt-8 pt-6 border-t border-surface-100 text-center">
              <p className="text-sm text-surface-500">
                New Seller?
                <Link to="/sellerreg" className="text-emerald-600 font-semibold ml-1 hover:text-emerald-700 transition-colors">Register Here</Link>
              </p>
              <div className="mt-4">
                <Link to="/login" className="text-xs font-semibold text-surface-400 hover:text-surface-600 uppercase tracking-wider transition-colors">
                  Are you a Buyer? →
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SellerLogin;