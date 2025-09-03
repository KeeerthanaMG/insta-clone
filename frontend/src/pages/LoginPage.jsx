import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { authAPI } from '../lib/api'

const LoginPage = ({ onLogin }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [rateLimitingDetected, setRateLimitingDetected] = useState(false)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError('')
        setSuccess('')
        setRateLimitingDetected(false)

        console.log('[CTF FRONTEND] ========== LOGIN ATTEMPT ==========')
        console.log('[CTF FRONTEND] Username:', formData.username)
        console.log('[CTF FRONTEND] Starting login request...')

        try {
            const response = await authAPI.login(formData)

            console.log('[CTF FRONTEND] Login response received:', response.data)

            // Check if this is a CTF vulnerability detection response
            if (response.data.vulnerability_detected) {
                console.log('[CTF FRONTEND] 🎉 VULNERABILITY DETECTED IN SUCCESS RESPONSE!')
                console.log('[CTF FRONTEND] CTF Message:', response.data.ctf_message)
                console.log('[CTF FRONTEND] Points Awarded:', response.data.ctf_points_awarded)
                console.log('[CTF FRONTEND] Bug Type:', response.data.bug_type)

                // Dispatch appropriate CTF event based on bug type
                if (response.data.bug_type === 'Missing Rate Limiting') {
                    // Special handling for rate limiting bug
                    const loginCtfEvent = new CustomEvent('ctf-login-bug', {
                        detail: {
                            message: response.data.ctf_message,
                            flag: response.data.flag,
                            points_awarded: response.data.ctf_points_awarded,
                            total_points: response.data.ctf_total_points,
                            bug_type: response.data.bug_type,
                            description: response.data.description
                        }
                    })
                    console.log('[CTF FRONTEND] Dispatching ctf-login-bug event:', loginCtfEvent.detail)
                    window.dispatchEvent(loginCtfEvent)
                } else {
                    // General CTF bug found event
                    const ctfEvent = new CustomEvent('ctf-bug-found', {
                        detail: {
                            message: response.data.ctf_message,
                            flag: response.data.flag,
                            points: response.data.ctf_points_awarded,
                            totalPoints: response.data.ctf_total_points,
                            bugType: response.data.bug_type,
                            description: response.data.description
                        }
                    })
                    console.log('[CTF FRONTEND] Dispatching ctf-bug-found event:', ctfEvent.detail)
                    window.dispatchEvent(ctfEvent)
                }

                // Also handle login success
                localStorage.setItem('token', response.data.token)
                onLogin()
                navigate('/feed')
                return
            }

            // Normal login success flow
            if (response.data.token) {
                console.log('[CTF FRONTEND] Normal login success')
                localStorage.setItem('token', response.data.token)
                onLogin()
                navigate('/feed')
            } else {
                throw new Error('No token received from server')
            }
        } catch (err) {
            console.log('[CTF FRONTEND] ========== LOGIN ERROR ==========')
            console.error('[CTF FRONTEND] Login error:', err)
            console.error('[CTF FRONTEND] Error response status:', err.response?.status)
            console.error('[CTF FRONTEND] Error response data:', err.response?.data)

            // Check if the error response contains CTF information
            if (err.response?.data?.vulnerability_detected) {
                console.log('[CTF FRONTEND] 🎉 VULNERABILITY DETECTED IN ERROR RESPONSE!')
                const ctfEvent = new CustomEvent('ctf-bug-found', {
                    detail: {
                        message: err.response.data.ctf_message,
                        flag: err.response.data.flag,
                        points: err.response.data.ctf_points_awarded,
                        totalPoints: err.response.data.ctf_total_points,
                        bugType: err.response.data.bug_type,
                        description: err.response.data.description
                    }
                })
                window.dispatchEvent(ctfEvent)
                return
            }

            // Handle rate limiting bug detection message
            if (err.response?.data?.rate_limiting_bug_detected) {
                console.log('[CTF FRONTEND] 🚨 RATE LIMITING BUG DETECTED!')
                console.log('[CTF FRONTEND] Rate limiting response data:', err.response.data)
                console.log('[CTF FRONTEND] Failed attempts count:', err.response.data.failed_attempts_count)
                console.log('[CTF FRONTEND] Security hint:', err.response.data.security_hint)

                setError('')
                setSuccess(err.response.data.ctf_message + ' ' + err.response.data.security_hint)
                setRateLimitingDetected(true)

                // Dispatch the rate limiting detection event for FlagPopup
                const rateLimitEvent = new CustomEvent('ctf-rate-limit-detected', {
                    detail: {
                        bug_type: 'Rate Limiting Bypass',
                        description: 'Application lacks proper rate limiting on login attempts',
                        message: 'Rate limiting vulnerability detected! No protection against brute force attacks.',
                        instruction: 'Now login with correct credentials to claim your points!',
                        failed_attempts: err.response.data.failed_attempts_count || 10,
                        target_username: err.response.data.event_data?.target_username || formData.username
                    }
                })
                console.log('[CTF FRONTEND] Dispatching rate limit event:', rateLimitEvent.detail)
                window.dispatchEvent(rateLimitEvent)
            } else if (err.response?.status === 401 && err.response?.data?.failed_attempts !== undefined) {
                // Check if we're approaching the rate limit threshold
                const attempts = err.response.data.failed_attempts
                const remaining = err.response.data.attempts_remaining || 0

                console.log('[CTF FRONTEND] Failed login attempt tracked:')
                console.log('[CTF FRONTEND] - Failed attempts:', attempts)
                console.log('[CTF FRONTEND] - Remaining attempts:', remaining)
                console.log('[CTF FRONTEND] - Message:', err.response.data.message)

                if (remaining <= 0) {
                    // This should be the rate limiting detection, but backend might not be flagging it correctly
                    console.log('[CTF FRONTEND] ⚠️ Rate limiting threshold reached but not detected!')
                    setError(`Rate limiting should have been triggered! Failed attempts: ${attempts}`)
                } else {
                    setError(`Invalid credentials. Failed attempts: ${attempts}, remaining: ${remaining}`)
                }
            } else {
                console.log('[CTF FRONTEND] Generic login error')
                setError(err.response?.data?.error || err.response?.data?.message || 'Login failed')
            }

            console.log('[CTF FRONTEND] ================================')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center">
                        <Camera className="h-16 w-16 text-pink-500" />
                    </div>
                    <h2 className="mt-4 text-4xl font-bold text-gradient">InstaCam</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Sign in to your account
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
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

                    <div className="space-y-4">
                        <div>
                            <label htmlFor="username" className="sr-only">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                placeholder="Username"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                placeholder="Password"
                            />
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white btn-primary disabled:opacity-50"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>

                    <div className="text-center">
                        <span className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-medium text-pink-600 hover:text-pink-500">
                                Sign up
                            </Link>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default LoginPage
