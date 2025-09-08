import React, { useState, useEffect } from 'react'
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
    Camera,
    ChevronLeft,
    ChevronRight,
    Trophy,
    Bug,
    Sparkles
} from 'lucide-react'
import { notificationsAPI, usersAPI } from '../lib/api'
import NavbarMobile from '../components/NavbarMobile'
import Avatar from '../components/Avatar'

const TopBar = ({ sidebarCollapsed }) => {
    const [profile, setProfile] = useState(null)

    useEffect(() => {
        fetchProfile()
    }, [])

    // Listen for CTF events to update profile data
    useEffect(() => {
        const handleBugFound = () => {
            fetchProfile()
        }
        window.addEventListener('ctf-bug-found', handleBugFound)
        return () => {
            window.removeEventListener('ctf-bug-found', handleBugFound)
        }
    }, [])

    const fetchProfile = async () => {
        try {
            const response = await usersAPI.getProfile('me')
            setProfile(response.data)
        } catch (error) {
            console.error('Error fetching profile for topbar:', error)
        }
    }

    return (
        <div className={`fixed top-0 right-0 z-20 bg-white border-b border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'left-20' : 'left-72'} hidden md:block`}>
            <div className="px-6 py-4">
                <div className="flex items-center justify-end space-x-6">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-green-300 px-4 py-2 rounded-lg border border-green-200">
                            <Trophy className="h-5 w-5 text-green-700" />
                            <span className="text-sm font-semibold text-green-800">
                                {profile?.points || 0} Points
                            </span>
                        </div>
                        <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-100 to-purple-300 px-4 py-2 rounded-lg border border-purple-200">
                            <Bug className="h-5 w-5 text-purple-700" />
                            <span className="text-sm font-semibold text-purple-800">
                                {profile?.bugs_solved || 0} Bugs Found
                            </span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-gradient-to-r from-gray-200 to-gray-400 rounded-full flex items-center justify-center">
                                <span className="text-gray-900 text-sm font-bold">
                                    {profile?.username?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-gray-800">
                                {profile?.username || 'User'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const MainLayout = ({ children, onLogout }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [unreadCount, setUnreadCount] = useState(0)

    useEffect(() => {
        fetchNotificationCount()
        // Poll for notifications every 30 seconds
        const interval = setInterval(fetchNotificationCount, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchNotificationCount = async () => {
        try {
            const response = await notificationsAPI.getNotifications()
            setUnreadCount(response.data.unread_count || 0)
        } catch (error) {
            console.error('Error fetching notification count:', error)
        }
    }

    const navigationItems = [
        { name: 'Home', path: '/feed', icon: Home, color: 'hover:text-pink-500' },
        { name: 'Explore', path: '/explore', icon: Compass, color: 'hover:text-pink-500' },
        { name: 'Create', path: '/create', icon: PlusSquare, color: 'hover:text-pink-500' },
        { name: 'Messages', path: '/messages', icon: MessageCircle, color: 'hover:text-pink-500' },
        {
            name: 'Notifications',
            path: '/notifications',
            icon: Heart,
            badge: unreadCount > 0 ? unreadCount : null,
            color: 'hover:text-pink-500'
        },
        { name: 'Profile', path: '/profile', icon: User, color: 'hover:text-pink-500' },
    ]

    const handleLogout = () => {
        localStorage.removeItem('token')
        onLogout()
    }

    const closeSidebar = () => setSidebarOpen(false)
    const toggleSidebarCollapse = () => setSidebarCollapsed(!sidebarCollapsed)

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
            {/* Mobile navbar */}
            <NavbarMobile onMenuClick={() => setSidebarOpen(true)} />

            {/* Sidebar overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden backdrop-blur-sm"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed top-0 left-0 h-full bg-white shadow-2xl z-50 transform transition-all duration-300 ease-in-out border-r border-gray-200
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0 md:z-30
                ${sidebarCollapsed ? 'w-20' : 'w-72'}
            `}>
                {/* Logo */}
                <div className={`px-4 py-2 border-b border-gray-200 ${sidebarCollapsed ? 'px-2' : ''}`}>
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center py-1 ${sidebarCollapsed ? 'justify-center w-full' : 'space-x-3'}`}>
                            <div className="relative group flex items-center justify-center" style={{ minWidth: 48, minHeight: 48 }}>
                                {/* 3D Logo Container */}
                                <div className="relative transform-gpu transition-all duration-300 group-hover:scale-110 perspective-1000" style={{ width: 48, height: 48 }}>
                                    {/* 3D Shadow layers */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-pink-600 rounded-xl transform translate-x-0.5 translate-y-0.5 opacity-50"></div>
                                    {/* Main logo */}
                                    <div className="relative px-2 py-3 bg-gradient-to-br from-purple-900 via-purple-800 to-pink-900 rounded-xl shadow-2xl border border-white/20 backdrop-blur-sm overflow-hidden flex items-center justify-center" style={{ width: 48, height: 48 }}>
                                        {/* Glossy overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent rounded-xl"></div>
                                        {/* Camera icon/image */}
                                        <div className="relative z-10">
                                            <Camera className='text-white' w-6 h-6 />
                                        </div>
                                        {/* Animated shine effect */}
                                        <div className="absolute -inset-1 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    </div>
                                </div>
                            </div>
                            {!sidebarCollapsed && (
                                <div className="relative">
                                    <h1 className="text-xl font-bold text-gray-900 drop-shadow-sm">
                                        𝓘𝓷𝓼𝓽𝓪𝓒𝓪𝓶
                                    </h1>
                                </div>
                            )}
                        </div>

                        {/* Desktop collapse button */}
                        <button
                            onClick={toggleSidebarCollapse}
                            className="hidden bg-gray-100/50 md:flex p-1 ml-2 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            {sidebarCollapsed ? <ChevronRight className="h-3 w-3 text-gray-800" /> : <ChevronLeft className="h-5 w-5 text-gray-400" />}
                        </button>

                        {/* Mobile close button */}
                        <button
                            onClick={closeSidebar}
                            className="md:hidden p-1 ml-2 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            <X className="h-6 w-6 text-gray-800" />
                        </button>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={`p-4 space-y-2 flex-1 ${sidebarCollapsed ? 'px-2' : ''}`}>
                    {navigationItems.map(({ name, path, icon: Icon, badge, color }) => (
                        <NavLink
                            key={name}
                            to={path}
                            onClick={closeSidebar}
                            className={({ isActive }) => `
                                flex items-center p-3 rounded-lg transition-all duration-200 relative group
                                ${sidebarCollapsed ? 'justify-center' : 'space-x-4'}
                                ${isActive 
                                    ? 'bg-gradient-to-r from-gray-100 to-gray-200 text-pink-600 shadow-md' 
                                    : `text-gray-700 hover:bg-gray-100 ${color}`
                                }
                            `}
                            title={sidebarCollapsed ? name : ''}
                        >
                            <Icon className={`h-6 w-6 transition-transform duration-200 group-hover:scale-110 ${sidebarCollapsed ? 'text-pink-600' : ''}`} />
                            {!sidebarCollapsed && (
                                <span className="text-base font-semibold">{name}</span>
                            )}
                            {badge && (
                                <span className={`absolute ${sidebarCollapsed ? 'top-1 right-1' : 'left-6 top-1'} bg-gradient-to-r from-red-700 to-pink-700 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg`}>
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout button */}
                <div className={`p-4 border-t border-gray-200 ${sidebarCollapsed ? 'px-2' : ''}`}>
                    <button
                        onClick={handleLogout}
                        className={`flex items-center p-3 rounded-2xl w-full text-left bg-gray-100 text-red-500 hover:bg-red-100 hover:text-red-700 transition-all duration-200 group border border-red-100 hover:border-red-300
                            ${sidebarCollapsed ? 'justify-center' : 'space-x-4'}
                        `}
                        title={sidebarCollapsed ? 'Sign Out' : ''}
                    >
                        <LogOut className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
                        {!sidebarCollapsed && (
                            <span className="text-base font-semibold">Sign Out</span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Top Bar */}
            <TopBar sidebarCollapsed={sidebarCollapsed} />

            {/* Main content */}
            <main className={`min-h-screen pt-20 md:pt-20 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-72'}`} 
                    style={{
                        backgroundImage: 'url("https://wallpapers.com/images/hd/white-hd-3d-abstract-design-sbwa95lygdbiklwc.jpg")',
                        backgroundColor: '#ffffffbb',
                        backgroundRepeat: 'no-repeat',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundBlendMode: 'overlay'
                    }}>
                <div className="max-w-5xl mx-auto px-6 py-8">
                    {children}
                </div>
            </main>
        </div>
    )
}

export default MainLayout;