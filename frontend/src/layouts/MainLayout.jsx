import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
    Home,
    Compass,
    PlusSquare,
    MessageCircle,
    Heart,
    User,
    LogOut,
    Menu,
    X,
    Camera
} from 'lucide-react'
import NavbarMobile from '../components/NavbarMobile'

const MainLayout = ({ children, onLogout }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const navigationItems = [
        { name: 'Home', path: '/feed', icon: Home },
        { name: 'Explore', path: '/explore', icon: Compass },
        { name: 'Create', path: '/create', icon: PlusSquare },
        { name: 'Messages', path: '/messages', icon: MessageCircle },
        { name: 'Notifications', path: '/notifications', icon: Heart },
        { name: 'Profile', path: '/profile', icon: User },
    ]

    const handleLogout = () => {
        localStorage.removeItem('token')
        onLogout()
    }

    const closeSidebar = () => setSidebarOpen(false)

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Mobile navbar */}
            <NavbarMobile onMenuClick={() => setSidebarOpen(true)} />

            {/* Sidebar overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:z-30
      `}>
                {/* Logo */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <Camera className="h-8 w-8 text-pink-500" />
                            <h1 className="text-2xl font-bold text-gradient">InstaCam</h1>
                        </div>

                        {/* Close button for mobile */}
                        <button
                            onClick={closeSidebar}
                            className="md:hidden p-1 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-2 flex-1">
                    {navigationItems.map(({ name, path, icon: Icon }) => (
                        <NavLink
                            key={name}
                            to={path}
                            onClick={closeSidebar}
                            className={({ isActive }) => `
                nav-item ${isActive ? 'active' : ''}
              `}
                        >
                            <Icon className="h-6 w-6" />
                            <span className="text-lg font-medium">{name}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Logout button */}
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={handleLogout}
                        className="nav-item w-full text-left text-red-600 hover:bg-red-50"
                    >
                        <LogOut className="h-6 w-6" />
                        <span className="text-lg font-medium">Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="md:ml-64 min-h-screen pt-16 md:pt-0">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default MainLayout
