import React from 'react';

export const LoadingSkeleton: React.FC<{ variant?: 'card' | 'table-row' | 'stat', className?: string }> = ({ variant = 'card', className = '' }) => {
  if (variant === 'stat') {
    return (
      <div className={`animate-pulse bg-gray-800 rounded-xl p-5 border border-gray-700 ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-600 rounded w-1/3"></div>
      </div>
    );
  }

  if (variant === 'table-row') {
    return (
      <div className={`animate-pulse flex items-center justify-between p-4 border-b border-gray-700 ${className}`}>
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/4"></div>
      </div>
    );
  }

  return (
    <div className={`animate-pulse bg-gray-800 rounded-xl p-6 border border-gray-700 ${className}`}>
      <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-700 rounded w-full"></div>
        <div className="h-4 bg-gray-700 rounded w-5/6"></div>
        <div className="h-4 bg-gray-700 rounded w-4/6"></div>
      </div>
    </div>
  );
};
