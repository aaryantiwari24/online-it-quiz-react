import axios from 'axios'

// Falls back to localhost:5000 if VITE_API_URL isn't set in frontend/.env
// (copy frontend/.env.example -> frontend/.env to configure it explicitly).
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
})

// Phase 5 — attach the logged-in user's JWT to every request that has one,
// so AuthContext.jsx and every future authenticated call (Phase 6's result
// history, Phase 7/8's question management, etc.) don't each need to pass
// an Authorization header manually. Reads straight from localStorage
// rather than from AuthContext/React state, since this module has no
// business importing React context — the two stay in sync because
// AuthContext is the only thing that ever writes the 'token' key.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
