/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedToken = localStorage.getItem('parkiq_token')
    const savedUser = localStorage.getItem('parkiq_user')
    if (savedToken && savedUser) {
      setToken(savedToken)
      setUser(JSON.parse(savedUser))
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    if (res.data.requiresTwoFactor) {
      return res.data
    }

    const { token: newToken, user: newUser } = res.data
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('parkiq_token', newToken)
    localStorage.setItem('parkiq_user', JSON.stringify(newUser))
    return newUser
  }, [])

  const verifyTwoFactor = useCallback(async (tempToken, code) => {
    const res = await authAPI.verifyTwoFactorLogin({ tempToken, code })
    const { token: newToken, user: newUser } = res.data
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('parkiq_token', newToken)
    localStorage.setItem('parkiq_user', JSON.stringify(newUser))
    return newUser
  }, [])

  const setupTwoFactor = useCallback(async () => authAPI.setupTwoFactor(), [])
  const verifyTwoFactorSetup = useCallback(async (code) => authAPI.verifyTwoFactorSetup({ code }), [])
  const disableTwoFactor = useCallback(async () => authAPI.disableTwoFactor(), [])

  const socialLogin = useCallback(async (data) => {
    const res = await authAPI.socialLogin(data)
    const { token: newToken, user: newUser } = res.data
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('parkiq_token', newToken)
    localStorage.setItem('parkiq_user', JSON.stringify(newUser))
    return newUser
  }, [])

  const completeOAuthLogin = useCallback(async (oauthToken) => {
    localStorage.setItem('parkiq_token', oauthToken)
    setToken(oauthToken)
    const res = await authAPI.getProfile()
    const newUser = res.data.user
    setUser(newUser)
    localStorage.setItem('parkiq_user', JSON.stringify(newUser))
    return newUser
  }, [])

  const register = useCallback(async (data) => {
    const res = await authAPI.register(data)
    const { token: newToken, user: newUser } = res.data
    setToken(newToken)
    setUser(newUser)
    localStorage.setItem('parkiq_token', newToken)
    localStorage.setItem('parkiq_user', JSON.stringify(newUser))
    return newUser
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('parkiq_token')
    localStorage.removeItem('parkiq_user')
  }, [])

  const refreshProfile = useCallback(async () => {
    try {
      const res = await authAPI.getProfile()
      setUser(res.data.user)
      localStorage.setItem('parkiq_user', JSON.stringify(res.data.user))
    } catch (err) {
      logout()
    }
  }, [logout])

  const isAdmin = user?.role === 'admin'
  const isAuthenticated = !!token && !!user

  return (
    <AuthContext.Provider value={{ user, token, loading, isAdmin, isAuthenticated, login, register, logout, refreshProfile, verifyTwoFactor, setupTwoFactor, verifyTwoFactorSetup, disableTwoFactor, socialLogin, completeOAuthLogin }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
