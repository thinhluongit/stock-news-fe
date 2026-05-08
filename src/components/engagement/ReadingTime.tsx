import { Clock } from 'lucide-react';

interface Props {
  content?: string;
  className?: string;
}

function estimateMinutes(content: string): number {
  const text = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

export default function ReadingTime({ content, className }: Props) {
  if (!content) return null;
  const minutes = estimateMinutes(content);
  return (
    <span className={`flex items-center gap-1 text-xs text-gray-500 ${className ?? ''}`}>
      <Clock size={12} />
      {minutes} min read
    </span>
  );
}
