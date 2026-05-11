import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }

    setLoading(true)
    try {
      const response = await api.post('/api/auth/forgot-password', { email })
      if (response.data.success) {
        setSubmitted(true)
        toast.success('✅ Check your email for reset instructions')
      }
    } catch (err) {
      setError('Failed to send reset email. Please try again.')
      toast.error('❌ Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
          <h2 className="text-green-400 text-2xl font-bold mb-4">✅ Email Sent!</h2>
          <p className="text-gray-300 mb-4">
            Check your email for a password reset link. The link expires in 1 hour.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-2 rounded-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-cyan-400">🔑 Forgot Password</h2>
          <p className="text-gray-400 text-sm mt-2">We'll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError('')
              }}
              placeholder="your@email.com"
              className={`w-full px-4 py-3 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 ${
                error ? 'ring-red-500 focus:ring-red-500' : 'focus:ring-cyan-500'
              }`}
            />
            {error && <p className="text-red-400 text-sm mt-1">⚠️ {error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? '⏳ Sending...' : '📧 Send Reset Link'}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-4">
          Remember your password? <a href="/login" className="text-cyan-400 hover:text-cyan-300">Login here</a>
        </p>
      </div>
    </div>
  )
}
