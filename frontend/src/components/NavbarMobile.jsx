import React from 'react'
import { Menu, Search, Camera } from 'lucide-react'

const NavbarMobile = ({ onMenuClick }) => {
    return (
        <nav className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-30">
            <div className="flex items-center justify-between px-4 py-3">
                <button
                    onClick={onMenuClick}
                    className="p-2 rounded-full hover:bg-gray-100"
                >
                    <Menu className="h-6 w-6" />
                </button>

                <div className="flex items-center space-x-2">
                    <Camera className="h-6 w-6 text-pink-500" />
                    <h1 className="text-xl font-bold text-gradient">InstaCam</h1>
                </div>

                <button className="p-2 rounded-full hover:bg-gray-100">
                    <Search className="h-6 w-6" />
                </button>
            </div>
        </nav>
    )
}

export default NavbarMobile
