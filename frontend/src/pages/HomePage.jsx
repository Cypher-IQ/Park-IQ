import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Zap, Shield, BarChart3, QrCode, Clock,
  ArrowRight, CheckCircle, Star, Activity,
  MapPin, TrendingUp, Cpu
} from 'lucide-react'
import ParkIQLogo from '../components/Logo'

const features = [
  { icon: Zap,       title: 'AI-Powered Pricing',   desc: 'Dynamic rates that adapt in real-time to demand, peak hours, and occupancy levels.', color: 'from-amber-400 to-orange-500',  glow: 'rgba(245,158,11,0.2)' },
  { icon: Shield,    title: 'Secure Bookings',       desc: 'JWT-authenticated sessions with encrypted QR codes for safe, verified parking.',      color: 'from-emerald-400 to-teal-500',  glow: 'rgba(16,185,129,0.2)' },
  { icon: QrCode,    title: 'QR Entry & Exit',       desc: 'Instant QR-based gate control — no tickets, no queues. Scan and go.',                 color: 'from-cyan-400 to-blue-500',     glow: 'rgba(0,212,255,0.2)'  },
  { icon: BarChart3, title: 'Revenue Analytics',     desc: 'Admin dashboard with occupancy charts, revenue trends, and booking stats.',            color: 'from-violet-400 to-purple-500', glow: 'rgba(124,58,237,0.2)' },
  { icon: Clock,     title: 'Real-time Tracking',    desc: 'Live slot availability across all zones and levels. Always up to date.',               color: 'from-rose-400 to-pink-500',     glow: 'rgba(244,63,94,0.2)'  },
  { icon: Activity,  title: 'Smart Occupancy',       desc: 'Nearest-slot algorithm routes drivers to the best available parking spot.',            color: 'from-indigo-400 to-cyan-500',   glow: 'rgba(99,102,241,0.2)' },
]

const stats = [
  { value: '100+', label: 'Parking Slots',   icon: MapPin    },
  { value: '5',    label: 'Microservices',   icon: Cpu       },
  { value: '99.9%',label: 'Uptime SLA',      icon: TrendingUp },
  { value: '<1s',  label: 'Booking Time',    icon: Zap       },
]

function AnimatedSlotGrid() {
  const statuses = ['available','available','available','occupied','occupied','occupied','occupied','reserved','available','available','available','available','occupied','reserved','available','available','occupied','available','available','available','occupied','available','reserved','available','available','occupied','available','available','available','occupied']

  return (
    <div className="grid grid-cols-6 gap-2">
      {statuses.map((s, i) => (
        <div
          key={i}
          className={`h-10 rounded-lg border transition-all duration-700 flex items-center justify-center text-xs font-bold
            ${s === 'available' ? 'slot-available' : s === 'occupied' ? 'slot-occupied' : 'slot-reserved'}`}
          style={{ transitionDelay: `${i * 30}ms` }}
        >
          {i + 1}
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const { isAuthenticated } = useAuth()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <div className="overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center">

        {/* Background layers */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-60 -left-60 w-[600px] h-[600px] rounded-full bg-cyan-500/5 blur-3xl" />
          <div className="absolute top-40 -right-40 w-[500px] h-[500px] rounded-full bg-violet-600/6 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-cyan-500/4 blur-3xl" />
          <div className="absolute inset-0 bg-grid-pattern opacity-100" />
          {/* Animated radar rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            {[0,1,2].map(i => (
              <div key={i} className="absolute inset-0 rounded-full border border-cyan-500/10 radar-ring"
                style={{ width: 200 + i*180, height: 200 + i*180, top: -(100+i*90), left: -(100+i*90), animationDelay: `${i * 0.7}s` }} />
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 grid lg:grid-cols-2 gap-16 items-center relative z-10">

          {/* LEFT: Text */}
          <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {/* AI badge */}
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-6 border border-cyan-500/20">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-cyan-400 text-sm font-medium">AI-Powered Smart Parking</span>
            </div>

            <h1 className="text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.05] mb-6"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Park<br />
              <span className="gradient-text text-shadow-glow">Smarter.</span><br />
              <span className="text-gray-300 text-4xl lg:text-5xl font-bold">With ParkIQ.</span>
            </h1>

            <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-lg">
              Intelligent parking management with AI-driven dynamic pricing, real-time slot tracking,
              QR-based entry/exit, and comprehensive analytics — all in one platform.
            </p>

            <div className="flex flex-wrap items-center gap-4 mb-10">
              {isAuthenticated ? (
                <>
                  <Link to="/booking" id="hero-book-btn" className="btn-primary flex items-center gap-2">
                    Book a Slot <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/dashboard" className="btn-secondary flex items-center gap-2">
                    My Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" id="hero-get-started-btn" className="btn-primary flex items-center gap-2">
                    Get Started Free <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/login" className="btn-secondary flex items-center gap-2">
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-5 text-sm text-gray-400">
              {['No credit card required', 'Free tier available', '5-min setup'].map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Live Slot Visualization */}
          <div className={`animate-float transition-all duration-700 delay-200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <div className="glass-card p-6 glow-cyan relative overflow-hidden">
              {/* Subtle gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/3 to-violet-500/3 pointer-events-none rounded-2xl" />

              <div className="flex items-center justify-between mb-5 relative">
                <div>
                  <h3 className="text-white font-semibold text-base flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-cyan-400" /> Live Slot Map
                  </h3>
                  <p className="text-gray-500 text-xs mt-0.5">Zone A — Ground Floor · 30 slots</p>
                </div>
                <div className="flex items-center gap-2 glass-card px-3 py-1.5 border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 text-xs font-semibold">LIVE</span>
                </div>
              </div>

              <AnimatedSlotGrid />

              <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/8">
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-500/60 inline-block" /> Available</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-red-500/60 inline-block" /> Occupied</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500/60 inline-block" /> Reserved</span>
                </div>
                <span className="text-cyan-400 text-xs font-bold">17 Free</span>
              </div>
            </div>

            {/* Floating info cards */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              {[
                { label: 'Zone A', pct: 57, color: '#00D4FF' },
                { label: 'Zone B', pct: 82, color: '#7C3AED' },
              ].map(z => (
                <div key={z.label} className="glass-card px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${z.color}18` }}>
                    <Activity className="w-4 h-4" style={{ color: z.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400">{z.label} Occupancy</p>
                    <div className="h-1.5 bg-white/8 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${z.pct}%`, background: `linear-gradient(to right, ${z.color}, ${z.color}88)` }} />
                    </div>
                  </div>
                  <span className="text-xs font-bold" style={{ color: z.color }}>{z.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────── */}
      <section className="py-16 relative">
        <div className="absolute inset-0 gradient-divider top-0 bottom-auto" />
        <div className="absolute inset-0 gradient-divider bottom-0 top-auto" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center animate-slide-up glass-card p-6 hover:border-cyan-500/20 transition-colors"
                style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-cyan-500/15 to-violet-600/15 flex items-center justify-center border border-white/8">
                  <s.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div className="text-3xl font-black gradient-text mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{s.value}</div>
                <div className="text-gray-500 text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────── */}
      <section className="py-24 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-16 bg-gradient-to-b from-transparent to-cyan-500/40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 animate-slide-up">
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-5 border border-violet-500/20">
              <Star className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-violet-400 text-sm font-medium">Everything You Need</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Manage parking <span className="gradient-text">intelligently</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A complete ecosystem of microservices working in harmony,
              delivering a seamless parking experience from booking to payment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <div
                key={i}
                className="glass-card-hover p-6 group animate-slide-up relative overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${f.glow} 0%, transparent 60%)` }} />

                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} p-3 mb-5 shadow-lg
                  group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 relative z-10`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2 relative z-10">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed relative z-10">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass-card p-12 relative overflow-hidden glow-violet text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-violet-600/10 pointer-events-none rounded-2xl" />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-cyan-500/8 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex justify-center mb-5">
                <ParkIQLogo size={56} />
              </div>
              <h2 className="text-4xl lg:text-5xl font-black text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Ready to park smarter?
              </h2>
              <p className="text-gray-400 text-lg mb-8 max-w-xl mx-auto">
                Join ParkIQ today and experience next-generation parking management
                powered by AI and built for scale.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link to="/register" id="cta-register-btn" className="btn-primary flex items-center gap-2">
                  Create Free Account <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/login" className="btn-secondary">Sign In</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}
