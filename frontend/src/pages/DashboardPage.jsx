import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bookingAPI, authAPI, paymentAPI } from '../services/api'
import LiveOccupancyMap from '../components/LiveOccupancyMap'
import {
  CalendarDays, Clock, Car, CreditCard, CheckCircle2,
  XCircle, QrCode, Activity
} from 'lucide-react'
import toast from 'react-hot-toast'

const statusConfig = {
  active:    { label: 'Active',     badge: 'badge-success', icon: CheckCircle2 },
  pending:   { label: 'Pending',    badge: 'badge-warning', icon: Clock },
  completed: { label: 'Completed',  badge: 'badge-info',    icon: CheckCircle2 },
  cancelled: { label: 'Cancelled',  badge: 'badge-danger',  icon: XCircle },
}

function BookingCard({ booking, onCancel }) {
  const cfg = statusConfig[booking.status] || statusConfig.pending
  const Icon = cfg.icon
  const formatDate = (d) => d ? new Date(d).toLocaleString() : '—'

  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
            <Car className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Slot #{booking.slotId}</p>
            <p className="text-gray-500 text-xs">Booking ID: {booking.bookingId}</p>
          </div>
        </div>
        <span className={cfg.badge}>
          <Icon className="w-3.5 h-3.5" />{cfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-gray-500 mb-1 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Start</p>
          <p className="text-gray-200">{formatDate(booking.startTime)}</p>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <p className="text-gray-500 mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> End</p>
          <p className="text-gray-200">{formatDate(booking.endTime)}</p>
        </div>
        {booking.vehicleNumber && (
          <div className="bg-white/5 rounded-lg p-3 col-span-2">
            <p className="text-gray-500 mb-1 flex items-center gap-1"><Car className="w-3.5 h-3.5" /> Vehicle</p>
            <p className="text-gray-200 font-medium">{booking.vehicleNumber}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <span className={`badge ${booking.paymentStatus === 'paid' ? 'badge-success' : booking.status === 'completed' ? 'badge-warning' : 'badge-info'}`}>
            {booking.paymentStatus === 'paid' ? 'Paid' : booking.status === 'completed' ? 'Payment Pending' : 'Payment Waiting'}
          </span>
          {booking.status === 'completed' && (
            <p className="text-[11px] text-gray-500">
              Fare: ${Number(booking.finalPrice || booking.estimatedPrice || 0).toFixed(2)}
            </p>
          )}
        </div>
        {booking.qrCode && (
          <div className="mt-2 flex flex-col items-center p-2 bg-white/5 rounded-xl border border-white/10">
            <img 
              src={booking.qrCode.startsWith('data:') ? booking.qrCode : `data:image/png;base64,${booking.qrCode}`}
              alt="QR Code"
              className="w-20 h-20 rounded-md shadow-lg bg-white p-1"
            />
            <span className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">Scan at Gate</span>
          </div>
        )}
        {['pending', 'confirmed'].includes(booking.status) && (
          <button
            onClick={() => onCancel(booking.bookingId)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors ml-auto"
          >
            Cancel Booking
          </button>
        )}
        {booking.status === 'completed' && (
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/bookings/${booking.bookingId}/receipt`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-violet-400 hover:text-violet-300 transition-colors ml-auto"
          >
            Download Receipt
          </a>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [securityLoading, setSecurityLoading] = useState(false)

  useEffect(() => {
    const fetchData = async (isInitial = false) => {
      try {
        const [bookRes, paymentRes] = await Promise.all([
          bookingAPI.getUserBookings(),
          user?.id || user?._id ? paymentAPI.getUserPayments(user.id || user._id, { limit: 5 }) : Promise.resolve({ data: { data: [] } }),
        ])
        setBookings(bookRes.data.data || [])
        setPayments(paymentRes.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        if (isInitial) setLoading(false)
      }
    }
    
    fetchData(true)
    const interval = setInterval(() => fetchData(false), 5000)
    return () => clearInterval(interval)
  }, [user?.id, user?._id])

  const handleCancel = async (bookingId) => {
    try {
      await bookingAPI.cancelBooking(bookingId)
      setBookings(prev => prev.map(b => b.bookingId === bookingId ? { ...b, status: 'cancelled' } : b))
    } catch (err) {
      console.error(err)
    }
  }

  const handleEnable2FA = async () => {
    setSecurityLoading(true)
    try {
      await authAPI.setupTwoFactor()
      const code = window.prompt('Enter the 6-digit code sent to your email to enable 2FA')
      if (!code) return
      await authAPI.verifyTwoFactorSetup({ code })
      toast.success('Two-factor authentication enabled')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to enable 2FA')
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setSecurityLoading(true)
    try {
      await authAPI.disableTwoFactor()
      toast.success('Two-factor authentication disabled')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to disable 2FA')
    } finally {
      setSecurityLoading(false)
    }
  }

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const counts = {
    total: bookings.length,
    active: bookings.filter(b => b.status === 'active').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    pending: bookings.filter(b => b.status === 'pending').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-heading text-3xl">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span> 👋
        </h1>
        <p className="text-gray-400">Here's your parking activity overview.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Car, label: 'Total Bookings', value: counts.total, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
          { icon: Activity, label: 'Active Now', value: counts.active, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: CheckCircle2, label: 'Completed', value: counts.completed, color: 'text-violet-400', bg: 'bg-violet-500/10' },
          { icon: Clock, label: 'Pending', value: counts.pending, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((s, i) => (
          <div key={i} className="stat-card animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-gray-500 text-xs">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/booking" className="glass-card-hover p-5 flex items-center gap-4 group animate-slide-up animation-delay-100">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">Book a Slot</p>
            <p className="text-gray-500 text-xs">Reserve your parking spot</p>
          </div>
        </Link>
        <Link to="/entry-exit" className="glass-card-hover p-5 flex items-center gap-4 group animate-slide-up animation-delay-200">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">QR Entry / Exit</p>
            <p className="text-gray-500 text-xs">Scan to enter or exit</p>
          </div>
        </Link>
        <div className="glass-card p-5 flex items-center gap-4 animate-slide-up animation-delay-300">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold">Payments</p>
            <p className="text-gray-500 text-xs">Completed fare appears after exit</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Recent Payments
            </h3>
            <p className="text-xs text-gray-500">Completed exit fares and other recorded transactions.</p>
          </div>
          <span className="badge badge-info">{payments.length}</span>
        </div>
        {payments.length === 0 ? (
          <p className="text-sm text-gray-500">No payments recorded yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {payments.map((payment) => (
              <div key={payment._id || payment.transactionId} className="bg-white/5 rounded-2xl border border-white/10 p-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-white font-semibold">${Number(payment.amount || 0).toFixed(2)}</p>
                  <span className="badge badge-success">{payment.status || 'success'}</span>
                </div>
                <p className="text-xs text-gray-400">Booking: {payment.bookingId}</p>
                <p className="text-xs text-gray-400">Method: {payment.method || 'card'}</p>
                <p className="text-xs text-gray-500 mt-2">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'Pending'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-white font-semibold">Account Security</h3>
          <p className="text-sm text-gray-500">Two-factor authentication is {user?.twoFactorEnabled ? 'enabled' : 'disabled'}.</p>
        </div>
        <div className="flex gap-3">
          {user?.twoFactorEnabled ? (
            <button onClick={handleDisable2FA} disabled={securityLoading} className="btn-secondary text-sm">Disable 2FA</button>
          ) : (
            <button onClick={handleEnable2FA} disabled={securityLoading} className="btn-primary text-sm">Enable 2FA</button>
          )}
        </div>
      </div>

      <div className="mb-8">
        <LiveOccupancyMap />
      </div>

      {/* Booking History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-heading !mb-0 text-xl">My Bookings</h2>
          <div className="flex items-center gap-2">
            {['all', 'active', 'pending', 'completed', 'cancelled'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  filter === f ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <svg className="animate-spin w-8 h-8 text-cyan-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Car className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 font-medium">No bookings yet</p>
            <p className="text-gray-600 text-sm mb-5">Reserve your first parking slot now.</p>
            <Link to="/booking" className="btn-primary inline-flex items-center gap-2">
              Book a Slot
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(b => (
              <BookingCard key={b._id} booking={b} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
