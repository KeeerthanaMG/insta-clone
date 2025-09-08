import React from 'react'
import { Menu, Search, Camera } from 'lucide-react'

const NavbarMobile = ({ onMenuClick }) => {
    return (
        <nav className="md:hidden fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-b border-gray-100 z-30 shadow-sm">
            <div className="flex items-center justify-between px-6 py-4">
                <button
                    onClick={onMenuClick}
                    className="p-3 rounded-full hover:bg-gray-100 transition-colors"
                >
                    <Menu className="h-6 w-6 text-gray-700" />
                </button>

                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl">
                        <Camera className="h-6 w-6 text-white" />
                    </div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                        InstaCam
                    </h1>
                </div>

                <button className="p-3 rounded-full hover:bg-gray-100 transition-colors">
                    <Search className="h-6 w-6 text-gray-700" />
                </button>
            </div>
        </nav>
    )
}

export default NavbarMobile
