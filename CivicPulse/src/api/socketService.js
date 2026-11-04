/**
 * Real-Time Socket.io & Firebase Cloud Messaging (FCM) Simulation Service
 * Section 7.4.1 Semester Report Alignment
 */
export const socketService = {
  listeners: [],

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  emitRealtimeEvent(eventType, payload) {
    const event = {
      type: eventType,
      payload,
      timestamp: new Date().toISOString()
    };

    this.listeners.forEach(fn => fn(event));

    // Show web notification banner if available
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`CivicPulse Alert: ${eventType}`, {
        body: payload.title || payload.message || 'Status updated.'
      });
    }
  }
};

export default socketService;
