import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { postsApi } from '../../services/api';
import { Article, Pagination } from '../../types';

interface PostsState {
  posts: Article[];
  pagination: Pagination | null;
  currentPost: Article | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: PostsState = {
  posts: [],
  pagination: null,
  currentPost: null,
  loading: false,
  saving: false,
  error: null,
};

type ApiError = { response?: { data?: { error?: string } } };
const extractError = (err: unknown, fallback: string): string =>
  (err as ApiError).response?.data?.error ?? fallback;

export const fetchPosts = createAsyncThunk<
  { data: Article[]; pagination: Pagination },
  Record<string, unknown> | undefined,
  { rejectValue: string }
>('posts/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await postsApi.getAll(params);
    return res.data as { data: Article[]; pagination: Pagination };
  } catch (err) {
    return rejectWithValue(extractError(err, 'Failed to fetch posts'));
  }
});

export const fetchPost = createAsyncThunk<Article, string, { rejectValue: string }>(
  'posts/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const res = await postsApi.getById(id);
      return (res.data as { data: Article }).data;
    } catch (err) {
      return rejectWithValue(extractError(err, 'Post not found'));
    }
  }
);

export const createPost = createAsyncThunk<Article, Record<string, unknown>, { rejectValue: string }>(
  'posts/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await postsApi.create(data);
      return (res.data as { data: Article }).data;
    } catch (err) {
      return rejectWithValue(extractError(err, 'Failed to create post'));
    }
  }
);

export const updatePost = createAsyncThunk<
  Article,
  { id: string; data: Record<string, unknown> },
  { rejectValue: string }
>('posts/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await postsApi.update(id, data);
    return (res.data as { data: Article }).data;
  } catch (err) {
    return rejectWithValue(extractError(err, 'Failed to save post'));
  }
});

export const changePostStatus = createAsyncThunk<
  Article,
  { id: string; doc_status: 0 | 1 | 2 },
  { rejectValue: string }
>('posts/changeStatus', async ({ id, doc_status }, { rejectWithValue }) => {
  try {
    const res = await postsApi.updateStatus(id, doc_status);
    return (res.data as { data: Article }).data;
  } catch (err) {
    return rejectWithValue(extractError(err, 'Failed to change status'));
  }
});

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearCurrentPost(state) {
      state.currentPost = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchPosts.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.loading = false;
        state.error = action.payload ?? 'Error';
      })

      .addCase(fetchPost.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(fetchPost.fulfilled, (state, action) => {
        state.loading = false;
        state.currentPost = action.payload;
      })
      .addCase(fetchPost.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.loading = false;
        state.error = action.payload ?? 'Error';
      })

      .addCase(createPost.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(createPost.fulfilled, (state) => { state.saving = false; })
      .addCase(createPost.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.saving = false;
        state.error = action.payload ?? 'Error';
      })

      .addCase(updatePost.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(updatePost.fulfilled, (state, action) => {
        state.saving = false;
        state.currentPost = action.payload;
      })
      .addCase(updatePost.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.saving = false;
        state.error = action.payload ?? 'Error';
      })

      .addCase(changePostStatus.pending, (state) => { state.saving = true; state.error = null; })
      .addCase(changePostStatus.fulfilled, (state, action) => {
        state.saving = false;
        state.currentPost = action.payload;
      })
      .addCase(changePostStatus.rejected, (state, action: PayloadAction<string | undefined>) => {
        state.saving = false;
        state.error = action.payload ?? 'Error';
      });
  },
});

export const { clearCurrentPost } = postsSlice.actions;
export default postsSlice.reducer;
