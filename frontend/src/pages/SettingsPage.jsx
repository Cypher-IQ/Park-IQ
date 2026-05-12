import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { User, Lock, Save, ShieldCheck, Eye, EyeOff, Mail, Phone, Car } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user, refreshProfile, setupTwoFactor, verifyTwoFactorSetup, disableTwoFactor } = useAuth()
  const [profile, setProfile] = useState({ name: '', phone: '', vehicleNumber: '' })
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [changingPass, setChangingPass] = useState(false)
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [securityLoading, setSecurityLoading] = useState(false)
  const [show2FAInput, setShow2FAInput] = useState(false)

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        phone: user.phone || '',
        vehicleNumber: user.vehicleNumber || '',
      })
    }
  }, [user])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authAPI.updateProfile({
        name: profile.name,
        phone: profile.phone,
        vehicleNumber: profile.vehicleNumber,
      })
      await refreshProfile()
      toast.success('Profile updated!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (password.newPassword !== password.confirmPassword) {
      return toast.error('Passwords do not match')
    }
    if (password.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters')
    }
    setChangingPass(true)
    try {
      await authAPI.changePassword({
        currentPassword: password.currentPassword,
        newPassword: password.newPassword,
      })
      toast.success('Password changed! Please sign in again.')
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password')
    } finally {
      setChangingPass(false)
    }
  }

  const handleEnable2FA = async () => {
    setSecurityLoading(true)
    try {
      await setupTwoFactor()
      toast.success('Verification code sent to your email')
      setShow2FAInput(true)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to setup 2FA')
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    if (!twoFactorCode) return toast.error('Enter the verification code')
    setSecurityLoading(true)
    try {
      await verifyTwoFactorSetup(twoFactorCode)
      toast.success('Two-factor authentication enabled!')
      setShow2FAInput(false)
      setTwoFactorCode('')
      await refreshProfile()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid code')
    } finally {
      setSecurityLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setSecurityLoading(true)
    try {
      await disableTwoFactor()
      toast.success('Two-factor authentication disabled')
      await refreshProfile()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA')
    } finally {
      setSecurityLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-8">
        <h1 className="section-heading text-3xl">Account <span className="gradient-text">Settings</span></h1>
        <p className="text-gray-400">Manage your profile, password, and security.</p>
      </div>

      {/* Profile Section */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-cyan-500/15 flex items-center justify-center">
            <User className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Profile</h2>
            <p className="text-gray-500 text-sm">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input className="input-field pl-11 opacity-60" value={user?.email || ''} disabled />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Name</label>
            <input className="input-field" value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Phone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input className="input-field pl-11" value={profile.phone} onChange={e => setProfile({ ...profile, phone: e.target.value })} placeholder="+1 (555) 123-4567" />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Vehicle Number</label>
            <div className="relative">
              <Car className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input className="input-field pl-11" value={profile.vehicleNumber} onChange={e => setProfile({ ...profile, vehicleNumber: e.target.value })} placeholder="ABC-1234" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2">
            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Password Section */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center">
            <Lock className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Change Password</h2>
            <p className="text-gray-500 text-sm">You will be signed out after changing your password</p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Current Password</label>
            <input className="input-field" type={showPass ? 'text' : 'password'} value={password.currentPassword} onChange={e => setPassword({ ...password, currentPassword: e.target.value })} required />
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">New Password</label>
            <input className="input-field" type={showPass ? 'text' : 'password'} value={password.newPassword} onChange={e => setPassword({ ...password, newPassword: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="text-sm text-gray-300 font-medium mb-2 block">Confirm New Password</label>
            <input className="input-field" type={showPass ? 'text' : 'password'} value={password.confirmPassword} onChange={e => setPassword({ ...password, confirmPassword: e.target.value })} required />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={changingPass} className="btn-primary flex items-center justify-center gap-2">
              {changingPass ? 'Changing...' : <><Lock className="w-4 h-4" /> Update Password</>}
            </button>
            <button type="button" onClick={() => setShowPass(!showPass)} className="btn-secondary flex items-center gap-2 text-sm">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {showPass ? 'Hide' : 'Show'} Passwords
            </button>
          </div>
        </form>
      </div>

      {/* 2FA Section */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-white font-semibold">Two-Factor Authentication</h2>
            <p className="text-gray-500 text-sm">Add an extra layer of security to your account</p>
          </div>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          2FA is currently <strong className={user?.twoFactorEnabled ? 'text-emerald-400' : 'text-gray-400'}>{user?.twoFactorEnabled ? 'enabled' : 'disabled'}</strong>.
        </p>

        {show2FAInput && (
          <div className="flex items-center gap-3 mb-4">
            <input className="input-field max-w-[200px] text-center tracking-[0.3em]" maxLength={6} placeholder="000000" value={twoFactorCode} onChange={e => setTwoFactorCode(e.target.value)} />
            <button onClick={handleVerify2FA} disabled={securityLoading} className="btn-primary text-sm">Verify</button>
          </div>
        )}

        <div className="flex gap-3">
          {user?.twoFactorEnabled ? (
            <button onClick={handleDisable2FA} disabled={securityLoading} className="btn-secondary text-sm">Disable 2FA</button>
          ) : (
            <button onClick={handleEnable2FA} disabled={securityLoading} className="btn-primary text-sm">Enable 2FA</button>
          )}
        </div>
      </div>
    </div>
  )
}
