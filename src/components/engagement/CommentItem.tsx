'use client';

import { useState } from 'react';
import { Heart, Reply, Edit2, Trash2, ChevronDown, Loader2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  toggleCommentLike, deleteComment, fetchReplies,
} from '../../store/slices/engagementSlice';
import { formatDateRelative } from '../../lib/utils';
import type { Comment } from '../../types';

function Avatar({ name, url }: { name?: string; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  const initials = name
    ? name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';
  return (
    <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
      <span className="text-xs font-bold text-green-400">{initials}</span>
    </div>
  );
}

interface Props {
  comment: Comment;
  articleId: string;
  isReply?: boolean;
  onReply: (commentId: string, authorName: string) => void;
  onEdit: (commentId: string, currentBody: string) => void;
}

export default function CommentItem({ comment, articleId, isReply = false, onReply, onEdit }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const replyLoading = useAppSelector(s => s.engagement.replyLoading[comment.id]);

  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);

  const isOwn   = !!user && comment.author?.id === user.id;
  const isAdmin = user?.role === 'admin';
  const isDeleted = comment.is_deleted || !comment.author;

  const handleLike = () => dispatch(toggleCommentLike(comment.id));

  const handleDelete = () => {
    if (!showConfirmDelete) { setShowConfirmDelete(true); return; }
    dispatch(deleteComment(comment.id));
    setShowConfirmDelete(false);
  };

  const handleLoadReplies = () => {
    if (!repliesExpanded) {
      dispatch(fetchReplies(comment.id));
      setRepliesExpanded(true);
    } else {
      setRepliesExpanded(false);
    }
  };

  const hasReplies    = (comment.reply_count ?? 0) > 0 || (comment.replies?.length ?? 0) > 0;
  const repliesLoaded = (comment.replies?.length ?? 0) > 0;

  return (
    <div className={`flex gap-3 ${isReply ? '' : ''}`}>
      <Avatar name={comment.author?.full_name} url={comment.author?.avatar_url} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {comment.author?.full_name ?? 'Deleted user'}
          </span>
          <span className="text-xs text-gray-400">
            {formatDateRelative(comment.created_at)}
          </span>
          {comment.is_edited && (
            <span className="text-xs text-gray-400 italic">(edited)</span>
          )}
        </div>

        {/* Body */}
        {isDeleted ? (
          <p className="text-sm text-gray-400 italic">[Comment deleted]</p>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line break-words">
            {comment.body}
          </p>
        )}

        {/* Actions */}
        {!isDeleted && (
          <div className="flex items-center gap-3 mt-2">
            {/* Like */}
            {user && (
              <button
                onClick={handleLike}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  comment.is_liked_by_me
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-gray-400 hover:text-red-400'
                }`}
              >
                <Heart size={13} fill={comment.is_liked_by_me ? 'currentColor' : 'none'} />
                {comment.like_count > 0 && <span>{comment.like_count}</span>}
              </button>
            )}
            {!user && comment.like_count > 0 && (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Heart size={13} />
                {comment.like_count}
              </span>
            )}

            {/* Reply — only on top-level */}
            {!isReply && user && (
              <button
                onClick={() => onReply(comment.id, comment.author?.full_name ?? '')}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-400 transition-colors"
              >
                <Reply size={13} />
                Reply
              </button>
            )}

            {/* Edit / Delete — own comments or admin */}
            {(isOwn || isAdmin) && (
              <>
                {isOwn && (
                  <button
                    onClick={() => onEdit(comment.id, comment.body)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Edit2 size={13} />
                    Edit
                  </button>
                )}
                {showConfirmDelete ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Delete?</span>
                    <button onClick={handleDelete} className="text-red-500 hover:text-red-600 font-medium">Yes</button>
                    <button onClick={() => setShowConfirmDelete(false)} className="text-gray-400 hover:text-gray-600">No</button>
                  </span>
                ) : (
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Replies toggle */}
        {!isReply && hasReplies && (
          <div className="mt-3">
            <button
              onClick={handleLoadReplies}
              className="flex items-center gap-1.5 text-xs text-green-400 hover:text-green-300 transition-colors"
            >
              {replyLoading ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <ChevronDown size={12} className={`transition-transform ${repliesExpanded ? 'rotate-180' : ''}`} />
              )}
              {repliesExpanded
                ? 'Hide replies'
                : `${comment.reply_count ?? comment.replies?.length ?? 0} repl${(comment.reply_count ?? 1) === 1 ? 'y' : 'ies'}`
              }
            </button>

            {repliesExpanded && repliesLoaded && (
              <div className="mt-3 pl-4 border-l-2 border-gray-200 dark:border-gray-800 space-y-4">
                {comment.replies!.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    articleId={articleId}
                    isReply
                    onReply={onReply}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
