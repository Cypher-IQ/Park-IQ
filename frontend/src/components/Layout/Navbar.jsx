import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, CalendarDays, QrCode, Settings,
  LogOut, Menu, X, ChevronRight, User, Sparkles, MessageCircle
} from 'lucide-react'
import ParkIQLogo from '../Logo'

const navItems = [
  { label: 'Home',        path: '/',           public: true },
  { label: 'Dashboard',   path: '/dashboard',  icon: LayoutDashboard, auth: true },
  { label: 'Book Slot',   path: '/booking',    icon: CalendarDays,    auth: true },
  { label: 'Entry / Exit',path: '/entry-exit', icon: QrCode,          auth: true },
  { label: 'Support',     path: '/support',    icon: MessageCircle,   auth: true },
  { label: 'Admin Panel', path: '/admin',      icon: Settings,        adminOnly: true },
]

export default function Navbar() {
  const [open,    setOpen]    = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { user, isAuthenticated, isAdmin, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const onAdminPage = location.pathname.startsWith('/admin')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  useEffect(() => { setOpen(false) }, [location.pathname])

  const handleLogout = () => { logout(); navigate('/') }

  const visible = navItems.filter(item => {
    if (onAdminPage) return item.public
    if (item.adminOnly) return isAdmin
    if (item.auth)      return isAuthenticated
    return true
  })

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled ? 'navbar-glass' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between">

          {/* ── Brand ── */}
          <Link to="/" className="flex items-center gap-3 group select-none" aria-label="ParkIQ Home">
            <ParkIQLogo size={40} className="logo-mark" />
            <div className="flex flex-col leading-none">
              <span
                className="text-[22px] font-black gradient-text tracking-tight"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                ParkIQ
              </span>
              <span className="text-[10px] text-gray-500 font-medium tracking-[0.18em] uppercase -mt-0.5">
                Smart Parking
              </span>
            </div>
          </Link>

          {/* ── Desktop Nav ── */}
          <div className="hidden md:flex items-center gap-7">
            {visible.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link py-1 ${location.pathname === item.path ? 'nav-link-active' : ''}`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* ── Desktop Right ── */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {/* User pill */}
                <div className="flex items-center gap-2.5 glass-card px-3.5 py-2 border-white/10">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex flex-col leading-none">
                    <span className="text-sm text-gray-100 font-semibold">{user?.name?.split(' ')[0]}</span>
                    {isAdmin && (
                      <span className="text-[10px] text-violet-400 font-medium tracking-wider uppercase">Admin</span>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="btn-secondary !py-2 !px-3.5 flex items-center gap-1.5 !text-sm"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-secondary !py-2 !px-4 !text-sm">Sign In</Link>
                <Link to="/register" className="btn-primary  !py-2 !px-4 !text-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Get Started
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile Toggle ── */}
          <button
            id="mobile-menu-toggle"
            aria-label="Toggle menu"
            className="md:hidden glass-card p-2.5 rounded-xl hover:border-cyan-500/40 transition-all"
            onClick={() => setOpen(!open)}
          >
            {open
              ? <X    className="w-5 h-5 text-gray-200" />
              : <Menu className="w-5 h-5 text-gray-200" />}
          </button>
        </div>

        {/* ── Mobile Menu ── */}
        {open && (
          <div className="md:hidden bg-navy-900/98 backdrop-blur-2xl border-t border-white/8 px-4 py-5 animate-slide-down">
            <div className="flex flex-col gap-1">
              {visible.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-medium ${
                    location.pathname === item.path
                      ? 'bg-gradient-to-r from-cyan-500/10 to-violet-600/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className="w-4 h-4" />}
                    {item.label}
                  </div>
                  <ChevronRight className="w-4 h-4 opacity-40" />
                </Link>
              ))}

              <div className="border-t border-white/8 mt-4 pt-4 flex flex-col gap-2">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-2">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">{user?.name}</p>
                        <p className="text-gray-500 text-xs">{user?.email}</p>
                      </div>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary flex items-center justify-center gap-2 w-full">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login"    className="btn-secondary text-center justify-center">Sign In</Link>
                    <Link to="/register" className="btn-primary  text-center justify-center flex items-center gap-2">
                      <Sparkles className="w-4 h-4" /> Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
