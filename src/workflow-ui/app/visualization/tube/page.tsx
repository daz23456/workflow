/**
 * Tube Map Visualization Page
 *
 * London Underground-style visualization where:
 * - Workflows are colored tube lines
 * - Tasks are station circles
 * - Shared tasks are interchange stations
 *
 * Follows Harry Beck's design principles:
 * - Only 0°, 45°, and 90° angles
 * - Schematic, not geographic
 * - Clear and readable
 *
 * Stage 12.4: Tube Map View
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { TubeCanvas, TubeLine, StationMarker, type Point } from '../../../components/visualization/tube';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Play, Pause, RotateCcw, Download, Info } from 'lucide-react';

// TfL-inspired color palette
const LINE_COLORS = {
  central: '#DC241F',    // Central Line red
  northern: '#000000',   // Northern Line black
  piccadilly: '#0019A8', // Piccadilly Line blue
  victoria: '#00A0E2',   // Victoria Line cyan
  jubilee: '#6A7278',    // Jubilee Line grey
  district: '#007229',   // District Line green
  circle: '#FFD329',     // Circle Line yellow
  metropolitan: '#751056', // Metropolitan Line purple
};

// Demo workflow data with pre-calculated Beck-style positions
interface WorkflowLine {
  id: string;
  name: string;
  color: string;
  points: Point[];
  stations: {
    id: string;
    name: string;
    position: Point;
    isTerminus?: boolean;
    isInterchange?: boolean;
  }[];
}

const DEMO_LINES: WorkflowLine[] = [
  {
    id: 'central',
    name: 'User API Composition',
    color: LINE_COLORS.central,
    points: [
      { x: 100, y: 300 },
      { x: 200, y: 300 },
      { x: 300, y: 300 },
      { x: 400, y: 300 },
      { x: 500, y: 300 },
      { x: 600, y: 300 },
      { x: 700, y: 300 },
    ],
    stations: [
      { id: 'input-1', name: 'Input', position: { x: 100, y: 300 }, isTerminus: true },
      { id: 'validate-1', name: 'Validate', position: { x: 200, y: 300 }, isInterchange: true },
      { id: 'fetch-user', name: 'Fetch User', position: { x: 300, y: 300 } },
      { id: 'fetch-prefs', name: 'Fetch Prefs', position: { x: 400, y: 300 } },
      { id: 'merge', name: 'Merge Data', position: { x: 500, y: 300 } },
      { id: 'format', name: 'Format', position: { x: 600, y: 300 } },
      { id: 'output-1', name: 'API Response', position: { x: 700, y: 300 }, isTerminus: true },
    ],
  },
  {
    id: 'northern',
    name: 'Order Processing',
    color: LINE_COLORS.northern,
    points: [
      { x: 100, y: 200 },
      { x: 200, y: 200 },
      { x: 200, y: 300 }, // Goes down to meet Central at Validate
      { x: 250, y: 350 },
      { x: 350, y: 350 },
      { x: 450, y: 350 },
      { x: 550, y: 350 },
      { x: 650, y: 350 },
    ],
    stations: [
      { id: 'order-input', name: 'Order In', position: { x: 100, y: 200 }, isTerminus: true },
      { id: 'validate-2', name: 'Validate', position: { x: 200, y: 300 }, isInterchange: true },
      { id: 'inventory', name: 'Check Inventory', position: { x: 250, y: 350 } },
      { id: 'payment', name: 'Process Payment', position: { x: 350, y: 350 } },
      { id: 'fulfill', name: 'Fulfill Order', position: { x: 450, y: 350 } },
      { id: 'ship', name: 'Ship', position: { x: 550, y: 350 } },
      { id: 'notify', name: 'Send Notification', position: { x: 650, y: 350 }, isTerminus: true },
    ],
  },
  {
    id: 'victoria',
    name: 'Data ETL Pipeline',
    color: LINE_COLORS.victoria,
    points: [
      { x: 100, y: 150 },
      { x: 200, y: 150 },
      { x: 300, y: 150 },
      { x: 400, y: 150 },
      { x: 500, y: 150 },
    ],
    stations: [
      { id: 'source', name: 'Source', position: { x: 100, y: 150 }, isTerminus: true },
      { id: 'extract', name: 'Extract', position: { x: 200, y: 150 } },
      { id: 'transform', name: 'Transform', position: { x: 300, y: 150 } },
      { id: 'validate-data', name: 'Validate Data', position: { x: 400, y: 150 } },
      { id: 'load', name: 'Load to DB', position: { x: 500, y: 150 }, isTerminus: true },
    ],
  },
  {
    id: 'district',
    name: 'Analytics Pipeline',
    color: LINE_COLORS.district,
    points: [
      { x: 100, y: 450 },
      { x: 200, y: 450 },
      { x: 300, y: 450 },
      { x: 400, y: 450 },
      { x: 450, y: 400 },
      { x: 500, y: 350 }, // Goes up to meet at Fulfill Order
      { x: 600, y: 350 },
    ],
    stations: [
      { id: 'events-in', name: 'Events In', position: { x: 100, y: 450 }, isTerminus: true },
      { id: 'parse', name: 'Parse Events', position: { x: 200, y: 450 } },
      { id: 'enrich', name: 'Enrich Data', position: { x: 300, y: 450 } },
      { id: 'aggregate', name: 'Aggregate', position: { x: 400, y: 450 } },
      { id: 'store', name: 'Store Metrics', position: { x: 500, y: 350 }, isInterchange: true },
      { id: 'alert', name: 'Send Alerts', position: { x: 600, y: 350 }, isTerminus: true },
    ],
  },
];

export default function TubeMapPage() {
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const handleLineClick = useCallback((id: string) => {
    setSelectedLine((prev) => (prev === id ? null : id));
  }, []);

  const handleStationClick = useCallback((id: string) => {
    setSelectedStation((prev) => (prev === id ? null : id));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedLine(null);
    setSelectedStation(null);
  }, []);

  // Get selected line details
  const selectedLineDetails = useMemo(() => {
    if (!selectedLine) return null;
    return DEMO_LINES.find((line) => line.id === selectedLine);
  }, [selectedLine]);

  // Get selected station details
  const selectedStationDetails = useMemo(() => {
    if (!selectedStation) return null;
    for (const line of DEMO_LINES) {
      const station = line.stations.find((s) => s.id === selectedStation);
      if (station) {
        return { ...station, lineName: line.name, lineColor: line.color };
      }
    }
    return null;
  }, [selectedStation]);

  return (
    <div className="h-screen w-full relative bg-[#0a1628] overflow-hidden">
      {/* Tube Map SVG */}
      <div className="w-full h-full flex items-center justify-center">
        <TubeCanvas width={800} height={600} className="max-w-full max-h-full">
          {/* Render lines first (behind stations) */}
          {DEMO_LINES.map((line) => (
            <TubeLine
              key={line.id}
              id={line.id}
              name={line.name}
              color={line.color}
              points={line.points}
              isHighlighted={selectedLine === line.id}
              onClick={handleLineClick}
            />
          ))}

          {/* Render stations on top */}
          {DEMO_LINES.map((line) =>
            line.stations.map((station) => (
              <StationMarker
                key={station.id}
                id={station.id}
                name={station.name}
                x={station.position.x}
                y={station.position.y}
                lineColor={line.color}
                isTerminus={station.isTerminus}
                isInterchange={station.isInterchange}
                onClick={handleStationClick}
              />
            ))
          )}
        </TubeCanvas>
      </div>

      {/* Controls - Top Left */}
      <div className="absolute top-4 left-4 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPaused(!isPaused)}
          className="bg-black/50 border-white/20 hover:bg-black/70"
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          className="bg-black/50 border-white/20 hover:bg-black/70"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-black/50 border-white/20 hover:bg-black/70"
        >
          <Info className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="bg-black/50 border-white/20 hover:bg-black/70"
          title="Download as SVG"
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Title - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-2xl font-bold text-white tracking-wide" style={{ fontFamily: "'Johnston', 'Gill Sans', sans-serif" }}>
          Workflow Tube Map
        </h1>
        <p className="text-sm text-white/50">
          Click lines or stations to explore
        </p>
      </div>

      {/* TfL-style roundel logo */}
      <div className="absolute top-4 right-4">
        <div className="w-12 h-12 relative">
          <div className="absolute inset-0 rounded-full bg-[#DC241F]" />
          <div className="absolute inset-[25%] left-0 right-0 bg-[#0019A8]" style={{ top: '35%', bottom: '35%' }} />
        </div>
      </div>

      {/* Legend - Bottom Left */}
      {showLegend && (
        <Card className="absolute bottom-4 left-4 bg-black/80 border-white/20 text-white w-72">
          <CardHeader className="py-3">
            <CardTitle className="text-sm" style={{ fontFamily: "'Johnston', 'Gill Sans', sans-serif" }}>
              Workflow Lines
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {DEMO_LINES.map((line) => (
                <div
                  key={line.id}
                  className={`flex items-center gap-3 cursor-pointer hover:bg-white/10 px-2 py-1 rounded transition-colors ${
                    selectedLine === line.id ? 'bg-white/20' : ''
                  }`}
                  onClick={() => handleLineClick(line.id)}
                >
                  <div
                    className="w-8 h-2 rounded-full"
                    style={{ backgroundColor: line.color }}
                  />
                  <span className="text-sm flex-1">{line.name}</span>
                  <span className="text-xs text-white/50">{line.stations.length} stops</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Details - Bottom Right */}
      {(selectedLineDetails || selectedStationDetails) && (
        <Card className="absolute bottom-4 right-4 bg-black/80 border-white/20 text-white w-72">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: selectedStationDetails?.lineColor || selectedLineDetails?.color,
                }}
              />
              {selectedStationDetails?.name || selectedLineDetails?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2 text-sm">
            {selectedStationDetails ? (
              <div className="space-y-1">
                <p className="text-white/70">Station / Task</p>
                <p>Line: {selectedStationDetails.lineName}</p>
                {selectedStationDetails.isInterchange && (
                  <p className="text-yellow-400">⬤ Interchange station</p>
                )}
                {selectedStationDetails.isTerminus && (
                  <p className="text-blue-400">▮ Terminus</p>
                )}
              </div>
            ) : selectedLineDetails ? (
              <div className="space-y-1">
                <p className="text-white/70">Workflow Line</p>
                <p>Stations: {selectedLineDetails.stations.length}</p>
                <div className="mt-2 text-xs text-white/50">
                  {selectedLineDetails.stations.map((s) => s.name).join(' → ')}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Keyboard hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">
        Click to select • Esc to deselect
      </div>
    </div>
  );
}
