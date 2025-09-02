import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X } from 'lucide-react'

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
                id: Date.now(),
                flag: event.detail.flag,
                timestamp: new Date(),
            }

            setFlags(prev => [...prev, flagData])

            // Auto-remove after 5 seconds
            setTimeout(() => {
                setFlags(prev => prev.filter(f => f.id !== flagData.id))
            }, 5000)
        }

        window.addEventListener('ctf-flag', handleFlagEvent)
        return () => window.removeEventListener('ctf-flag', handleFlagEvent)
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
                        className="bg-green-500 text-white px-6 py-4 rounded-lg shadow-lg max-w-sm"
                    >
                        <div className="flex items-start space-x-3">
                            <Flag className="h-6 w-6 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="font-bold text-lg">🎉 Bug Found!</h3>
                                <p className="text-sm opacity-90 break-all font-mono">
                                    {flagData.flag}
                                </p>
                                <p className="text-xs opacity-75 mt-1">
                                    {flagData.timestamp.toLocaleTimeString()}
                                </p>
                            </div>
                            <button
                                onClick={() => removeFlag(flagData.id)}
                                className="hover:bg-green-600 rounded-full p-1 transition-colors"
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
