import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const UnauthorizedPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="bg-gray-800 border border-red-500/30 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl shadow-red-900/20">
        <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-red-500/10 mb-6">
          <ShieldAlert size={40} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-100 mb-2">Access Denied</h1>
        <p className="text-gray-400 mb-8">
          You do not have the required permissions to access this security clearance level. This incident has been logged.
        </p>
        <Link 
          to="/"
          className="inline-flex items-center justify-center space-x-2 w-full bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-3 rounded-lg transition-colors"
        >
          <ArrowLeft size={18} />
          <span>Return to Safety</span>
        </Link>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
