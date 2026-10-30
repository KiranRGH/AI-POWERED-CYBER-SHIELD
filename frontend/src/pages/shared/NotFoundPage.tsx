import React from 'react';
import { Search, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-800 mb-4">404</h1>
        <h2 className="text-3xl font-bold text-gray-200 mb-4">Sector Not Found</h2>
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          The coordinates you entered do not match any known sectors in the CyberShield platform. The page may have been moved or deleted.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
          <Link 
            to="/"
            className="inline-flex items-center justify-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium px-6 py-3 rounded-lg transition-colors w-full sm:w-auto"
          >
            <Home size={18} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
