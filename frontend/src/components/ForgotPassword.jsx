import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Camera, Mail, ArrowLeft } from 'lucide-react'
import { authAPI } from '../lib/api'

const ForgotPassword = () => {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setMessage('')
        setLoading(true)

        try {
            const response = await authAPI.forgotPassword({ email })
            setMessage(response.data.message)
            setEmail('') // Clear the email field on success
        } catch (err) {
            console.error('Forgot password error:', err)
            setError(err.response?.data?.error || 'Failed to send reset link')
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
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Forgot Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter your email address to receive a password reset link
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg">
                            <div className="flex items-center">
                                <Mail className="h-5 w-5 mr-2" />
                                {message}
                            </div>
                            <p className="text-sm mt-2">
                                Check the console log for the reset link (in development mode).
                            </p>
                        </div>
                    )}

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Enter your email address"
                        />
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white btn-primary disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </div>

                    <div className="text-center space-y-2">
                        <Link
                            to="/login"
                            className="inline-flex items-center text-sm text-pink-600 hover:text-pink-500"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1" />
                            Back to Login
                        </Link>
                        <div className="text-sm text-gray-600">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-pink-600 hover:text-pink-500">
                                Sign up
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ForgotPassword
