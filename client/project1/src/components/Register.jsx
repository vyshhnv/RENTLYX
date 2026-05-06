import React, { useState, useEffect, useRef } from "react"
import { toast } from "react-toastify"
import { Link, useNavigate } from "react-router-dom"
import { register, sendEmailOtp, verifyEmailOtp, checkUserEmailExists } from "../api/fetchApi"
import { Eye, EyeOff, ArrowRight, KeyRound, CheckCircle2, Loader2, Mail, Timer } from "lucide-react"

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
          <div key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < score ? colors[score] : "bg-surface-200"}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs">
        <span className={`font-semibold ${score > 0 ? colors[score].replace("bg-", "text-") : "text-surface-400"}`}>
          {labels[score]}
        </span>
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

function Register() {
  const [user, setUser] = useState({
    username: "", email: "", password: "", password2: ""
  })

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
      // Updated regex: Allows letters AND spaces
      const hasNumber = /[0-9]/.test(upper)
      const hasSpecial = /[^A-Z ]/.test(upper)
      const hasInvalid = hasNumber || hasSpecial

      if (hasInvalid) {
        const parts = []
        if (hasNumber) parts.push("numbers")
        if (hasSpecial) parts.push("special characters")
        setUsernameWarning(`Not allowed: ${parts.join(" & ")}`)
        setTimeout(() => setUsernameWarning(""), 2000)
      } else {
        setUsernameWarning("")
      }
      // Preserve spaces while filtering out numbers/symbols
      value = upper.replace(/[^A-Z ]/g, "")
    }
    setUser({ ...user, [name]: value })
  }

  const handleSendOtp = async () => {
    if (!user.email) { toast.error("Enter email first"); return }

    if (!isValidEmail(user.email)) {
      toast.error("Invalid email address — must include a valid domain (e.g. name@example.com)")
      return
    }

    setLoadingOtp(true)
    try {
      const res = await checkUserEmailExists({ email: user.email })
      if (res.data.exists) {
        toast.error("This email is already registered. Please use a different email.")
        setLoadingOtp(false)
        return
      }
      await sendEmailOtp({ email: user.email })
      toast.success("OTP sent to email")
      setOtpSent(true)
      startTimer()
    } catch {
      toast.error("Failed to send OTP")
    } finally {
      setLoadingOtp(false)
    }
  }

  const handleVerifyOtp = () => {
    if (!otp) { toast.error("Enter OTP"); return }
    verifyEmailOtp({ email: user.email, otp })
      .then(() => {
        toast.success("Email verified")
        setEmailVerified(true)
        clearInterval(timerRef.current)
      })
      .catch(() => toast.error("Invalid or expired OTP"))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const { username, email, password, password2 } = user

    if (!username.trim() || !email || !password || !password2) {
      toast.error("Please fill in all fields"); return
    }

    if (!isValidEmail(email)) {
      toast.error("Invalid email address"); return
    }

    if (!emailVerified) {
      toast.error("Verify email first"); return
    }
    if (!isStrongPassword(password)) {
      toast.error("Password must include letters, numbers & symbols (min 8 chars)"); return
    }
    if (password !== password2) {
      toast.error("Passwords do not match"); return
    }

    // FIX: Removed the .replace(/\s+/g, "_") so spaces stay as spaces
    const finalUsername = username.trim(); 

    register({ username: finalUsername, email, password1: password, password2 })
      .then(() => { 
        toast.success("Account created successfully!"); 
        navigate("/login") 
      })
      .catch((err) => {
        const errors = err.response?.data
        if (errors) Object.values(errors).flat().forEach(msg => toast.error(msg))
        else toast.error("Registration failed")
      })
  }

  return (
    <div className="flex min-h-screen w-full overflow-hidden">
      {/* ── LEFT PANEL ── */}
      <div className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e2a5e 0%, #4263eb 50%, #7c3aed 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        <div className="relative z-10 text-center px-12">
          <div className="w-28 h-28 mx-auto mb-8 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
            <KeyRound size={48} className="text-white/90" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-3">New Beginnings</h1>
          <p className="text-brand-200 text-base max-w-sm mx-auto">Create an account to access exclusive listings and VIP drops.</p>
        </div>
        <div className="absolute bottom-8 left-8 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white font-bold">R</div>
          <span className="text-white/60 font-semibold text-sm">RentlyX</span>
        </div>
      </div>

      {/* ── RIGHT — FORM ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <Link to="/" className="absolute top-6 left-6 flex items-center gap-1.5 text-sm text-surface-400 hover:text-brand-600 font-medium transition-colors">
          <ArrowRight size={14} className="rotate-180" /> Back to home
        </Link>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold text-surface-900 mb-1.5">Create Account</h2>
          <p className="text-surface-400 text-sm mb-6">Join us to start your property journey.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* USERNAME */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Username</label>
              <input
                name="username" value={user.username} onChange={handleChange}
                placeholder="FULL NAME"
                className={`input-premium uppercase tracking-widest font-semibold ${usernameWarning ? "border-rose-400 bg-rose-50" : ""}`}
              />
              {usernameWarning ? (
                <p className="text-xs text-rose-500 mt-1 font-medium">{usernameWarning}</p>
              ) : (
                <p className="text-xs text-surface-400 mt-1">Letters and spaces allowed</p>
              )}
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Email</label>
              <input
                name="email" type="email" value={user.email} onChange={handleChange}
                disabled={emailVerified}
                placeholder="name@example.com"
                className={`input-premium ${emailVerified ? 'bg-emerald-50 border-emerald-200' : ''}`}
              />
              {!emailVerified && (
                <button type="button" onClick={handleSendOtp}
                  disabled={loadingOtp || otpTimer > 0}
                  className="w-full mt-2 btn-primary py-2.5 text-sm flex items-center justify-center gap-2">
                  {loadingOtp ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  {loadingOtp ? "Sending..." : otpTimer > 0 ? `Resend in ${otpTimer}s` : "Verify Email"}
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
                <input value={otp} onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter OTP"
                  className="input-premium text-center tracking-[0.3em] font-semibold" />
                <button type="button" onClick={handleVerifyOtp}
                  className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-semibold text-sm">
                  Confirm OTP
                </button>
              </div>
            )}

            {/* PASSWORD */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Password</label>
              <div className="relative">
                <input name="password" type={showPassword ? "text" : "password"}
                  value={user.password} onChange={handleChange}
                  placeholder="Create password"
                  className="input-premium pr-11" />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <PasswordStrengthBar password={user.password} />
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-0.5">Confirm Password</label>
              <div className="relative">
                <input name="password2" type={showConfirmPassword ? "text" : "password"}
                  value={user.password2} onChange={handleChange}
                  placeholder="Re-enter password"
                  className={`input-premium pr-11 ${user.password2 && (user.password === user.password2 ? "border-emerald-400" : "border-rose-400")}`} />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* SUBMIT */}
            <button type="submit" disabled={!emailVerified}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all
                ${emailVerified ? "btn-primary" : "bg-surface-300 cursor-not-allowed shadow-none"}`}>
              Create Account
            </button>

            <p className="text-center text-sm mt-4 text-surface-500">
              Already have an account?
              <Link to="/login" className="text-brand-600 ml-1 font-semibold">Log In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Register
