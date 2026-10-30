import React from 'react';
import { formatDistanceToNow } from 'date-fns';

export const TimeAgo: React.FC<{ date: string | Date, className?: string }> = ({ date, className = '' }) => {
  const timeString = formatDistanceToNow(new Date(date), { addSuffix: true });
  
  return (
    <span className={`text-sm text-gray-400 ${className}`} title={new Date(date).toLocaleString()}>
      {timeString}
    </span>
  );
};
