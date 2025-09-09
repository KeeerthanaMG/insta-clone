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
    const [selectedSearchUser, setSelectedSearchUser] = useState(null)
    const [searchMessageText, setSearchMessageText] = useState('')
    const [flagData, setFlagData] = useState(null)

    const socket = useRef(null)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        fetchThreads()
    }, [])

    // Listen for shared post event to refresh messages immediately
    useEffect(() => {
        const handleSharedPost = (e) => {
            const { threadId } = e.detail
            // Refresh threads and messages for the new shared post
            fetchThreads().then(() => {
                setTimeout(() => {
                    navigate(`/messages/${threadId}`)
                    fetchMessages(threadId)
                }, 100)
            })
        }
        window.addEventListener('shared-post-message', handleSharedPost)
        return () => {
            window.removeEventListener('shared-post-message', handleSharedPost)
        }
    }, [navigate])

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
                console.log('[DEBUG] Thread not found in user threads, fetching anyway...')
                // Thread might be newly created, so fetch it and the messages
                fetchThreads().then(() => {
                    const updatedThreads = [...inbox, ...requests]
                    const newThread = updatedThreads.find(t => t.id === parseInt(threadId))
                    if (newThread) {
                        setSelectedThread(newThread)
                        fetchMessages(threadId)
                    } else {
                        // Still try to fetch messages even if thread not in user's list (for IDOR testing)
                        fetchMessages(threadId)
                    }
                })
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
        // Remove automatic search - only search when user presses Enter or submits form
        // This prevents cursor jumping issues
    }, []) // Remove searchQuery dependency

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
            e.preventDefault()
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

            // Check for CTF vulnerability detection in response
            if (response.data.vulnerability_detected) {
                console.log('[DEBUG] CTF VULNERABILITY DETECTED!')
                console.log('[DEBUG] CTF response:', response.data)

                // Dispatch CTF event for FlagPopup
                const ctfEvent = new CustomEvent('ctf-bug-found', {
                    detail: {
                        message: response.data.ctf_message,
                        flag: response.data.flag,
                        points: response.data.ctf_points_awarded,
                        totalPoints: response.data.ctf_total_points,
                        bugType: response.data.bug_type,
                        description: response.data.description
                    }
                })
                console.log('[DEBUG] Dispatching CTF event:', ctfEvent.detail)
                window.dispatchEvent(ctfEvent)

                // Don't show actual messages for IDOR vulnerability
                setMessages([])
                return
            }

            // Check for old-style CTF flag response (backward compatibility)
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
            setSelectedSearchUser(null)
            setSearchMessageText('')
            fetchThreads()
            navigate(`/messages/${response.data.id}`)
        } catch (error) {
            console.error('Error starting chat:', error)
        }
    }

    const handleSendMessageToSearchUser = async (user, messageText) => {
        try {
            if (!messageText.trim()) return

            // First create or get the thread
            const threadResponse = await messagesAPI.startThread(user.id)
            const threadId = threadResponse.data.id

            // Then send the message using the WebSocket or API
            if (threadResponse.data.created) {
                // New thread created, send message via API
                await messagesAPI.sendMessage(threadId, messageText.trim())
            } else {
                // Existing thread, we could use WebSocket but API is more reliable here
                await messagesAPI.sendMessage(threadId, messageText.trim())
            }

            // Clear search and navigate to the conversation
            setSearchQuery('')
            setSearchResults([])
            setSelectedSearchUser(null)
            setSearchMessageText('')
            setIsSearching(false)
            
            // Refresh threads before navigation to ensure the new thread appears
            await fetchThreads()
            
            // Small delay to ensure thread is updated before navigation
            setTimeout(() => {
                navigate(`/messages/${threadId}`)
            }, 100)

        } catch (error) {
            console.error('Error sending message to search user:', error)
        }
    }

    const handleSearchUserClick = (user) => {
        setSelectedSearchUser(user)
    }

    const handleBackFromSearchUser = () => {
        setSelectedSearchUser(null)
        setSearchMessageText('')
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
                            onKeyDown={handleSearchKeyPress}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                        />
                    </div>
                </form>
            </div>
            <div className="flex-1 overflow-y-auto">
                {isSearching ? (
                    <div>
                        {selectedSearchUser ? (
                            // Show message composer for selected user
                            <div className="p-4">
                                <div className="flex items-center space-x-3 mb-4">
                                    <button onClick={handleBackFromSearchUser} className="p-2 hover:bg-gray-100 rounded-full">
                                        <ArrowLeft className="h-4 w-4" />
                                    </button>
                                    <Avatar src={selectedSearchUser.profile_picture} alt={selectedSearchUser.username} size="md" />
                                    <div>
                                        <h3 className="font-medium text-gray-900">{selectedSearchUser.username}</h3>
                                        <p className="text-sm text-gray-500">Send a message</p>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <textarea
                                        placeholder="Type your message..."
                                        value={searchMessageText}
                                        onChange={(e) => setSearchMessageText(e.target.value)}
                                        className="w-full px-3 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 resize-none"
                                        rows={3}
                                    />
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleSendMessageToSearchUser(selectedSearchUser, searchMessageText)}
                                            disabled={!searchMessageText.trim()}
                                            className="flex-1 bg-pink-500 text-white py-2 px-4 rounded-lg hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        >
                                            Send Message
                                        </button>
                                        <button
                                            onClick={() => handleStartChat(selectedSearchUser)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                                        >
                                            Just Chat
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            // Show search results
                            <div>
                                {searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500">
                                        {searchQuery ? 'No users found' : 'Start typing to search...'}
                                    </div>
                                ) : (
                                    searchResults.map(user => (
                                        <button 
                                            key={user.id} 
                                            onClick={() => handleSearchUserClick(user)} 
                                            className="w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors"
                                        >
                                            <Avatar src={user.profile_picture} alt={user.username} size="md" />
                                            <div className="flex-1 text-left">
                                                <p className="font-medium text-gray-900">{user.username}</p>
                                                <p className="text-sm text-gray-500">{user.followers_count} followers</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
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
        <div className="max-w-6xl mx-auto h-[calc(100vh-380px)] md:h-[calc(100vh-150px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex h-full">
                <ConversationList />
                <ChatWindow />
            </div>
        </div>
    )
}
export default MessagesPage