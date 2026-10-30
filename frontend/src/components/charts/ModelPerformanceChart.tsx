import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { subject: 'Precision', A: 92, fullMark: 100 },
  { subject: 'Recall', A: 88, fullMark: 100 },
  { subject: 'F1 Score', A: 90, fullMark: 100 },
  { subject: 'Accuracy', A: 94, fullMark: 100 },
  { subject: 'Latency', A: 85, fullMark: 100 },
];

export const ModelPerformanceChart = () => {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280' }} />
          <Radar name="Model Metrics" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.4} />
          <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};
