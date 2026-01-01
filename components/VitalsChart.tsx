import React from 'react';
import { VitalReading } from '../types';

interface VitalsChartProps {
  data: VitalReading[];
  type: 'bloodPressure' | 'heartRate' | 'temperature' | 'weight' | 'bloodSugar';
  days?: 7 | 30;
  showThresholds?: boolean;
}

export const VitalsChart: React.FC<VitalsChartProps> = ({
  data,
  type,
  days = 30,
  showThresholds = true,
}) => {
  // Filter data by type and time period
  const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const filteredData = data
    .filter((v) => {
      if (v.type !== type) return false;
      const vDate = v.timestamp instanceof Date ? v.timestamp : new Date(v.timestamp);
      return vDate >= cutoffDate;
    })
    .sort((a, b) => {
      const dateA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const dateB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return dateA.getTime() - dateB.getTime();
    });

  if (filteredData.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center border border-gray-200">
        <p className="text-gray-500 font-semibold">No data available</p>
        <p className="text-sm text-gray-400 mt-1">Data will appear once vitals are tracked</p>
      </div>
    );
  }

  // Extract values for chart
  const values = filteredData.map((v) => {
    if (type === 'bloodPressure') {
      const bp = v.value as { systolic: number; diastolic: number };
      return { sys: bp.systolic, dia: bp.diastolic };
    }
    return { value: v.value as number };
  });

  // Determine thresholds and colors
  const getThresholds = () => {
    switch (type) {
      case 'bloodPressure':
        return { low: 90, normal: 120, high: 140, max: 180 };
      case 'heartRate':
        return { low: 50, normal: 60, high: 100, max: 120 };
      case 'temperature':
        return { low: 97, normal: 98.6, high: 100, max: 103 };
      case 'weight':
        return { low: 50, normal: 70, high: 90, max: 120 };
      case 'bloodSugar':
        return { low: 70, normal: 100, high: 140, max: 200 };
    }
  };

  const thresholds = getThresholds();

  // Calculate min/max for scaling
  let minValue = Infinity;
  let maxValue = -Infinity;

  values.forEach((v) => {
    if ('sys' in v) {
      minValue = Math.min(minValue, v.dia);
      maxValue = Math.max(maxValue, v.sys);
    } else {
      minValue = Math.min(minValue, v.value);
      maxValue = Math.max(maxValue, v.value);
    }
  });

  // Add padding to min/max
  const padding = (maxValue - minValue) * 0.2;
  minValue = Math.max(0, minValue - padding);
  maxValue = maxValue + padding;

  // Chart dimensions
  const width = 100; // percentage
  const height = 200; // pixels
  const pointCount = filteredData.length;

  // Generate SVG path for line chart
  const generatePath = (dataPoints: number[]) => {
    if (dataPoints.length === 0) return '';

    const points = dataPoints.map((value, index) => {
      const x = (index / (pointCount - 1)) * 100;
      const y = ((maxValue - value) / (maxValue - minValue)) * 100;
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  const sysValues = values.map((v) => ('sys' in v ? v.sys : v.value));
  const diaValues = type === 'bloodPressure' ? values.map((v) => ('dia' in v ? v.dia : 0)) : [];

  const sysPath = generatePath(sysValues);
  const diaPath = type === 'bloodPressure' ? generatePath(diaValues) : '';

  // Format dates for x-axis
  const formatDate = (timestamp: Date | string) => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const firstDate = formatDate(filteredData[0].timestamp);
  const lastDate = formatDate(filteredData[filteredData.length - 1].timestamp);

  // Get label
  const getLabel = () => {
    switch (type) {
      case 'bloodPressure':
        return 'Blood Pressure (mmHg)';
      case 'heartRate':
        return 'Heart Rate (BPM)';
      case 'temperature':
        return 'Temperature (°F)';
      case 'weight':
        return 'Weight (kg)';
      case 'bloodSugar':
        return 'Blood Sugar (mg/dL)';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="mb-4">
        <h4 className="font-bold text-gray-900 text-lg">{getLabel()}</h4>
        <p className="text-sm text-gray-600 mt-1">
          Last {days} days • {filteredData.length} readings
        </p>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
          style={{ overflow: 'visible' }}
        >
          {/* Threshold zones (background) */}
          {showThresholds && (
            <>
              {/* Danger zone (high) */}
              <rect
                x="0"
                y="0"
                width="100"
                height={((maxValue - thresholds.max) / (maxValue - minValue)) * 100}
                fill="#fee2e2"
                opacity="0.5"
              />
              {/* Warning zone */}
              <rect
                x="0"
                y={((maxValue - thresholds.max) / (maxValue - minValue)) * 100}
                width="100"
                height={((thresholds.max - thresholds.high) / (maxValue - minValue)) * 100}
                fill="#fef3c7"
                opacity="0.5"
              />
              {/* Normal zone */}
              <rect
                x="0"
                y={((maxValue - thresholds.high) / (maxValue - minValue)) * 100}
                width="100"
                height={((thresholds.high - thresholds.low) / (maxValue - minValue)) * 100}
                fill="#d1fae5"
                opacity="0.5"
              />
            </>
          )}

          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.2"
              vectorEffect="non-scaling-stroke"
            />
          ))}

          {/* Systolic line (or main value line) */}
          <path
            d={sysPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Diastolic line (BP only) */}
          {type === 'bloodPressure' && (
            <path
              d={diaPath}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {sysValues.map((value, index) => {
            const x = (index / (pointCount - 1)) * 100;
            const y = ((maxValue - value) / (maxValue - minValue)) * 100;
            return (
              <circle
                key={`sys-${index}`}
                cx={x}
                cy={y}
                r="1.5"
                fill="#3b82f6"
                vectorEffect="non-scaling-stroke"
              />
            );
          })}

          {type === 'bloodPressure' &&
            diaValues.map((value, index) => {
              const x = (index / (pointCount - 1)) * 100;
              const y = ((maxValue - value) / (maxValue - minValue)) * 100;
              return (
                <circle
                  key={`dia-${index}`}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="#8b5cf6"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
        </svg>

        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500 font-semibold pr-2">
          <span>{Math.round(maxValue)}</span>
          <span>{Math.round((maxValue + minValue) / 2)}</span>
          <span>{Math.round(minValue)}</span>
        </div>
      </div>

      {/* X-axis */}
      <div className="flex justify-between text-xs text-gray-500 font-semibold mt-2 pl-12">
        <span>{firstDate}</span>
        <span>{lastDate}</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-4 text-xs font-semibold">
        {type === 'bloodPressure' ? (
          <>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-700">Systolic</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-700">Diastolic</span>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">Value</span>
          </div>
        )}
      </div>

      {/* Latest value */}
      <div className="mt-4 bg-blue-50 rounded-xl p-3 border border-blue-200">
        <p className="text-xs font-bold text-blue-900">Latest Reading</p>
        <p className="text-2xl font-black text-blue-600 mt-1">
          {type === 'bloodPressure'
            ? `${Math.round(sysValues[sysValues.length - 1])}/${Math.round(diaValues[diaValues.length - 1])}`
            : Math.round(sysValues[sysValues.length - 1])}
        </p>
        <p className="text-xs text-blue-800 mt-1">
          {formatDate(filteredData[filteredData.length - 1].timestamp)}
        </p>
      </div>
    </div>
  );
};
