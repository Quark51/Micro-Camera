/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  ObjectiveSpec,
  TubeLensSpec,
  SensorSpec,
  ObjectSpec,
  DistanceSettings,
  OpticalCalculationResults,
} from '../types/optics';
import { ZoomIn, ZoomOut, RotateCcw, AlertTriangle, Eye, Sliders } from 'lucide-react';

interface RayPathCanvasProps {
  objective: ObjectiveSpec;
  tubeLens: TubeLensSpec;
  sensor: SensorSpec;
  object: ObjectSpec;
  distances: DistanceSettings;
  results: OpticalCalculationResults;
  onUpdateDistances: (distances: Partial<DistanceSettings>) => void;
}

export const RayPathCanvas: React.FC<RayPathCanvasProps> = ({
  objective,
  tubeLens,
  sensor,
  object,
  distances,
  results,
  onUpdateDistances,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [showChiefRays, setShowChiefRays] = useState(true);
  const [showMarginalRays, setShowMarginalRays] = useState(true);
  const [showOffAxis, setShowOffAxis] = useState(true);
  const [probeX, setProbeX] = useState<number | null>(null);
  const [isDraggingTL, setIsDraggingTL] = useState(false);
  const [isDraggingSensor, setIsDraggingSensor] = useState(false);

  // SVG Coordinates setup
  const width = 920;
  const height = 360;
  const cy = height / 2;

  // Real physical layout mapping
  // We lay out:
  // Object Plane -> Objective (WD + fObj) -> Infinity Space (L_inf) -> Tube Lens -> Camera Sensor (d_TL_sensor)
  const fObj = Math.max(0.5, objective.focalLength);
  const wd = Math.max(0.2, objective.workingDistance);
  const lInf = Math.max(10, distances.infinitySpace);
  const fTL = Math.max(10, tubeLens.focalLength);
  const dSensor = Math.max(10, distances.tubeLensToSensor);

  // Total nominal physical length along Z
  const physicalLength = wd + fObj * 1.5 + lInf + dSensor + 20;

  // X-scale mapping to SVG canvas
  const leftMargin = 70;
  const rightMargin = 70;
  const usableWidth = width - leftMargin - rightMargin;
  const scaleZ = (usableWidth / physicalLength) * zoom;

  // Key Z-plane X coordinates
  const xObject = leftMargin;
  const xObjFront = xObject + wd * scaleZ;
  const xObjCenter = xObjFront + fObj * scaleZ;
  const xObjBack = xObjCenter + (fObj * 0.5) * scaleZ;
  const xTL = xObjBack + lInf * scaleZ;
  const xSensor = xTL + dSensor * scaleZ;

  // Y-scale mapping
  // Vertical scale: map mm to pixels
  // Max vertical feature: tube lens clear aperture (~25-50mm) or sensor diagonal (~10-45mm)
  const maxClearanceMm = Math.max(40, tubeLens.clearAperture * 1.3, sensor.height * 1.2);
  const scaleY = (height * 0.38) / (maxClearanceMm / 2);

  const objPupilR = (results.objectivePupilDiameterMm / 2) * scaleY;
  const tlApertureR = (tubeLens.clearAperture / 2) * scaleY;
  const sensorHalfHeight = (sensor.height / 2) * scaleY;

  // Object size (height in mm for display scale)
  // To keep it visible, clamp min visual height
  const objectHalfHeightMm = ((object.height || 200) / 1000) / 2;
  const objectHalfHeightPx = Math.max(8, Math.min(height * 0.3, objectHalfHeightMm * scaleY * 4));

  // Projected image height on sensor in px
  const projectedHalfHeightPx = (results.projectedHeightMm / 2) * scaleY;

  // Ray coordinates calculation
  // 1. Axial on-axis object point (0, cy)
  // Diverges through objective pupil -> collimated in infinity space -> converges to (xSensor, cy)
  const axialPupilYTop = cy - objPupilR;
  const axialPupilYBottom = cy + objPupilR;

  // At tube lens: parallel beam of diameter objPupilR
  const axialTL_YTop = axialPupilYTop;
  const axialTL_YBottom = axialPupilYBottom;

  // 2. Off-axis field point (top of object: cy - objectHalfHeightPx)
  // Rays fill objective pupil: top ray and bottom ray
  // In infinity space, rays emerge parallel to each other at angle theta:
  // tan(theta) = y_img / f_TL
  const chiefRayAngleRad = Math.atan((results.projectedHeightMm / 2) / fTL);
  const infinityOffAxisSlope = Math.tan(chiefRayAngleRad) * (scaleY / scaleZ);

  // Off-axis ray heights at objective back
  const offAxisTopBackY = cy - objPupilR;
  const offAxisBottomBackY = cy + objPupilR;
  const offAxisChiefBackY = cy;

  // At tube lens plane (traversing distance lInf)
  const offAxisChiefTL_Y = offAxisChiefBackY + lInf * scaleZ * infinityOffAxisSlope;
  const offAxisTopTL_Y = offAxisTopBackY + lInf * scaleZ * infinityOffAxisSlope;
  const offAxisBottomTL_Y = offAxisBottomBackY + lInf * scaleZ * infinityOffAxisSlope;

  // Focus point on sensor:
  const sensorFocusY = cy + (results.projectedHeightMm / 2) * scaleY;

  // Vignetting check at tube lens clear aperture
  const isTopClipped = Math.abs(offAxisBottomTL_Y - cy) > tlApertureR || Math.abs(offAxisTopTL_Y - cy) > tlApertureR;

  // Interactive mouse drag handlers
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (width / rect.width);
    setProbeX(mx);

    if (isDraggingTL) {
      // Calculate new lInf from mouse position
      const deltaPx = mx - xObjBack;
      const newLInf = Math.max(10, Math.min(350, Math.round(deltaPx / scaleZ)));
      onUpdateDistances({ infinitySpace: newLInf });
    } else if (isDraggingSensor) {
      // Calculate new dSensor from mouse position
      const deltaPx = mx - xTL;
      const newDSensor = Math.max(10, Math.min(400, Math.round(deltaPx / scaleZ)));
      onUpdateDistances({ tubeLensToSensor: newDSensor });
    }
  };

  const handleMouseUp = () => {
    setIsDraggingTL(false);
    setIsDraggingSensor(false);
  };

  useEffect(() => {
    const onGlobalUp = () => {
      setIsDraggingTL(false);
      setIsDraggingSensor(false);
    };
    window.addEventListener('mouseup', onGlobalUp);
    return () => window.removeEventListener('mouseup', onGlobalUp);
  }, []);

  // Compute probe readout at probeX
  let probeZMm = 0;
  let probeZone = 'Specimen Plane';
  let probeBeamDiamMm = 0;

  if (probeX !== null) {
    if (probeX < xObjFront) {
      probeZone = 'Object / Working Distance';
      probeZMm = (probeX - xObject) / scaleZ;
      probeBeamDiamMm = (object.height / 1000) * (probeX / (xObjFront - xObject || 1));
    } else if (probeX <= xObjBack) {
      probeZone = 'Objective Lens Barrel';
      probeZMm = wd + (probeX - xObjFront) / scaleZ;
      probeBeamDiamMm = results.objectivePupilDiameterMm;
    } else if (probeX < xTL) {
      probeZone = 'Infinity Collimated Space';
      probeZMm = wd + fObj + (probeX - xObjBack) / scaleZ;
      const zFromObj = (probeX - xObjBack) / scaleZ;
      probeBeamDiamMm = results.objectivePupilDiameterMm + (zFromObj * results.sensorDiagonalMm) / fTL;
    } else if (probeX <= xSensor) {
      probeZone = 'Converging Image Space';
      probeZMm = wd + fObj + lInf + (probeX - xTL) / scaleZ;
      const fractionToSensor = (xSensor - probeX) / (xSensor - xTL || 1);
      probeBeamDiamMm = tubeLens.clearAperture * fractionToSensor;
    } else {
      probeZone = 'Past Sensor Plane';
      probeZMm = wd + fObj + lInf + dSensor + (probeX - xSensor) / scaleZ;
      probeBeamDiamMm = 0;
    }
  }

  return (
    <div className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden select-none">
      {/* Canvas Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200 tracking-wide flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            2D Interactive Optical Ray Bench
          </span>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-slate-400">
            Total Path: {(physicalLength - 20).toFixed(1)} mm
          </span>
        </div>

        {/* Ray Visibility & Zoom Toggles */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900 rounded-md p-0.5 border border-slate-800">
            <button
              onClick={() => setShowMarginalRays(!showMarginalRays)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                showMarginalRays ? 'bg-cyan-950/80 text-cyan-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Axial Marginal Ray Bundle"
            >
              Axial (Cyan)
            </button>
            <button
              onClick={() => setShowOffAxis(!showOffAxis)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                showOffAxis ? 'bg-amber-950/80 text-amber-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Off-Axis Field Rays"
            >
              Off-Axis (Amber)
            </button>
            <button
              onClick={() => setShowChiefRays(!showChiefRays)}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                showChiefRays ? 'bg-emerald-950/80 text-emerald-300 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Toggle Chief Ray"
            >
              Chief Ray
            </button>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 rounded-md p-0.5 border border-slate-800">
            <button
              onClick={() => setZoom(Math.max(0.7, zoom - 0.15))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-300">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom(Math.min(1.8, zoom + 0.15))}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main SVG Optical Bench Stage */}
      <div
        ref={containerRef}
        className="relative w-full overflow-x-auto bg-slate-950 cursor-crosshair"
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[760px] block"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => {
            setProbeX(null);
            handleMouseUp();
          }}
          onMouseUp={handleMouseUp}
        >
          <defs>
            {/* Gradients for Optical Elements */}
            <linearGradient id="lensGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="tubeLensGlass" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#4f46e5" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#4338ca" stopOpacity="0.4" />
            </linearGradient>

            <linearGradient id="sensorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect width={width} height={height} fill="url(#gridPattern)" />

          {/* Optical Axis Line */}
          <line
            x1={20}
            y1={cy}
            x2={width - 20}
            y2={cy}
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="6 4"
          />
          <text
            x={26}
            y={cy - 6}
            fill="#64748b"
            fontSize="10"
            fontFamily="monospace"
          >
            Optical Axis (Z)
          </text>

          {/* --- RAYS LAYER --- */}
          {/* 1. Axial Marginal Rays (Cyan) */}
          {showMarginalRays && (
            <g opacity="0.85">
              {/* Diverging from object center (xObject, cy) to objective pupil */}
              <polygon
                points={`
                  ${xObject},${cy}
                  ${xObjFront},${axialPupilYTop}
                  ${xObjFront},${axialPupilYBottom}
                `}
                fill="#06b6d4"
                fillOpacity="0.08"
                stroke="#06b6d4"
                strokeWidth="1.2"
              />

              {/* Collimated beam in infinity space between Objective and Tube Lens */}
              <polygon
                points={`
                  ${xObjBack},${axialPupilYTop}
                  ${xTL},${axialTL_YTop}
                  ${xTL},${axialTL_YBottom}
                  ${xObjBack},${axialPupilYBottom}
                `}
                fill="#06b6d4"
                fillOpacity="0.12"
                stroke="#06b6d4"
                strokeWidth="1"
                strokeDasharray="4 2"
              />

              {/* Converging beam from Tube Lens to Sensor */}
              <polygon
                points={`
                  ${xTL},${axialTL_YTop}
                  ${xSensor},${cy}
                  ${xTL},${axialTL_YBottom}
                `}
                fill="#06b6d4"
                fillOpacity="0.12"
                stroke="#06b6d4"
                strokeWidth="1.2"
              />
            </g>
          )}

          {/* 2. Off-Axis Field Rays (Amber) */}
          {showOffAxis && (
            <g opacity="0.8">
              {/* Diverging from off-axis object tip (xObject, cy - objectHalfHeightPx) */}
              <polygon
                points={`
                  ${xObject},${cy - objectHalfHeightPx}
                  ${xObjFront},${cy - objPupilR}
                  ${xObjFront},${cy + objPupilR}
                `}
                fill="#f59e0b"
                fillOpacity="0.07"
                stroke="#f59e0b"
                strokeWidth="1"
              />

              {/* Infinity Space tilted collimated bundle */}
              <polygon
                points={`
                  ${xObjBack},${offAxisTopBackY}
                  ${xTL},${offAxisTopTL_Y}
                  ${xTL},${offAxisBottomTL_Y}
                  ${xObjBack},${offAxisBottomBackY}
                `}
                fill={isTopClipped ? '#ef4444' : '#f59e0b'}
                fillOpacity={isTopClipped ? 0.18 : 0.09}
                stroke={isTopClipped ? '#ef4444' : '#f59e0b'}
                strokeWidth="1.2"
                strokeDasharray={isTopClipped ? '3 3' : undefined}
              />

              {/* Converging to inverted image point on sensor */}
              <polygon
                points={`
                  ${xTL},${offAxisTopTL_Y}
                  ${xSensor},${sensorFocusY}
                  ${xTL},${offAxisBottomTL_Y}
                `}
                fill={isTopClipped ? '#ef4444' : '#f59e0b'}
                fillOpacity={isTopClipped ? 0.15 : 0.08}
                stroke={isTopClipped ? '#ef4444' : '#f59e0b'}
                strokeWidth="1"
              />
            </g>
          )}

          {/* 3. Chief Ray (Emerald / Magenta line) */}
          {showChiefRays && (
            <g>
              {/* Specimen to Objective Center (passes through center of pupil) */}
              <line
                x1={xObject}
                y1={cy - objectHalfHeightPx}
                x2={xObjCenter}
                y2={cy}
                stroke="#10b981"
                strokeWidth="1.5"
              />
              {/* Infinity Space Chief Ray (parallel to optical axis if telecentric, or tilted by chief angle) */}
              <line
                x1={xObjCenter}
                y1={cy}
                x2={xTL}
                y2={offAxisChiefTL_Y}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 3"
              />
              {/* Tube lens to Sensor Focus */}
              <line
                x1={xTL}
                y1={offAxisChiefTL_Y}
                x2={xSensor}
                y2={sensorFocusY}
                stroke="#10b981"
                strokeWidth="1.5"
              />
            </g>
          )}

          {/* --- OPTICAL HARDWARE COMPONENTS --- */}

          {/* 1. Specimen / Object Stage */}
          <g>
            {/* Stage Plate */}
            <line
              x1={xObject}
              y1={cy - height * 0.38}
              x2={xObject}
              y2={cy + height * 0.38}
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            {/* Object Arrow / Indicator */}
            <line
              x1={xObject}
              y1={cy}
              x2={xObject}
              y2={cy - objectHalfHeightPx}
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            {/* Arrow Head */}
            <polygon
              points={`
                ${xObject - 3},${cy - objectHalfHeightPx + 6}
                ${xObject + 3},${cy - objectHalfHeightPx + 6}
                ${xObject},${cy - objectHalfHeightPx - 2}
              `}
              fill="#38bdf8"
            />
            <text
              x={xObject - 8}
              y={cy - objectHalfHeightPx - 8}
              fill="#94a3b8"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="end"
            >
              Obj: {object.height} µm
            </text>
            <text
              x={xObject}
              y={cy + height * 0.42}
              fill="#94a3b8"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              Stage (Z=0)
            </text>
          </g>

          {/* 2. Objective Lens System */}
          <g>
            {/* Outer Metal Barrel */}
            <rect
              x={xObjFront}
              y={cy - objPupilR * 1.35}
              width={xObjBack - xObjFront}
              height={objPupilR * 2.7}
              fill="#0f172a"
              stroke="#334155"
              strokeWidth="1.5"
              rx="4"
            />
            {/* Lens Elements Shape */}
            <path
              d={`
                M ${xObjFront + 3} ${cy - objPupilR}
                C ${xObjCenter} ${cy - objPupilR * 0.8}, ${xObjCenter} ${cy + objPupilR * 0.8}, ${xObjFront + 3} ${cy + objPupilR}
                Z
              `}
              fill="url(#lensGlass)"
              stroke="#38bdf8"
              strokeWidth="1"
            />
            <path
              d={`
                M ${xObjBack - 3} ${cy - objPupilR}
                C ${xObjCenter} ${cy - objPupilR * 0.8}, ${xObjCenter} ${cy + objPupilR * 0.8}, ${xObjBack - 3} ${cy + objPupilR}
                Z
              `}
              fill="url(#lensGlass)"
              stroke="#38bdf8"
              strokeWidth="1"
            />

            {/* Aperture Stop Aperture (Entrance/Exit Pupil) */}
            <line
              x1={xObjCenter}
              y1={cy - objPupilR * 1.3}
              x2={xObjCenter}
              y2={cy - objPupilR}
              stroke="#f43f5e"
              strokeWidth="2.5"
            />
            <line
              x1={xObjCenter}
              y1={cy + objPupilR}
              x2={xObjCenter}
              y2={cy + objPupilR * 1.3}
              stroke="#f43f5e"
              strokeWidth="2.5"
            />

            {/* Objective Label */}
            <text
              x={(xObjFront + xObjBack) / 2}
              y={cy - objPupilR * 1.45}
              fill="#cbd5e1"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              Objective {objective.nominalMagnification}x / {objective.numericalAperture} NA
            </text>
            <text
              x={(xObjFront + xObjBack) / 2}
              y={cy + objPupilR * 1.55}
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="middle"
            >
              f={fObj}mm · Ø_pupil={results.objectivePupilDiameterMm}mm
            </text>
          </g>

          {/* 3. Tube Lens System (Interactive Draggable) */}
          <g
            className="cursor-ew-resize group"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingTL(true);
            }}
          >
            {/* Tube Lens Barrel */}
            <rect
              x={xTL - 7}
              y={cy - tlApertureR * 1.25}
              width={14}
              height={tlApertureR * 2.5}
              fill="#1e1b4b"
              stroke={isDraggingTL ? '#a5b4fc' : '#4338ca'}
              strokeWidth={isDraggingTL ? 2 : 1.5}
              rx="3"
            />
            {/* Doublet Lens Curve */}
            <ellipse
              cx={xTL}
              cy={cy}
              rx={5}
              ry={tlApertureR}
              fill="url(#tubeLensGlass)"
              stroke="#818cf8"
              strokeWidth="1.2"
            />

            {/* Aperture Stop Edges */}
            <line
              x1={xTL}
              y1={cy - tlApertureR * 1.25}
              x2={xTL}
              y2={cy - tlApertureR}
              stroke="#f59e0b"
              strokeWidth="2.5"
            />
            <line
              x1={xTL}
              y1={cy + tlApertureR}
              x2={xTL}
              y2={cy + tlApertureR * 1.25}
              stroke="#f59e0b"
              strokeWidth="2.5"
            />

            {/* Draggable indicator knob */}
            <circle
              cx={xTL}
              cy={cy - tlApertureR * 1.35}
              r={4}
              fill="#6366f1"
              stroke="#e0e7ff"
              strokeWidth="1"
            />

            {/* Tube Lens Label */}
            <text
              x={xTL}
              y={cy - tlApertureR * 1.5}
              fill="#c7d2fe"
              fontSize="11"
              fontWeight="600"
              textAnchor="middle"
            >
              Tube Lens ({fTL} mm)
            </text>
            <text
              x={xTL}
              y={cy + tlApertureR * 1.55}
              fill="#94a3b8"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="middle"
            >
              Clear Ø {tubeLens.clearAperture} mm (drag)
            </text>
          </g>

          {/* 4. Camera Sensor Plane (Interactive Draggable) */}
          <g
            className="cursor-ew-resize group"
            onMouseDown={(e) => {
              e.stopPropagation();
              setIsDraggingSensor(true);
            }}
          >
            {/* Sensor Housing */}
            <rect
              x={xSensor - 4}
              y={cy - sensorHalfHeight * 1.25}
              width={10}
              height={sensorHalfHeight * 2.5}
              fill="#064e3b"
              stroke={isDraggingSensor ? '#6ee7b7' : '#059669'}
              strokeWidth={isDraggingSensor ? 2 : 1.5}
              rx="2"
            />
            {/* Active Silicon Area */}
            <rect
              x={xSensor - 2}
              y={cy - sensorHalfHeight}
              width={4}
              height={sensorHalfHeight * 2}
              fill="url(#sensorGrad)"
              stroke="#34d399"
              strokeWidth="1"
            />

            {/* Projected Image Size Indicator on Sensor */}
            <line
              x1={xSensor + 8}
              y1={cy}
              x2={xSensor + 8}
              y2={sensorFocusY}
              stroke="#fbbf24"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <polygon
              points={`
                ${xSensor + 5},${sensorFocusY - 4}
                ${xSensor + 11},${sensorFocusY - 4}
                ${xSensor + 8},${sensorFocusY + 2}
              `}
              fill="#fbbf24"
            />

            {/* Draggable knob */}
            <circle
              cx={xSensor}
              cy={cy - sensorHalfHeight * 1.35}
              r={4}
              fill="#10b981"
              stroke="#ecfdf5"
              strokeWidth="1"
            />

            {/* Sensor Labels */}
            <text
              x={xSensor + 12}
              y={cy - sensorHalfHeight * 1.1}
              fill="#a7f3d0"
              fontSize="11"
              fontWeight="600"
              textAnchor="start"
            >
              Sensor Plane
            </text>
            <text
              x={xSensor + 12}
              y={cy - sensorHalfHeight * 1.1 + 13}
              fill="#6ee7b7"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="start"
            >
              {sensor.width} × {sensor.height} mm
            </text>
            <text
              x={xSensor + 12}
              y={sensorFocusY + 4}
              fill="#fde68a"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="start"
            >
              Image: {results.projectedHeightMm.toFixed(2)} mm
            </text>
          </g>

          {/* --- DIMENSION LINES & DISTANCES --- */}
          {/* Infinity Space Dimension Line */}
          <g>
            <line
              x1={xObjBack}
              y1={cy + height * 0.34}
              x2={xTL}
              y2={cy + height * 0.34}
              stroke="#64748b"
              strokeWidth="1"
            />
            <line
              x1={xObjBack}
              y1={cy + height * 0.32}
              x2={xObjBack}
              y2={cy + height * 0.36}
              stroke="#64748b"
              strokeWidth="1"
            />
            <line
              x1={xTL}
              y1={cy + height * 0.32}
              x2={xTL}
              y2={cy + height * 0.36}
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              x={(xObjBack + xTL) / 2}
              y={cy + height * 0.38}
              fill={results.isVignetted ? '#f87171' : '#cbd5e1'}
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
              fontWeight={results.isVignetted ? '600' : 'normal'}
            >
              L_inf = {distances.infinitySpace} mm {results.isVignetted ? '⚠️ (Vignetted)' : `(Max: ${results.maxUnvignettedDistanceMm} mm)`}
            </text>
          </g>

          {/* Tube Lens to Sensor Dimension Line */}
          <g>
            <line
              x1={xTL}
              y1={cy + height * 0.34}
              x2={xSensor}
              y2={cy + height * 0.34}
              stroke="#64748b"
              strokeWidth="1"
            />
            <line
              x1={xSensor}
              y1={cy + height * 0.32}
              x2={xSensor}
              y2={cy + height * 0.36}
              stroke="#64748b"
              strokeWidth="1"
            />
            <text
              x={(xTL + xSensor) / 2}
              y={cy + height * 0.38}
              fill="#cbd5e1"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              d_TL = {distances.tubeLensToSensor} mm
            </text>
          </g>

          {/* Interactive Optical Probe Cursor */}
          {probeX !== null && probeX > 20 && probeX < width - 20 && (
            <g>
              <line
                x1={probeX}
                y1={20}
                x2={probeX}
                y2={height - 20}
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.8"
              />
              <circle cx={probeX} cy={cy} r={3} fill="#38bdf8" />
            </g>
          )}
        </svg>

        {/* Live Floating Probe HUD */}
        {probeX !== null && (
          <div className="absolute bottom-3 left-4 bg-slate-900/90 backdrop-blur border border-slate-700/80 px-3 py-1.5 rounded-lg text-xs font-mono shadow-lg flex items-center gap-3 text-slate-300 pointer-events-none">
            <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <Eye className="w-3.5 h-3.5" />
              {probeZone}
            </span>
            <span className="text-slate-600">|</span>
            <span>Z = <strong className="text-white">{probeZMm.toFixed(1)}</strong> mm</span>
            <span className="text-slate-600">|</span>
            <span>Beam Ø ≈ <strong className="text-white">{probeBeamDiamMm > 0 ? probeBeamDiamMm.toFixed(1) : '—'}</strong> mm</span>
          </div>
        )}

        {/* Vignetting Alert Banner */}
        {results.isVignetted && (
          <div className="absolute top-3 right-4 bg-rose-950/90 border border-rose-800 text-rose-200 px-3 py-1.5 rounded-lg text-xs flex items-center gap-2 shadow-lg">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-semibold">Vignetting Warning: </span>
              <span>L_inf exceeds unvignetted limit of {results.maxUnvignettedDistanceMm} mm by {Math.abs(results.vignettingMarginMm)} mm.</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Sliders for Direct Distances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 py-3 bg-slate-950/60 border-t border-slate-800">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium">
              Infinity Space Distance (L_inf):
            </span>
            <span className="font-mono text-cyan-400 font-semibold">
              {distances.infinitySpace} mm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="20"
              max="350"
              step="1"
              value={distances.infinitySpace}
              onChange={(e) => onUpdateDistances({ infinitySpace: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-[11px] font-mono text-slate-500 shrink-0">
              Limit: {results.maxUnvignettedDistanceMm}mm
            </span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-slate-300 font-medium">
              Tube Lens to Sensor Distance (d_TL):
            </span>
            <span className="font-mono text-indigo-400 font-semibold">
              {distances.tubeLensToSensor} mm
            </span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="30"
              max="350"
              step="1"
              value={distances.tubeLensToSensor}
              onChange={(e) => onUpdateDistances({ tubeLensToSensor: Number(e.target.value) })}
              className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => onUpdateDistances({ tubeLensToSensor: tubeLens.focalLength })}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-mono shrink-0 transition-colors"
              title="Set to Tube Lens Focal Length for perfect infinity focus"
            >
              Reset to f_TL ({tubeLens.focalLength}mm)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
