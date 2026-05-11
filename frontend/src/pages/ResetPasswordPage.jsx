import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../services/api'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    token: searchParams.get('token') || '',
    newPassword: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validateForm = () => {
    const newErrors = {}
    if (!formData.token) newErrors.token = 'Reset token is missing'
    if (!formData.newPassword) newErrors.newPassword = 'Password is required'
    if (formData.newPassword.length < 6) newErrors.newPassword = 'Password must be at least 6 characters'
    if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setErrors(prev => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await api.post('/api/auth/reset-password', {
        token: formData.token,
        newPassword: formData.newPassword,
      })

      if (response.data.success) {
        toast.success('✅ Password reset successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      } else {
        toast.error('❌ ' + (response.data.message || 'Reset failed'))
      }
    } catch (err) {
      toast.error('❌ ' + (err.response?.data?.message || 'Reset failed'))
    } finally {
      setLoading(false)
    }
  }

  if (!formData.token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
          <h2 className="text-red-400 text-2xl font-bold mb-4">❌ Invalid Reset Link</h2>
          <p className="text-gray-300 mb-4">The password reset link is missing or invalid.</p>
          <a href="/login" className="text-cyan-400 hover:text-cyan-300">Back to login</a>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-cyan-400">🔐 Reset Password</h2>
          <p className="text-gray-400 text-sm mt-2">Enter your new password</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="At least 6 characters"
              className={`w-full px-4 py-3 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 ${
                errors.newPassword ? 'ring-red-500 focus:ring-red-500' : 'focus:ring-cyan-500'
              }`}
            />
            {errors.newPassword && <p className="text-red-400 text-sm mt-1">⚠️ {errors.newPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              className={`w-full px-4 py-3 rounded-lg bg-slate-700 text-white focus:outline-none focus:ring-2 ${
                errors.confirmPassword ? 'ring-red-500 focus:ring-red-500' : 'focus:ring-cyan-500'
              }`}
            />
            {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">⚠️ {errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-black font-bold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? '⏳ Resetting...' : '🔓 Reset Password'}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-4">
          Remember your password? <a href="/login" className="text-cyan-400 hover:text-cyan-300">Login here</a>
        </p>
      </div>
    </div>
  )
}
