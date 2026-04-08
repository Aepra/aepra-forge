"use client";

import React from 'react';
// Pastikan pakai @xyflow/react, bukan reactflow!
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

export default function SmartEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) {
  // Logic-nya tetap sama, cuma library-nya saja yang beda
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    borderRadius: 12,
  });

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, strokeWidth: 2, stroke: '#22d3ee' }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {/* Titik siku-siku */}
          <div className="w-3 h-3 bg-slate-900 border-2 border-cyan-400 rounded-full hover:scale-125 transition-transform cursor-pointer" />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}