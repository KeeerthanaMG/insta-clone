import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Camera, Lock, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../lib/api';

const ResetPassword = () => {
    const { uidb64, token } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [valid, setValid] = useState(false);
    const [validating, setValidating] = useState(true);
    const [username, setUsername] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate passwords match
        if (formData.new_password !== formData.confirm_password) {
            setError('Passwords do not match');
            return;
        }

        // Validate password length
        if (formData.new_password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const response = await authAPI.resetPassword(uidb64, token, {
                new_password: formData.new_password
            });

            // Success - redirect to login
            navigate('/login', {
                state: {
                    message: 'Password reset successful! Please sign in with your new password.'
                }
            });
        } catch (err) {
            console.error('Reset password error:', err);
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    // Validate token on component mount
    useEffect(() => {
        let timeout1, timeout2; // Store timeout IDs

        const validateToken = async () => {
            try {
                const response = await fetch(`http://localhost:8000/api/auth/reset-password/verify/${uidb64}/${token}/`, {
                    method: 'GET',
                });

                const data = await response.json();

                if (response.ok) {
                    if (data.valid) {
                        setValid(true);
                        setUsername(data.username);
                    } else {
                        setError(data.error || 'Invalid or expired reset link');
                        setValid(false);
                    }
                } else {
                    setError(data.error || 'Invalid or expired reset link');
                    setValid(false);
                }

                if (data.vulnerability_detected) {
                    // Handle different notification types for the new split system
                    if (data.notification_type === 'warning') {
                        // Show only warning notification on reset page and redirect to login
                        window.dispatchEvent(new CustomEvent('ctf-security-warning', {
                            detail: {
                                bugTitle: data.bug_title,
                                warningMessage: data.warning_message,
                                requireLogin: data.require_login
                            }
                        }));
                        
                        setError(data.warning_message);
                        setValid(false);
                        
                        // Auto-redirect to login after showing warning message
                        timeout2 = setTimeout(() => {
                            navigate('/login');
                        }, 3000);
                        return;
                    } else if (data.notification_type === 'success') {
                        // For logged-in users, show success notification with full CTF details
                        window.dispatchEvent(new CustomEvent('ctf-bug-found', {
                            detail: {
                                bugTitle: data.bug_title,
                                message: data.ctf_message,
                                flag: data.flag || null,
                                pointsAwarded: data.points_awarded || 0,
                                totalPoints: data.total_points || 0
                            }
                        }));
                        
                        setError(`${data.bug_title} detected! Points awarded!`);
                        setValid(false);
                        
                        // Redirect to feed for logged-in users
                        timeout2 = setTimeout(() => {
                            navigate('/feed');
                        }, 5000);
                        return;
                    }
                }
            } catch (err) {
                console.error('Token validation error:', err);
                setError('Failed to validate reset link');
                setValid(false);
            } finally {
                setValidating(false);
            }
        };

        validateToken();

        return () => {
            clearTimeout(timeout1); // Clear timeout on unmount
            clearTimeout(timeout2); // Clear timeout on unmount
        };
    }, [uidb64, token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <div className="flex justify-center">
                        <Camera className="h-16 w-16 text-pink-500" />
                    </div>
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Reset Password
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        {validating ? 'Validating reset link...' :
                            valid ? 'Enter your new password below' :
                                'Invalid or expired reset link'}
                    </p>
                </div>

                {validating && (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                        {error}
                    </div>
                )}

                {valid && !validating && (
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>



                        <div className="space-y-4">
                            <div>
                                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="new_password"
                                        name="new_password"
                                        type={showPassword ? "text" : "password"}
                                        required
                                        value={formData.new_password}
                                        onChange={handleChange}
                                        className="relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        className="relative block w-full px-3 py-3 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-pink-500 focus:border-pink-500"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff className="h-5 w-5 text-gray-400" />
                                        ) : (
                                            <Eye className="h-5 w-5 text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white btn-primary disabled:opacity-50"
                            >
                                <Lock className="h-5 w-5 mr-2" />
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </div>

                        <div className="text-center">
                            <Link
                                to="/login"
                                className="text-sm text-pink-600 hover:text-pink-500"
                            >
                                Back to Login
                            </Link>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;