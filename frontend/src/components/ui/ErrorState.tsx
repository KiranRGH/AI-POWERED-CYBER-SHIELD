import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-500/10 border border-red-500/20 rounded-xl">
      <AlertCircle size={40} className="text-red-500 mb-4" />
      <h3 className="text-lg font-medium text-gray-100 mb-2">Something went wrong</h3>
      <p className="text-sm text-red-400 mb-6">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="flex items-center space-x-2 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300">
          <RefreshCw size={16} />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
};
