import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCarAnimation } from '../context/AnimationContext'
import { Car, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Globe, Users, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [twoFactor, setTwoFactor] = useState({ enabled: false, tempToken: '', code: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { login, verifyTwoFactor } = useAuth()
  const { triggerCarAnimation } = useCarAnimation()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(form.email, form.password)
      if (user?.requiresTwoFactor) {
        setTwoFactor({ enabled: true, tempToken: user.tempToken, code: '' })
        toast.success(user.message || 'Two-factor code sent')
        return
      }
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      triggerCarAnimation('Vroom...', 1500)
      setTimeout(() => {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard')
      }, 1500)
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyTwoFactor = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await verifyTwoFactor(twoFactor.tempToken, twoFactor.code)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      triggerCarAnimation('Vroom...', 1500)
      setTimeout(() => {
        navigate(user.role === 'admin' ? '/admin' : '/dashboard')
      }, 1500)
    } catch (err) {
      const msg = err.response?.data?.message || '2FA verification failed.'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20 relative">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-cyan-500/30">
            <Car className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Welcome Back</h1>
          <p className="text-gray-400">Sign in to your ParkIQ account</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 glow-cyan">
          {error && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {!twoFactor.enabled ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="login-email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className="input-field pl-11"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="login-password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="login-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-2 w-full mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In…
                </span>
              ) : (
                <span className="flex items-center gap-2">Sign In <ArrowRight className="w-5 h-5" /></span>
              )}
            </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyTwoFactor} className="flex flex-col gap-5">
              <div className="flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <p className="text-sm text-cyan-100">Enter the 6-digit code sent to your email.</p>
              </div>
              <div>
                <label className="text-sm text-gray-300 font-medium mb-2 block" htmlFor="two-factor-code">
                  Verification Code
                </label>
                <input
                  id="two-factor-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={twoFactor.code}
                  onChange={e => setTwoFactor({ ...twoFactor, code: e.target.value })}
                  className="input-field tracking-[0.4em] text-center text-lg"
                />
              </div>
              <button id="two-factor-submit-btn" type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading ? 'Verifying…' : 'Verify & Sign In'}
              </button>
            </form>
          )}

          <div className="text-center mt-6 text-sm text-gray-400">
            <div className="mb-3">
              Don't have an account?{' '}
              <Link to="/register" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                Create one free
              </Link>
            </div>
            <div>
              Forgot your password?{' '}
              <Link to="/forgot-password" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                Reset it here
              </Link>
            </div>
            <div className="mt-2">
              Or use{' '}
              <Link to="/social-login" className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors">
                social login
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <button
              type="button"
              onClick={() => {
                const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
                window.location.href = `${base}/api/auth/oauth/google/start`
              }}
              className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
            >
              <Globe className="w-4 h-4" /> Google
            </button>
            <button
              type="button"
              onClick={() => {
                const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
                window.location.href = `${base}/api/auth/oauth/facebook/start`
              }}
              className="btn-secondary inline-flex items-center justify-center gap-2 text-sm"
            >
              <Users className="w-4 h-4" /> Facebook
            </button>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-5 glass-card p-4">
          <p className="text-xs text-gray-500 text-center mb-3 font-medium uppercase tracking-wide">Demo Credentials</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-cyan-400 font-semibold mb-1">User</p>
              <p className="text-gray-400">user@demo.com</p>
              <p className="text-gray-400">demo1234</p>
            </div>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-violet-400 font-semibold mb-1">Admin</p>
              <p className="text-gray-400">admin@demo.com</p>
              <p className="text-gray-400">admin1234</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
