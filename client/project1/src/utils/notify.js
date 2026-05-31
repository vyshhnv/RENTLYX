import { toast } from "react-toastify";

export const getErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.error ||
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  fallback;

export const notifyError = (message) => toast.error(message);
export const notifySuccess = (message) => toast.success(message);
