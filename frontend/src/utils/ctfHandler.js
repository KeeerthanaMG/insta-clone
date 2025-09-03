export const handleCTFResponse = (response) => {
  if (response.data && response.data.vulnerability_detected) {
    // Dispatch custom event for CTF popup
    const event = new CustomEvent('ctf-bug-found', {
      detail: {
        message: response.data.ctf_message,
        points: response.data.ctf_points_awarded,
        totalPoints: response.data.ctf_total_points,
        flag: response.data.flag,
        description: response.data.description,
        bugType: response.data.bug_type
      }
    });
    window.dispatchEvent(event);
    return true;
  }
  return false;
};

export const handleRateLimitingResponse = (errorResponse) => {
  if (errorResponse.data && errorResponse.data.rate_limiting_bug_detected) {
    console.log('[CTF] Rate limiting vulnerability detected in response');

    const rateLimitEvent = new CustomEvent('ctf-rate-limit-detected', {
      detail: {
        bug_type: 'Rate Limiting Bypass',
        description: 'Application lacks proper rate limiting on login attempts',
        message: 'Rate limiting vulnerability detected! No protection against brute force attacks.',
        instruction: 'Now login with correct credentials to claim your points!',
        failed_attempts: errorResponse.data.failed_attempts_count || 10,
        target_username: errorResponse.data.event_data?.target_username || 'unknown'
      }
    });

    window.dispatchEvent(rateLimitEvent);
    return true;
  }
  return false;
};
