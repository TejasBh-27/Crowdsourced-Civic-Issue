import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authApi from '../../api/authApi';
import storage, { sessionStore } from '../../utils/storage';
import { setApiUser } from '../../api/apiClient';
import { getPersistedAvatar, savePersistedAvatar } from '../../utils/avatarStorage';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ identifier, password, role }, { rejectWithValue }) => {
    try {
      const res = await authApi.login({ identifier, password, role });
      // Store session in sessionStorage only so closing the app or launching npm run dev always starts at the Login page
      sessionStore.setItem('user_session', res);
      // Clean legacy localStorage session
      storage.removeItem('user_session');
      return res;
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (formData, { rejectWithValue }) => {
    try {
      const res = await authApi.register(formData);
      return res;
    } catch (err) {
      return rejectWithValue(err.message || 'Registration failed');
    }
  }
);

export const checkAuthSession = createAsyncThunk(
  'auth/checkAuthSession',
  async (_, { rejectWithValue }) => {
    // Clean any legacy persistent auto-login session so starting npm run dev always asks to log in first
    storage.removeItem('user_session');
    storage.removeItem('last_active_user');

    // Only restore session if actively logged in during this active browser tab
    const session = sessionStore.getItem('user_session');
    if (session && session.user) {
      return session;
    }
    return rejectWithValue('No active session. Please log in.');
  }
);

// Backward-compatibility thunks
export const requestOTP = createAsyncThunk(
  'auth/requestOTP',
  async ({ phone, role }, { rejectWithValue }) => {
    try {
      return await authApi.requestOTP(phone, role);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const verifyOTP = createAsyncThunk(
  'auth/verifyOTP',
  async ({ phone, otp, role }, { rejectWithValue }) => {
    try {
      const res = await authApi.verifyOTP(phone, otp, role);
      sessionStore.setItem('user_session', res);
      storage.removeItem('user_session');
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    role: 'citizen',
    isAuthenticated: false,
    isLoading: false,
    error: null,
  },
  reducers: {
    setRole: (state, action) => {
      state.role = action.payload;
      if (state.user) state.user.role = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      sessionStore.removeItem('user_session');
      storage.removeItem('user_session');
      storage.removeItem('last_active_user');
      setApiUser(null);
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    updateUserProfile: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        if (action.payload.avatar) {
          savePersistedAvatar(state.user, action.payload.avatar);
        }
        const session = sessionStore.getItem('user_session') || {};
        sessionStore.setItem('user_session', { ...session, user: state.user });
      }
    }
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        const userWithAvatar = {
          ...action.payload.user,
          avatar: getPersistedAvatar(action.payload.user, action.payload.user.avatar)
        };
        state.user = userWithAvatar;
        state.token = action.payload.token;
        state.role = action.payload.user.role || state.role;
        setApiUser(userWithAvatar);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to login';
      })

      // Register (Creates account AND logs in the newly registered user)
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        if (action.payload?.user) {
          state.isAuthenticated = true;
          const userWithAvatar = {
            ...action.payload.user,
            avatar: getPersistedAvatar(action.payload.user, action.payload.user.avatar)
          };
          state.user = userWithAvatar;
          state.token = action.payload.token;
          state.role = action.payload.user.role || 'citizen';
          setApiUser(userWithAvatar);
          sessionStore.setItem('user_session', { ...action.payload, user: userWithAvatar });
          storage.removeItem('user_session');
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to register';
      })

      // Session restore
      .addCase(checkAuthSession.fulfilled, (state, action) => {
        if (action.payload?.user) {
          const userWithAvatar = {
            ...action.payload.user,
            avatar: getPersistedAvatar(action.payload.user, action.payload.user.avatar)
          };
          state.isAuthenticated = true;
          state.user = userWithAvatar;
          state.token = action.payload.token;
          state.role = action.payload.user.role || 'citizen';
          setApiUser(userWithAvatar);
        }
      })
      .addCase(checkAuthSession.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })

      // Legacy OTP
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        const userWithAvatar = {
          ...action.payload.user,
          avatar: getPersistedAvatar(action.payload.user, action.payload.user.avatar)
        };
        state.user = userWithAvatar;
        state.token = action.payload.token;
        state.role = action.payload.user.role || state.role;
        setApiUser(userWithAvatar);
      });
  },
});

export const { setRole, logout, clearAuthError, updateUserProfile } = authSlice.actions;
export default authSlice.reducer;
