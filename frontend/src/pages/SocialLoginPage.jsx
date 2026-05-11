import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Globe, Users, ShieldCheck, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SocialLoginPage() {
  const [searchParams] = useSearchParams()
  const defaultProvider = searchParams.get('provider') || 'google'
  const oauthToken = searchParams.get('token')
  const oauthError = searchParams.get('error')
  const [provider, setProvider] = useState(defaultProvider)
  const [form, setForm] = useState({ email: '', name: '', providerId: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { completeOAuthLogin, socialLogin } = useAuth()

  const providerMeta = {
    google: { label: 'Google', icon: Globe },
    facebook: { label: 'Facebook', icon: Users },
  }

  // Handle OAuth callback redirect (token from backend)
  useEffect(() => {
    if (oauthToken) {
      setLoading(true)
      completeOAuthLogin(oauthToken)
        .then((user) => {
          toast.success(`Signed in with ${searchParams.get('provider') || 'social login'}`)
          navigate(user.role === 'admin' ? '/admin' : '/dashboard')
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || 'OAuth login failed')
          setLoading(false)
        })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle OAuth error from backend
  useEffect(() => {
    if (oauthError) {
      toast.error(decodeURIComponent(oauthError))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const user = await socialLogin({
        provider,
        email: form.email,
        name: form.name,
        providerId: form.providerId || `${provider}-${form.email}`,
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(form.name || form.email)}`,
      })
      toast.success(`Signed in with ${providerMeta[provider].label}`)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Social sign in failed')
    } finally {
      setLoading(false)
    }
  }

  // Show loading spinner while processing OAuth callback
  if (oauthToken || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-20">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 text-cyan-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">Completing sign in…</p>
        </div>
      </div>
    )
  }

  const ProviderIcon = providerMeta[provider].icon

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md glass-card p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">Social Login</h1>
          <p className="text-gray-400 text-sm">Use a social identity to access ParkIQ.</p>
        </div>

        <div className="flex gap-2 mb-5">
          {['google', 'facebook'].map(p => {
            const Icon = providerMeta[p].icon
            return (
              <button
                key={p}
                type="button"
                onClick={() => setProvider(p)}
                className={`flex-1 btn-secondary inline-flex items-center justify-center gap-2 ${provider === p ? 'border-cyan-500/40 text-cyan-300' : ''}`}
              >
                <Icon className="w-4 h-4" /> {providerMeta[p].label}
              </button>
            )
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="input-field"
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input-field"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Provider user id"
            value={form.providerId}
            onChange={(e) => setForm({ ...form, providerId: e.target.value })}
          />
          <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2">
            <ProviderIcon className="w-4 h-4" /> Continue with {providerMeta[provider].label}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
