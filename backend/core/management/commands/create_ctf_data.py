from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import ChatThread, ChatMessage

User = get_user_model()

class Command(BaseCommand):
    help = 'Create CTF test data for IDOR vulnerability testing'

    def handle(self, *args, **options):
        # Create test users
        user1, created = User.objects.get_or_create(
            username='alice',
            defaults={'email': 'alice@example.com', 'password': 'pbkdf2_sha256$600000$test$test'}
        )
        
        user2, created = User.objects.get_or_create(
            username='bob', 
            defaults={'email': 'bob@example.com', 'password': 'pbkdf2_sha256$600000$test$test'}
        )

        # Create a chat thread between alice and bob
        thread = ChatThread.objects.create(is_accepted=True)
        thread.participants.add(user1, user2)

        # Create some messages
        ChatMessage.objects.create(
            thread=thread,
            sender=user1,
            text="Hey Bob, how's the CTF going?"
        )
        
        ChatMessage.objects.create(
            thread=thread,
            sender=user2,
            text="Great! Found some interesting vulnerabilities 🔍"
        )

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created CTF test data:\n'
                f'- Thread ID: {thread.id}\n'
                f'- Participants: {user1.username}, {user2.username}\n'
                f'- Messages: 2\n'
                f'- To test IDOR: Access /messages/{thread.id}/ as a different user'
            )
        )
