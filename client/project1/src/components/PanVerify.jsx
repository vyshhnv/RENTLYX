import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { verifyPan } from "../api/fetchApi";
import Bar from "./Bar";
import { ShieldCheck, Loader2, CreditCard } from "lucide-react";

function PanVerify() {
  const [pan, setPan] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkVerification = async () => {
      const token = sessionStorage.getItem("token");
      const sellerId = sessionStorage.getItem("seller_id");
      if (!token || !sellerId) { navigate("/seller/login"); return; }
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/seller/${sellerId}/`, {
          headers: { Authorization: `Token ${token}` }
        });
        const data = await res.json();
        if (data.pan_verified === true) {
          toast.info("Your account is already verified!");
          navigate("/seller/dashboard");
        }
      } catch (err) { console.error("Error checking verification:", err); }
    };
    checkVerification();
  }, [navigate]);

  const handleVerifyPan = async (e) => {
    e.preventDefault();
    if (pan.length !== 10) { toast.warning("Please enter a valid 10-character PAN number"); return; }
    setLoading(true);
    try {
      const res = await verifyPan({ pan });
      if (res.data.pan_verified || res.status === 200) {
        sessionStorage.setItem("seller_verified", "true");
        toast.success("Identity Verified Successfully!");
        navigate("/seller/dashboard");
      } else { toast.error("Verification failed. Please check the number."); }
    } catch (err) {
      if (err.response?.data?.pan_verified === true) {
        sessionStorage.setItem("seller_verified", "true");
        toast.info("PAN already verified. Redirecting...");
        navigate("/seller/dashboard");
      } else { toast.error("Verification failed. Please try again."); }
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-surface-50 font-sans">
      <Bar forceSolid={true} />
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="card p-8 md:p-10 w-full max-w-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-50 rounded-bl-full opacity-60" />

          <div className="text-center mb-8 relative z-10">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} />
            </div>
            <h2 className="text-xl font-display font-bold text-surface-900">Verify Identity</h2>
            <p className="text-surface-500 text-sm mt-2">
              Enter your Permanent Account Number (PAN) to verify your seller account.
            </p>
          </div>

          <form onSubmit={handleVerifyPan} className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-semibold text-surface-700 mb-1.5 ml-1">PAN Number</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-surface-400"><CreditCard size={18} /></div>
                <input value={pan} onChange={(e) => setPan(e.target.value.toUpperCase())}
                  placeholder="ABCDE1234F" maxLength={10}
                  className="w-full pl-12 pr-4 py-3.5 bg-surface-50 border border-surface-200 rounded-xl outline-none font-mono text-lg uppercase tracking-wider text-surface-800 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all placeholder:text-surface-300" />
              </div>
            </div>
            <button disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm">
              {loading ? <><Loader2 size={18} className="animate-spin" /> Verifying...</> : "Verify Now"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button onClick={() => navigate(-1)}
              className="text-sm font-medium text-surface-400 hover:text-surface-600 transition">
              Cancel and go back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PanVerify;