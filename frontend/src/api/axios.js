import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || "http://127.0.0.1:5000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false  // 🔥 Add this line
});

export default api;
