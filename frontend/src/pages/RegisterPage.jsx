import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { authAPI } from '../lib/api'

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState('')
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
        setError('')

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)

        try {
            const response = await authAPI.register({
                username: formData.username,
                email: formData.email,
                password: formData.password
            })
            
            // Check if registration returned a token (auto-login)
            if (response.data.token) {
                localStorage.setItem('token', response.data.token)
                navigate('/feed', {
                    state: { message: 'Account created successfully! Welcome to InstaCam.' }
                })
            } else {
                // Fallback to login page if no token
                navigate('/login', {
                    state: { message: 'Account created successfully! Please sign in.' }
                })
            }
        } catch (err) {
            console.error('Registration error:', err)
            setError(err.response?.data?.error || err.response?.data?.message || 'Registration failed')
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
                        Create your account
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            name="username"
                            type="text"
                            required
                            value={formData.username}
                            onChange={handleChange}
                            className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Username"
                        />
                        <input
                            name="email"
                            type="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Email address"
                        />
                        <input
                            name="password"
                            type="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Password"
                        />
                        <input
                            name="confirmPassword"
                            type="password"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Confirm password"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white btn-primary disabled:opacity-50"
                    >
                        {loading ? 'Creating account...' : 'Sign up'}
                    </button>

                    <div className="text-center">
                        <span className="text-sm text-gray-600">
                            Already have an account?{' '}
                            <Link to="/login" className="font-medium text-pink-600 hover:text-pink-500">
                                Sign in
                            </Link>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default RegisterPage
