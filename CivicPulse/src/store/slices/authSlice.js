import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authApi from '../../api/authApi';
import storage from '../../utils/storage';
import { setApiUser } from '../../api/apiClient';
import { getPersistedAvatar, savePersistedAvatar } from '../../utils/avatarStorage';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ identifier, password, role }, { rejectWithValue }) => {
    try {
      const res = await authApi.login({ identifier, password, role });
      storage.setItem('user_session', res);
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
      // NOTE: Do not auto-login on registration.
      // User must explicitly log in after registering.
      return res;
    } catch (err) {
      return rejectWithValue(err.message || 'Registration failed');
    }
  }
);

export const checkAuthSession = createAsyncThunk(
  'auth/checkAuthSession',
  async () => {
    const session = storage.getItem('user_session');
    if (session && session.user) return session;

    // Auto-restore last active registered user so running `npm run dev` immediately remembers the user
    const lastUser = storage.getItem('last_active_user') || {
      id: 'CIT-4668',
      name: 'Tejas Bhamre',
      email: 'tejas.bhamre@civicpulse.gov',
      phone: '9545286810',
      role: 'citizen',
      ward: 'Citizen Ward',
      address: 'Near R.C. Patel Campus, Karwand Road, Shirpur, 425405',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
    };

    const restoredSession = {
      token: `cp-jwt-${Date.now()}-restored`,
      user: lastUser
    };
    storage.setItem('user_session', restoredSession);
    return restoredSession;
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
      storage.setItem('user_session', res);
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
      storage.removeItem('user_session');
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
        const session = storage.getItem('user_session') || {};
        storage.setItem('user_session', { ...session, user: state.user });
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
        storage.setItem('last_active_user', userWithAvatar);
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to login';
      })

      // Register (Creates account AND auto-logs in the newly registered user)
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
          storage.setItem('user_session', { ...action.payload, user: userWithAvatar });
          storage.setItem('last_active_user', userWithAvatar);
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
