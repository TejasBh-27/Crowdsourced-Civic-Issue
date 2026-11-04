import { createSlice } from '@reduxjs/toolkit';

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [
      {
        id: 'NOTIF-1',
        title: 'FastAPI AI Processing Complete 🤖',
        message: 'CV verified photo (94%) & DistilBERT assigned task to Roads & Infrastructure.',
        timestamp: '10 mins ago',
        read: false
      },
      {
        id: 'NOTIF-2',
        title: 'Real-time Alert Dispatched ⚡',
        message: 'Socket.io alert sent to Inspector Rajesh Kumar for CMP-2026-101.',
        timestamp: '1 hour ago',
        read: true
      }
    ]
  },
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
    },
    markAllRead: (state) => {
      state.items = state.items.map(i => ({ ...i, read: true }));
    }
  }
});

export const { addNotification, markAllRead } = notificationSlice.actions;
export default notificationSlice.reducer;
