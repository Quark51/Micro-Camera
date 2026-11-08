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
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Ruler,
  Maximize2,
  Grid,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';

interface SensorSimulationViewProps {
  objective: ObjectiveSpec;
  tubeLens: TubeLensSpec;
  sensor: SensorSpec;
  object: ObjectSpec;
  distances: DistanceSettings;
  results: OpticalCalculationResults;
  onUpdateObject: (object: Partial<ObjectSpec>) => void;
}

export const SensorSimulationView: React.FC<SensorSimulationViewProps> = ({
  objective,
  tubeLens,
  sensor,
  object,
  distances,
  results,
  onUpdateObject,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Measurement Caliper Tool
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [caliperStart, setCaliperStart] = useState<{ x: number; y: number } | null>(null);
  const [caliperCurrent, setCaliperCurrent] = useState<{ x: number; y: number } | null>(null);

  // Display toggles
  const [showPixelGrid, setShowPixelGrid] = useState(false);
  const [showFieldCircle, setShowFieldCircle] = useState(true);
  const [showScaleBar, setShowScaleBar] = useState(true);
  const [simulateDiffractionBlur, setSimulateDiffractionBlur] = useState(true);

  // Dual point separation in um for point resolution test
  const [pointSeparationUm, setPointSeparationUm] = useState(
    object.pointSeparation ?? Math.max(0.5, Number((results.rayleighLimitUm * 1.5).toFixed(2)))
  );

  // Sync point separation
  useEffect(() => {
    if (object.type === 'points' && object.pointSeparation !== pointSeparationUm) {
      onUpdateObject({ pointSeparation: pointSeparationUm });
    }
  }, [pointSeparationUm, object.type]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    // Coordinate mapping:
    // Sensor rectangle centered on canvas
    // 1 mm on sensor = basePixelsPerMm * zoomLevel
    const maxSensorDimMm = Math.max(sensor.width, sensor.height);
    const canvasMinDim = Math.min(width, height);
    const basePixelsPerMm = (canvasMinDim * 0.72) / maxSensorDimMm;
    const scale = basePixelsPerMm * zoomLevel;

    const cx = width / 2 + panOffset.x;
    const cy = height / 2 + panOffset.y;

    const sensorPixelW = sensor.width * scale;
    const sensorPixelH = sensor.height * scale;
    const sensorLeft = cx - sensorPixelW / 2;
    const sensorTop = cy - sensorPixelH / 2;

    // 1. Draw outer workspace shadow / vignetted boundary
    ctx.save();

    // 2. Draw Sensor Body / Silicon Active Area
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(sensorLeft, sensorTop, sensorPixelW, sensorPixelH);

    // Subtle dark sensor silicon grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(sensorLeft, sensorTop, sensorPixelW, sensorPixelH);

    // Sensor clipping boundary
    ctx.beginPath();
    ctx.rect(sensorLeft, sensorTop, sensorPixelW, sensorPixelH);
    ctx.clip();

    // Inside Sensor Area:
    // Render Specimen according to magnification
    const M = results.actualMagnification;
    // Object size in mm on sensor:
    const objectWidthOnSensorMm = ((object.width || 100) / 1000) * M;
    const objectHeightOnSensorMm = ((object.height || 100) / 1000) * M;

    const objPxW = objectWidthOnSensorMm * scale;
    const objPxH = objectHeightOnSensorMm * scale;
    const objLeft = cx - objPxW / 2;
    const objTop = cy - objPxH / 2;

    // Diffraction blur radius in canvas pixels
    // Airy radius on sensor: results.airyDiscDiameterSensorUm / 2 in micrometers
    const airyRadiusSensorMm = (results.airyDiscDiameterSensorUm / 2) / 1000;
    const blurRadiusPx = simulateDiffractionBlur
      ? Math.max(0.5, airyRadiusSensorMm * scale)
      : 0;

    // Render chosen specimen
    if (object.type === 'usaf') {
      renderUSAF1951Target(ctx, cx, cy, objPxW, objPxH, blurRadiusPx, results);
    } else if (object.type === 'cell') {
      renderBiologicalCell(ctx, cx, cy, objPxW, objPxH, blurRadiusPx, results);
    } else if (object.type === 'wafer') {
      renderSiliconWafer(ctx, cx, cy, objPxW, objPxH, blurRadiusPx, results);
    } else if (object.type === 'grid') {
      renderMicrometerGrid(ctx, cx, cy, objPxW, objPxH, scale, M, blurRadiusPx);
    } else if (object.type === 'points') {
      renderDualPointEmitters(
        ctx,
        cx,
        cy,
        pointSeparationUm,
        M,
        scale,
        blurRadiusPx,
        results.rayleighLimitUm
      );
    }

    // 3. Sensor Pixel Grid Overlay (when zoomed in)
    if (showPixelGrid || zoomLevel >= 3.5) {
      renderSensorPixelGrid(ctx, sensorLeft, sensorTop, sensorPixelW, sensorPixelH, sensor.pixelSize, scale);
    }

    // 4. Optical Vignetting & Illumination Falloff
    if (results.isVignetted || results.cornerIlluminationPercent < 100) {
      const grad = ctx.createRadialGradient(
        cx,
        cy,
        sensorPixelW * 0.35,
        cx,
        cy,
        sensorPixelW * 0.72
      );
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
      const darkFactor = Math.max(0.4, 1 - results.cornerIlluminationPercent / 100);
      grad.addColorStop(1, `rgba(0, 0, 0, ${darkFactor})`);
      ctx.fillStyle = grad;
      ctx.fillRect(sensorLeft, sensorTop, sensorPixelW, sensorPixelH);
    }

    ctx.restore(); // restore clipping

    // 5. Objective Field Number (FN) Circular Limit Overlay
    if (showFieldCircle) {
      const fieldDiameterMm = objective.fieldNumber || 22;
      const fieldRadiusPx = (fieldDiameterMm / 2) * scale;

      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(cx, cy, fieldRadiusPx, 0, Math.PI * 2);
      ctx.stroke();

      // Field Number Label
      ctx.fillStyle = '#22d3ee';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`Objective Field Circle: FN ${fieldDiameterMm} mm`, cx - fieldRadiusPx + 10, cy - fieldRadiusPx + 14);

      // Warning if sensor diagonal exceeds image circle
      if (results.cornerClippingRisk) {
        ctx.fillStyle = '#fb7185';
        ctx.fillText(`⚠️ Corners exceed FN circle (Corner Clipping)`, cx - fieldRadiusPx + 10, cy - fieldRadiusPx + 28);
      }
      ctx.restore();
    }

    // 6. Sensor Outline & Dimension HUD
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sensorLeft, sensorTop, sensorPixelW, sensorPixelH);

    // Corner brackets for technical aesthetic
    const bracketLen = 12;
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(sensorLeft, sensorTop + bracketLen);
    ctx.lineTo(sensorLeft, sensorTop);
    ctx.lineTo(sensorLeft + bracketLen, sensorTop);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(sensorLeft + sensorPixelW - bracketLen, sensorTop);
    ctx.lineTo(sensorLeft + sensorPixelW, sensorTop);
    ctx.lineTo(sensorLeft + sensorPixelW, sensorTop + bracketLen);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(sensorLeft, sensorTop + sensorPixelH - bracketLen);
    ctx.lineTo(sensorLeft, sensorTop + sensorPixelH);
    ctx.lineTo(sensorLeft + bracketLen, sensorTop + sensorPixelH);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(sensorLeft + sensorPixelW - bracketLen, sensorTop + sensorPixelH);
    ctx.lineTo(sensorLeft + sensorPixelW, sensorTop + sensorPixelH);
    ctx.lineTo(sensorLeft + sensorPixelW, sensorTop + sensorPixelH - bracketLen);
    ctx.stroke();

    // Sensor Dimension Label
    ctx.fillStyle = '#6ee7b7';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.fillText(
      `Sensor: ${sensor.width} × ${sensor.height} mm (${results.projectedPixelsX} × ${results.projectedPixelsY} px utilized)`,
      sensorLeft + 8,
      sensorTop - 8
    );

    // 7. Interactive Caliper Measurement Line
    if (caliperStart && caliperCurrent) {
      const dx = caliperCurrent.x - caliperStart.x;
      const dy = caliperCurrent.y - caliperStart.y;
      const distPx = Math.sqrt(dx * dx + dy * dy);
      const distSensorMm = distPx / scale;
      const distObjectUm = (distSensorMm / M) * 1000;

      ctx.save();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(caliperStart.x, caliperStart.y);
      ctx.lineTo(caliperCurrent.x, caliperCurrent.y);
      ctx.stroke();

      // Crosshairs at start & end
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(caliperStart.x, caliperStart.y, 4, 0, Math.PI * 2);
      ctx.arc(caliperCurrent.x, caliperCurrent.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Caliper measurement box
      const midX = (caliperStart.x + caliperCurrent.x) / 2;
      const midY = (caliperStart.y + caliperCurrent.y) / 2;
      const textObj = `Object: ${distObjectUm.toFixed(2)} µm`;
      const textSens = `Sensor: ${distSensorMm.toFixed(3)} mm`;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.fillRect(midX + 8, midY - 24, 150, 42);
      ctx.strokeRect(midX + 8, midY - 24, 150, 42);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px JetBrains Mono, monospace';
      ctx.fillText(textObj, midX + 16, midY - 8);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(textSens, midX + 16, midY + 8);
      ctx.restore();
    }

    // 8. Calibrated Scale Bar
    if (showScaleBar) {
      renderScaleBar(ctx, width, height, scale, M);
    }
  }, [
    objective,
    tubeLens,
    sensor,
    object,
    distances,
    results,
    zoomLevel,
    panOffset,
    showPixelGrid,
    showFieldCircle,
    showScaleBar,
    simulateDiffractionBlur,
    caliperStart,
    caliperCurrent,
    pointSeparationUm,
  ]);

  // Helper: USAF 1951 Target Drawing
  const renderUSAF1951Target = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    blurPx: number,
    res: OpticalCalculationResults
  ) => {
    ctx.save();
    if (blurPx > 0.5) {
      ctx.filter = `blur(${Math.min(10, blurPx).toFixed(1)}px)`;
    }

    // Target backdrop
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    // Outer Target Frame
    ctx.strokeStyle = '#020617';
    ctx.lineWidth = Math.max(1, w * 0.02);
    ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);

    // Central concentric elements
    ctx.fillStyle = '#020617';

    // Group labels and bar patterns
    const barW = w * 0.04;
    const barH = h * 0.2;

    // Element 1 bars (3 vertical, 3 horizontal)
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - w * 0.35 + i * barW * 2, cy - barH * 0.6, barW, barH);
      ctx.fillRect(cx - w * 0.35, cy + barH * 0.2 + i * barW * 2, barH, barW);
    }

    // Element 2 bars (higher frequency)
    const barW2 = barW * 0.65;
    const barH2 = barH * 0.65;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx - w * 0.05 + i * barW2 * 2, cy - barH2 * 0.6, barW2, barH2);
      ctx.fillRect(cx - w * 0.05, cy + barH2 * 0.2 + i * barW2 * 2, barH2, barW2);
    }

    // Element 3 bars (near optical resolution limit)
    const barW3 = barW * 0.35;
    const barH3 = barH * 0.35;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(cx + w * 0.2 + i * barW3 * 2, cy - barH3 * 0.6, barW3, barH3);
      ctx.fillRect(cx + w * 0.2, cy + barH3 * 0.2 + i * barW3 * 2, barH3, barW3);
    }

    // Calibration Target Text
    ctx.font = `bold ${Math.max(9, Math.round(w * 0.07))}px JetBrains Mono, monospace`;
    ctx.fillText('USAF 1951', cx - w * 0.42, cy - h * 0.38);
    ctx.font = `${Math.max(7, Math.round(w * 0.05))}px JetBrains Mono, monospace`;
    ctx.fillText(`Rayleigh Limit: ${res.rayleighLimitUm} µm`, cx - w * 0.42, cy + h * 0.44);

    ctx.restore();
  };

  // Helper: Biological Specimen Drawing
  const renderBiologicalCell = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    blurPx: number,
    res: OpticalCalculationResults
  ) => {
    ctx.save();
    if (blurPx > 0.5) {
      ctx.filter = `blur(${Math.min(8, blurPx).toFixed(1)}px)`;
    }

    // Cell Cytoplasm & Membrane
    const rx = w * 0.45;
    const ry = h * 0.42;

    const cellGrad = ctx.createRadialGradient(cx, cy, rx * 0.1, cx, cy, rx);
    cellGrad.addColorStop(0, '#38bdf8');
    cellGrad.addColorStop(0.6, '#0284c7');
    cellGrad.addColorStop(0.95, '#0369a1');
    cellGrad.addColorStop(1, '#0c4a6e');

    ctx.fillStyle = cellGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Cell membrane outline
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = Math.max(1, w * 0.015);
    ctx.stroke();

    // Nucleus
    const nucR = rx * 0.42;
    const nucX = cx - rx * 0.15;
    const nucY = cy - ry * 0.1;

    const nucGrad = ctx.createRadialGradient(nucX, nucY, nucR * 0.1, nucX, nucY, nucR);
    nucGrad.addColorStop(0, '#c084fc');
    nucGrad.addColorStop(0.8, '#7e22ce');
    nucGrad.addColorStop(1, '#581c87');

    ctx.fillStyle = nucGrad;
    ctx.beginPath();
    ctx.arc(nucX, nucY, nucR, 0, Math.PI * 2);
    ctx.fill();

    // Nucleolus
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(nucX + nucR * 0.25, nucY - nucR * 0.2, nucR * 0.28, 0, Math.PI * 2);
    ctx.fill();

    // Mitochondria & Organelles
    const organelleColors = ['#f59e0b', '#10b981', '#38bdf8'];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4 + 0.3;
      const dist = rx * 0.65;
      const ox = cx + Math.cos(angle) * dist;
      const oy = cy + Math.sin(angle) * dist * 0.8;
      ctx.fillStyle = organelleColors[i % organelleColors.length];
      ctx.beginPath();
      ctx.ellipse(ox, oy, rx * 0.08, ry * 0.04, angle, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  // Helper: Silicon Wafer Integrated Circuit
  const renderSiliconWafer = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    blurPx: number,
    res: OpticalCalculationResults
  ) => {
    ctx.save();
    if (blurPx > 0.5) {
      ctx.filter = `blur(${Math.min(8, blurPx).toFixed(1)}px)`;
    }

    // Silicon Substrate
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    // Aluminum / Copper Metal Interconnect Tracks
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = Math.max(1, w * 0.015);

    const step = w / 12;
    for (let x = cx - w / 2 + step; x < cx + w / 2; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, cy - h / 2);
      ctx.lineTo(x, cy + h / 2);
      ctx.stroke();
    }

    ctx.strokeStyle = '#818cf8';
    for (let y = cy - h / 2 + step; y < cy + h / 2; y += step) {
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y);
      ctx.lineTo(cx + w / 2, y);
      ctx.stroke();
    }

    // Contact Via Pads (Gold)
    ctx.fillStyle = '#fbbf24';
    const padSize = step * 0.45;
    for (let x = cx - w / 2 + step; x < cx + w / 2; x += step * 2) {
      for (let y = cy - h / 2 + step; y < cy + h / 2; y += step * 2) {
        ctx.fillRect(x - padSize / 2, y - padSize / 2, padSize, padSize);
      }
    }

    ctx.restore();
  };

  // Helper: Stage Micrometer Calibration Grid
  const renderMicrometerGrid = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    w: number,
    h: number,
    scale: number,
    M: number,
    blurPx: number
  ) => {
    ctx.save();
    if (blurPx > 0.5) {
      ctx.filter = `blur(${Math.min(6, blurPx).toFixed(1)}px)`;
    }

    // White glass slide backdrop
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - w / 2, cy - h / 2, w, h);

    ctx.strokeStyle = '#020617';
    ctx.fillStyle = '#020617';

    // 10 um pitch in pixels:
    // 10 um = 0.01 mm on object -> 0.01 * M mm on sensor -> (0.01 * M) * scale px
    const pitch10UmPx = 0.01 * M * scale;
    const pitch100UmPx = pitch10UmPx * 10;

    // Draw horizontal and vertical tick marks
    if (pitch10UmPx >= 3) {
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = '#94a3b8';
      for (let x = cx; x < cx + w / 2; x += pitch10UmPx) {
        ctx.beginPath();
        ctx.moveTo(x, cy - 8);
        ctx.lineTo(x, cy + 8);
        ctx.stroke();
      }
      for (let x = cx - pitch10UmPx; x > cx - w / 2; x -= pitch10UmPx) {
        ctx.beginPath();
        ctx.moveTo(x, cy - 8);
        ctx.lineTo(x, cy + 8);
        ctx.stroke();
      }
    }

    // 100 um major ticks with numbers
    if (pitch100UmPx >= 15) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#020617';
      ctx.font = '9px JetBrains Mono, monospace';
      let index = 0;
      for (let x = cx; x < cx + w / 2; x += pitch100UmPx) {
        ctx.beginPath();
        ctx.moveTo(x, cy - 18);
        ctx.lineTo(x, cy + 18);
        ctx.stroke();
        ctx.fillText(`${index * 100}µm`, x - 12, cy + 32);
        index++;
      }
      index = 1;
      for (let x = cx - pitch100UmPx; x > cx - w / 2; x -= pitch100UmPx) {
        ctx.beginPath();
        ctx.moveTo(x, cy - 18);
        ctx.lineTo(x, cy + 18);
        ctx.stroke();
        ctx.fillText(`-${index * 100}µm`, x - 14, cy + 32);
        index++;
      }
    }

    ctx.restore();
  };

  // Helper: Dual Point Emitter (Rayleigh Resolution Criterion Test)
  const renderDualPointEmitters = (
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    sepUm: number,
    M: number,
    scale: number,
    blurPx: number,
    rayleighLimitUm: number
  ) => {
    ctx.save();
    // Distance between points on sensor in pixels:
    // sepUm / 1000 = sepMm -> sepMm * M * scale px
    const sepPx = (sepUm / 1000) * M * scale;
    const p1x = cx - sepPx / 2;
    const p2x = cx + sepPx / 2;

    const isResolved = sepUm >= rayleighLimitUm;

    // Draw Airy intensity discs with diffraction profile
    const airyR = Math.max(2, blurPx * 2.2);

    // Point 1
    const g1 = ctx.createRadialGradient(p1x, cy, 0, p1x, cy, airyR);
    g1.addColorStop(0, '#38bdf8');
    g1.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
    g1.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g1;
    ctx.beginPath();
    ctx.arc(p1x, cy, airyR, 0, Math.PI * 2);
    ctx.fill();

    // Point 2
    const g2 = ctx.createRadialGradient(p2x, cy, 0, p2x, cy, airyR);
    g2.addColorStop(0, '#38bdf8');
    g2.addColorStop(0.5, 'rgba(56, 189, 248, 0.4)');
    g2.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(p2x, cy, airyR, 0, Math.PI * 2);
    ctx.fill();

    // Point core centers
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p1x, cy, 2, 0, Math.PI * 2);
    ctx.arc(p2x, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    // Separation line annotation
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(p1x, cy - 20);
    ctx.lineTo(p2x, cy - 20);
    ctx.stroke();

    ctx.fillStyle = isResolved ? '#34d399' : '#f87171';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.fillText(
      `Δx = ${sepUm.toFixed(2)} µm (${isResolved ? 'Resolved' : 'Diffraction Limited / Merged'})`,
      cx - 90,
      cy - 28
    );

    ctx.restore();
  };

  // Helper: Render Sensor Pixel Grid (Nyquist sampling inspection)
  const renderSensorPixelGrid = (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    w: number,
    h: number,
    pixelSizeUm: number,
    scale: number
  ) => {
    const pixelSizeMm = pixelSizeUm / 1000;
    const pxPitchCanvas = pixelSizeMm * scale;

    if (pxPitchCanvas < 3) return; // Skip if too dense to prevent moire

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 0.5;

    for (let x = left; x <= left + w; x += pxPitchCanvas) {
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, top + h);
      ctx.stroke();
    }

    for (let y = top; y <= top + h; y += pxPitchCanvas) {
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + w, y);
      ctx.stroke();
    }
    ctx.restore();
  };

  // Helper: Calibrated Scale Bar
  const renderScaleBar = (
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    scale: number,
    M: number
  ) => {
    // Choose nice round micron step for ~80-120px scale bar
    // 1 px = (1 / scale) mm on sensor = (1 / (scale * M)) * 1000 um on object
    const umPerPx = (1 / (scale * M)) * 1000;
    const targetUm = 100 * umPerPx;

    const roundSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
    let chosenUm = roundSteps[0];
    for (const step of roundSteps) {
      if (step <= targetUm) {
        chosenUm = step;
      }
    }

    const barLengthPx = (chosenUm / 1000) * M * scale;
    const barX = w - barLengthPx - 30;
    const barY = h - 30;

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(barX - 10, barY - 24, barLengthPx + 20, 36);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(barX, barY);
    ctx.lineTo(barX + barLengthPx, barY);
    ctx.stroke();

    // End caps
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barX, barY - 4);
    ctx.lineTo(barX, barY + 4);
    ctx.moveTo(barX + barLengthPx, barY - 4);
    ctx.lineTo(barX + barLengthPx, barY + 4);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    const label = chosenUm >= 1000 ? `${(chosenUm / 1000).toFixed(1)} mm` : `${chosenUm} µm`;
    ctx.fillText(label, barX + barLengthPx / 2 - 16, barY - 8);
    ctx.restore();
  };

  // Mouse Handlers for Pan and Caliper
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isMeasuring) {
      setCaliperStart({ x, y });
      setCaliperCurrent({ x, y });
    } else {
      setIsPanning(true);
      setStartPan({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isMeasuring && caliperStart) {
      setCaliperCurrent({ x, y });
    } else if (isPanning) {
      setPanOffset({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const resetPanZoom = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    setCaliperStart(null);
    setCaliperCurrent(null);
  };

  return (
    <div className="flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden select-none shadow-xs">
      {/* Top Header & View Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800 dark:text-slate-200 tracking-wide flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Camera Sensor Capture Simulation
          </span>
          <span className="text-slate-400 dark:text-slate-500">·</span>
          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
            FOV: {results.fovWidthUm} × {results.fovHeightUm} µm
          </span>
        </div>

        {/* Specimen Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onUpdateObject({ type: 'usaf' })}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              object.type === 'usaf'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            USAF 1951
          </button>
          <button
            onClick={() => onUpdateObject({ type: 'cell' })}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              object.type === 'cell'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Biological Cell
          </button>
          <button
            onClick={() => onUpdateObject({ type: 'wafer' })}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              object.type === 'wafer'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Silicon Wafer
          </button>
          <button
            onClick={() => onUpdateObject({ type: 'grid' })}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              object.type === 'grid'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Micrometer Grid
          </button>
          <button
            onClick={() => onUpdateObject({ type: 'points' })}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              object.type === 'points'
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Point Emitters
          </button>
        </div>

        {/* Action Tools */}
        <div className="flex items-center gap-2">
          {/* Caliper Tool Button */}
          <button
            onClick={() => {
              setIsMeasuring(!isMeasuring);
              if (!isMeasuring) {
                setCaliperStart(null);
                setCaliperCurrent(null);
              }
            }}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1.5 transition-colors ${
              isMeasuring
                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800'
            }`}
            title="Measure distances in microns on object and millimeters on sensor"
          >
            <Ruler className="w-3.5 h-3.5" />
            Caliper Tool
          </button>

          {/* Toggle Diffraction Blur */}
          <button
            onClick={() => setSimulateDiffractionBlur(!simulateDiffractionBlur)}
            className={`p-1.5 rounded transition-colors ${
              simulateDiffractionBlur
                ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
            title="Toggle Optical Diffraction Blur (Rayleigh limit)"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Pixel Grid */}
          <button
            onClick={() => setShowPixelGrid(!showPixelGrid)}
            className={`p-1.5 rounded transition-colors ${
              showPixelGrid
                ? 'bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
            title="Toggle Sensor Pixel Grid overlay"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 rounded-md p-0.5 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.25))}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300">
              {zoomLevel.toFixed(1)}x
            </span>
            <button
              onClick={() => setZoomLevel(Math.min(8.0, zoomLevel + 0.25))}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetPanZoom}
              className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative w-full bg-slate-950 overflow-hidden flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={840}
          height={480}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`block w-full h-auto cursor-${isMeasuring ? 'crosshair' : isPanning ? 'grabbing' : 'grab'}`}
        />

        {/* Point Emitter Slider Overlay */}
        {object.type === 'points' && (
          <div className="absolute top-3 left-4 bg-slate-900/90 backdrop-blur border border-slate-800 px-3 py-2 rounded-lg text-xs shadow-lg flex items-center gap-3">
            <span className="text-slate-300 font-medium">Emitter Separation (Δx):</span>
            <input
              type="range"
              min="0.1"
              max={Math.max(5, results.rayleighLimitUm * 4)}
              step="0.05"
              value={pointSeparationUm}
              onChange={(e) => setPointSeparationUm(Number(e.target.value))}
              className="w-32 accent-emerald-400 cursor-pointer"
            />
            <span className="font-mono text-emerald-400 font-semibold">{pointSeparationUm.toFixed(2)} µm</span>
            <span className="text-[11px] text-slate-400">
              (Limit: {results.rayleighLimitUm.toFixed(2)} µm)
            </span>
          </div>
        )}

        {/* Live Status HUD */}
        <div className="absolute bottom-3 left-4 flex items-center gap-2 bg-slate-900/90 backdrop-blur border border-slate-800/80 px-3 py-1.5 rounded-lg text-[11px] font-mono text-slate-300">
          <span>
            Projected Size: <strong className="text-white">{results.projectedWidthMm} × {results.projectedHeightMm} mm</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span>
            Pixels: <strong className="text-white">{results.projectedPixelsX} × {results.projectedPixelsY}</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className={results.fitsSensor ? 'text-emerald-400' : 'text-amber-400 font-semibold'}>
            {results.fitsSensor ? 'Fits Sensor Frame' : 'Object Exceeds Sensor Frame'}
          </span>
        </div>
      </div>
    </div>
  );
};
