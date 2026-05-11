import { useState, useEffect, useCallback } from 'react'
import { parkingAPI, bookingAPI, paymentAPI, pricingAPI, supportAPI, authAPI } from '../services/api'
import LiveOccupancyMap from '../components/LiveOccupancyMap'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler
} from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import {
  Car, DollarSign, Activity, Plus,
  RefreshCw, TrendingUp, BarChart3, Zap, AlertCircle, MessageCircle, SendHorizontal, UserCheck,
  Users, ReceiptText, History, Wallet
} from 'lucide-react'
import toast from 'react-hot-toast'
import SupportCenter from '../components/Support/SupportCenter'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Filler)

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { labels: { color: '#9CA3AF', font: { family: 'Inter' } } } },
}

function StatCard({ icon: Icon, label, value, sub, color, bg }) {
  return (
    <div className="stat-card animate-slide-up">
      <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-black text-white">{value}</p>
        <p className="text-gray-500 text-xs">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [slots, setSlots] = useState([])
  const [bookings, setBookings] = useState([])
  const [users, setUsers] = useState([])
  const [payments, setPayments] = useState([])
  const [revenueStats, setRevenueStats] = useState(null)
  const [peakConfig, setPeakConfig] = useState(null)
  const [supportThreads, setSupportThreads] = useState([])
  const [usersTotal, setUsersTotal] = useState(0)
  const [pricingCount, setPricingCount] = useState(0)
  const [selectedSupportThread, setSelectedSupportThread] = useState(null)
  const [supportReply, setSupportReply] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [seedLoading, setSeedLoading] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [slotsRes, bookingsRes, revenueRes, peakRes, supportRes, usersRes] = await Promise.allSettled([
        parkingAPI.getSlots({ limit: 200 }),
        bookingAPI.getAllBookings({ limit: 100 }),
        paymentAPI.getRevenueStats(),
        pricingAPI.getPeakHours(),
        supportAPI.adminGetThreads({ limit: 50 }),
        authAPI.getAllUsers({ limit: 100 }),
      ])
      const safeData = (result) => (result.status === 'fulfilled' ? result.value?.data : null)

      const slotsData = safeData(slotsRes)
      const bookingsData = safeData(bookingsRes)
      const revenueData = safeData(revenueRes)
      const peakData = safeData(peakRes)
      const supportData = safeData(supportRes)
      const usersData = safeData(usersRes)

      setSlots(slotsData?.data || [])
      setBookings(bookingsData?.data || [])
      setRevenueStats(revenueData?.data || null)
      setPeakConfig(peakData?.data || null)
      setPayments(revenueData?.data?.recentPayments || [])

      const threads = supportData?.data || []
      setSupportThreads(threads)
      if (threads.length) setSelectedSupportThread((current) => current || threads[0])

      setUsers(usersData?.data || [])
      setUsersTotal(usersData?.pagination?.total || 0)

      const pricingWindows = peakData?.data?.peakWindows || []
      setPricingCount(pricingWindows.length)

      const forbiddenCount = [supportRes, usersRes].filter((result) => result.status === 'rejected' && result.reason?.response?.status === 403).length
      if (forbiddenCount > 0) {
        toast.error('Admin-only lists require an admin login')
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSeed = async () => {
    setSeedLoading(true)
    try {
      await parkingAPI.seedSlots()
      toast.success('50 parking slots seeded!')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Seed failed')
    } finally {
      setSeedLoading(false)
    }
  }

  // Derived stats
  const available = slots.filter(s => s.status === 'available').length
  const occupied = slots.filter(s => s.status === 'occupied').length
  const reserved = slots.filter(s => s.status === 'reserved').length
  const occupancyRate = slots.length ? ((occupied + reserved) / slots.length * 100).toFixed(0) : 0
  const totalRevenue = revenueStats?.totalRevenue || 0
  const totalBookings = bookings.length
  const activeBookings = bookings.filter(b => b.status === 'active').length
  const completedBookings = bookings.filter(b => b.status === 'completed').length
  const paidBookings = bookings.filter(b => b.paymentStatus === 'paid').length
  const pendingBookings = bookings.filter(b => b.status === 'pending').length
  const revenueByDay = revenueStats?.dailyRevenue || []
  const pendingSupportTickets = supportThreads.filter((thread) => thread.status !== 'closed').length
  const bookingRevenueFallback = bookings
    .filter((booking) => booking.status === 'completed')
    .reduce((sum, booking) => sum + Number(booking.finalPrice || booking.estimatedPrice || 0), 0)
  const effectiveTotalRevenue = Number(totalRevenue) > 0 ? Number(totalRevenue) : bookingRevenueFallback
  const effectivePayments = payments.length > 0
    ? payments
    : bookings
        .filter((booking) => booking.status === 'completed')
        .map((booking) => ({
          _id: `booking-${booking.bookingId}`,
          transactionId: booking.paymentTransactionId || `AUTO-${booking.bookingId}`,
          bookingId: booking.bookingId,
          amount: Number(booking.finalPrice || booking.estimatedPrice || 0),
          method: 'auto-exit',
          paidAt: booking.paymentCompletedAt || booking.exitTime || booking.updatedAt || booking.createdAt,
          status: booking.paymentStatus === 'paid' ? 'success' : 'pending',
        }))

  // Chart data
  const occupancyData = {
    labels: ['Available', 'Occupied', 'Reserved'],
    datasets: [{
      data: [available, occupied, reserved],
      backgroundColor: ['rgba(16,185,129,0.7)', 'rgba(239,68,68,0.7)', 'rgba(245,158,11,0.7)'],
      borderColor: ['#10b981', '#ef4444', '#f59e0b'],
      borderWidth: 2,
    }],
  }

  const statusCounts = ['pending','active','completed','cancelled'].reduce((acc, s) => {
    acc[s] = bookings.filter(b => b.status === s).length
    return acc
  }, {})

  const bookingStatusData = {
    labels: ['Pending', 'Active', 'Completed', 'Cancelled'],
    datasets: [{
      label: 'Bookings',
      data: Object.values(statusCounts),
      backgroundColor: ['rgba(245,158,11,0.7)', 'rgba(16,185,129,0.7)', 'rgba(99,102,241,0.7)', 'rgba(239,68,68,0.7)'],
      borderColor: ['#f59e0b', '#10b981', '#6366f1', '#ef4444'],
      borderWidth: 2,
      borderRadius: 8,
    }],
  }

  const revenueChartData = {
    labels: revenueByDay.map(d => d._id || d.date || 'Day'),
    datasets: [{
      label: 'Revenue ($)',
      data: revenueByDay.map(d => d.total || 0),
      borderColor: 'rgba(0, 212, 255, 1)',
      backgroundColor: 'rgba(0, 212, 255, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(0,212,255,1)',
      pointRadius: 4,
    }],
  }

  const tabs = ['overview', 'users', 'money', 'history', 'slots', 'pricing', 'support']

  const handleAssignSupportThread = async (threadId) => {
    try {
      await supportAPI.adminAssignThread(threadId)
      toast.success('Ticket assigned to you')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign ticket')
    }
  }

  const handleSupportStatusUpdate = async (threadId, status) => {
    try {
      await supportAPI.adminUpdateStatus(threadId, { status })
      toast.success('Ticket status updated')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const handleSupportReply = async (threadId) => {
    if (!supportReply.trim()) return
    setSupportLoading(true)
    try {
      const res = await supportAPI.adminReplyToThread(threadId, { message: supportReply.trim() })
      setSelectedSupportThread(res.data.data)
      setSupportReply('')
      toast.success('Reply sent to user')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reply')
    } finally {
      setSupportLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-heading text-3xl">
            Admin <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-gray-400">Full system overview and management controls.</p>
        </div>
        <div className="flex gap-3">
          <button id="seed-slots-btn" onClick={handleSeed} disabled={seedLoading}
            className="btn-secondary flex items-center gap-2 text-sm">
            {seedLoading ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <Plus className="w-4 h-4" />}
            Seed Slots
          </button>
          <button onClick={fetchAll} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 glass-card p-1.5 rounded-2xl w-fit mb-8">
        {tabs.map(t => (
          <button
            key={t}
            id={`admin-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              tab === t ? 'bg-white/10 text-white border border-white/15' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <svg className="animate-spin w-10 h-10 text-cyan-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="flex flex-col gap-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <StatCard icon={Car} label="Total Slots" value={slots.length} sub={`${available} free`} color="text-cyan-400" bg="bg-cyan-500/10" />
                <StatCard icon={Activity} label="Occupancy Rate" value={`${occupancyRate}%`} sub={`${occupied} occupied`} color="text-rose-400" bg="bg-rose-500/10" />
                <StatCard icon={DollarSign} label="Total Revenue" value={`$${Number(totalRevenue).toFixed(0)}`} sub={`${revenueStats?.totalTransactions || 0} transactions`} color="text-emerald-400" bg="bg-emerald-500/10" />
                <StatCard icon={BarChart3} label="Completed Bookings" value={completedBookings} sub={`${pendingBookings} pending`} color="text-violet-400" bg="bg-violet-500/10" />
                <StatCard icon={UserCheck} label="Users" value={usersTotal} sub="Registered users" color="text-sky-400" bg="bg-sky-500/10" />
                <StatCard icon={Zap} label="Support Tickets" value={pendingSupportTickets} sub="Need replies" color="text-amber-400" bg="bg-amber-500/10" />
              </div>

              {/* Charts Row */}
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="glass-card p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Car className="w-5 h-5 text-cyan-400" /> Slot Occupancy
                  </h3>
                  <div className="h-48">
                    <Doughnut data={occupancyData} options={{ ...chartDefaults, cutout: '65%' }} />
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-violet-400" /> Booking Status
                  </h3>
                  <div className="h-48">
                    <Bar data={bookingStatusData} options={{
                      ...chartDefaults,
                      scales: {
                        x: { ticks: { color: '#6B7280' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        y: { ticks: { color: '#6B7280' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                      }
                    }} />
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" /> Revenue Trend
                  </h3>
                  <div className="h-48">
                    {revenueByDay.length > 0 ? (
                      <Line data={revenueChartData} options={{
                        ...chartDefaults,
                        scales: {
                          x: { ticks: { color: '#6B7280' }, grid: { display: false } },
                          y: { ticks: { color: '#6B7280' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        }
                      }} />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-600 text-sm">
                        No revenue data yet
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <LiveOccupancyMap />
            </div>
          )}

          {/* Users Tab */}
          {tab === 'users' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <Users className="w-5 h-5 text-sky-400" /> Registered Users
                  </h3>
                  <p className="text-xs text-gray-500">All accounts with role and join date.</p>
                </div>
                <span className="badge badge-info">{users.length} shown</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wide">
                      {['Name', 'Email', 'Role', 'Phone', 'Joined'].map(h => (
                        <th key={h} className="text-left px-5 py-4 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3 text-white font-medium">{user.name || '—'}</td>
                        <td className="px-5 py-3 text-gray-300">{user.email || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`badge ${user.role === 'admin' ? 'badge-success' : 'badge-info'}`}>
                            {user.role || 'user'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400">{user.phone || '—'}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{user.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-500">No users found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Money Tab */}
          {tab === 'money' && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={Wallet} label="Total Revenue" value={`$${Number(effectiveTotalRevenue).toFixed(2)}`} sub={`${revenueStats?.totalTransactions || effectivePayments.length} payments`} color="text-emerald-400" bg="bg-emerald-500/10" />
                <StatCard icon={ReceiptText} label="Recent Payments" value={effectivePayments.length} sub="Latest transactions" color="text-cyan-400" bg="bg-cyan-500/10" />
                <StatCard icon={DollarSign} label="Average Payment" value={`$${Number(revenueStats?.averageTransaction || 0).toFixed(2)}`} sub="Per transaction" color="text-violet-400" bg="bg-violet-500/10" />
                <StatCard icon={BarChart3} label="Payment Methods" value={revenueStats?.methodBreakdown?.length || 0} sub="Cash, card, wallet" color="text-amber-400" bg="bg-amber-500/10" />
              </div>

              <div className="glass-card overflow-hidden">
                <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <ReceiptText className="w-5 h-5 text-cyan-400" /> Money / Transactions
                    </h3>
                    <p className="text-xs text-gray-500">Recent successful payments recorded by the system.</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wide">
                        {['Transaction', 'Booking', 'Amount', 'Method', 'Paid At'].map(h => (
                          <th key={h} className="text-left px-5 py-4 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {effectivePayments.map((payment) => (
                        <tr key={payment._id || payment.transactionId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-5 py-3 text-gray-300 font-mono text-xs">{payment.transactionId || payment._id || '—'}</td>
                          <td className="px-5 py-3 text-white font-medium">{payment.bookingId || '—'}</td>
                          <td className="px-5 py-3 text-emerald-400 font-semibold">${Number(payment.amount || 0).toFixed(2)}</td>
                          <td className="px-5 py-3 text-gray-300 capitalize">{payment.method || '—'}</td>
                          <td className="px-5 py-3 text-gray-400 text-xs">{payment.paidAt ? new Date(payment.paidAt).toLocaleString() : '—'}</td>
                        </tr>
                      ))}
                      {effectivePayments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-10 text-gray-500">No payment records available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="glass-card p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-400" /> Revenue Breakdown
                </h3>
                <div className="grid sm:grid-cols-3 gap-3">
                  {(revenueStats?.methodBreakdown || []).map((method) => (
                    <div key={method._id} className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">{method._id || 'unknown'}</p>
                      <p className="text-white text-xl font-black">${Number(method.total || 0).toFixed(2)}</p>
                      <p className="text-gray-500 text-xs">{method.count || 0} transactions</p>
                    </div>
                  ))}
                  {(revenueStats?.methodBreakdown || []).length === 0 && (
                    <p className="text-gray-500 text-sm">No breakdown available.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {tab === 'history' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <History className="w-5 h-5 text-violet-400" /> Previous Booking History
                  </h3>
                  <p className="text-xs text-gray-500">All booking records and their status timeline.</p>
                </div>
                <span className="badge badge-info">{bookings.length} records</span>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-5 py-4 border-b border-white/10">
                <StatCard icon={BarChart3} label="Completed" value={completedBookings} sub="Finished exits" color="text-violet-400" bg="bg-violet-500/10" />
                <StatCard icon={Wallet} label="Paid" value={paidBookings} sub="Payment reflected" color="text-emerald-400" bg="bg-emerald-500/10" />
                <StatCard icon={DollarSign} label="Revenue" value={`$${Number(totalRevenue).toFixed(0)}`} sub="All completed fares" color="text-cyan-400" bg="bg-cyan-500/10" />
                <StatCard icon={Users} label="Users" value={usersTotal} sub="Bookers" color="text-sky-400" bg="bg-sky-500/10" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs uppercase tracking-wide">
                      {['Booking ID', 'Slot', 'User', 'Status', 'Payment', 'Start', 'End'].map(h => (
                        <th key={h} className="text-left px-5 py-4 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking._id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-5 py-3 text-gray-500 font-mono text-xs">{booking._id?.slice(-8)}</td>
                        <td className="px-5 py-3 text-white font-medium">{booking.slotId?.slotId || booking.slotId}</td>
                        <td className="px-5 py-3 text-gray-300">{booking.userId?.name || booking.userId?.email || '—'}</td>
                        <td className="px-5 py-3">
                          <span className={`badge ${{
                            active: 'badge-success', pending: 'badge-warning',
                            completed: 'badge-info', cancelled: 'badge-danger'
                          }[booking.status] || 'badge-info'}`}>{booking.status}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`badge ${booking.paymentStatus === 'paid' ? 'badge-success' : booking.status === 'completed' ? 'badge-warning' : 'badge-info'}`}>
                            {booking.paymentStatus === 'paid' ? 'paid' : booking.status === 'completed' ? 'pending' : 'waiting'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{booking.startTime ? new Date(booking.startTime).toLocaleString() : '—'}</td>
                        <td className="px-5 py-3 text-gray-400 text-xs">{booking.endTime ? new Date(booking.endTime).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-gray-500">No booking history yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Slots Tab */}
          {tab === 'slots' && (
            <div>
              <div className="grid grid-cols-4 gap-3 mb-4 text-center">
                {[
                  { label: 'Total', val: slots.length, c: 'text-white' },
                  { label: 'Available', val: available, c: 'text-emerald-400' },
                  { label: 'Occupied', val: occupied, c: 'text-red-400' },
                  { label: 'Reserved', val: reserved, c: 'text-amber-400' },
                ].map(s => (
                  <div key={s.label} className="glass-card p-4">
                    <p className={`text-2xl font-black ${s.c}`}>{s.val}</p>
                    <p className="text-gray-500 text-xs mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="glass-card p-5">
                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-2">
                  {slots.map(slot => (
                    <div
                      key={slot._id}
                      className={`h-12 rounded-lg border flex flex-col items-center justify-center text-xs font-bold transition-all
                        ${slot.status === 'available' ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' :
                          slot.status === 'occupied' ? 'bg-red-500/15 border-red-500/40 text-red-400' :
                          'bg-amber-500/15 border-amber-500/40 text-amber-400'}`}
                    >
                      <span>{slot.slotId}</span>
                      <span className="opacity-60 text-[9px]">{slot.zone}</span>
                    </div>
                  ))}
                </div>
                {slots.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    <Car className="w-12 h-12 mx-auto mb-3 text-gray-700" />
                    <p>No slots found. Click "Seed Slots" to create 50 slots.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Pricing Tab */}
          {tab === 'pricing' && (
            <div className="max-w-lg">
              <div className="glass-card p-6">
                <h3 className="text-white font-semibold mb-5 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-400" /> Peak Hour Configuration
                </h3>
                {peakConfig ? (
                  <div className="flex flex-col gap-4 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-gray-500 text-xs mb-1">Base Price</p>
                        <p className="text-white font-bold text-xl">${peakConfig.basePrice}/hr</p>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4">
                        <p className="text-gray-500 text-xs mb-1">Peak Multiplier</p>
                    <p className="text-amber-400 font-bold text-xl">
                      ×{peakConfig?.peakWindows?.[0]?.multiplier || 1.5}
                    </p>
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-gray-500 text-xs mb-2">Peak Windows</p>
                      {peakConfig.peakWindows?.map((ph, i) => (
                        <div key={i} className="flex items-center gap-2 text-gray-300 mb-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          {ph.name}: {ph.startHour}:00 — {ph.endHour}:00 (×{ph.multiplier})
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/10 pt-3 flex items-center gap-2 text-xs text-gray-500">
                      <AlertCircle className="w-4 h-4" />
                      Price = Base × Demand Factor × Peak Multiplier
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No pricing config available.</p>
                )}
              </div>
            </div>
          )}

          {tab === 'support' && <SupportCenter adminMode />}
        </>
      )}
    </div>
  )
}
