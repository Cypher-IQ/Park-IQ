import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCarAnimation } from '../context/AnimationContext'
import { Mail, Lock, Eye, EyeOff, User, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'user' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { register } = useAuth()
  const { triggerCarAnimation } = useCarAnimation()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    try {
      const { name, email, password, role } = form
      const user = await register({ name, email, password, role })
      toast.success(`Welcome to ParkIQ, ${user.name.split(' ')[0]}!`)
      triggerCarAnimation('Vroom...', 1500)
      setTimeout(() => {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard')
      }, 1500)
    } catch (err) {
      let msg = 'Registration failed. Please try again.'
      if (err.response?.data?.errors && err.response.data.errors.length > 0) {
        msg = err.response.data.errors[0].msg
      } else if (err.response?.data?.message) {
        msg = err.response.data.message
      }
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-72 h-72 bg-violet-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-72 h-72 bg-cyan-500/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-violet-600/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Create Account</h1>
          <p className="text-gray-400">Join ParkIQ and start parking smarter</p>
        </div>

        <div className="glass-card p-8 glow-violet">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div>
              <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="reg-name">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-name"
                  type="text"
                  required
                  placeholder="John Smith"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="reg-email">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Role */}
            <div>
              <label className="text-sm text-gray-300 font-medium mb-2 block">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                {[{ v: 'user', label: 'User', desc: 'Book parking slots' }, { v: 'admin', label: 'Admin', desc: 'Manage the system' }].map(r => (
                  <button
                    key={r.v}
                    type="button"
                    id={`reg-role-${r.v}`}
                    onClick={() => setForm({ ...form, role: r.v })}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      form.role === r.v
                        ? 'bg-cyan-500/15 border-cyan-500/60 '
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${form.role === r.v ? 'text-cyan-400' : 'text-white'}`}>{r.label}</p>
                    <p className="text-gray-500 text-xs">{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="reg-password">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-11 pr-11"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm */}
            <div>
              <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="reg-confirm">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="reg-confirm"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={form.confirmPassword}
                  onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                  className="input-field pl-11"
                />
              </div>
            </div>

            <button
              id="reg-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 w-full mt-2"
            >
              {loading ? (
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <><span>Create Account</span> <ArrowRight className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="text-center mt-5 text-sm text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
