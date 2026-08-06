'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';

interface ComplexityData {
  file: string;
  function: string;
  complexity: number;
  line_start: number;
  line_end: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  color_intensity: number;
}

interface ComplexityHeatmapProps {
  data: ComplexityData[];
  title?: string;
}

const getRiskColor = (riskLevel: string): string => {
  switch (riskLevel) {
    case 'low': return '#10B981'; // green
    case 'medium': return '#F59E0B'; // yellow
    case 'high': return '#EF4444'; // red
    case 'critical': return '#DC2626'; // dark red
    default: return '#6B7280'; // gray
  }
};

const getRiskIcon = (riskLevel: string) => {
  switch (riskLevel) {
    case 'low': return <CheckCircle className="w-3 h-3" />;
    case 'medium': return <Info className="w-3 h-3" />;
    case 'high': return <AlertTriangle className="w-3 h-3" />;
    case 'critical': return <XCircle className="w-3 h-3" />;
    default: return <Info className="w-3 h-3" />;
  }
};

export const ComplexityHeatmap: React.FC<ComplexityHeatmapProps> = ({ 
  data, 
  title = "Code Complexity Heatmap" 
}) => {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'complexity' | 'file' | 'risk_level'>('complexity');

  // Group data by file
  const fileGroups = data.reduce((acc, item) => {
    if (!acc[item.file]) {
      acc[item.file] = [];
    }
    acc[item.file].push(item);
    return acc;
  }, {} as Record<string, ComplexityData[]>);

  // Sort and filter data
  const sortedData = data.sort((a, b) => {
    if (sortBy === 'complexity') return b.complexity - a.complexity;
    if (sortBy === 'file') return a.file.localeCompare(b.file);
    if (sortBy === 'risk_level') {
      const riskOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return riskOrder[b.risk_level] - riskOrder[a.risk_level];
    }
    return 0;
  });

  const filteredData = selectedFile 
    ? sortedData.filter(item => item.file === selectedFile)
    : sortedData.slice(0, 20); // Show top 20

  // Calculate stats
  const stats = {
    total_functions: data.length,
    avg_complexity: data.reduce((sum, item) => sum + item.complexity, 0) / data.length,
    critical_functions: data.filter(item => item.risk_level === 'critical').length,
    high_risk_functions: data.filter(item => item.risk_level === 'high').length,
    files_analyzed: Object.keys(fileGroups).length
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex gap-2">
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="complexity">Sort by Complexity</option>
            <option value="risk_level">Sort by Risk Level</option>
            <option value="file">Sort by File</option>
          </select>
          <select 
            value={selectedFile || ''} 
            onChange={(e) => setSelectedFile(e.target.value || null)}
            className="text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="">All Files</option>
            {Object.keys(fileGroups).map(file => (
              <option key={file} value={file}>{file}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gray-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-gray-900">{stats.total_functions}</div>
          <div className="text-xs text-gray-600">Functions</div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-900">{stats.avg_complexity.toFixed(1)}</div>
          <div className="text-xs text-blue-700">Avg Complexity</div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-red-900">{stats.critical_functions}</div>
          <div className="text-xs text-red-700">Critical</div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-yellow-900">{stats.high_risk_functions}</div>
          <div className="text-xs text-yellow-700">High Risk</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-green-900">{stats.files_analyzed}</div>
          <div className="text-xs text-green-700">Files</div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredData.map((item, index) => (
          <motion.div
            key={`${item.file}-${item.function}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            style={{
              borderLeftWidth: '4px',
              borderLeftColor: getRiskColor(item.risk_level)
            }}
          >
            {/* Risk Indicator */}
            <div 
              className="flex items-center justify-center w-8 h-8 rounded-full text-white"
              style={{ backgroundColor: getRiskColor(item.risk_level) }}
            >
              {getRiskIcon(item.risk_level)}
            </div>

            {/* Function Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-gray-900 truncate">
                  {item.function}
                </span>
                <span className="text-xs text-gray-500">
                  lines {item.line_start}-{item.line_end}
                </span>
              </div>
              <div className="text-xs text-gray-600 truncate">
                {item.file}
              </div>
            </div>

            {/* Complexity Score */}
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">
                {item.complexity}
              </div>
              <div className="text-xs text-gray-500 capitalize">
                {item.risk_level}
              </div>
            </div>

            {/* Complexity Bar */}
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (item.complexity / 20) * 100)}%`,
                  backgroundColor: getRiskColor(item.risk_level)
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 pt-2 border-t border-gray-200">
        <span className="text-xs font-semibold text-gray-700">Risk Levels:</span>
        {['low', 'medium', 'high', 'critical'].map(level => (
          <div key={level} className="flex items-center gap-1">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getRiskColor(level) }}
            />
            <span className="text-xs text-gray-600 capitalize">{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
};