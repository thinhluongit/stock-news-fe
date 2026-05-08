'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Loader2, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchComments, fetchMoreComments, createComment, updateComment,
  resetComments,
} from '../../store/slices/engagementSlice';
import CommentItem from './CommentItem';

const MAX_BODY = 2000;

interface Props {
  articleId: string;
}

export default function CommentsSection({ articleId }: Props) {
  const dispatch = useAppDispatch();
  const user       = useAppSelector(s => s.auth.user);
  const comments   = useAppSelector(s => s.engagement.comments);
  const pagination = useAppSelector(s => s.engagement.commentPagination);
  const loading    = useAppSelector(s => s.engagement.commentLoading);
  const submitting = useAppSelector(s => s.engagement.submitting);

  const [sort, setSort]           = useState<'newest' | 'oldest'>('newest');
  const [body, setBody]           = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody]   = useState('');

  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    dispatch(resetComments());
    dispatch(fetchComments({ articleId, sort }));
  }, [articleId, sort, dispatch]);

  const handleSortChange = (newSort: 'newest' | 'oldest') => {
    if (newSort !== sort) setSort(newSort);
  };

  const handleSubmitComment = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    const res = await dispatch(createComment({ articleId, body: trimmed }));
    if (createComment.fulfilled.match(res)) {
      setBody('');
      toast.success('Comment posted');
    } else {
      toast.error('Failed to post comment');
    }
  };

  const handleSubmitReply = async () => {
    if (!replyingTo) return;
    const trimmed = replyBody.trim();
    if (!trimmed) return;
    const res = await dispatch(createComment({ articleId, body: trimmed, parent_id: replyingTo.id }));
    if (createComment.fulfilled.match(res)) {
      setReplyBody('');
      setReplyingTo(null);
      toast.success('Reply posted');
    } else {
      toast.error('Failed to post reply');
    }
  };

  const handleSubmitEdit = async () => {
    if (!editingId) return;
    const trimmed = editBody.trim();
    if (!trimmed) return;
    const res = await dispatch(updateComment({ commentId: editingId, body: trimmed }));
    if (updateComment.fulfilled.match(res)) {
      setEditingId(null);
      setEditBody('');
      toast.success('Comment updated');
    } else {
      toast.error('Failed to update comment');
    }
  };

  const handleReply = useCallback((id: string, name: string) => {
    setReplyingTo({ id, name });
    setReplyBody('');
    setEditingId(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleEdit = useCallback((id: string, currentBody: string) => {
    setEditingId(id);
    setEditBody(currentBody);
    setReplyingTo(null);
  }, []);

  const canLoadMore = pagination ? pagination.page < pagination.pages : false;
  const nextPage    = pagination ? pagination.page + 1 : 2;
  const total       = pagination?.total ?? 0;

  return (
    <section id="comments" className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
          <MessageCircle size={20} className="text-green-400" />
          Comments
          {total > 0 && (
            <span className="text-sm font-normal text-gray-400">({total})</span>
          )}
        </h2>

        <div className="flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['newest', 'oldest'] as const).map(s => (
            <button
              key={s}
              onClick={() => handleSortChange(s)}
              className={`px-2.5 py-1 rounded-md capitalize transition-colors ${
                sort === s
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Comment input */}
      {user ? (
        <div className="mb-8">
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg">
              <span>
                Replying to <span className="font-semibold text-gray-700 dark:text-gray-300">{replyingTo.name}</span>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold text-green-400">
                {user.full_name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
            </div>

            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={replyingTo ? replyBody : body}
                onChange={e => replyingTo ? setReplyBody(e.target.value) : setBody(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.name}…` : 'Write a comment…'}
                maxLength={MAX_BODY}
                rows={3}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-green-500 resize-none transition-colors"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400">
                  {MAX_BODY - (replyingTo ? replyBody : body).length} chars left
                </span>
                <button
                  onClick={replyingTo ? handleSubmitReply : handleSubmitComment}
                  disabled={submitting || (replyingTo ? !replyBody.trim() : !body.trim())}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm px-4 py-1.5 rounded-lg transition-colors"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {submitting ? 'Posting…' : replyingTo ? 'Reply' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 py-4 text-center text-sm text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <Link href="/auth/login" className="text-green-400 hover:text-green-300 font-medium">
            Log in
          </Link>{' '}
          to join the discussion
        </div>
      )}

      {/* Comment list */}
      {loading && comments.length === 0 ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-green-400" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-center py-8 text-sm text-gray-400">
          No comments yet. Be the first!
        </p>
      ) : (
        <div className="space-y-6">
          {comments.map(comment => (
            editingId === comment.id ? (
              <div key={comment.id} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-green-400">
                    {comment.author?.full_name?.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1">
                  <textarea
                    value={editBody}
                    onChange={e => setEditBody(e.target.value)}
                    maxLength={MAX_BODY}
                    rows={3}
                    autoFocus
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-green-500 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:outline-none resize-none"
                  />
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button
                      onClick={() => { setEditingId(null); setEditBody(''); }}
                      className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmitEdit}
                      disabled={submitting || !editBody.trim()}
                      className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white text-xs px-4 py-1.5 rounded-lg transition-colors"
                    >
                      {submitting ? <Loader2 size={12} className="animate-spin" /> : null}
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <CommentItem
                key={comment.id}
                comment={comment}
                articleId={articleId}
                onReply={handleReply}
                onEdit={handleEdit}
              />
            )
          ))}

          {canLoadMore && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => dispatch(fetchMoreComments({ articleId, page: nextPage, sort }))}
                disabled={loading}
                className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-500 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                Load more comments
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
