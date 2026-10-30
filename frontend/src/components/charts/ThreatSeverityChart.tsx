import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const defaultData = [
  { name: 'CRITICAL', value: 12 },
  { name: 'HIGH', value: 45 },
  { name: 'MEDIUM', value: 130 },
  { name: 'LOW', value: 450 },
  { name: 'INFO', value: 206 },
];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#6b7280'];

export interface ThreatSeverityChartProps {
  data?: Array<{ name: string; value: number }>;
}

export const ThreatSeverityChart: React.FC<ThreatSeverityChartProps> = ({ data: propData }) => {
  const chartData = propData && propData.length > 0 ? propData : defaultData;

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
            itemStyle={{ color: '#fff' }}
          />
          <Legend wrapperStyle={{ color: '#9ca3af' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ThreatSeverityChart;
