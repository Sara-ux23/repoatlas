'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, GitCommit, Network } from 'lucide-react';

interface NetworkNode {
  id: string;
  label: string;
  size: number;
  commits: number;
  color: string;
}

interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  weight: number;
  width: number;
  label: string;
}

interface CollaborationData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metrics: {
    total_authors: number;
    total_collaborations: number;
    avg_collaboration_strength: number;
    most_collaborative_pair?: [string, number];
  };
}

interface TeamCollaborationNetworkProps {
  data: CollaborationData;
  title?: string;
}

export const TeamCollaborationNetwork: React.FC<TeamCollaborationNetworkProps> = ({ 
  data, 
  title = "Team Collaboration Network" 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Simple force-directed layout simulation
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    if (!data.nodes.length) return;

    const width = 400;
    const height = 300;
    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions in a circle
    const newPositions: Record<string, { x: number; y: number }> = {};
    data.nodes.forEach((node, index) => {
      const angle = (index / data.nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      newPositions[node.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    setPositions(newPositions);
  }, [data.nodes]);

  const getConnectedNodes = (nodeId: string): string[] => {
    return data.edges
      .filter(edge => edge.source === nodeId || edge.target === nodeId)
      .map(edge => edge.source === nodeId ? edge.target : edge.source);
  };

  const getNodeConnections = (nodeId: string): NetworkEdge[] => {
    return data.edges.filter(edge => edge.source === nodeId || edge.target === nodeId);
  };

  // Get top contributors
  const topContributors = data.nodes
    .sort((a, b) => b.commits - a.commits)
    .slice(0, 5);

  // Calculate collaboration stats
  const collaborationStats = {
    strongest_collaboration: data.edges.reduce((max, edge) => 
      edge.weight > max.weight ? edge : max, data.edges[0] || { weight: 0, source: '', target: '', label: '', id: '', width: 0 }),
    total_shared_files: data.edges.reduce((sum, edge) => sum + edge.weight, 0),
    network_density: data.edges.length / Math.max(1, (data.nodes.length * (data.nodes.length - 1)) / 2) * 100
  };

  return (
    <div className="w-full space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <div className="text-xs text-gray-500">
          {data.nodes.length} developers • {data.edges.length} collaborations
        </div>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-blue-900">{data.metrics.total_authors}</div>
          <div className="text-xs text-blue-700">Contributors</div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-green-900">{data.metrics.total_collaborations}</div>
          <div className="text-xs text-green-700">Collaborations</div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-purple-900">
            {collaborationStats.network_density.toFixed(1)}%
          </div>
          <div className="text-xs text-purple-700">Network Density</div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg text-center">
          <div className="text-lg font-bold text-orange-900">
            {data.metrics.avg_collaboration_strength.toFixed(1)}
          </div>
          <div className="text-xs text-orange-700">Avg Strength</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Network Visualization */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Collaboration Network</h4>
          <svg 
            ref={svgRef}
            width="100%" 
            height="300" 
            viewBox="0 0 400 300"
            className="border border-gray-100 rounded"
          >
            {/* Edges */}
            {data.edges.map(edge => {
              const sourcePos = positions[edge.source];
              const targetPos = positions[edge.target];
              
              if (!sourcePos || !targetPos) return null;
              
              const isHighlighted = hoveredNode && (
                edge.source === hoveredNode || edge.target === hoveredNode
              );
              
              return (
                <line
                  key={edge.id}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={isHighlighted ? '#3B82F6' : '#E5E7EB'}
                  strokeWidth={Math.max(1, edge.width / 3)}
                  opacity={isHighlighted ? 0.8 : 0.4}
                  className="transition-all duration-200"
                />
              );
            })}
            
            {/* Nodes */}
            {data.nodes.map(node => {
              const pos = positions[node.id];
              if (!pos) return null;
              
              const isSelected = selectedNode === node.id;
              const isHovered = hoveredNode === node.id;
              const isConnected = hoveredNode && getConnectedNodes(hoveredNode).includes(node.id);
              
              return (
                <g key={node.id}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={Math.max(8, Math.min(20, node.size / 5))}
                    fill={node.color}
                    stroke={isSelected ? '#1F2937' : '#FFFFFF'}
                    strokeWidth={isSelected ? 3 : 2}
                    opacity={hoveredNode && !isHovered && !isConnected ? 0.3 : 1}
                    className="cursor-pointer transition-all duration-200 hover:stroke-gray-700"
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(isSelected ? null : node.id)}
                  />
                  <text
                    x={pos.x}
                    y={pos.y - Math.max(8, Math.min(20, node.size / 5)) - 5}
                    textAnchor="middle"
                    className="text-xs font-medium fill-gray-700 pointer-events-none"
                    opacity={isHovered || isSelected ? 1 : 0.7}
                  >
                    {node.label.length > 12 ? node.label.substring(0, 12) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
          
          {selectedNode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="text-sm font-semibold text-gray-900">
                {data.nodes.find(n => n.id === selectedNode)?.label}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {data.nodes.find(n => n.id === selectedNode)?.commits} commits
              </div>
              <div className="text-xs text-gray-600">
                Collaborates with {getConnectedNodes(selectedNode).length} developers
              </div>
            </motion.div>
          )}
        </div>

        {/* Top Contributors */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Contributors</h4>
          <div className="space-y-3">
            {topContributors.map((contributor, index) => (
              <motion.div
                key={contributor.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedNode(contributor.id)}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold"
                     style={{ backgroundColor: contributor.color }}>
                  {contributor.label.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {contributor.label}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <GitCommit className="w-3 h-3" />
                    {contributor.commits} commits
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  #{index + 1}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Strongest Collaboration */}
          {collaborationStats.strongest_collaboration.weight > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="text-xs font-semibold text-blue-900 mb-1">
                Strongest Collaboration
              </div>
              <div className="text-sm text-blue-800">
                {collaborationStats.strongest_collaboration.source} ↔ {collaborationStats.strongest_collaboration.target}
              </div>
              <div className="text-xs text-blue-700">
                {collaborationStats.strongest_collaboration.weight} shared files
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collaboration Details */}
      {selectedNode && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white border border-gray-200 rounded-lg p-4"
        >
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Collaboration Details: {data.nodes.find(n => n.id === selectedNode)?.label}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">Connected Developers</div>
              <div className="space-y-1">
                {getNodeConnections(selectedNode).map(edge => {
                  const partner = edge.source === selectedNode ? edge.target : edge.source;
                  const partnerNode = data.nodes.find(n => n.id === partner);
                  return (
                    <div key={edge.id} className="flex items-center justify-between text-xs">
                      <span className="text-gray-700">{partner}</span>
                      <span className="text-gray-500">{edge.weight} files</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-600 mb-2">Statistics</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Commits:</span>
                  <span className="text-gray-900 font-medium">
                    {data.nodes.find(n => n.id === selectedNode)?.commits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Collaborations:</span>
                  <span className="text-gray-900 font-medium">
                    {getConnectedNodes(selectedNode).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shared Files:</span>
                  <span className="text-gray-900 font-medium">
                    {getNodeConnections(selectedNode).reduce((sum, edge) => sum + edge.weight, 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};