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
  Low: '#5E6776',      // Low-risk slate gray
  Medium: '#FF9838',   // Medium orange
  High: '#FF4D5E',     // High red
};

const AGENCY_COLORS = [
  '#00B0FF', // Neon Blue
  '#8B5CF6', // Purple
  '#FF4D5E', // Red
  '#FF9838', // Orange
  '#00E676', // Green
];

export function RiskDistributionBarChart({ riskData = [] }: { riskData?: RiskData[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const safeData = riskData || [];
  const hasNoData = safeData.length === 0 || safeData.every(d => d.count === 0);

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

  if (hasNoData) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Cases by Risk Level</h3>
        <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>No Risk Data Available</span>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', textAlign: 'center', maxWidth: '280px' }}>
            The background crawler may still be populating projects, or the registry is empty.
          </span>
        </div>
      </div>
    );
  }

  // Ensure correct order Low -> Medium -> High
  const orderedData = [...safeData].sort((a, b) => {
    const order: Record<string, number> = { Low: 1, Medium: 2, High: 3 };
    return (order[a.level] ?? 0) - (order[b.level] ?? 0);
  });

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Cases by Risk Level</h3>
      <div style={{ width: '100%', height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={orderedData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
            <XAxis
              dataKey="level"
              stroke="var(--color-ink-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              className="font-mono"
            />
            <YAxis
              stroke="var(--color-ink-muted)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              className="font-mono"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              itemStyle={{ color: 'var(--color-ink)' }}
              labelStyle={{ fontWeight: 600, color: 'var(--color-ink)' }}
              cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
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

export function AgencyConcentrationPieChart({ agencyData = [] }: { agencyData?: AgencyData[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const safeData = agencyData || [];
  const validData = safeData.filter((d) => d.total_awarded > 0);
  const hasNoData = validData.length === 0;

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
        <h3 style={chartTitleStyle} className="font-ui">Spending Concentration by Agency</h3>
        <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-ink-muted)' }}>Loading Chart...</span>
        </div>
      </div>
    );
  }

  if (hasNoData) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Spending Concentration by Agency</h3>
        <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-ink)' }}>No Spending Data Available</span>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', textAlign: 'center', maxWidth: '280px' }}>
            No procurement cases with valid awarded amounts have been indexed yet.
          </span>
        </div>
      </div>
    );
  }

  // Pre-process: take top 4 and aggregate the rest into Others
  let formattedData = [...validData];
  if (formattedData.length > 4) {
    const top4 = formattedData.slice(0, 4);
    const othersSum = formattedData.slice(4).reduce((sum, item) => sum + item.total_awarded, 0);
    formattedData = [...top4, { agency_name: 'Others', total_awarded: othersSum }];
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

export function AgencyCasesRiskChart({ cases = [] }: { cases?: CaseSummaryItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const safeCases = cases || [];
  const hasNoData = safeCases.length === 0;

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

  if (hasNoData) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Case Risk Distribution</h3>
        <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>No Projects Indexed</span>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
            No cases were found for this procuring entity.
          </span>
        </div>
      </div>
    );
  }

  // Aggregate risk categories
  const counts = { Low: 0, Medium: 0, High: 0 };
  safeCases.forEach((c) => {
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

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Case Risk Distribution</h3>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
            <XAxis dataKey="level" stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
            <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} className="font-mono" allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
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

export function AgencyMethodShareChart({ cases = [] }: { cases?: CaseSummaryItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const safeCases = cases || [];
  const validCases = safeCases.filter(c => (c.awarded_amount ?? 0) > 0);
  const hasNoData = validCases.length === 0;

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

  if (hasNoData) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Procurement Mode Value Share</h3>
        <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>No Award Value Share</span>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
            No project values are recorded for this entity.
          </span>
        </div>
      </div>
    );
  }

  // Aggregate total awarded value per procurement method
  const aggregates: Record<string, number> = {};
  validCases.forEach((c) => {
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

export function SupplierAgencyConcentrationChart({ awards = [] }: { awards?: SupplierAwardItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const safeAwards = awards || [];
  const validAwards = safeAwards.filter(a => (a.amount ?? 0) > 0);
  const hasNoData = validAwards.length === 0;

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

  if (hasNoData) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Awards by Procuring Agency</h3>
        <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>No Award History</span>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
            No awards have been indexed for this supplier yet.
          </span>
        </div>
      </div>
    );
  }

  const aggregates: Record<string, number> = {};
  validAwards.forEach((a) => {
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

export function SupplierAwardTrendChart({ awards = [] }: { awards?: SupplierAwardItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const safeAwards = awards || [];
  const validAwards = safeAwards.filter(a => (a.amount ?? 0) > 0 && a.award_date);
  const hasNoData = validAwards.length === 0;

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

  if (hasNoData) {
    return (
      <div style={chartWrapperStyle}>
        <h3 style={chartTitleStyle} className="font-ui">Award Value Timeline</h3>
        <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '20px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-ink)' }}>No Timeline Data</span>
          <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', textAlign: 'center' }}>
            No historical award timeline available.
          </span>
        </div>
      </div>
    );
  }

  const aggregates: Record<string, number> = {};
  validAwards.forEach((a) => {
    if (!a.award_date) return;
    const year = a.award_date.split('-')[0] || 'Unknown';
    const amount = a.amount ?? 0;
    aggregates[year] = (aggregates[year] ?? 0) + amount;
  });

  const chartData = Object.entries(aggregates)
    .map(([year, amount]) => ({ year, amount }))
    .sort((a, b) => a.year.localeCompare(b.year));

  return (
    <div style={chartWrapperStyle}>
      <h3 style={chartTitleStyle} className="font-ui">Award Value Timeline</h3>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
            <XAxis dataKey="year" stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} className="font-mono" />
            <YAxis stroke="var(--color-ink-muted)" fontSize={11} tickLine={false} axisLine={false} className="font-mono" tickFormatter={(v) => formatPesoCompact(v)} />
            <Tooltip contentStyle={tooltipStyle} formatter={(val: unknown) => [formatPesoCompact(Number(val)), 'Total Awarded']} />
            <Bar dataKey="amount" fill="var(--color-data-blue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Inline Styles
const chartWrapperStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-paper-dark)',
  border: '1px solid var(--color-rule)',
  borderRadius: '6px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
};

const chartTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--color-ink)',
  margin: 0,
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--color-paper-darker)',
  border: '1px solid var(--color-rule-strong)',
  borderRadius: '4px',
  fontSize: '12px',
  color: 'var(--color-ink)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
};
