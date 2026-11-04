import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authApi from '../../api/authApi';
import storage from '../../utils/storage';
import { setApiUser } from '../../api/apiClient';

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

export const checkAuthSession = createAsyncThunk(
  'auth/checkAuthSession',
  async () => {
    return storage.getItem('user_session');
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
    otpSent: false,
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
      state.otpSent = false;
      state.error = null;
      storage.removeItem('user_session');
    },
    clearAuthError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(requestOTP.fulfilled, (state) => {
        state.isLoading = false;
        state.otpSent = true;
      })
      .addCase(requestOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to send OTP';
      })
      .addCase(verifyOTP.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.role = action.payload.user.role || state.role;
        setApiUser(action.payload.user); // sync to real API client
      })
      .addCase(verifyOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Invalid verification code';
      })
      .addCase(checkAuthSession.fulfilled, (state, action) => {
        if (action.payload?.user) {
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.token = action.payload.token;
          state.role = action.payload.user.role || 'citizen';
          setApiUser(action.payload.user); // sync to real API client
        }
      });
  },
});

export const { setRole, logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
