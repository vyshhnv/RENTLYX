import commonApi from "./commonApi";
import { API_BASE_URL as BASE_URL } from "../config/api";

/* ================= USER ================= */

export const checkUserEmailExists = (data) =>
  commonApi(`${BASE_URL}/user/check-email/`, "POST", data);

export const sendEmailOtp = (data) =>
  commonApi(`${BASE_URL}/user/send-email-otp/`, "POST", data);

export const verifyEmailOtp = (data) =>
  commonApi(`${BASE_URL}/user/verify-email-otp/`, "POST", data);

export const register = (data) =>
  commonApi(`${BASE_URL}/user/`, "POST", data);

export const login = (data) =>
  commonApi(`${BASE_URL}/auth/login/`, "POST", data);

export const userForgotPassword = (data) =>
  commonApi(`${BASE_URL}/user/forgot-password/`, "POST", data);

export const userResetPassword = (data) =>
  commonApi(`${BASE_URL}/user/reset-password/`, "POST", data);

// ✅ Get logged-in user's profile
export const getUserProfile = (token) =>
  commonApi(`${BASE_URL}/user/profile/`, "GET", "", token);

// ✅ Update logged-in user's profile
export const updateUserProfile = (data, token) =>
  commonApi(`${BASE_URL}/user/profile/`, "PATCH", data, token);


/* ================= SELLER ================= */

export const checkSellerEmailExists = (data) =>
  commonApi(`${BASE_URL}/seller/check-email/`, "POST", data);

export const sendSellerEmailOtp = (data) =>
  commonApi(`${BASE_URL}/seller/send-email-otp/`, "POST", data);

export const verifySellerEmailOtp = (data) =>
  commonApi(`${BASE_URL}/seller/verify-email-otp/`, "POST", data);

export const sellerRegister = (data) =>
  commonApi(`${BASE_URL}/seller/`, "POST", data);

export const sellerLogin = (data) =>
  commonApi(`${BASE_URL}/seller/login/`, "POST", data);

export const sellerForgotPassword = (data) =>
  commonApi(`${BASE_URL}/seller/forgot-password/`, "POST", data);

export const sellerResetPassword = (data) =>
  commonApi(`${BASE_URL}/seller/reset-password/`, "POST", data);

export const verifyPan = (data) =>
  commonApi(
    `${BASE_URL}/seller/verify-pan/`,
    "POST",
    data,
    sessionStorage.getItem("token")
  );


/* ================= PROPERTIES ================= */

export const listAllProperty = (url = `${BASE_URL}/properties/`) =>
  commonApi(url, "GET");

export const listSellerProperties = (token) =>
  commonApi(`${BASE_URL}/seller/my-properties/`, "GET", "", token);

export const createProperty = (data, token) =>
  commonApi(`${BASE_URL}/properties/`, "POST", data, token);

export const getProperty = (id) =>
  commonApi(`${BASE_URL}/properties/${id}/`, "GET");

export const deleteProperty = (id, token) =>
  commonApi(`${BASE_URL}/properties/${id}/delete/`, "DELETE", "", token);

export const updateProperty = (id, data, token) =>
  commonApi(`${BASE_URL}/properties/${id}/edit/`, "PATCH", data, token);


/* ================= PROPERTY GALLERY IMAGES ================= */

export const getPropertyGallery = (propertyId) =>
  commonApi(`${BASE_URL}/properties/${propertyId}/images/`, "GET");

export const uploadPropertyImages = (propertyId, data, token) =>
  commonApi(`${BASE_URL}/properties/${propertyId}/images/`, "POST", data, token);

export const deletePropertyImage = (imageId, token) =>
  commonApi(`${BASE_URL}/properties/images/${imageId}/`, "DELETE", "", token);


/* ================= BOOKINGS ================= */

export const createBookingOrder = (data, token) =>
  commonApi(`${BASE_URL}/bookings/create-order/`, "POST", data, token);

export const verifyBookingPayment = (data, token) =>
  commonApi(`${BASE_URL}/bookings/verify-payment/`, "POST", data, token);

export const getPropertyBookingStatus = (propertyId) =>
  commonApi(`${BASE_URL}/bookings/property/${propertyId}/status/`, "GET");

export const getSellerBookings = (token) =>
  commonApi(`${BASE_URL}/bookings/seller/`, "GET", "", token);

export const bookingAction = (bookingId, action, token) =>
  commonApi(`${BASE_URL}/bookings/${bookingId}/action/`, "POST", { action }, token);

export const getUserBookings = (token) =>
  commonApi(`${BASE_URL}/bookings/my/`, "GET", "", token);


/* ================= CHAT ================= */

export const getUserChatRooms = (token) =>
  commonApi(`${BASE_URL}/chat/rooms/`, "GET", "", token);

export const cancelBooking = (bookingId, token) =>
  commonApi(`${BASE_URL}/bookings/${bookingId}/cancel/`, "POST", {}, token);

export const analyzeConditionsPDF = (data) => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  return commonApi(`${BASE_URL}/properties/analyze-pdf/`, "POST", data, token);
};
