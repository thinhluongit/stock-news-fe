import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../services/api';
import { User, LoginCredentials, RegisterData } from '../../types';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const getStoredToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const initialState: AuthState = {
  user: null,
  token: getStoredToken(),
  loading: false,
  error: null,
  initialized: false,
};

export const loginUser = createAsyncThunk<
  { token: string; user: User },
  LoginCredentials,
  { rejectValue: string }
>('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await authApi.login(credentials);
    const { token, user } = res.data as { token: string; user: User };
    localStorage.setItem('token', token);
    return { token, user };
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
    return rejectWithValue(msg ?? 'Login failed');
  }
});

export const registerUser = createAsyncThunk<
  { token: string; user: User },
  RegisterData,
  { rejectValue: string }
>('auth/register', async (data, { rejectWithValue }) => {
  try {
    const res = await authApi.register(data);
    const { token, user } = res.data as { token: string; user: User };
    localStorage.setItem('token', token);
    return { token, user };
  } catch (err: unknown) {
    const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
    return rejectWithValue(msg ?? 'Registration failed');
  }
});

export const fetchCurrentUser = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const res = await authApi.getMe();
      return (res.data as { user: User }).user;
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      return rejectWithValue(msg ?? 'Failed to fetch user');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.initialized = true;
      if (typeof window !== 'undefined') localStorage.removeItem('token');
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const pending = (state: AuthState) => { state.loading = true; state.error = null; };
    const rejected = (state: AuthState, action: PayloadAction<string | undefined>) => {
      state.loading = false;
      state.error = action.payload ?? 'Unknown error';
    };

    builder
      .addCase(loginUser.pending, pending)
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, rejected)
      .addCase(registerUser.pending, pending)
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(registerUser.rejected, rejected)
      .addCase(fetchCurrentUser.pending, pending)
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
        state.initialized = true;
        if (typeof window !== 'undefined') localStorage.removeItem('token');
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
