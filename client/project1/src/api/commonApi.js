import axios from "axios";

const commonApi = (url, method, data, token) => {
  const headers = {};

  if (token) {
    headers["Authorization"] = `Token ${token}`;
  }

  console.log("Sending to", url, "with method", method);
  console.log("Has token:", !!token);

  // ✅ Normalize: treat empty string as no data
  const payload = (data && data !== "") ? data : undefined;

  // ✅ FormData → let browser set multipart Content-Type with boundary
  if (payload instanceof FormData) {
    return axios({ url, method, data: payload, headers });
  }

  // ✅ Plain object → send as JSON
  if (payload && typeof payload === "object") {
    headers["Content-Type"] = "application/json";
    return axios({ url, method, data: payload, headers });
  }

  // ✅ GET / DELETE / no body
  return axios({ url, method, headers });
};

export default commonApi;