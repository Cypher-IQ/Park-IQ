import axios from 'axios'

const GATEWAY_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor — attach JWT and user-id header
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('parkiq_token')
    const user = localStorage.getItem('parkiq_user')
    if (token) config.headers.Authorization = `Bearer ${token}`
    if (user) {
      try {
        const parsed = JSON.parse(user)
        if (parsed?.id || parsed?._id) config.headers['x-user-id'] = parsed.id || parsed._id
      } catch (err) {
        // Ignore invalid JSON
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('parkiq_token')
      localStorage.removeItem('parkiq_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  socialLogin: (data) => api.post('/api/auth/social-login', data),
  verifyTwoFactorLogin: (data) => api.post('/api/auth/2fa/verify-login', data),
  setupTwoFactor: () => api.post('/api/auth/2fa/setup'),
  verifyTwoFactorSetup: (data) => api.post('/api/auth/2fa/verify-setup', data),
  disableTwoFactor: () => api.post('/api/auth/2fa/disable'),
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (data) => api.put('/api/auth/profile', data),
  changePassword: (data) => api.put('/api/auth/change-password', data),
  getAllUsers: (params) => api.get('/api/auth/users', { params }),
}

// ── Parking Slots ─────────────────────────────────────────
export const parkingAPI = {
  getSlots: (params) => api.get('/api/parking/slots', { params }),
  getSlot: (id) => api.get(`/api/parking/slots/${id}`),
  createSlot: (data) => api.post('/api/parking/slots', data),
  createSlotsBulk: (slots) => api.post('/api/parking/slots/bulk', { slots }),
  updateSlot: (id, data) => api.put(`/api/parking/slots/${id}`, data),
  updateSlotStatus: (id, status, bookingId) => api.patch(`/api/parking/slots/${id}/status`, { status, bookingId }),
  deleteSlot: (id) => api.delete(`/api/parking/slots/${id}`),
  getNearestSlot: (params) => api.get('/api/parking/nearest', { params }),
  getStats: () => api.get('/api/parking/stats'),
  getZoneStats: () => api.get('/api/parking/zones'),
  seedSlots: () => api.post('/api/parking/slots/seed'),
}

// ── Bookings ──────────────────────────────────────────────
export const bookingAPI = {
  createBooking: (data) => api.post('/api/bookings', data),
  getUserBookings: (params) => api.get('/api/bookings', { params }),
  getAllBookings: (params) => api.get('/api/bookings/admin/all', { params }),
  getBookingStats: () => api.get('/api/bookings/admin/stats'),
  getBooking: (id) => api.get(`/api/bookings/${id}`),
  scanEntry: (qrToken) => api.post('/api/bookings/entry', { qrToken }),
  scanExit: (qrToken) => api.post('/api/bookings/exit', { qrToken }),
  cancelBooking: (id) => api.patch(`/api/bookings/${id}/cancel`),
  getReceipt: (id) => api.get(`/api/bookings/${id}/receipt`, { responseType: 'blob' }),
}

// ── Pricing ───────────────────────────────────────────────
export const pricingAPI = {
  calculatePrice: (data) => api.post('/api/pricing/calculate', data),
  getPriceEstimate: (params) => api.get('/api/pricing/estimate', { params }),
  getPeakHours: () => api.get('/api/pricing/peak-hours'),
  getCurrentRate: () => api.get('/api/pricing/current'),
}

// ── Payments ──────────────────────────────────────────────
export const paymentAPI = {
  initiatePayment: (data) => api.post('/api/payments/initiate', data),
  retryPayment: (id) => api.post(`/api/payments/retry/${id}`),
  getPaymentByBooking: (bookingId) => api.get(`/api/payments/booking/${bookingId}`),
  getUserPayments: (userId, params) => api.get(`/api/payments/user/${userId}`, { params }),
  getInvoice: (bookingId) => api.get(`/api/payments/invoice/${bookingId}`, { responseType: 'blob' }),
  refundPayment: (id) => api.post(`/api/payments/refund/${id}`),
  getRevenueStats: (params) => api.get('/api/payments/admin/revenue', { params }),
}

export const supportAPI = {
  getThreads: () => api.get('/api/support/threads'),
  createThread: (data) => api.post('/api/support/threads', data),
  getThread: (id) => api.get(`/api/support/threads/${id}`),
  addMessage: (id, data) => api.post(`/api/support/threads/${id}/messages`, data),
  closeThread: (id) => api.patch(`/api/support/threads/${id}/close`),
  markThreadRead: (id) => api.patch(`/api/support/threads/${id}/read`),
  // Admin endpoints
  adminGetThreads: (params) => api.get('/api/support/admin/threads', { params }),
  adminGetThreadById: (id) => api.get(`/api/support/admin/threads/${id}`),
  adminAssignThread: (id) => api.patch(`/api/support/admin/threads/${id}/assign`),
  adminReplyToThread: (id, data) => api.post(`/api/support/admin/threads/${id}/reply`, data),
  adminUpdateStatus: (id, data) => api.patch(`/api/support/admin/threads/${id}/status`, data),
  adminMarkThreadRead: (id) => api.patch(`/api/support/admin/threads/${id}/read`),
}

// ── Admin Dashboard ───────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/api/admin/dashboard'),
}

export default api
