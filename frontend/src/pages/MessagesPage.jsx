import React, { useState } from 'react'
import { Search, Send, Phone, Video, Info } from 'lucide-react'
import Avatar from '../components/Avatar'
import { formatTimeAgo } from '../utils/timeAgo'

const MessagesPage = () => {
    const [selectedConversation, setSelectedConversation] = useState(null)
    const [messageText, setMessageText] = useState('')
    const [searchQuery, setSearchQuery] = useState('')

    // Placeholder data - replace with real API calls
    const conversations = [
        {
            id: 1,
            user: { username: 'john_doe', profile_picture: null },
            lastMessage: 'Hey! How are you doing?',
            timestamp: '2024-01-15T10:30:00Z',
            unread: true
        },
        {
            id: 2,
            user: { username: 'jane_smith', profile_picture: null },
            lastMessage: 'Thanks for the photo!',
            timestamp: '2024-01-14T15:45:00Z',
            unread: false
        }
    ]

    const messages = selectedConversation ? [
        {
            id: 1,
            text: 'Hey! How are you doing?',
            timestamp: '2024-01-15T10:30:00Z',
            isOwn: false
        },
        {
            id: 2,
            text: 'I\'m doing great! Thanks for asking 😊',
            timestamp: '2024-01-15T10:31:00Z',
            isOwn: true
        }
    ] : []

    const handleSendMessage = (e) => {
        e.preventDefault()
        if (!messageText.trim() || !selectedConversation) return

        // TODO: Implement message sending
        console.log('Sending message:', messageText)
        setMessageText('')
    }

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-120px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex h-full">
                {/* Conversations List */}
                <div className="w-1/3 border-r border-gray-200 flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200">
                        <h1 className="text-xl font-bold text-gray-900 mb-4">Messages</h1>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search conversations..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>
                    </div>

                    {/* Conversations */}
                    <div className="flex-1 overflow-y-auto">
                        {conversations.map((conversation) => (
                            <button
                                key={conversation.id}
                                onClick={() => setSelectedConversation(conversation)}
                                className={`w-full p-4 flex items-center space-x-3 hover:bg-gray-50 transition-colors ${selectedConversation?.id === conversation.id ? 'bg-gray-100' : ''
                                    }`}
                            >
                                <Avatar
                                    src={conversation.user.profile_picture}
                                    alt={conversation.user.username}
                                    size="md"
                                />
                                <div className="flex-1 text-left">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900">
                                            {conversation.user.username}
                                        </h3>
                                        <span className="text-xs text-gray-500">
                                            {formatTimeAgo(conversation.timestamp)}
                                        </span>
                                    </div>
                                    <p className={`text-sm truncate ${conversation.unread ? 'font-medium text-gray-900' : 'text-gray-500'
                                        }`}>
                                        {conversation.lastMessage}
                                    </p>
                                </div>
                                {conversation.unread && (
                                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 flex flex-col">
                    {selectedConversation ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <Avatar
                                        src={selectedConversation.user.profile_picture}
                                        alt={selectedConversation.user.username}
                                        size="md"
                                    />
                                    <h2 className="font-medium text-gray-900">
                                        {selectedConversation.user.username}
                                    </h2>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button className="p-2 hover:bg-gray-100 rounded-full">
                                        <Phone className="h-5 w-5 text-gray-600" />
                                    </button>
                                    <button className="p-2 hover:bg-gray-100 rounded-full">
                                        <Video className="h-5 w-5 text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.isOwn
                                                ? 'bg-pink-500 text-white'
                                                : 'bg-gray-200 text-gray-900'
                                                }`}
                                        >
                                            <p className="text-sm">{message.text}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Message Input */}
                            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                                <div className="flex items-center space-x-3">
                                    <input
                                        type="text"
                                        placeholder="Type a message..."
                                        value={messageText}
                                        onChange={(e) => setMessageText(e.target.value)}
                                        className="flex-1 px-4 py-2 bg-gray-100 border-0 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!messageText.trim()}
                                        className="p-2 bg-pink-500 text-white rounded-full hover:bg-pink-600 disabled:opacity-50"
                                    >
                                        <Send className="h-5 w-5" />
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center">
                                <Send className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Select a conversation
                                </h3>
                                <p className="text-gray-500">
                                    Choose a conversation from the list to start messaging
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default MessagesPage
