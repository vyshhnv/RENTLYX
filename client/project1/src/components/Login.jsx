import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { Link, useNavigate } from "react-router-dom";
import { login } from '../api/fetchApi';
import { Eye, EyeOff, ArrowRight, Home } from 'lucide-react';

function Login() {
  const [user, setUser] = useState({ username: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user.username.trim() || !user.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(user);
      const token = res.data.token || res.data.key;

      if (token) {
        sessionStorage.setItem("token", token);
        sessionStorage.setItem("user_id", res.data.user_id);
        sessionStorage.setItem("username", user.username);
        sessionStorage.setItem("role", res.data.role || "buyer");
        window.dispatchEvent(new Event("auth-change"));

        toast.success("Welcome back!");
        setTimeout(() => navigate("/"), 500);
      } else {
        toast.error("Login failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error('Invalid Username or Password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full font-sans overflow-hidden">

      {/* LEFT — Decorative Panel */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e2a5e 0%, #4263eb 50%, #7c3aed 100%)' }}>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Decorative orbs */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-[80px] animate-pulse-soft" />
        <div className="absolute bottom-32 left-16 w-48 h-48 bg-brand-300/20 rounded-full blur-[60px] animate-pulse-soft" style={{ animationDelay: '2s' }} />

        {/* Center content */}
        <div className="relative z-10 text-center px-12 animate-fade-in">
          <div className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl animate-float">
            <Home size={48} className="text-white/90" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-3 leading-tight">
            Welcome Back
          </h1>
          <p className="text-brand-200 text-base max-w-sm mx-auto leading-relaxed">
            Sign in to continue your journey to finding the perfect home.
          </p>
        </div>

        {/* Bottom brand */}
        <div className="absolute bottom-8 left-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-display font-bold text-sm">R</div>
          <span className="text-white/60 font-display font-semibold text-sm">RentlyX</span>
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white p-8 relative">
        {/* Back to home */}
        <Link to="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-surface-400 hover:text-brand-600 font-medium transition-colors">
          <ArrowRight size={14} className="rotate-180" /> Back to home
        </Link>

        {/* Logo top right */}
        <div className="absolute top-6 right-6 hidden md:flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm shadow-md">R</div>
          <span className="font-display font-bold text-lg text-surface-800">RentlyX</span>
        </div>

        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8">
            {/* Mobile Logo */}
            <div className="flex items-center gap-2 mb-6 lg:hidden">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-700 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm">R</div>
              <span className="font-display font-bold text-lg text-brand-600">RentlyX</span>
            </div>
            <h2 className="text-2xl font-display font-bold text-surface-900 mb-2">Sign In</h2>
            <p className="text-surface-400 text-sm">Welcome back! Please enter your details.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Username</label>
              <input
                name="username" type="text" value={user.username} onChange={handleChange}
                className="input-premium"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Password</label>
              <div className="relative">
                <input
                  name="password" type={showPassword ? "text" : "password"}
                  value={user.password} onChange={handleChange}
                  className="input-premium pr-11"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                Forgot Password?
              </Link>
            </div>

            <button type="submit" disabled={isLoading}
              className="w-full btn-primary py-3.5 text-sm flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing In...
                </>
              ) : 'Sign In'}
            </button>

            <div className="mt-8 pt-6 border-t border-surface-100 text-center">
              <p className="text-sm text-surface-500">
                Don't have an account?
                <Link to="/reg" className="text-brand-600 font-semibold ml-1 hover:text-brand-700 transition-colors">Sign Up</Link>
              </p>
              <div className="mt-4">
                <Link to="/seller/login" className="text-xs font-semibold text-surface-400 hover:text-surface-600 uppercase tracking-wider transition-colors">
                  Are you a Seller? →
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;