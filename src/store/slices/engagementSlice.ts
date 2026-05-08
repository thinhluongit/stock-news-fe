'use client';

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { engagementApi } from '../../services/api';
import type { ArticleLike, ArticleBookmark, Comment, CommentPage, Pagination } from '../../types';

interface LikeEntry { liked: boolean; count: number; }

interface EngagementState {
  likes:             Record<string, LikeEntry>;
  bookmarks:         Record<string, boolean>;
  comments:          Comment[];
  replyLoading:      Record<string, boolean>;
  commentPagination: Pagination | null;
  commentLoading:    boolean;
  commentError:      string | null;
  submitting:        boolean;
  submitError:       string | null;
}

type EngState = { engagement: EngagementState };

const initialState: EngagementState = {
  likes:             {},
  bookmarks:         {},
  comments:          [],
  replyLoading:      {},
  commentPagination: null,
  commentLoading:    false,
  commentError:      null,
  submitting:        false,
  submitError:       null,
};

// ── Article like / bookmark ───────────────────────────────────────────────────

export const fetchLikeStatus = createAsyncThunk<ArticleLike, string, { rejectValue: string }>(
  'engagement/fetchLikeStatus',
  async (articleId, { rejectWithValue }) => {
    try {
      const res = await engagementApi.getLike(articleId);
      return (res.data as { data: ArticleLike }).data;
    } catch {
      return rejectWithValue('Failed');
    }
  }
);

export const toggleLike = createAsyncThunk<
  ArticleLike,
  string,
  { state: EngState; rejectValue: { error: string; prev: LikeEntry } }
>(
  'engagement/toggleLike',
  async (articleId, { getState, rejectWithValue }) => {
    const prev = getState().engagement.likes[articleId] ?? { liked: false, count: 0 };
    try {
      const res = await engagementApi.toggleLike(articleId);
      return (res.data as { data: ArticleLike }).data;
    } catch {
      return rejectWithValue({ error: 'Failed to toggle like', prev });
    }
  }
);

export const fetchBookmarkStatus = createAsyncThunk<ArticleBookmark, string, { rejectValue: string }>(
  'engagement/fetchBookmarkStatus',
  async (articleId, { rejectWithValue }) => {
    try {
      const res = await engagementApi.getBookmark(articleId);
      return (res.data as { data: ArticleBookmark }).data;
    } catch {
      return rejectWithValue('Failed');
    }
  }
);

export const toggleBookmark = createAsyncThunk<
  ArticleBookmark,
  string,
  { state: EngState; rejectValue: { error: string; prev: boolean } }
>(
  'engagement/toggleBookmark',
  async (articleId, { getState, rejectWithValue }) => {
    const prev = getState().engagement.bookmarks[articleId] ?? false;
    try {
      const res = await engagementApi.toggleBookmark(articleId);
      return (res.data as { data: ArticleBookmark }).data;
    } catch {
      return rejectWithValue({ error: 'Failed to toggle bookmark', prev });
    }
  }
);

// ── Comments ──────────────────────────────────────────────────────────────────

export const fetchComments = createAsyncThunk<
  CommentPage,
  { articleId: string; page?: number; sort?: 'newest' | 'oldest' },
  { rejectValue: string }
>(
  'engagement/fetchComments',
  async ({ articleId, page = 1, sort = 'newest' }, { rejectWithValue }) => {
    try {
      const res = await engagementApi.getComments(articleId, { page, limit: 20, sort });
      return res.data as CommentPage;
    } catch {
      return rejectWithValue('Failed to load comments');
    }
  }
);

export const fetchMoreComments = createAsyncThunk<
  CommentPage,
  { articleId: string; page: number; sort?: 'newest' | 'oldest' },
  { rejectValue: string }
>(
  'engagement/fetchMoreComments',
  async ({ articleId, page, sort = 'newest' }, { rejectWithValue }) => {
    try {
      const res = await engagementApi.getComments(articleId, { page, limit: 20, sort });
      return res.data as CommentPage;
    } catch {
      return rejectWithValue('Failed');
    }
  }
);

export const fetchReplies = createAsyncThunk<
  { commentId: string; replies: Comment[] },
  string,
  { rejectValue: string }
>(
  'engagement/fetchReplies',
  async (commentId, { rejectWithValue }) => {
    try {
      const res = await engagementApi.getReplies(commentId);
      return { commentId, replies: (res.data as { data: Comment[] }).data };
    } catch {
      return rejectWithValue('Failed to load replies');
    }
  }
);

export const createComment = createAsyncThunk<
  Comment,
  { articleId: string; body: string; parent_id?: string | null },
  { rejectValue: string }
>(
  'engagement/createComment',
  async ({ articleId, body, parent_id }, { rejectWithValue }) => {
    try {
      const res = await engagementApi.createComment(articleId, body, parent_id);
      return (res.data as { data: Comment }).data;
    } catch {
      return rejectWithValue('Failed to post comment');
    }
  }
);

export const updateComment = createAsyncThunk<
  Comment,
  { commentId: string; body: string },
  { rejectValue: string }
>(
  'engagement/updateComment',
  async ({ commentId, body }, { rejectWithValue }) => {
    try {
      const res = await engagementApi.updateComment(commentId, body);
      return (res.data as { data: Comment }).data;
    } catch {
      return rejectWithValue('Failed to update comment');
    }
  }
);

export const deleteComment = createAsyncThunk<string, string, { rejectValue: string }>(
  'engagement/deleteComment',
  async (commentId, { rejectWithValue }) => {
    try {
      await engagementApi.deleteComment(commentId);
      return commentId;
    } catch {
      return rejectWithValue('Failed to delete comment');
    }
  }
);

export const toggleCommentLike = createAsyncThunk<
  { commentId: string; liked: boolean; count: number },
  string,
  { rejectValue: { commentId: string } }
>(
  'engagement/toggleCommentLike',
  async (commentId, { rejectWithValue }) => {
    try {
      const res = await engagementApi.toggleCommentLike(commentId);
      const d = (res.data as { data: { liked: boolean; like_count: number } }).data;
      return { commentId, liked: d.liked, count: d.like_count };
    } catch {
      return rejectWithValue({ commentId });
    }
  }
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function mapComment(comments: Comment[], id: string, fn: (c: Comment) => Comment): Comment[] {
  return comments.map(c => {
    if (c.id === id) return fn(c);
    if (c.replies?.length) return { ...c, replies: c.replies.map(r => r.id === id ? fn(r) : r) };
    return c;
  });
}

function removeComment(comments: Comment[], id: string): Comment[] {
  return comments
    .filter(c => c.id !== id)
    .map(c => c.replies?.length ? { ...c, replies: c.replies.filter(r => r.id !== id) } : c);
}

// ── Slice ─────────────────────────────────────────────────────────────────────

const engagementSlice = createSlice({
  name: 'engagement',
  initialState,
  reducers: {
    resetComments(state) {
      state.comments = [];
      state.commentPagination = null;
      state.commentError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchLikeStatus
      .addCase(fetchLikeStatus.fulfilled, (state, { payload: p }) => {
        state.likes[p.article_id] = { liked: p.liked, count: p.total_likes };
      })

      // toggleLike — optimistic
      .addCase(toggleLike.pending, (state, action) => {
        const id = action.meta.arg;
        const prev = state.likes[id] ?? { liked: false, count: 0 };
        state.likes[id] = { liked: !prev.liked, count: Math.max(0, prev.count + (!prev.liked ? 1 : -1)) };
      })
      .addCase(toggleLike.fulfilled, (state, { payload: p }) => {
        state.likes[p.article_id] = { liked: p.liked, count: p.total_likes };
      })
      .addCase(toggleLike.rejected, (state, action) => {
        if (action.payload?.prev) state.likes[action.meta.arg] = action.payload.prev;
      })

      // fetchBookmarkStatus
      .addCase(fetchBookmarkStatus.fulfilled, (state, { payload: p }) => {
        state.bookmarks[p.article_id] = p.bookmarked;
      })

      // toggleBookmark — optimistic
      .addCase(toggleBookmark.pending, (state, action) => {
        state.bookmarks[action.meta.arg] = !(state.bookmarks[action.meta.arg] ?? false);
      })
      .addCase(toggleBookmark.fulfilled, (state, { payload: p }) => {
        state.bookmarks[p.article_id] = p.bookmarked;
      })
      .addCase(toggleBookmark.rejected, (state, action) => {
        if (action.payload !== undefined) state.bookmarks[action.meta.arg] = action.payload.prev;
      })

      // fetchComments
      .addCase(fetchComments.pending, (state) => { state.commentLoading = true; state.commentError = null; })
      .addCase(fetchComments.fulfilled, (state, { payload }) => {
        state.commentLoading = false;
        state.comments = payload.data;
        state.commentPagination = payload.pagination;
      })
      .addCase(fetchComments.rejected, (state, action) => {
        state.commentLoading = false;
        state.commentError = action.payload ?? 'Error';
      })

      // fetchMoreComments
      .addCase(fetchMoreComments.fulfilled, (state, { payload }) => {
        state.comments = [...state.comments, ...payload.data];
        state.commentPagination = payload.pagination;
      })

      // fetchReplies
      .addCase(fetchReplies.pending, (state, action) => { state.replyLoading[action.meta.arg] = true; })
      .addCase(fetchReplies.fulfilled, (state, { payload: { commentId, replies } }) => {
        state.replyLoading[commentId] = false;
        state.comments = mapComment(state.comments, commentId, c => ({ ...c, replies }));
      })
      .addCase(fetchReplies.rejected, (state, action) => { state.replyLoading[action.meta.arg] = false; })

      // createComment
      .addCase(createComment.pending, (state) => { state.submitting = true; state.submitError = null; })
      .addCase(createComment.fulfilled, (state, { payload: c }) => {
        state.submitting = false;
        if (c.parent_id) {
          state.comments = mapComment(state.comments, c.parent_id, p => ({
            ...p,
            reply_count: (p.reply_count ?? 0) + 1,
            replies: [...(p.replies ?? []), c],
          }));
        } else {
          state.comments = [c, ...state.comments];
          if (state.commentPagination) {
            state.commentPagination = { ...state.commentPagination, total: state.commentPagination.total + 1 };
          }
        }
      })
      .addCase(createComment.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload ?? 'Error';
      })

      // updateComment
      .addCase(updateComment.pending, (state) => { state.submitting = true; })
      .addCase(updateComment.fulfilled, (state, { payload: updated }) => {
        state.submitting = false;
        state.comments = mapComment(state.comments, updated.id, () => updated);
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.submitting = false;
        state.submitError = action.payload ?? 'Error';
      })

      // deleteComment
      .addCase(deleteComment.fulfilled, (state, { payload: id }) => {
        state.comments = removeComment(state.comments, id);
        if (state.commentPagination) {
          state.commentPagination = { ...state.commentPagination, total: Math.max(0, state.commentPagination.total - 1) };
        }
      })

      // toggleCommentLike — optimistic
      .addCase(toggleCommentLike.pending, (state, action) => {
        state.comments = mapComment(state.comments, action.meta.arg, c => ({
          ...c,
          is_liked_by_me: !c.is_liked_by_me,
          like_count: Math.max(0, c.like_count + (!c.is_liked_by_me ? 1 : -1)),
        }));
      })
      .addCase(toggleCommentLike.fulfilled, (state, { payload: { commentId, liked, count } }) => {
        state.comments = mapComment(state.comments, commentId, c => ({ ...c, is_liked_by_me: liked, like_count: count }));
      })
      .addCase(toggleCommentLike.rejected, (state, action) => {
        if (action.payload) {
          const id = action.payload.commentId;
          state.comments = mapComment(state.comments, id, c => ({
            ...c,
            is_liked_by_me: !c.is_liked_by_me,
            like_count: Math.max(0, c.like_count + (!c.is_liked_by_me ? 1 : -1)),
          }));
        }
      });
  },
});

export const { resetComments } = engagementSlice.actions;
export default engagementSlice.reducer;
