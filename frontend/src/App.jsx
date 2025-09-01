import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import FeedPage from './pages/FeedPage'
import ExplorePage from './pages/ExplorePage'
import CreatePostPage from './pages/CreatePostPage'
import MessagesPage from './pages/MessagesPage'
import NotificationsPage from './pages/NotificationsPage'
import ProfilePage from './pages/ProfilePage'
import UserProfilePage from './pages/UserProfilePage'
import FlagPopup from './components/FlagPopup'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    setIsAuthenticated(!!token)
    setLoading(false)
  }, [])

  const PublicRoute = ({ children }) => {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
        </div>
      )
    }

    return !isAuthenticated ? children : <Navigate to="/feed" replace />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  return (
    <>
      <FlagPopup />
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage onLogin={() => setIsAuthenticated(true)} />
          </PublicRoute>
        } />

        <Route path="/register" element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        } />

        <Route path="/*" element={
          <ProtectedRoute>
            <MainLayout onLogout={() => setIsAuthenticated(false)}>
              <Routes>
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/create" element={<CreatePostPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/:username" element={<UserProfilePage />} />
                <Route path="/" element={<Navigate to="/feed" replace />} />
              </Routes>
            </MainLayout>
          </ProtectedRoute>
        } />
      </Routes>
    </>
  )
}

export default App
