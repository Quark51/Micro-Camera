/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ObjectiveSpec,
  TubeLensSpec,
  SensorSpec,
  ObjectSpec,
  DistanceSettings,
  OpticalCalculationResults,
  ImmersionMedium,
} from '../types/optics';
import {
  STANDARD_SENSORS,
  STANDARD_TUBE_LENSES,
} from '../data/opticalPresets';
import {
  calculateObjectiveFocalLength,
  calculateNominalMagnification,
} from '../utils/opticsCalculations';
import {
  Sliders,
  Camera,
  Layers,
  CircleDot,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ParameterControlsProps {
  objective: ObjectiveSpec;
  tubeLens: TubeLensSpec;
  sensor: SensorSpec;
  object: ObjectSpec;
  distances: DistanceSettings;
  results: OpticalCalculationResults;
  onUpdateObjective: (objective: Partial<ObjectiveSpec>) => void;
  onUpdateTubeLens: (tubeLens: Partial<TubeLensSpec>) => void;
  onUpdateSensor: (sensor: Partial<SensorSpec>) => void;
  onUpdateObject: (object: Partial<ObjectSpec>) => void;
  onUpdateDistances: (distances: Partial<DistanceSettings>) => void;
}

export const ParameterControls: React.FC<ParameterControlsProps> = ({
  objective,
  tubeLens,
  sensor,
  object,
  distances,
  results,
  onUpdateObjective,
  onUpdateTubeLens,
  onUpdateSensor,
  onUpdateObject,
  onUpdateDistances,
}) => {
  const [autoSyncFocalLength, setAutoSyncFocalLength] = useState(true);

  // Handle Magnification Change
  const handleMagChange = (mag: number) => {
    const updates: Partial<ObjectiveSpec> = { nominalMagnification: mag };
    if (autoSyncFocalLength) {
      updates.focalLength = calculateObjectiveFocalLength(mag, objective.referenceStandard);
    }
    onUpdateObjective(updates);
  };

  // Handle Focal Length Change
  const handleFocalLengthChange = (f: number) => {
    const updates: Partial<ObjectiveSpec> = { focalLength: f };
    if (autoSyncFocalLength && f > 0) {
      updates.nominalMagnification = calculateNominalMagnification(f, objective.referenceStandard);
    }
    onUpdateObjective(updates);
  };

  // Handle Reference Standard Change
  const handleReferenceChange = (standard: ObjectiveSpec['referenceStandard']) => {
    const updates: Partial<ObjectiveSpec> = { referenceStandard: standard };
    if (autoSyncFocalLength) {
      updates.focalLength = calculateObjectiveFocalLength(objective.nominalMagnification, standard);
    }
    onUpdateObjective(updates);
  };

  // Handle Sensor Preset selection
  const handleSensorPresetChange = (presetId: string) => {
    const found = STANDARD_SENSORS.find((s) => s.id === presetId);
    if (found) {
      onUpdateSensor({
        id: found.id,
        name: found.name,
        width: found.width,
        height: found.height,
        pixelSize: found.pixelSize,
      });
    }
  };

  // Handle Tube Lens Preset selection
  const handleTubeLensPresetChange = (presetId: string) => {
    const found = STANDARD_TUBE_LENSES.find((t) => t.id === presetId);
    if (found) {
      onUpdateTubeLens({
        id: found.id,
        name: found.name,
        focalLength: found.focalLength,
        clearAperture: found.clearAperture,
        manufacturer: found.manufacturer,
      });
      // Also update tube lens to sensor distance to match focal length for infinity focus
      onUpdateDistances({ tubeLensToSensor: found.focalLength });
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. OBJECTIVE LENS SPECIFICATIONS */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Microscope Objective Lens
            </h3>
          </div>
          <button
            onClick={() => setAutoSyncFocalLength(!autoSyncFocalLength)}
            className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
              autoSyncFocalLength
                ? 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
            title="Auto-calculate focal length f_obj = f_TL_design / M_nom"
          >
            {autoSyncFocalLength ? 'Auto-Sync f_obj' : 'Manual f_obj'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3">
          {/* Nominal Magnification */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Nominal Magnification
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="250"
                step="0.5"
                value={objective.nominalMagnification}
                onChange={(e) => handleMagChange(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                ×
              </span>
            </div>
          </div>

          {/* Numerical Aperture (NA) */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Numerical Aperture (NA)
            </label>
            <input
              type="number"
              min="0.05"
              max="1.50"
              step="0.05"
              value={objective.numericalAperture}
              onChange={(e) => onUpdateObjective({ numericalAperture: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
            />
          </div>

          {/* Objective Focal Length */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Focal Length (f_obj)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.1"
                value={objective.focalLength}
                onChange={(e) => handleFocalLengthChange(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>

          {/* Reference Standard */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Design Standard
            </label>
            <select
              value={objective.referenceStandard}
              onChange={(e) => handleReferenceChange(e.target.value as ObjectiveSpec['referenceStandard'])}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
            >
              <option value="nikon">Nikon (f_TL = 200 mm)</option>
              <option value="olympus">Olympus (f_TL = 180 mm)</option>
              <option value="zeiss">Zeiss (f_TL = 164.5 mm)</option>
              <option value="leica">Leica (f_TL = 200 mm)</option>
              <option value="mitutoyo">Mitutoyo (f_TL = 200 mm)</option>
              <option value="custom">Custom (200 mm)</option>
            </select>
          </div>

          {/* Immersion Medium */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Immersion Medium
            </label>
            <select
              value={objective.immersion}
              onChange={(e) => onUpdateObjective({ immersion: e.target.value as ImmersionMedium })}
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
            >
              <option value="air">Air (n = 1.000)</option>
              <option value="water">Water (n = 1.333)</option>
              <option value="silicone">Silicone Oil (n = 1.406)</option>
              <option value="oil">Standard Immersion Oil (n = 1.518)</option>
            </select>
          </div>

          {/* Working Distance */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Working Distance (WD)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.1"
                max="50"
                step="0.1"
                value={objective.workingDistance}
                onChange={(e) => onUpdateObjective({ workingDistance: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>
        </div>

        {/* Quick Quick-Select Standard Objectives */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
          <span className="text-slate-500 mr-1">Quick Select:</span>
          {[
            { label: '4x / 0.13', mag: 4, na: 0.13, wd: 17.0 },
            { label: '10x / 0.30', mag: 10, na: 0.3, wd: 16.0 },
            { label: '20x / 0.75', mag: 20, na: 0.75, wd: 1.0 },
            { label: '40x / 0.95', mag: 40, na: 0.95, wd: 0.25 },
            { label: '60x / 1.40 Oil', mag: 60, na: 1.4, wd: 0.13, immersion: 'oil' as ImmersionMedium },
            { label: '100x / 1.45 Oil', mag: 100, na: 1.45, wd: 0.13, immersion: 'oil' as ImmersionMedium },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => {
                handleMagChange(item.mag);
                onUpdateObjective({
                  numericalAperture: item.na,
                  workingDistance: item.wd,
                  ...(item.immersion ? { immersion: item.immersion } : {}),
                });
              }}
              className="px-2 py-0.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded font-mono transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* 2. TUBE LENS & DISTANCES */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Tube Lens & Distance Parameters
            </h3>
          </div>
          <select
            value={tubeLens.id}
            onChange={(e) => handleTubeLensPresetChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-indigo-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
          >
            {STANDARD_TUBE_LENSES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          {/* Tube Lens Focal Length */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Tube Lens Focal (f_TL)
            </label>
            <div className="relative">
              <input
                type="number"
                min="50"
                max="500"
                step="1"
                value={tubeLens.focalLength}
                onChange={(e) => onUpdateTubeLens({ focalLength: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>

          {/* Tube Lens Clear Aperture */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Clear Aperture (Ø_TL)
            </label>
            <div className="relative">
              <input
                type="number"
                min="10"
                max="80"
                step="1"
                value={tubeLens.clearAperture}
                onChange={(e) => onUpdateTubeLens({ clearAperture: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>

          {/* Infinity Space Distance */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Infinity Space (L_inf)
            </label>
            <div className="relative">
              <input
                type="number"
                min="10"
                max="350"
                step="5"
                value={distances.infinitySpace}
                onChange={(e) => onUpdateDistances({ infinitySpace: Number(e.target.value) })}
                className={`w-full bg-slate-950 border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none ${
                  results.isVignetted ? 'border-rose-500 text-rose-300' : 'border-slate-700 text-slate-100 focus:border-indigo-400'
                }`}
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>

          {/* Tube Lens to Sensor Distance */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              TL to Sensor Distance
            </label>
            <div className="relative">
              <input
                type="number"
                min="20"
                max="400"
                step="1"
                value={distances.tubeLensToSensor}
                onChange={(e) => onUpdateDistances({ tubeLensToSensor: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CAMERA SENSOR SPECIFICATIONS */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Camera Sensor Specifications
            </h3>
          </div>
          <select
            value={sensor.id}
            onChange={(e) => handleSensorPresetChange(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-emerald-300 rounded-lg px-2 py-1 text-xs focus:outline-none"
          >
            {STANDARD_SENSORS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          {/* Sensor Width */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Sensor Width (W_s)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={sensor.width}
                onChange={(e) => onUpdateSensor({ width: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>

          {/* Sensor Height */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Sensor Height (H_s)
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="100"
                step="0.1"
                value={sensor.height}
                onChange={(e) => onUpdateSensor({ height: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                mm
              </span>
            </div>
          </div>

          {/* Sensor Pixel Size */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Pixel Pitch (e)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0.5"
                max="20"
                step="0.05"
                value={sensor.pixelSize}
                onChange={(e) => onUpdateSensor({ pixelSize: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                µm
              </span>
            </div>
          </div>

          {/* Diagonal Readout */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Sensor Diagonal
            </label>
            <div className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 font-mono">
              {results.sensorDiagonalMm} mm
            </div>
          </div>
        </div>
      </section>

      {/* 4. OBJECT / SPECIMEN SIZE & WAVELENGTH */}
      <section className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              Object Size & Light Source
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Projected: {results.projectedWidthMm} × {results.projectedHeightMm} mm
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          {/* Object Width */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Object Width
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="10000"
                step="10"
                value={object.width}
                onChange={(e) => onUpdateObject({ width: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                µm
              </span>
            </div>
          </div>

          {/* Object Height */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Object Height
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="10000"
                step="10"
                value={object.height}
                onChange={(e) => onUpdateObject({ height: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                µm
              </span>
            </div>
          </div>

          {/* Wavelength */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Wavelength (λ)
            </label>
            <div className="relative">
              <input
                type="number"
                min="350"
                max="850"
                step="10"
                value={distances.wavelength}
                onChange={(e) => onUpdateDistances({ wavelength: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500 font-mono">
                nm
              </span>
            </div>
          </div>

          {/* Specimen Presets */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Object Type
            </label>
            <select
              value={object.type}
              onChange={(e) => onUpdateObject({ type: e.target.value as ObjectSpec['type'] })}
              className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
            >
              <option value="usaf">USAF 1951 Target</option>
              <option value="cell">Biological Cell</option>
              <option value="wafer">Silicon Wafer Track</option>
              <option value="grid">Micrometer Reticle Grid</option>
              <option value="points">Dual Point Emitters</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
};
