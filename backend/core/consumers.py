import json
import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from .models import ChatThread, ChatMessage
from .serializers import ChatMessageSerializer, UserSummarySerializer

User = get_user_model()
logger = logging.getLogger(__name__)

class ChatConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time chat messaging.
    
    Error codes:
    - 4401: Unauthorized (no valid token)
    - 4403: Forbidden (user not participant in thread)
    - 4404: Thread not found
    """
    
    async def connect(self):
        self.thread_id = self.scope['url_route']['kwargs']['thread_id']
        self.group_name = f"chat_{self.thread_id}"
        self.user = self.scope['user']

        logger.info(f"WebSocket connection attempt for thread {self.thread_id} by user {self.user}")

        # Check if user is authenticated
        if self.user.is_anonymous:
            logger.warning(f"Unauthenticated user tried to connect to thread {self.thread_id}")
            await self.close(code=4401)  # Unauthorized
            return
        
        # Validate user belongs to the thread
        thread_exists, user_is_participant = await self.validate_thread_access()
        
        if not thread_exists:
            await self.close(code=4404)  # Thread not found
            return
            
        if not user_is_participant:
            await self.close(code=4403)  # Forbidden
            return
        
        # Join thread group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"WebSocket connection accepted for user {self.user.id} in thread {self.thread_id}")

    async def disconnect(self, close_code):
        # Leave thread group
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(
                self.group_name,
                self.channel_name
            )
        logger.info(f"WebSocket connection closed for user {self.user.id} in thread {self.thread_id}")

    async def receive_json(self, content):
        """
        Handle incoming WebSocket messages from client.
        Expected format: {"message": "text content"}
        """
        message_text = content.get('message', '').strip()
        
        if not message_text:
            return
        
        # Save message to database
        message_data = await self.save_message(message_text)
        
        if message_data:
            # Broadcast message to thread group
            await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'chat_message',
                    'message_data': message_data
                }
            )
        logger.info(f"Message sent in thread {self.thread_id}: {message_text}")

    async def chat_message(self, event):
        """
        Send message to WebSocket client.
        """
        await self.send_json(event['message_data'])
    
    @database_sync_to_async
    def validate_thread_access(self):
        """
        Check if thread exists and user is a participant.
        Returns tuple: (thread_exists, user_is_participant)
        """
        try:
            thread = ChatThread.objects.get(id=self.thread_id)
            is_participant = thread.participants.filter(id=self.user.id).exists()
            return True, is_participant
        except ChatThread.DoesNotExist:
            return False, False
    
    @database_sync_to_async
    def save_message(self, text):
        """
        Save message to database and return message data for broadcasting.
        """
        try:
            thread = ChatThread.objects.get(id=self.thread_id)
            message = ChatMessage.objects.create(
                thread=thread,
                sender=self.user,
                text=text
            )
            
            # Update thread's updated_at timestamp
            thread.save(update_fields=['updated_at'])
            
            return {
                'id': message.id,
                'text': message.text,
                'sender': {
                    'id': message.sender.id,
                    'username': message.sender.username,
                    'profile_picture': message.sender.profile_picture.url if message.sender.profile_picture else None
                },
                'created_at': message.created_at.isoformat(),
                'thread_id': self.thread_id
            }
        except ChatThread.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error saving message: {e}")
            return None
