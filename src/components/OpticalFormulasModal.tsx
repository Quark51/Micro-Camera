/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  OpticalCalculationResults,
  ObjectiveSpec,
  TubeLensSpec,
  SensorSpec,
  ObjectSpec,
  DistanceSettings,
} from '../types/optics';
import { X, BookOpen, Calculator, Check } from 'lucide-react';

interface OpticalFormulasModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: OpticalCalculationResults;
  objective: ObjectiveSpec;
  tubeLens: TubeLensSpec;
  sensor: SensorSpec;
  object: ObjectSpec;
  distances: DistanceSettings;
}

export const OpticalFormulasModal: React.FC<OpticalFormulasModalProps> = ({
  isOpen,
  onClose,
  results,
  objective,
  tubeLens,
  sensor,
  object,
  distances,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Optical Physics & Derivation Reference
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Exact equations and current parameter substitutions for infinity-corrected microscope imaging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulas Grid */}
        <div className="space-y-5 pt-4 text-xs font-mono">
          {/* Formula 1: System Magnification */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 font-sans font-semibold mb-1.5">
              <span>1. System Magnification (M)</span>
              <span className="text-cyan-700 dark:text-cyan-400 font-mono">M = {results.actualMagnification.toFixed(2)}×</span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-sans text-xs mb-2">
              In infinity-corrected systems, magnification is determined solely by the ratio of the tube lens focal length to the objective focal length:
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 text-cyan-800 dark:text-cyan-300">
              M_actual = f_tube / f_obj = {tubeLens.focalLength} mm / {objective.focalLength} mm = {results.actualMagnification.toFixed(3)}×
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-500 mt-1.5 font-sans">
              Relative to design standard ({objective.referenceStandard}): {results.relativeMagnification.toFixed(2)}× of nominal {objective.nominalMagnification}×.
            </div>
          </div>

          {/* Formula 2: Field of View (FOV) */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 font-sans font-semibold mb-1.5">
              <span>2. Object Field of View (FOV)</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono">
                {results.fovWidthUm.toFixed(0)} × {results.fovHeightUm.toFixed(0)} µm
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-sans text-xs mb-2">
              The observable specimen area imaged onto the active sensor frame:
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1 text-emerald-800 dark:text-emerald-300">
              <div>FOV_x = Sensor_Width / M = {sensor.width} mm / {results.actualMagnification.toFixed(2)} = {results.fovWidthMm.toFixed(3)} mm ({results.fovWidthUm.toFixed(1)} µm)</div>
              <div>FOV_y = Sensor_Height / M = {sensor.height} mm / {results.actualMagnification.toFixed(2)} = {results.fovHeightMm.toFixed(3)} mm ({results.fovHeightUm.toFixed(1)} µm)</div>
              <div>FOV_diag = Sensor_Diagonal / M = {results.sensorDiagonalMm} mm / {results.actualMagnification.toFixed(2)} = {results.fovDiagonalMm.toFixed(3)} mm ({results.fovDiagonalUm.toFixed(1)} µm)</div>
            </div>
          </div>

          {/* Formula 3: Optical Resolution Limits */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 font-sans font-semibold mb-1.5">
              <span>3. Diffraction-Limited Resolution</span>
              <span className="text-amber-700 dark:text-amber-400 font-mono">r_Rayleigh = {results.rayleighLimitNm.toFixed(0)} nm</span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-sans text-xs mb-2">
              Minimum resolvable lateral separation between two emitting point sources:
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1 text-amber-800 dark:text-amber-300">
              <div>Rayleigh: r = 0.61 · λ / NA = 0.61 · {distances.wavelength} nm / {objective.numericalAperture} = {results.rayleighLimitNm.toFixed(1)} nm ({results.rayleighLimitUm.toFixed(3)} µm)</div>
              <div>Abbe: d = λ / (2 · NA) = {distances.wavelength} nm / (2 · {objective.numericalAperture}) = {results.abbeLimitNm.toFixed(1)} nm ({results.abbeLimitUm.toFixed(3)} µm)</div>
              <div>Half-Angle: θ = arcsin(NA / n) = arcsin({objective.numericalAperture} / {results.refractiveIndex}) = {results.halfAngleDeg}°</div>
            </div>
          </div>

          {/* Formula 4: Infinity Space Vignetting */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 font-sans font-semibold mb-1.5">
              <span>4. Infinity Space Unvignetted Distance Limit (L_max)</span>
              <span className="text-indigo-700 dark:text-indigo-400 font-mono">L_max = {results.maxUnvignettedDistanceMm} mm</span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-sans text-xs mb-2">
              Maximum allowable physical separation between objective and tube lens before off-axis field rays clip the tube lens clear aperture (Ø_TL):
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1 text-indigo-800 dark:text-indigo-300">
              <div>D_pupil = 2 · f_obj · NA = 2 · {objective.focalLength} mm · {objective.numericalAperture} = {results.objectivePupilDiameterMm} mm</div>
              <div>L_inf_max = (Ø_TL - D_pupil) / (Sensor_Diag / f_TL) = ({tubeLens.clearAperture} - {results.objectivePupilDiameterMm}) / ({results.sensorDiagonalMm} / {tubeLens.focalLength}) = {results.maxUnvignettedDistanceMm} mm</div>
              <div>Current L_inf = {distances.infinitySpace} mm → Margin: {results.vignettingMarginMm} mm ({results.isVignetted ? 'Vignetting Active' : 'Unvignetted'})</div>
            </div>
          </div>

          {/* Formula 5: Shannon-Nyquist Sampling Criterion */}
          <div className="bg-slate-50 dark:bg-slate-950/70 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center justify-between text-slate-800 dark:text-slate-300 font-sans font-semibold mb-1.5">
              <span>5. Shannon-Nyquist Sampling on Detector</span>
              <span className="text-purple-700 dark:text-purple-400 font-mono">Airy Ø = {results.airyDiscDiameterSensorUm.toFixed(1)} µm</span>
            </div>
            <div className="text-slate-600 dark:text-slate-400 font-sans text-xs mb-2">
              To faithfully record the diffraction-limited resolution without spatial aliasing, the sensor pixel pitch must sample at least 2 pixels across the Airy disc radius:
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded border border-slate-200 dark:border-slate-800 space-y-1 text-purple-800 dark:text-purple-300">
              <div>D_Airy_sensor = 2 · r_Rayleigh · M = 2 · {results.rayleighLimitUm.toFixed(3)} µm · {results.actualMagnification.toFixed(2)} = {results.airyDiscDiameterSensorUm.toFixed(2)} µm</div>
              <div>Nyquist Pixel Limit: e ≤ D_Airy / 2 = {results.nyquistPixelSizeUm.toFixed(2)} µm</div>
              <div>Current Pixel Pitch: e = {sensor.pixelSize} µm → Ratio: {results.airyDiscToPixelRatio.toFixed(2)} pixels / Airy Disc ({results.samplingState})</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors font-sans"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
