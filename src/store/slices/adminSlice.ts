import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { adminApi } from '../../services/api';
import { AdminUser, AdminStats, Pagination } from '../../types';

interface AdminState {
  users: AdminUser[];
  currentUser: AdminUser | null;
  stats: AdminStats | null;
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  users: [],
  currentUser: null,
  stats: null,
  pagination: null,
  loading: false,
  error: null,
};

type ApiError = { response?: { data?: { error?: string } } };
const extractError = (err: unknown, fallback: string): string =>
  (err as ApiError).response?.data?.error ?? fallback;

export const fetchAdminStats = createAsyncThunk<AdminStats, void, { rejectValue: string }>(
  'admin/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await adminApi.getStats();
      return (res.data as { data: AdminStats }).data;
    } catch (err) { return rejectWithValue(extractError(err, 'Failed to fetch stats')); }
  }
);

export const fetchAdminUsers = createAsyncThunk<
  { data: AdminUser[]; pagination: Pagination },
  Record<string, unknown> | undefined,
  { rejectValue: string }
>(
  'admin/fetchUsers',
  async (params, { rejectWithValue }) => {
    try {
      const res = await adminApi.getUsers(params);
      return res.data as { data: AdminUser[]; pagination: Pagination };
    } catch (err) { return rejectWithValue(extractError(err, 'Failed to fetch users')); }
  }
);

export const fetchAdminUser = createAsyncThunk<AdminUser, string, { rejectValue: string }>(
  'admin/fetchUser',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.getUser(id);
      return (res.data as { data: AdminUser }).data;
    } catch (err) { return rejectWithValue(extractError(err, 'User not found')); }
  }
);

export const updateAdminUser = createAsyncThunk<
  AdminUser,
  { id: string; data: Partial<AdminUser> },
  { rejectValue: string }
>(
  'admin/updateUser',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await adminApi.updateUser(id, data);
      return (res.data as { data: AdminUser }).data;
    } catch (err) { return rejectWithValue(extractError(err, 'Failed to update user')); }
  }
);

export const deleteAdminUser = createAsyncThunk<string, string, { rejectValue: string }>(
  'admin/deleteUser',
  async (id, { rejectWithValue }) => {
    try {
      await adminApi.deleteUser(id);
      return id;
    } catch (err) { return rejectWithValue(extractError(err, 'Failed to delete user')); }
  }
);

export const toggleAdminUserStatus = createAsyncThunk<AdminUser, string, { rejectValue: string }>(
  'admin/toggleStatus',
  async (id, { rejectWithValue }) => {
    try {
      const res = await adminApi.toggleStatus(id);
      return (res.data as { data: AdminUser }).data;
    } catch (err) { return rejectWithValue(extractError(err, 'Failed to toggle status')); }
  }
);

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    clearCurrentUser(state) { state.currentUser = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    const pending  = (state: AdminState) => { state.loading = true;  state.error = null; };
    const rejected = (state: AdminState, action: PayloadAction<string | undefined>) => {
      state.loading = false; state.error = action.payload ?? 'Error';
    };

    builder
      .addCase(fetchAdminStats.fulfilled, (state, action) => { state.stats = action.payload; })

      .addCase(fetchAdminUsers.pending,   pending)
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.loading    = false;
        state.users      = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchAdminUsers.rejected,  rejected)

      .addCase(fetchAdminUser.pending,    pending)
      .addCase(fetchAdminUser.fulfilled,  (state, action) => { state.loading = false; state.currentUser = action.payload; })
      .addCase(fetchAdminUser.rejected,   rejected)

      .addCase(updateAdminUser.pending,   pending)
      .addCase(updateAdminUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
        state.users = state.users.map((u) => u.id === action.payload.id ? action.payload : u);
      })
      .addCase(updateAdminUser.rejected,  rejected)

      .addCase(deleteAdminUser.fulfilled, (state, action) => {
        state.users = state.users.filter((u) => u.id !== action.payload);
      })
      .addCase(deleteAdminUser.rejected,  rejected)

      .addCase(toggleAdminUserStatus.fulfilled, (state, action) => {
        state.users = state.users.map((u) => u.id === action.payload.id ? action.payload : u);
        if (state.currentUser?.id === action.payload.id) state.currentUser = action.payload;
      })
      .addCase(toggleAdminUserStatus.rejected, rejected);
  },
});

export const { clearCurrentUser, clearError } = adminSlice.actions;
export default adminSlice.reducer;
