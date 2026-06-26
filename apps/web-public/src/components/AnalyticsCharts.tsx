/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface RiskData {
  level: string;
  count: number;
}

interface AgencyData {
  agency_name: string;
  total_awarded: number;
}

interface CaseSummaryItem {
  risk_score?: number;
  procurement_method?: string;
  awarded_amount?: number;
}

interface SupplierAwardItem {
  agency_acronym?: string;
  agency_name?: string;
  amount?: number;
  award_date?: string;
}



const RISK_COLORS: Record<string, string> = {
  Low: '#7A7670',      // low-risk gray
  Medium: '#D4821A',   // medium orange
  High: '#C0392B',     // high red
};

const AGENCY_COLORS = [
  '#2C5F8A', // DPWH (blue)
  '#8B5CF6', // DepEd (purple)
  '#C0392B', // DOH (red)
  '#D4821A', // DBM/Others (orange)
  '#7A7670', // low gray
];

export function RiskDistributionBarChart({ riskData }: { riskData: RiskData[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Ensure correct order Low -> Medium -> High
  const orderedData = [...riskData].sort((a, b) => {
    const order: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
    return (order[a.level] ?? 0) - (order[b.level] ?? 0);
  });

  if (!mounted) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Cases by Risk Level</h3>
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)' }}>Loading Chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Cases by Risk Level</h3>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={orderedData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="level"
              stroke="#4A4740"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              className="font-mono"
            />
            <YAxis
              stroke="#4A4740"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              className="font-mono"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={{ color: '#1A1814' }}
              labelStyle={{ fontWeight: 600, color: '#1A1814' }}
              cursor={{ fill: 'rgba(200, 196, 187, 0.15)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {orderedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.level] || '#7A7670'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AgencyConcentrationPieChart({ agencyData }: { agencyData: AgencyData[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Format Peso amount to compact currency
  function formatPesoCompact(value: number) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  // Pre-process: take top 4 and aggregate the rest into Others
  let formattedData = [...agencyData];
  if (formattedData.length > 4) {
    const top4 = formattedData.slice(0, 4);
    const othersSum = formattedData.slice(4).reduce((sum, item) => sum + item.total_awarded, 0);
    formattedData = [...top4, { agency_name: 'Others', total_awarded: othersSum }];
  }

  // Filter out any zero entries to prevent chart errors
  formattedData = formattedData.filter((d) => d.total_awarded > 0);

  if (!mounted) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Spending Concentration by Agency</h3>
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)' }}>Loading Chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Spending Concentration by Agency</h3>
      <div style={{ width: '100%', height: 260, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={formattedData}
              dataKey="total_awarded"
              nameKey="agency_name"
              cx="50%"
              cy="48%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
            >
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={AGENCY_COLORS[index % AGENCY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number | string) => [formatPesoCompact(Number(value)), 'Total Awarded']}
              contentStyle={tooltipStyle}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', marginTop: '10px' }}
              className="font-ui"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AgencyCasesRiskChart({ cases }: { cases: CaseSummaryItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Aggregate risk categories
  const counts = { Low: 0, Medium: 0, High: 0 };
  cases.forEach((c) => {
    const score = c.risk_score ?? 0;
    if (score < 0.35) counts.Low++;
    else if (score < 0.70) counts.Medium++;
    else counts.High++;
  });

  const chartData = [
    { level: 'Low', count: counts.Low },
    { level: 'Medium', count: counts.Medium },
    { level: 'High', count: counts.High },
  ];

  if (!mounted) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Case Risk Distribution</h3>
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)' }}>Loading Chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Case Risk Distribution</h3>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
            <XAxis dataKey="level" stroke="#4A4740" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
            <YAxis stroke="#4A4740" fontSize={11} tickLine={false} axisLine={false} className="font-mono" allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(200, 196, 187, 0.15)' }} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.level] || '#7A7670'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AgencyMethodShareChart({ cases }: { cases: CaseSummaryItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Aggregate total awarded value per procurement method
  const aggregates: Record<string, number> = {};
  cases.forEach((c) => {
    const method = c.procurement_method ? c.procurement_method.replace(/_/g, ' ') : 'Other';
    const amount = c.awarded_amount ?? 0;
    aggregates[method] = (aggregates[method] ?? 0) + amount;
  });

  const chartData = Object.entries(aggregates)
    .map(([method, value]) => ({ method, value }))
    .sort((a, b) => b.value - a.value);

  // Take top 3 and others
  let displayData = [...chartData];
  if (displayData.length > 3) {
    const top3 = displayData.slice(0, 3);
    const othersVal = displayData.slice(3).reduce((sum, item) => sum + item.value, 0);
    displayData = [...top3, { method: 'Others', value: othersVal }];
  }

  displayData = displayData.filter((d) => d.value > 0);

  function formatPesoCompact(value: number) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (!mounted) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Procurement Mode Value Share</h3>
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)' }}>Loading Chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Procurement Mode Value Share</h3>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              dataKey="value"
              nameKey="method"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={AGENCY_COLORS[index % AGENCY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: unknown) => [formatPesoCompact(Number(val)), 'Total Awarded']} contentStyle={tooltipStyle} />
            <Legend verticalAlign="bottom" height={24} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '10px' }} className="font-ui" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SupplierAgencyConcentrationChart({ awards }: { awards: SupplierAwardItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const aggregates: Record<string, number> = {};
  awards.forEach((a) => {
    const agency = a.agency_acronym ?? a.agency_name ?? 'Unknown';
    const amount = a.amount ?? 0;
    aggregates[agency] = (aggregates[agency] ?? 0) + amount;
  });

  const chartData = Object.entries(aggregates)
    .map(([agency, value]) => ({ agency, value }))
    .sort((a, b) => b.value - a.value);

  let displayData = [...chartData];
  if (displayData.length > 3) {
    const top3 = displayData.slice(0, 3);
    const othersVal = displayData.slice(3).reduce((sum, item) => sum + item.value, 0);
    displayData = [...top3, { agency: 'Others', value: othersVal }];
  }

  displayData = displayData.filter((d) => d.value > 0);

  function formatPesoCompact(value: number) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (!mounted) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Awards by Procuring Agency</h3>
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)' }}>Loading Chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Awards by Procuring Agency</h3>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={displayData}
              dataKey="value"
              nameKey="agency"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={2}
            >
              {displayData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={AGENCY_COLORS[index % AGENCY_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(val: unknown) => [formatPesoCompact(Number(val)), 'Total Awarded']} contentStyle={tooltipStyle} />
            <Legend verticalAlign="bottom" height={24} iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '10px' }} className="font-ui" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SupplierAwardTrendChart({ awards }: { awards: SupplierAwardItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const aggregates: Record<string, number> = {};
  awards.forEach((a) => {
    if (!a.award_date) return;
    const year = a.award_date.split('-')[0] || 'Unknown';
    const amount = a.amount ?? 0;
    aggregates[year] = (aggregates[year] ?? 0) + amount;
  });

  const chartData = Object.entries(aggregates)
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year.localeCompare(b.year));

  function formatPesoCompact(value: number) {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  if (!mounted) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Award Value Timeline</h3>
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)' }}>Loading Chart...</span>
        </div>
      </div>
    );
  }

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Award Value Timeline</h3>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
            <XAxis dataKey="year" stroke="#4A4740" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
            <YAxis stroke="#4A4740" fontSize={11} tickLine={false} axisLine={false} className="font-mono" tickFormatter={(v) => formatPesoCompact(v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val: unknown) => [formatPesoCompact(Number(val)), 'Total Awarded']} />
            <Bar dataKey="amount" fill="#2C5F8A" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Inline Styles
const chartWrapperStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-paper-dark, #EDEAE3)',
  border: '1px solid var(--color-rule, #C8C4BB)',
  borderRadius: '2px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-ink, #1A1814)',
  margin: 0,
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: '#EDEAE3',
  border: '1px solid #C8C4BB',
  borderRadius: '2px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};
