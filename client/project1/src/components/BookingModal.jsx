import React, { useState } from "react";
import { X, Shield, CreditCard, CheckCircle, Info } from "lucide-react";
import commonApi from "../api/commonApi";
import { API_BASE_URL as BASE_URL } from "../config/api";
import { getErrorMessage, notifyError } from "../utils/notify";

function BookingModal({ property, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ user_name: "", user_phone: "", user_message: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const propertyPrice = Number(property.price);
  const tokenAmount = Math.round(propertyPrice * 0.05);
  const remaining = propertyPrice - tokenAmount;

  const validate = () => {
    const e = {};
    if (!form.user_name.trim()) e.user_name = "Name is required";
    if (!form.user_phone.match(/^[6-9]\d{9}$/)) e.user_phone = "Enter valid 10-digit mobile number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const loadRazorpayScript = () =>
    new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleBooking = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const orderRes = await commonApi(`${BASE_URL}/bookings/create-order/`, "POST", {
        property_id: property.id, user_name: form.user_name,
        user_phone: form.user_phone, user_message: form.user_message,
      }, token);
      const orderData = orderRes.data;
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        notifyError("Failed to load payment gateway.");
        setLoading(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderData.key, amount: orderData.amount, currency: orderData.currency,
        order_id: orderData.order_id, name: "RentlyX",
        description: `Token Booking (5%) – ${property.name}`,
        prefill: { name: form.user_name, contact: form.user_phone },
        notes: { property_name: property.name, booking_id: orderData.booking_id },
        theme: { color: "#4263eb" },
        handler: async (response) => {
          setStep(2);
          try {
            await commonApi(`${BASE_URL}/bookings/verify-payment/`, "POST", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }, token);
            setStep(3);
            onSuccess && onSuccess();
          } catch {
            notifyError(`Payment verification failed. Keep this payment ID: ${response.razorpay_payment_id}`);
            setStep(1);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      });
      razorpay.open();
    } catch (err) {
      notifyError(getErrorMessage(err, "Something went wrong."));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" style={{ zIndex: 99999 }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="p-6 text-white relative" style={{ background: 'linear-gradient(135deg, #1e2a5e 0%, #4263eb 100%)' }}>
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 bg-white/15 hover:bg-white/25 rounded-lg transition">
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 mb-1 relative z-10">
            <div className="p-2 bg-white/15 rounded-xl"><CreditCard size={20} /></div>
            <h2 className="text-lg font-display font-bold">Token Booking</h2>
          </div>
          <p className="text-brand-200 text-sm truncate relative z-10">{property.name}</p>
        </div>

        <div className="p-6">
          {/* STEP 1: FORM */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-3">
                  <Info size={15} className="text-brand-500 shrink-0 mt-0.5" />
                  <p className="text-brand-700 text-sm font-medium">A 5% token amount is required to reserve this property. Full refund if the seller declines.</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-surface-600">
                    <span>Property Price</span>
                    <span className="font-semibold">₹{propertyPrice.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-surface-600">
                    <span className="flex items-center gap-1">Token Amount <span className="text-[10px] bg-brand-200 text-brand-700 px-1.5 py-0.5 rounded-full font-bold">5%</span></span>
                    <span className="font-bold text-brand-700">₹{tokenAmount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="border-t border-brand-100 pt-2 flex justify-between text-surface-400 text-xs">
                    <span>Remaining (payable to seller later)</span>
                    <span>₹{remaining.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">Your Name</label>
                <input type="text" value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })}
                  placeholder="Full name" className="input-premium" />
                {errors.user_name && <p className="text-rose-500 text-xs mt-1">{errors.user_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">Mobile Number</label>
                <input type="tel" value={form.user_phone} onChange={(e) => setForm({ ...form, user_phone: e.target.value })}
                  placeholder="10-digit mobile" maxLength={10} className="input-premium" />
                {errors.user_phone && <p className="text-rose-500 text-xs mt-1">{errors.user_phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 mb-1.5">
                  Message to Seller <span className="text-surface-400 font-normal">(optional)</span>
                </label>
                <textarea value={form.user_message} onChange={(e) => setForm({ ...form, user_message: e.target.value })}
                  placeholder="Any questions or requirements..." rows={3} className="input-premium resize-none" />
              </div>

              <button onClick={handleBooking} disabled={loading}
                className="w-full btn-primary py-4 text-sm flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Processing...</> : <>Pay Token ₹{tokenAmount.toLocaleString("en-IN")}</>}
              </button>

              <p className="text-center text-xs text-surface-400 flex items-center justify-center gap-1">
                <Shield size={12} /> Secured by Razorpay
              </p>
            </div>
          )}

          {/* STEP 2: VERIFYING */}
          {step === 2 && (
            <div className="py-12 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 border-3 border-brand-200 border-t-brand-600 rounded-full animate-spin" />
              <h3 className="text-lg font-display font-bold text-surface-800">Verifying Payment</h3>
              <p className="text-surface-500 text-sm">Please wait, do not close this window...</p>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 3 && (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h3 className="text-lg font-display font-bold text-surface-800">Booking Submitted!</h3>
              <div className="bg-surface-50 rounded-xl p-4 w-full text-sm space-y-2">
                <div className="flex justify-between text-surface-600">
                  <span>Token Paid</span>
                  <span className="font-bold text-emerald-600">₹{tokenAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-surface-500">
                  <span>Remaining (on acceptance)</span>
                  <span>₹{remaining.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <p className="text-surface-500 text-sm leading-relaxed max-w-xs">
                The seller has <strong>48 hours</strong> to confirm. You'll receive an email update either way.
              </p>
              <button onClick={onClose} className="btn-primary px-8 py-3 text-sm">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingModal;
