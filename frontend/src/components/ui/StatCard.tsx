import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'cyan' | 'emerald' | 'blue' | 'orange' | 'red' | 'gray';
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, color = 'cyan' }) => {
  const colorMap = {
    cyan: 'text-cyan-400 bg-cyan-900/20',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    blue: 'text-blue-400 bg-blue-900/20',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10',
    gray: 'text-gray-400 bg-gray-800',
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-5 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <h3 className="text-2xl font-bold text-gray-100 mt-2">{value}</h3>
          
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}% from last week
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};
