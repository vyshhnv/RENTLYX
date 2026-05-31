import axios from "axios";

const commonApi = (url, method, data, token) => {
  const headers = {};

  if (token) {
    headers.Authorization = `Token ${token}`;
  }

  const payload = data && data !== "" ? data : undefined;

  if (payload instanceof FormData) {
    return axios({ url, method, data: payload, headers });
  }

  if (payload && typeof payload === "object") {
    headers["Content-Type"] = "application/json";
    return axios({ url, method, data: payload, headers });
  }

  return axios({ url, method, headers });
};

export default commonApi;
