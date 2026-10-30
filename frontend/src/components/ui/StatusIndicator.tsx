import React from 'react';

export const StatusIndicator: React.FC<{ status: 'healthy' | 'degraded' | 'unavailable' | 'unknown' }> = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return 'bg-emerald-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unavailable': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="relative flex h-3 w-3">
        {status === 'healthy' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
        <span className={`relative inline-flex rounded-full h-3 w-3 ${getStatusColor()}`}></span>
      </span>
      <span className="text-sm text-gray-300 capitalize">{status}</span>
    </div>
  );
};
