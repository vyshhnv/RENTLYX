import React, { useState, useEffect, useRef } from "react"
import { toast } from "react-toastify"
import { Link, useNavigate } from "react-router-dom"
import {
  sendSellerEmailOtp,
  verifySellerEmailOtp,
  sellerRegister,
  checkSellerEmailExists
} from "../api/fetchApi"
import { Eye, EyeOff, ArrowRight, Building2, CheckCircle2, Loader2, Mail, Timer } from "lucide-react"

/* ── helpers ── */
const SPECIAL_CHAR_PATTERN = /[^A-Za-z0-9\s]/;

const isStrongPassword = (pwd) =>
  /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s]).{8,}$/.test(pwd)

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)

function PasswordStrengthBar({ password }) {
  if (!password) return null
  const checks = {
    length: password.length >= 8,
    letter: /[a-zA-Z]/.test(password),
    number: /\d/.test(password),
    special: SPECIAL_CHAR_PATTERN.test(password),
  }
  const score = Object.values(checks).filter(Boolean).length
  const colors = ['bg-rose-500', 'bg-orange-400', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500']
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : "bg-surface-200"}`} />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        <span className={`font-semibold ${score > 0 ? colors[score].replace("bg-", "text-") : "text-surface-400"}`}>{labels[score]}</span>
        <span className="space-x-1.5 text-surface-400">
          {!checks.length && <span>8+ chars</span>}
          {!checks.letter && <span>· letter</span>}
          {!checks.number && <span>· number</span>}
          {!checks.special && <span>· symbol</span>}
        </span>
      </div>
    </div>
  )
}

const OTP_DURATION = 120

function SellerRegister() {
  const [formData, setFormData] = useState({
    username: "", email: "", phone: "", address: "", password: ""
  })
  const [confirmPassword, setConfirmPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [loadingOtp, setLoadingOtp] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [usernameWarning, setUsernameWarning] = useState("")
  const [otpTimer, setOtpTimer] = useState(0)
  const timerRef = useRef(null)
  const navigate = useNavigate()

  /* ── timer logic ── */
  const startTimer = () => {
    setOtpTimer(OTP_DURATION)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  const handleChange = (e) => {
    let { name, value } = e.target
    if (name === "username") {
      const upper = value.toUpperCase()
      const hasNumber = /[0-9]/.test(upper)
      const hasSpecial = /[^A-Z ]/.test(upper)
      if (hasNumber || hasSpecial) {
        const parts = []
        if (hasNumber) parts.push("numbers")
        if (hasSpecial) parts.push("special characters")
        setUsernameWarning(`Not allowed: ${parts.join(" & ")}`)
        setTimeout(() => setUsernameWarning(""), 2000)
      } else { setUsernameWarning("") }
      value = upper.replace(/[^A-Z ]/g, "")
    }
    setFormData({ ...formData, [name]: value })
  }

  const handleSendOtp = async () => {
    if (!formData.email) { toast.error("Enter email first"); return }

    if (!isValidEmail(formData.email)) {
      toast.error("Invalid email address — must include a valid domain (e.g. name@example.com)")
      return
    }

    setLoadingOtp(true)
    try {
      const res = await checkSellerEmailExists({ email: formData.email })
      if (res.data.exists) {
        toast.error("This email is already registered. Please use a different email.")
        setLoadingOtp(false)
        return
      }
      await sendSellerEmailOtp({ email: formData.email })
      toast.success("OTP sent to email")
      setOtpSent(true)
      startTimer()
    } catch { toast.error("Failed to send OTP") }
    finally { setLoadingOtp(false) }
  }

  const handleVerifyOtp = async () => {
    if (!otp) { toast.error("Enter OTP"); return }
    try {
      await verifySellerEmailOtp({ email: formData.email, otp })
      toast.success("Email verified")
      setEmailVerified(true)
      clearInterval(timerRef.current)
    } catch { toast.error("Invalid or expired OTP") }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { username, email, phone, address, password } = formData

    if (!username.trim() || !email || !phone || !address || !password) {
      toast.error("Fill all fields"); return
    }
    if (!isValidEmail(email)) {
      toast.error("Invalid email address — must include a valid domain (e.g. name@example.com)"); return
    }
    if (!isStrongPassword(password)) {
      toast.error("Password must include letters, numbers & special characters (min 8 chars)"); return
    }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return }
    if (!emailVerified) { toast.error("Verify email first"); return }

    try {
      await sellerRegister(formData)
      toast.success("Seller account created successfully"); navigate("/seller/login")
    } catch { toast.error("Registration failed") }
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden">

      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #10b981 100%)' }}>

        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        <div className="absolute top-16 left-16 w-72 h-72 bg-white/10 rounded-full blur-[100px] animate-pulse-soft" />
        <div className="absolute bottom-24 right-20 w-56 h-56 bg-emerald-300/15 rounded-full blur-[70px] animate-pulse-soft" style={{ animationDelay: '1.5s' }} />

        <div className="relative z-10 text-center px-12 animate-fade-in">
          <div className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl animate-float">
            <Building2 size={48} className="text-white/90" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-3 leading-tight">
            List Your Property
          </h1>
          <p className="text-emerald-200 text-base max-w-sm mx-auto leading-relaxed">
            Join our network of top sellers and reach millions of potential buyers.
          </p>
        </div>

        <div className="absolute bottom-8 left-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-display font-bold text-sm">R</div>
          <span className="text-white/60 font-display font-semibold text-sm">RentlyX</span>
        </div>
      </div>

      {/* ── RIGHT — FORM ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative overflow-y-auto">
        <Link to="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-surface-400 hover:text-emerald-600 font-medium transition-colors">
          <ArrowRight size={14} className="rotate-180" /> Back to home
        </Link>

        <div className="w-full max-w-md animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">
            <Building2 size={12} /> Seller Registration
          </div>
          <h2 className="text-2xl font-display font-bold text-surface-900 mb-1.5">Partner with us</h2>
          <p className="text-surface-400 text-sm mb-6">Create a seller account to manage listings.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* USERNAME */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Business Name</label>
              <input name="username" value={formData.username} placeholder="BUSINESS / USERNAME"
                onChange={handleChange}
                className={`input-premium uppercase tracking-widest font-semibold focus:border-emerald-500 focus:ring-emerald-500/10 ${usernameWarning ? "border-rose-400 bg-rose-50 focus:border-rose-400" : ""}`} />
              {usernameWarning ? (
                <p className="text-xs text-rose-500 mt-1 font-medium">{usernameWarning}</p>
              ) : (
                <p className="text-xs text-surface-400 mt-1">Letters and spaces only (auto-capitalised)</p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Email</label>
              <input name="email" type="email" placeholder="business@example.com"
                disabled={emailVerified} onChange={handleChange}
                className={`input-premium focus:border-emerald-500 focus:ring-emerald-500/10 ${emailVerified ? 'bg-emerald-50 border-emerald-200' : ''}`} />

              {/* Send / Resend OTP button */}
              {!emailVerified && (
                <button type="button" onClick={handleSendOtp}
                  disabled={loadingOtp || otpTimer > 0}
                  className="w-full mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
                  {loadingOtp ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending OTP...</>
                  ) : otpTimer > 0 ? (
                    <><Timer size={16} /> Resend in {otpTimer}s</>
                  ) : otpSent ? (
                    <><Mail size={16} /> Resend OTP</>
                  ) : (
                    <><Mail size={16} /> Verify Email</>
                  )}
                </button>
              )}

              {emailVerified && (
                <p className="text-emerald-600 text-sm mt-1.5 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Email verified
                </p>
              )}
            </div>

            {/* OTP INPUT */}
            {otpSent && !emailVerified && (
              <div className="space-y-2.5">
                <div className="relative">
                  <input value={otp} onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="input-premium text-center tracking-[0.3em] font-semibold pr-20" />
                  {otpTimer > 0 ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500 tabular-nums">
                      {String(Math.floor(otpTimer / 60)).padStart(2, '0')}:{String(otpTimer % 60).padStart(2, '0')}
                    </span>
                  ) : (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-rose-400">
                      Expired
                    </span>
                  )}
                </div>
                <button type="button" onClick={handleVerifyOtp}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} /> Confirm OTP
                </button>
              </div>
            )}

            {/* PHONE */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Phone Number</label>
              <input name="phone" placeholder="Phone Number" onChange={handleChange}
                className="input-premium focus:border-emerald-500 focus:ring-emerald-500/10" />
            </div>

            {/* ADDRESS */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Office Address</label>
              <textarea name="address" rows="2" placeholder="Office Address" onChange={handleChange}
                className="input-premium resize-none focus:border-emerald-500 focus:ring-emerald-500/10" />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password" onChange={handleChange}
                  className="input-premium pr-11 focus:border-emerald-500 focus:ring-emerald-500/10" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrengthBar password={formData.password} />
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Confirm Password</label>
              <div className="relative">
                <input type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`input-premium pr-11 focus:border-emerald-500 focus:ring-emerald-500/10 ${confirmPassword
                    ? formData.password === confirmPassword ? "border-emerald-400" : "border-rose-400"
                    : ""}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600 transition-colors">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && formData.password !== confirmPassword && (
                <p className="text-xs text-rose-500 mt-1 font-medium">Passwords do not match</p>
              )}
              {confirmPassword && formData.password === confirmPassword && (
                <p className="text-xs text-emerald-500 mt-1 font-medium flex items-center gap-1">
                  <CheckCircle2 size={12} /> Passwords match
                </p>
              )}
            </div>

            <button type="submit" disabled={!emailVerified}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all duration-200 ${emailVerified
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
                : "bg-surface-300 cursor-not-allowed shadow-none"}`}>
              Register as Seller
            </button>

            <p className="text-center text-sm mt-4 text-surface-500">
              Already have an account?
              <Link to="/seller/login" className="text-emerald-600 ml-1 font-semibold hover:text-emerald-700 transition-colors">Log In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default SellerRegister
