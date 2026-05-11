import { Link } from 'react-router-dom'
import { GitBranch, ExternalLink, Share2 } from 'lucide-react'
import ParkIQLogo from '../Logo'

export default function Footer() {
  return (
    <footer className="border-t border-white/8 mt-auto" style={{ background: 'rgba(4,8,15,0.8)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <ParkIQLogo size={42} />
              <div className="flex flex-col leading-none">
                <span className="text-xl font-black gradient-text" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ParkIQ</span>
                <span className="text-[10px] text-gray-500 font-medium tracking-[0.18em] uppercase">Smart Parking</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              AI-powered smart parking management. Real-time slot tracking, dynamic pricing,
              and seamless QR-based entry/exit — parking made intelligent.
            </p>
            <div className="flex items-center gap-2.5 mt-6">
              {[
                { icon: GitBranch,   href: '#' },
                { icon: Share2,      href: '#' },
                { icon: ExternalLink, href: '#' },
              ].map(({ icon: Icon, href }, i) => (
                <a key={i} href={href}
                  className="w-9 h-9 glass-card flex items-center justify-center hover:border-cyan-500/40 hover:text-cyan-400 transition-all duration-200 text-gray-400">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm tracking-wide uppercase">Platform</h4>
            <ul className="flex flex-col gap-3">
              {[
                { label: 'Dashboard',   path: '/dashboard'  },
                { label: 'Book a Slot', path: '/booking'    },
                { label: 'Entry / Exit',path: '/entry-exit' },
                { label: 'Support',     path: '/support'    },
                { label: 'Admin Panel', path: '/admin'      },
              ].map(l => (
                <li key={l.label}>
                  <Link to={l.path} className="text-gray-400 hover:text-cyan-400 text-sm transition-colors duration-200">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm tracking-wide uppercase">Services</h4>
            <ul className="flex flex-col gap-3 text-sm text-gray-400">
              {['Real-time Tracking','Dynamic Pricing','QR Entry/Exit','Revenue Analytics','Microservices API'].map(s => (
                <li key={s} className="hover:text-gray-300 transition-colors cursor-default">{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="gradient-divider mt-10 mb-6" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} ParkIQ. Built with ❤️ · All rights reserved.</span>
          <div className="flex gap-5">
            {['Privacy Policy','Terms of Service','API Docs'].map(t => (
              <a key={t} href="#" className="hover:text-cyan-400 transition-colors duration-200">{t}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
