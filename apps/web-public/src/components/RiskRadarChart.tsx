'use client';

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';

interface RiskRadarChartProps {
  riskComponents: Record<string, number> | string | undefined;
}

export default function RiskRadarChart({ riskComponents }: RiskRadarChartProps) {
  let parsed: Record<string, number> = {
    competition: 0.1,
    timeline: 0.1,
    financial: 0.1,
    transparency: 0.1,
    compliance: 0.1
  };

  if (riskComponents) {
    try {
      parsed = typeof riskComponents === 'string' 
        ? JSON.parse(riskComponents) 
        : riskComponents;
    } catch {
      // fallback
    }
  }

  const data = [
    { subject: 'Competition', score: Math.round((parsed.competition || 0.1) * 100), fullMark: 100 },
    { subject: 'Timeline', score: Math.round((parsed.timeline || 0.1) * 100), fullMark: 100 },
    { subject: 'Financial', score: Math.round((parsed.financial || 0.1) * 100), fullMark: 100 },
    { subject: 'Transparency', score: Math.round((parsed.transparency || 0.1) * 100), fullMark: 100 },
    { subject: 'Compliance', score: Math.round((parsed.compliance || 0.1) * 100), fullMark: 100 },
  ];

  return (
    <div style={{ width: '100%', height: '240px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#333" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#ccc', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#888', fontSize: 9 }} />
          <Radar
            name="Risk Score"
            dataKey="score"
            stroke="#ff5a5a"
            fill="#ff5a5a"
            fillOpacity={0.4}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
