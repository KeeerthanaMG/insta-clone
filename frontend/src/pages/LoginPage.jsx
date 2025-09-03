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

        try {
            const response = await authAPI.login(formData)

            // Check if this is a CTF vulnerability detection response
            if (response.data.vulnerability_detected) {
                // Dispatch CTF bug found event for the popup
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
                window.dispatchEvent(ctfEvent)
                return
            }

            // Normal login success flow
            if (response.data.token) {
                localStorage.setItem('token', response.data.token)
                onLogin()
                navigate('/feed')
            } else {
                throw new Error('No token received from server')
            }
        } catch (err) {
            console.error('Login error:', err)
            
            // Check if the error response contains CTF information
            if (err.response?.data?.vulnerability_detected) {
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
                setError('')
                setSuccess(err.response.data.ctf_message + ' ' + err.response.data.security_hint)
                setRateLimitingDetected(true)
                
                // Dispatch the rate limiting detection event for FlagPopup
                console.log('[DEBUG] Rate limiting bug detected, dispatching event:', err.response.data)
                
                if (err.response.data.dispatch_event && err.response.data.event_type === 'ctf-rate-limit-detected') {
                    const rateLimitEvent = new CustomEvent('ctf-rate-limit-detected', {
                        detail: err.response.data.event_data
                    })
                    console.log('[DEBUG] Dispatching rate limit event:', rateLimitEvent)
                    window.dispatchEvent(rateLimitEvent)
                } else {
                    // Fallback - dispatch event anyway with available data
                    const rateLimitEvent = new CustomEvent('ctf-rate-limit-detected', {
                        detail: {
                            bug_type: 'Rate Limiting Bypass',
                            description: 'Application lacks proper rate limiting on login attempts',
                            message: 'Rate limiting vulnerability detected! No protection against brute force attacks.',
                            instruction: 'Now login with correct credentials to claim your points!',
                            failed_attempts: err.response.data.failed_attempts_count || 10
                        }
                    })
                    console.log('[DEBUG] Dispatching fallback rate limit event:', rateLimitEvent)
                    window.dispatchEvent(rateLimitEvent)
                }
            } else {
                setError(err.response?.data?.error || err.response?.data?.message || 'Login failed')
            }
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
