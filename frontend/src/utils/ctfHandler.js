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
