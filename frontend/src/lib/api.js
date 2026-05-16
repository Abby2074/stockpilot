import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "http://127.0.0.1:8000";
const AI_BASE = process.env.REACT_APP_AI_BASE || "http://127.0.0.1:8001";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export const auth = {
  login: (email, password) =>
    api.post("/auth/login", { email, password }).then((r) => r.data),
  register: (payload) => api.post("/auth/register", payload).then((r) => r.data),
};

export const products = {
  list: () => api.get("/products").then((r) => r.data),
  create: (data) => api.post("/products", data).then((r) => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then((r) => r.data),
  remove: (id) => api.delete(`/products/${id}`).then((r) => r.data),
};

export const users = {
  list: () => api.get("/users").then((r) => r.data),
  create: (data) => api.post("/users", data).then((r) => r.data),
};

export const transactions = {
  list: () => api.get("/transactions").then((r) => r.data),
  create: (data) => api.post("/transactions", data).then((r) => r.data),
  approve: (id) => api.post(`/transactions/${id}/approve`).then((r) => r.data),
  reject: (id, reason) =>
    api.post(`/transactions/${id}/reject`, { reason }).then((r) => r.data),
};

export const audit = {
  list: (params = {}) => api.get("/audit", { params }).then((r) => r.data),
};

export const alerts = {
  list: (unreadOnly = false) =>
    api.get("/alerts", { params: { unread_only: unreadOnly } }).then((r) => r.data),
  count: () => api.get("/alerts/count").then((r) => r.data),
  markRead: (id) => api.post(`/alerts/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post("/alerts/read-all").then((r) => r.data),
  emitTest: () => api.post("/alerts/test").then((r) => r.data),
};

// Standalone AI microservice — separate base URL.
// Returns { detections: [{ product, count, confidence }], model, mock }.
export const aiDetect = async (files) => {
  const form = new FormData();
  form.append("file", files[0]);
  const res = await axios.post(`${AI_BASE}/detect`, form, {
    timeout: 60000,
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const aiStatus = () => axios.get(`${AI_BASE}/`).then((r) => r.data);

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
};

export default api;
