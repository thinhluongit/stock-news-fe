'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Eye, Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchLikeStatus, toggleLike,
  fetchBookmarkStatus, toggleBookmark,
} from '../../store/slices/engagementSlice';
import { formatNumber } from '../../lib/utils';
import type { EngagementCounts } from '../../types';
import ShareMenu from './ShareMenu';

interface Props {
  articleId: string;
  articleTitle: string;
  articleUrl: string;
  initialCounts: EngagementCounts;
}

export default function EngagementBar({ articleId, articleTitle, articleUrl, initialCounts }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const likeEntry  = useAppSelector(s => s.engagement.likes[articleId]);
  const bookmarked = useAppSelector(s => s.engagement.bookmarks[articleId]);

  const liked      = likeEntry?.liked ?? false;
  const likeCount  = likeEntry?.count ?? initialCounts.likes;

  useEffect(() => {
    if (user && articleId) {
      dispatch(fetchLikeStatus(articleId));
      dispatch(fetchBookmarkStatus(articleId));
    }
  }, [articleId, user, dispatch]);

  const handleLike = () => {
    if (!user) {
      toast.error('Log in to like articles');
      return;
    }
    dispatch(toggleLike(articleId));
  };

  const handleBookmark = () => {
    if (!user) {
      toast.error('Log in to save articles');
      return;
    }
    dispatch(toggleBookmark(articleId));
    if (!bookmarked) toast.success('Article saved');
    else toast('Removed from saved articles');
  };

  return (
    <div className="flex items-center justify-between py-3 border-y border-gray-200 dark:border-gray-800 my-6">
      {/* Counts */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <span className="flex items-center gap-1.5">
          <Eye size={15} />
          {formatNumber(initialCounts.views)}
        </span>

        <button
          onClick={handleLike}
          aria-label={liked ? 'Unlike' : 'Like'}
          className={`flex items-center gap-1.5 transition-colors ${
            liked
              ? 'text-red-500 hover:text-red-600'
              : 'hover:text-red-400'
          }`}
        >
          <Heart size={15} fill={liked ? 'currentColor' : 'none'} />
          <span>{formatNumber(likeCount)}</span>
        </button>

        <Link
          href="#comments"
          className="flex items-center gap-1.5 hover:text-green-400 transition-colors"
        >
          <MessageCircle size={15} />
          <span>{formatNumber(initialCounts.comments)}</span>
        </Link>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <ShareMenu articleId={articleId} title={articleTitle} url={articleUrl} />

        <button
          onClick={handleBookmark}
          aria-label={bookmarked ? 'Remove bookmark' : 'Save article'}
          title={bookmarked ? 'Remove from saved' : 'Save article'}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
            bookmarked
              ? 'text-green-500 hover:text-green-600 bg-green-500/10'
              : 'text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          <Bookmark size={15} fill={bookmarked ? 'currentColor' : 'none'} />
          {bookmarked ? 'Saved' : 'Save'}
        </button>
      </div>
    </div>
  );
}
