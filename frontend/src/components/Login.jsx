import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Eye, EyeOff } from 'lucide-react'
import { getCSRFToken } from '../utils/csrf'

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [rateLimitingDetected, setRateLimitingDetected] = useState(false)
    const [success, setSuccess] = useState('')
    const navigate = useNavigate()

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!username.trim() || !password.trim()) {
            setError('Please fill in all fields')
            return
        }

        setLoading(true)
        setError('')
        setSuccess('')

        try {
            const response = await fetch('http://localhost:8000/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken(),
                },
                credentials: 'include',
                body: JSON.stringify({ username: username.trim(), password: password.trim() }),
            })

            const data = await response.json()

            if (response.ok) {
                // Check if this is a successful login with CTF bug discovery
                if (data.vulnerability_detected && data.ctf_points_awarded !== undefined) {
                    // Dispatch CTF login event for FlagPopup
                    const ctfEvent = new CustomEvent('ctf-login-bug', {
                        detail: {
                            ctf_message: data.ctf_message,
                            ctf_points_awarded: data.ctf_points_awarded,
                            ctf_total_points: data.ctf_total_points,
                            flag: data.flag,
                            bug_type: data.bug_type,
                            description: data.description
                        }
                    })
                    window.dispatchEvent(ctfEvent)
                }

                // Store auth data
                localStorage.setItem('token', data.token)
                localStorage.setItem('user', JSON.stringify({
                    id: data.user_id,
                    username: data.username,
                    email: data.email
                }))

                onLogin(data)
                navigate('/')
            } else {
                // Handle error responses
                if (data.rate_limiting_bug_detected) {
                    setError('')
                    setSuccess(data.ctf_message + ' ' + data.security_hint)
                    setRateLimitingDetected(true)

                    // Dispatch the rate limiting detection event
                    console.log('[DEBUG] Backend detected rate limiting bug, dispatching frontend event')

                    const rateLimitEvent = new CustomEvent('ctf-rate-limit-detected', {
                        detail: {
                            bug_type: 'Rate Limiting Bypass',
                            description: 'Application lacks proper rate limiting on login attempts',
                            message: 'Rate limiting vulnerability detected! No protection against brute force attacks.',
                            instruction: 'Now login with correct credentials to claim your points!',
                            failed_attempts: data.failed_attempts_count || 10,
                            target_username: username
                        }
                    })
                    console.log('[DEBUG] Dispatching rate limit event:', rateLimitEvent)
                    window.dispatchEvent(rateLimitEvent)
                } else {
                    // Normal error handling
                    setError(data.error || data.message || 'Login failed')
                }
            }
        } catch (error) {
            console.error('Login error:', error)
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
            <div className="bg-white/80 backdrop-blur-lg p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl shadow-lg">
                            <Camera className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        InstaCam
                    </h1>
                    <p className="text-gray-600 mt-2">Welcome back!</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl backdrop-blur-sm">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl backdrop-blur-sm">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="w-5 h-5 text-green-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm font-medium">{success}</p>
                                {rateLimitingDetected && (
                                    <p className="mt-2 text-sm">
                                        Now login with your correct credentials to claim the CTF points!
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="username">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full p-4 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50/50 backdrop-blur-sm transition-all duration-200 text-gray-900 placeholder-gray-500"
                            placeholder="Enter your username"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2" htmlFor="password">
                            Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="w-full p-4 pr-12 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50/50 backdrop-blur-sm transition-all duration-200 text-gray-900 placeholder-gray-500"
                                placeholder="Enter your password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] disabled:opacity-50 disabled:transform-none disabled:hover:shadow-none"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center space-x-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Signing in...</span>
                            </div>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center space-y-4">
                    <p className="text-sm text-gray-600">
                        <a href="/forgot-password" className="text-pink-600 hover:text-pink-700 font-semibold transition-colors">
                            Forgot your password?
                        </a>
                    </p>
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-white text-gray-500">or</span>
                        </div>
                    </div>
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a href="/register" className="text-pink-600 hover:text-pink-700 font-semibold transition-colors">
                            Sign up now
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login