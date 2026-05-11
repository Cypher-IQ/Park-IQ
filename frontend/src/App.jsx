import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CarAnimationProvider } from './context/AnimationContext'
import Layout from './components/Layout/Layout'
import ErrorBoundary from './components/ErrorBoundary'

import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import SocialLoginPage from './pages/SocialLoginPage'
import SupportPage from './pages/SupportPage'
import DashboardPage from './pages/DashboardPage'
import BookingPage from './pages/BookingPage'
import EntryExitPage from './pages/EntryExitPage'
import AdminPage from './pages/AdminPage'

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <svg className="animate-spin w-10 h-10 text-cyan-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function GuestRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  if (loading) return null
  if (isAuthenticated) return <Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />
  return children
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
          <Route path="/reset-password" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />
          <Route path="/social-login" element={<GuestRoute><SocialLoginPage /></GuestRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/booking" element={<ProtectedRoute><BookingPage /></ProtectedRoute>} />
          <Route path="/entry-exit" element={<ProtectedRoute><EntryExitPage /></ProtectedRoute>} />
          <Route path="/support" element={<ProtectedRoute><SupportPage /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <CarAnimationProvider>
        <AuthProvider>
          <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#111D35',
              color: '#F3F4F6',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10B981', secondary: '#111D35' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#111D35' } },
          }}
        />
        </AuthProvider>
      </CarAnimationProvider>
    </ErrorBoundary>
  )
}
