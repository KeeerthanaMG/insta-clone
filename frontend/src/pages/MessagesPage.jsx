import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Search, Send, UserPlus, ArrowLeft } from 'lucide-react'
import Avatar from '../components/Avatar'
import { formatTimeAgo } from '../utils/timeAgo'
import { messagesAPI, usersAPI } from '../lib/api'
import FlagPopup from '../components/FlagPopup'

const MessagesPage = () => {
    const { threadId } = useParams()
    const navigate = useNavigate()

    const [inbox, setInbox] = useState([])
    const [requests, setRequests] = useState([])
    const [selectedThread, setSelectedThread] = useState(null)
    const [messages, setMessages] = useState([])
    const [messageText, setMessageText] = useState('')
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)
    const [flagData, setFlagData] = useState(null)

    const socket = useRef(null)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        fetchThreads()
    }, [])

    useEffect(() => {
        if (threadId) {
            console.log('[DEBUG] useEffect triggered with threadId:', threadId)
            const allThreads = [...inbox, ...requests]
            const foundThread = allThreads.find(t => t.id === parseInt(threadId))
            console.log('[DEBUG] Found thread:', foundThread)
            if (foundThread) {
                setSelectedThread(foundThread)
                fetchMessages(threadId)
            } else {
                console.log('[DEBUG] Thread not found in user threads, but still fetching messages...')
                // Still try to fetch messages even if thread not in user's list (for IDOR testing)
                fetchMessages(threadId)
            }
        } else {
            setSelectedThread(null)
            setMessages([])
        }
    }, [threadId, inbox, requests])

    useEffect(() => {
        if (selectedThread) {
            connectWebSocket(selectedThread.id)
        }
        return () => {
            if (socket.current) {
                socket.current.close()
            }
        }
    }, [selectedThread])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        // Remove automatic search - only search when user presses Enter
        // if (searchQuery.trim()) {
        //     setIsSearching(true)
        //     const handler = setTimeout(() => searchUsers(searchQuery), 300)
        //     return () => clearTimeout(handler)
        // } else {
        //     setIsSearching(false)
        //     setSearchResults([])
        // }
    }, [searchQuery])

    const handleSearchSubmit = (e) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            setIsSearching(true)
            searchUsers(searchQuery)
        } else {
            setIsSearching(false)
            setSearchResults([])
        }
    }

    const handleSearchKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearchSubmit(e)
        }
    }

    const fetchThreads = async () => {
        try {
            setLoading(true)
            const response = await messagesAPI.getThreads()
            setInbox(response.data.inbox || [])
            setRequests(response.data.requests || [])
        } catch (error) {
            console.error('Error fetching threads:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMessages = async (id) => {
        console.log('[DEBUG] fetchMessages called with id:', id)
        try {
            console.log('[DEBUG] Making API call to getMessages...')
            const response = await messagesAPI.getMessages(id)
            console.log('[DEBUG] API response:', response.data)

            // Check for CTF flag in response
            if (response.data.flag_found !== undefined) {
                console.log('[DEBUG] Flag response detected!')
                console.log('[DEBUG] flag_found:', response.data.flag_found)

                if (response.data.flag_found) {
                    console.log('[DEBUG] Setting flag data for popup...')
                    setFlagData({
                        flag: response.data.flag,
                        bug_name: response.data.bug_name,
                        points_awarded: response.data.points_awarded,
                        message: response.data.message
                    })
                    // Clear messages to prevent viewing after flag is found
                    setMessages([])
                    return
                } else {
                    console.log('[DEBUG] Bug already solved, showing message')
                    alert(response.data.message) // Temporary alert for debugging
                }
            } else {
                console.log('[DEBUG] No flag response, setting messages normally')
                setMessages(response.data)
            }
        } catch (error) {
            console.error('[DEBUG] Error fetching messages:', error)
            console.error('[DEBUG] Error response:', error.response?.data)
        }
    }

    const connectWebSocket = (id) => {
        if (socket.current) {
            socket.current.close()
        }
        const token = localStorage.getItem('token')
        if (!token) {
            console.error('No authentication token found')
            return
        }

        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const wsUrl = `${wsProtocol}//${window.location.host.replace('5173', '8000')}/ws/chat/${id}/?token=${token}`

        console.log('Connecting to WebSocket:', wsUrl)
        socket.current = new WebSocket(wsUrl)

        socket.current.onopen = () => {
            console.log('WebSocket connected successfully')
        }

        socket.current.onmessage = (event) => {
            const data = JSON.parse(event.data)
            setMessages(prev => [...prev, data])
        }

        socket.current.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason)
            if (event.code === 4403) {
                console.log('Access forbidden - you may have triggered a CTF flag')
            }
        }

        socket.current.onerror = (error) => {
            console.error('WebSocket error details:', {
                url: wsUrl,
                readyState: socket.current?.readyState,
                error: error
            })
        }
    }

    const handleSendMessage = (e) => {
        e.preventDefault()
        if (!messageText.trim() || !selectedThread) return

        if (socket.current && socket.current.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify({ message: messageText.trim() }))
        }
        setMessageText('')
    }

    const searchUsers = async (query) => {
        try {
            const response = await usersAPI.searchUsers(query)
            setSearchResults(response.data.results || [])
        } catch (error) {
            console.error('Error searching users:', error)
        }
    }

    const handleStartChat = async (user) => {
        try {
            const response = await messagesAPI.startThread(user.id)
            setSearchQuery('')
            setSearchResults([])
            fetchThreads()
            navigate(`/messages/${response.data.id}`)
        } catch (error) {
            console.error('Error starting chat:', error)
        }
    }

    const handleAcceptRequest = async (threadId) => {
        try {
            await messagesAPI.acceptThread(threadId)
            fetchThreads()
            navigate(`/messages/${threadId}`)
        } catch (error) {
            console.error('Error accepting request:', error)
        }
    }

    const renderThreadItem = (thread, isRequest = false) => (
        <button
            key={thread.id}
            onClick={() => navigate(`/messages/${thread.id}`)}
            className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${selectedThread?.id === thread.id ? 'bg-gray-100' : ''}`}
        >
            <Avatar
                src={thread.other_participant?.profile_picture}
                alt={thread.other_participant?.username}
                size="md"
            />
            <div className="flex-1 text-left overflow-hidden">
                <h3 className="font-medium text-gray-900 truncate">{thread.other_participant?.username}</h3>
                <p className="text-sm text-gray-500 truncate">
                    {thread.last_message ? thread.last_message.text : (isRequest ? 'New chat request' : 'No messages yet')}
                </p>
            </div>
            {isRequest && (
                <button onClick={(e) => { e.stopPropagation(); handleAcceptRequest(thread.id) }} className="btn-primary text-xs py-1 px-3">
                    Accept
                </button>
            )}
        </button>
    )

    const ConversationList = () => (
        <div className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${threadId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b border-gray-200">
                <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
                <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search or start new chat... (Press Enter)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleSearchKeyPress}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>
                </form>
            </div>
            <div className="flex-1 overflow-y-auto">
                {isSearching ? (
                    <div>
                        {searchResults.map(user => (
                            <button key={user.id} onClick={() => handleStartChat(user)} className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50">
                                <Avatar src={user.profile_picture} alt={user.username} size="md" />
                                <span className="font-medium">{user.username}</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <>
                        {requests.length > 0 && (
                            <div className="p-2">
                                <h2 className="text-sm font-semibold text-gray-600 px-2 mb-1">Requests</h2>
                                {requests.map(thread => renderThreadItem(thread, true))}
                            </div>
                        )}
                        <div className="p-2">
                            <h2 className="text-sm font-semibold text-gray-600 px-2 mb-1">Inbox</h2>
                            {inbox.map(thread => renderThreadItem(thread))}
                        </div>
                    </>
                )}
            </div>
        </div>
    )

    const ChatWindow = () => (
        <div className={`flex-1 flex flex-col ${!threadId ? 'hidden md:flex' : 'flex'}`}>
            {selectedThread ? (
                <>
                    <div className="p-4 border-b border-gray-200 flex items-center space-x-3">
                        <button onClick={() => navigate('/messages')} className="md:hidden p-2 -ml-2">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <Avatar src={selectedThread.other_participant?.profile_picture} alt={selectedThread.other_participant?.username} size="md" />
                        <h2 className="font-medium text-gray-900">{selectedThread.other_participant?.username}</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.sender.username === selectedThread.other_participant?.username ? 'justify-start' : 'justify-end'}`}>
                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.sender.username !== selectedThread.other_participant?.username ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-900'}`}>
                                    <p className="text-sm">{message.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>
                    <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                        <div className="flex items-center space-x-3">
                            <input type="text" placeholder="Type a message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500" />
                            <button type="submit" disabled={!messageText.trim()} className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50">
                                <Send className="h-5 w-5" />
                            </button>
                        </div>
                    </form>
                </>
            ) : (
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <Send className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Your Messages</h3>
                        <p className="text-gray-500">Select a conversation or start a new one.</p>
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-80px)] md:h-[calc(100vh-40px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex h-full">
                <ConversationList />
                <ChatWindow />
            </div>
            {/* Show CTF flag popup if flagData is present */}
            {flagData && (
                <FlagPopup
                    flag={flagData.flag}
                    bugName={flagData.bug_name}
                    points={flagData.points_awarded}
                    message={flagData.message}
                    onClose={() => setFlagData(null)}
                />
            )}
        </div>
    )
}

export default MessagesPage
