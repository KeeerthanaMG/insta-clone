import React from 'react'

const Avatar = ({ src, alt, size = 'md', className = '' }) => {
    const sizes = {
        sm: 'h-8 w-8',
        md: 'h-10 w-10',
        lg: 'h-16 w-16',
        xl: 'h-24 w-24'
    }

    const getInitials = (name) => {
        return name?.charAt(0)?.toUpperCase() || '?'
    }

    return (
        <div className={`${sizes[size]} rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center ${className}`}>
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                />
            ) : (
                <span className="text-white font-semibold text-sm">
                    {getInitials(alt)}
                </span>
            )}
        </div>
    )
}

export default Avatar
