import { handleCTFResponse } from '../utils/ctfHandler';

// ...existing code...

const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const response = await axios.post('/api/comments/', {
      post: postId,
      text: commentText
    });
    
    // Check if this is a CTF response
    if (handleCTFResponse(response)) {
      // CTF bug detected - don't add comment to UI
      setCommentText('');
      return;
    }
    
    // Normal comment creation
    onCommentAdded(response.data);
    setCommentText('');
    
  } catch (error) {
    // Also check error responses for CTF
    if (error.response && handleCTFResponse(error.response)) {
      setCommentText('');
      return;
    }
    
    console.error('Error creating comment:', error);
  }
};

// ...existing code...