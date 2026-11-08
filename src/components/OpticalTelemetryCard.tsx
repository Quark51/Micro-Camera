/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { OpticalCalculationResults, ObjectiveSpec, TubeLensSpec, SensorSpec, ObjectSpec, DistanceSettings } from '../types/optics';
import {
  Compass,
  Maximize,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Sparkles,
  Info,
  Scale,
} from 'lucide-react';

interface OpticalTelemetryCardProps {
  results: OpticalCalculationResults;
  objective: ObjectiveSpec;
  tubeLens: TubeLensSpec;
  sensor: SensorSpec;
  object: ObjectSpec;
  distances: DistanceSettings;
  onOpenFormulas: () => void;
}

export const OpticalTelemetryCard: React.FC<OpticalTelemetryCardProps> = ({
  results,
  objective,
  tubeLens,
  sensor,
  object,
  distances,
  onOpenFormulas,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
      {/* Telemetry Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Calculated Optical Performance & FOV Telemetry
          </h3>
        </div>
        <button
          onClick={onOpenFormulas}
          className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 flex items-center gap-1 font-mono transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          View Formulas
        </button>
      </div>

      {/* Primary KPI Grid (60-30-10 discipline) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800">
        {/* 1. Actual Magnification */}
        <div className="bg-white dark:bg-slate-900/90 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            System Magnification
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 tabular-nums">
              {results.actualMagnification.toFixed(2)}×
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              ({results.relativeMagnification.toFixed(2)}× nominal)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-500 font-mono mt-0.5">
            f_TL ({tubeLens.focalLength}mm) / f_obj ({objective.focalLength}mm)
          </div>
        </div>

        {/* 2. Field of View (FOV) */}
        <div className="bg-white dark:bg-slate-900/90 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Object Field of View (FOV)
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {results.fovWidthUm >= 1000
                ? `${(results.fovWidthUm / 1000).toFixed(2)} × ${(results.fovHeightUm / 1000).toFixed(2)}`
                : `${results.fovWidthUm.toFixed(0)} × ${results.fovHeightUm.toFixed(0)}`}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {results.fovWidthUm >= 1000 ? 'mm' : 'µm'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-500 font-mono mt-0.5">
            Diag: {results.fovDiagonalUm.toFixed(1)} µm ({results.fovDiagonalMm.toFixed(2)} mm)
          </div>
        </div>

        {/* 3. Optical Resolution (Rayleigh) */}
        <div className="bg-white dark:bg-slate-900/90 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Rayleigh Resolution Limit
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 tabular-nums">
              {results.rayleighLimitUm < 1
                ? `${results.rayleighLimitNm.toFixed(0)}`
                : results.rayleighLimitUm.toFixed(2)}
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              {results.rayleighLimitUm < 1 ? 'nm' : 'µm'}
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              (Abbe: {results.abbeLimitNm.toFixed(0)} nm)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-500 font-mono mt-0.5">
            λ={distances.wavelength}nm · NA={objective.numericalAperture} (θ={results.halfAngleDeg}°)
          </div>
        </div>

        {/* 4. Nyquist Sampling Quality */}
        <div className="bg-white dark:bg-slate-900/90 p-3.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Detector Sampling Status
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span
              className={`text-base font-bold font-mono ${
                results.samplingState === 'nyquist_optimal'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : results.samplingState === 'undersampled'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-indigo-600 dark:text-indigo-400'
              }`}
            >
              {results.samplingState === 'nyquist_optimal'
                ? 'Nyquist Matched'
                : results.samplingState === 'undersampled'
                ? 'Undersampled (Aliasing)'
                : 'Oversampled'}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
            Airy: {results.airyDiscDiameterSensorUm.toFixed(1)} µm / Pixel: {sensor.pixelSize} µm ({results.airyDiscToPixelRatio.toFixed(1)} px)
          </div>
        </div>
      </div>

      {/* Detailed Technical Telemetry Rows */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
        {/* Group 1: Geometric Optics & Pupils */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5 mb-2 font-sans">
            <Maximize className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Pupils & Working Geometry
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Objective Pupil (Ø):</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">{results.objectivePupilDiameterMm} mm</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Effective F-Number:</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">f / {results.effectiveFNumber}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Working Distance (WD):</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">{objective.workingDistance} mm</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Depth of Field (DOF):</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">{results.depthOfFieldUm} µm</span>
          </div>
        </div>

        {/* Group 2: Infinity Space & Vignetting */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5 mb-2 font-sans">
            <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Infinity Space & Vignetting
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Current Infinity Space:</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">{distances.infinitySpace} mm</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Max Unvignetted (L_max):</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">{results.maxUnvignettedDistanceMm} mm</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Infinity Margin:</span>
            <span
              className={`tabular-nums font-semibold ${
                results.isVignetted ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {results.vignettingMarginMm > 0 ? `+${results.vignettingMarginMm} mm` : `${results.vignettingMarginMm} mm`}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Corner Illumination:</span>
            <span
              className={`tabular-nums font-semibold ${
                results.cornerIlluminationPercent === 100
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {results.cornerIlluminationPercent}%
            </span>
          </div>
        </div>

        {/* Group 3: Sensor Coverage & Framing */}
        <div className="space-y-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5 mb-2 font-sans">
            <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Sensor Coverage & Framing
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Projected Image:</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">
              {results.projectedWidthMm} × {results.projectedHeightMm} mm
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Sensor Pixel Utilization:</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">
              {results.projectedPixelsX} × {results.projectedPixelsY} px
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Area Coverage:</span>
            <span className="text-slate-900 dark:text-slate-200 font-medium tabular-nums">
              {results.sensorCoverageAreaPercent}% of sensor
            </span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Framing Status:</span>
            <span
              className={`tabular-nums font-semibold ${
                results.fitsSensor ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {results.fitsSensor ? 'Fits in Sensor' : 'Clipped by Sensor Frame'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
