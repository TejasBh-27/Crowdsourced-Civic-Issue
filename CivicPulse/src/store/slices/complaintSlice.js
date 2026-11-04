import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import expressGatewayApi from '../../api/expressGatewayApi';
import { setApiUser } from '../../api/apiClient';

// Helper to get user from Redux state and sync to API client
function getUser(getState) {
  const { user } = getState().auth;
  if (user) setApiUser(user);
  return user;
}

export const fetchComplaints = createAsyncThunk(
  'complaints/fetchComplaints',
  async (_, { rejectWithValue, getState }) => {
    try {
      const user = getUser(getState);
      return await expressGatewayApi.fetchComplaints(user);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const createComplaint = createAsyncThunk(
  'complaints/createComplaint',
  async (payload, { rejectWithValue, getState }) => {
    try {
      const user = getUser(getState);
      return await expressGatewayApi.createComplaint(payload, user);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resubmitPhoto = createAsyncThunk(
  'complaints/resubmitPhoto',
  async ({ id, photoFile, previewUrl }, { rejectWithValue, getState }) => {
    try {
      const user = getUser(getState);
      return await expressGatewayApi.resubmitPhoto(id, photoFile, previewUrl, user);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const acceptComplaintTask = createAsyncThunk(
  'complaints/acceptTask',
  async ({ id, officerInfo }, { rejectWithValue, getState }) => {
    try {
      const user = getUser(getState);
      return await expressGatewayApi.acceptComplaint(id, officerInfo, user);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const resolveComplaint = createAsyncThunk(
  'complaints/resolve',
  async ({ id, note, resolutionImage, officerInfo, resolutionFile }, { rejectWithValue, getState }) => {
    try {
      const user = getUser(getState);
      return await expressGatewayApi.resolveComplaint(id, note, resolutionImage, officerInfo, resolutionFile, user);
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchMttrAnalytics = createAsyncThunk(
  'complaints/mttrAnalytics',
  async (_, { rejectWithValue }) => {
    try {
      return await expressGatewayApi.getMttrAnalytics();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const complaintSlice = createSlice({
  name: 'complaints',
  initialState: {
    items: [],
    selectedComplaint: null,
    statusFilter: 'All',
    searchQuery: '',
    isLoading: false,
    isSubmitting: false,
    error: null,
    successMessage: null,
    mttrStats: {
      avgMttrHours: 24.5,
      totalResolved: 1,
      deptBreakdown: [
        { dept: 'Roads & Infrastructure', mttr: 42.1, resolvedCount: 12 },
        { dept: 'Sanitation & Solid Waste', mttr: 18.4, resolvedCount: 28 },
        { dept: 'Jal Board Water Supply', mttr: 24.0, resolvedCount: 15 },
        { dept: 'Electrical Grid', mttr: 54.7, resolvedCount: 8 }
      ]
    }
  },
  reducers: {
    setStatusFilter: (state, action) => { state.statusFilter = action.payload; },
    setSearchQuery: (state, action) => { state.searchQuery = action.payload; },
    setSelectedComplaint: (state, action) => { state.selectedComplaint = action.payload; },
    clearSuccessMessage: (state) => { state.successMessage = null; },
    // Update selectedComplaint live when items change
    syncSelectedComplaint: (state) => {
      if (state.selectedComplaint) {
        const updated = state.items.find(c => c.id === state.selectedComplaint.id);
        if (updated) state.selectedComplaint = updated;
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchComplaints.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchComplaints.fulfilled, (state, action) => { state.isLoading = false; state.items = action.payload; })
      .addCase(fetchComplaints.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })

      .addCase(createComplaint.pending, (state) => { state.isSubmitting = true; state.error = null; })
      .addCase(createComplaint.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.items.unshift(action.payload);
        state.selectedComplaint = action.payload;
      })
      .addCase(createComplaint.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

      .addCase(resubmitPhoto.pending, (state) => { state.isSubmitting = true; })
      .addCase(resubmitPhoto.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const idx = state.items.findIndex(c => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedComplaint?.id === action.payload.id) state.selectedComplaint = action.payload;
      })
      .addCase(resubmitPhoto.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

      .addCase(acceptComplaintTask.pending, (state) => { state.isSubmitting = true; })
      .addCase(acceptComplaintTask.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const idx = state.items.findIndex(c => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedComplaint?.id === action.payload.id) state.selectedComplaint = action.payload;
      })
      .addCase(acceptComplaintTask.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

      .addCase(resolveComplaint.pending, (state) => { state.isSubmitting = true; })
      .addCase(resolveComplaint.fulfilled, (state, action) => {
        state.isSubmitting = false;
        const idx = state.items.findIndex(c => c.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedComplaint?.id === action.payload.id) state.selectedComplaint = action.payload;
      })
      .addCase(resolveComplaint.rejected, (state, action) => { state.isSubmitting = false; state.error = action.payload; })

      .addCase(fetchMttrAnalytics.fulfilled, (state, action) => { state.mttrStats = action.payload; });
  }
});

export const { setStatusFilter, setSearchQuery, setSelectedComplaint, clearSuccessMessage, syncSelectedComplaint } = complaintSlice.actions;
export default complaintSlice.reducer;
