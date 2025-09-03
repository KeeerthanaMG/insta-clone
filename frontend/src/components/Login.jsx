import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCSRFToken } from '../utils/csrf'

const Login = ({ onLogin }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
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
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">InstaCam Login</h2>

                {error && (
                    <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Success message for CTF flag discovery */}
                {success && (
                    <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            {success}
                        </div>
                        {rateLimitingDetected && (
                            <p className="mt-2 text-sm">
                                Now login with your correct credentials to claim the CTF points!
                            </p>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="username">
                            Username
                        </label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold transition-all duration-200 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-4 text-center space-y-2">
                    <p className="text-sm text-gray-600">
                        <a href="/forgot-password" className="text-blue-600 hover:underline">
                            Forgot your password?
                        </a>
                    </p>
                    <p className="text-sm text-gray-600">
                        Don't have an account?{' '}
                        <a href="/register" className="text-blue-600 hover:underline">
                            Register here
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}

export default Login