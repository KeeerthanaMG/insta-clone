import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X } from 'lucide-react'

// Add unique ID generator
let idCounter = 0
const generateUniqueId = () => `flag_${Date.now()}_${++idCounter}`

const FlagPopup = ({ flag, bugName, points, message, onClose }) => {
    const [flags, setFlags] = useState([])

    console.log('[DEBUG] FlagPopup props:', { flag, bugName, points, message })

    // If props are provided, show single popup (for manual CTF flags)
    if (flag) {
        console.log('[DEBUG] Showing manual flag popup')
        return (
            <div className="fixed top-4 right-4 z-50">
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, x: 300, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 300, scale: 0.8 }}
                        className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm"
                    >
                        <div className="flex items-start space-x-3">
                            <Flag className="h-6 w-6 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">🎉 Bug Found!</h3>
                                <p className="font-semibold text-sm">{bugName}</p>
                                <p className="text-xs opacity-90 break-all font-mono mt-1">{flag}</p>
                                <p className="text-xs opacity-75 mt-1">Points awarded: +{points}</p>
                                <p className="text-xs opacity-75">{message}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="hover:bg-green-600 rounded-full p-1 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        )
    }

    useEffect(() => {
        const handleFlagEvent = (event) => {
            const flagData = {
                id: generateUniqueId(),
                flag: event.detail.flag,
                timestamp: new Date(),
            }

            setFlags(prev => [...prev, flagData])

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setFlags(prev => prev.filter(f => f.id !== flagData.id))
            }, 5000)
        }

        const handleBugFoundEvent = (event) => {
            const bugData = {
                id: generateUniqueId(),
                message: event.detail.message,
                points_awarded: event.detail.points_awarded,
                total_points: event.detail.total_points,
                flag: event.detail.flag,
                timestamp: new Date(),
                type: 'bug'
            }

            setFlags(prev => [...prev, bugData])

            // Auto-remove after 7 seconds (bit longer for bug messages)
            setTimeout(() => {
                setFlags(prev => prev.filter(f => f.id !== bugData.id))
            }, 7000)
        }

        // Handle CTF responses from login with better event handling
        const handleLoginCTFEvent = (event) => {
            console.log('[DEBUG] Login CTF event received:', event.detail)
            
            const ctfData = {
                id: generateUniqueId(),
                message: event.detail.ctf_message,
                points_awarded: event.detail.ctf_points_awarded || 0,
                total_points: event.detail.ctf_total_points || 0,
                flag: event.detail.flag,
                bug_type: event.detail.bug_type || 'Security Vulnerability',
                description: event.detail.description,
                timestamp: new Date(),
                type: 'login_ctf'
            }

            console.log('[DEBUG] Adding CTF data to flags:', ctfData)
            setFlags(prev => [...prev, ctfData])

            // Auto-remove after 10 seconds (longer for login CTF messages)
            setTimeout(() => {
                setFlags(prev => prev.filter(f => f.id !== ctfData.id))
            }, 10000)
        }

        // Handle rate limiting detection event
        const handleRateLimitDetected = (event) => {
            console.log('[DEBUG] Rate limit detection event received:', event.detail)
            
            const rateLimitData = {
                id: generateUniqueId(),
                message: "Rate limiting vulnerability detected! No protection against brute force attacks.",
                instruction: "Now login with correct credentials to claim your points!",
                bug_type: "Rate Limiting Bypass",
                description: "Application lacks proper rate limiting on login attempts",
                timestamp: new Date(),
                type: 'rate_limit_detected',
                persistent: true // This type doesn't auto-remove
            }

            console.log('[DEBUG] Adding rate limit detection to flags:', rateLimitData)
            setFlags(prev => [...prev, rateLimitData])
        }

        window.addEventListener('ctf-flag', handleFlagEvent)
        window.addEventListener('ctf-bug-found', handleBugFoundEvent)
        window.addEventListener('ctf-login-bug', handleLoginCTFEvent)
        window.addEventListener('ctf-rate-limit-detected', handleRateLimitDetected)
        
        return () => {
            window.removeEventListener('ctf-flag', handleFlagEvent)
            window.removeEventListener('ctf-bug-found', handleBugFoundEvent)
            window.removeEventListener('ctf-login-bug', handleLoginCTFEvent)
            window.removeEventListener('ctf-rate-limit-detected', handleRateLimitDetected)
        }
    }, [])

    const removeFlag = (id) => {
        setFlags(prev => prev.filter(f => f.id !== id))
    }

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            <AnimatePresence>
                {flags.map((flagData) => (
                    <motion.div
                        key={flagData.id}
                        initial={{ opacity: 0, x: 300, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 300, scale: 0.8 }}
                        className={`text-white px-6 py-4 rounded-lg shadow-lg max-w-sm ${
                            flagData.type === 'bug' 
                                ? (flagData.points_awarded > 0 ? 'bg-red-500' : 'bg-orange-500')
                                : flagData.type === 'login_ctf'
                                ? (flagData.points_awarded > 0 ? 'bg-purple-500' : 'bg-gray-500')
                                : flagData.type === 'rate_limit_detected'
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                        }`}
                    >
                        <div className="flex items-start space-x-3">
                            <Flag className="h-6 w-6 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                {flagData.type === 'rate_limit_detected' ? (
                                    <>
                                        <h3 className="font-bold text-lg">🔍 Vulnerability Detected!</h3>
                                        <p className="text-sm font-medium mb-1">{flagData.bug_type}</p>
                                        <p className="text-xs opacity-90 mb-2">{flagData.description}</p>
                                        <p className="text-xs opacity-90 mb-2 font-semibold">{flagData.message}</p>
                                        <p className="text-xs bg-black bg-opacity-20 p-2 rounded font-medium">
                                            💡 {flagData.instruction}
                                        </p>
                                    </>
                                ) : flagData.type === 'login_ctf' ? (
                                    <>
                                        <h3 className="font-bold text-lg">
                                            {flagData.points_awarded > 0 ? '🔓 Security Bug Exploited!' : '⚠️ Bug Already Found'}
                                        </h3>
                                        <p className="text-sm font-medium mb-1">{flagData.bug_type}</p>
                                        <p className="text-xs opacity-90 mb-1">{flagData.description}</p>
                                        <p className="text-xs opacity-90 mb-1">{flagData.message}</p>
                                        {flagData.points_awarded > 0 ? (
                                            <p className="text-xs opacity-90 mb-1 font-bold">
                                                🎉 Points Earned: +{flagData.points_awarded} (Total: {flagData.total_points})
                                            </p>
                                        ) : (
                                            <p className="text-xs opacity-90 mb-1">
                                                No additional points (Total: {flagData.total_points})
                                            </p>
                                        )}
                                        {flagData.flag && (
                                            <p className="text-xs opacity-75 break-all font-mono mt-1 bg-black bg-opacity-20 p-1 rounded">
                                                Flag: {flagData.flag}
                                            </p>
                                        )}
                                    </>
                                ) : flagData.type === 'bug' ? (
                                    <>
                                        <h3 className="font-bold text-lg">
                                            {flagData.points_awarded > 0 ? '🚨 Security Bug Found!' : '⚠️ Bug Already Found'}
                                        </h3>
                                        <p className="text-sm font-medium mb-1">{flagData.message}</p>
                                        {flagData.points_awarded > 0 ? (
                                            <p className="text-xs opacity-90 mb-1">
                                                Points: +{flagData.points_awarded} (Total: {flagData.total_points})
                                            </p>
                                        ) : (
                                            <p className="text-xs opacity-90 mb-1">
                                                No additional points (Total: {flagData.total_points})
                                            </p>
                                        )}
                                        {flagData.flag && (
                                            <p className="text-xs opacity-75 break-all font-mono mt-1">
                                                {flagData.flag}
                                            </p>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <h3 className="font-bold text-lg">🎉 Bug Found!</h3>
                                        <p className="text-sm opacity-90 break-all font-mono">
                                            {flagData.flag}
                                        </p>
                                    </>
                                )}
                                <p className="text-xs opacity-75 mt-1">
                                    {flagData.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                            <button
                                onClick={() => removeFlag(flagData.id)}
                                className={`rounded-full p-1 transition-colors ${
                                    flagData.type === 'rate_limit_detected'
                                        ? 'hover:bg-yellow-600'
                                        : flagData.type === 'login_ctf'
                                        ? (flagData.points_awarded > 0 ? 'hover:bg-purple-600' : 'hover:bg-gray-600')
                                        : flagData.type === 'bug' 
                                        ? (flagData.points_awarded > 0 ? 'hover:bg-red-600' : 'hover:bg-orange-600')
                                        : 'hover:bg-green-600'
                                }`}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}

export default FlagPopup
