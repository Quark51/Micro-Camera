/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  OpticalCalculationResults,
  ObjectiveSpec,
  TubeLensSpec,
  SensorSpec,
  ObjectSpec,
  DistanceSettings,
} from '../types/optics';
import { X, Download, Copy, Check, FileText, Upload } from 'lucide-react';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: OpticalCalculationResults;
  objective: ObjectiveSpec;
  tubeLens: TubeLensSpec;
  sensor: SensorSpec;
  object: ObjectSpec;
  distances: DistanceSettings;
  onImportConfig?: (config: {
    objective: ObjectiveSpec;
    tubeLens: TubeLensSpec;
    sensor: SensorSpec;
    object: ObjectSpec;
    distances: DistanceSettings;
  }) => void;
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  results,
  objective,
  tubeLens,
  sensor,
  object,
  distances,
  onImportConfig,
}) => {
  const [copiedText, setCopiedText] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  if (!isOpen) return null;

  // Generate plain text report
  const generateTextReport = () => {
    return `=====================================================
MICROSCOPE OPTICAL SYSTEM SIMULATION REPORT
Generated: ${new Date().toISOString()}
=====================================================

1. OBJECTIVE LENS SPECIFICATIONS:
-----------------------------------------------------
- Nominal Magnification: ${objective.nominalMagnification}x
- Numerical Aperture (NA): ${objective.numericalAperture}
- Focal Length (f_obj): ${objective.focalLength} mm
- Working Distance (WD): ${objective.workingDistance} mm
- Field Number (FN): ${objective.fieldNumber} mm
- Design Standard: ${objective.referenceStandard.toUpperCase()}
- Immersion Medium: ${objective.immersion.toUpperCase()} (n = ${results.refractiveIndex})
- Objective Pupil Diameter: ${results.objectivePupilDiameterMm} mm

2. TUBE LENS SPECIFICATIONS:
-----------------------------------------------------
- Name: ${tubeLens.name}
- Tube Lens Focal Length (f_TL): ${tubeLens.focalLength} mm
- Tube Lens Clear Aperture: ${tubeLens.clearAperture} mm
- Manufacturer: ${tubeLens.manufacturer}

3. DISTANCE PARAMETERS:
-----------------------------------------------------
- Infinity Space Distance (L_inf): ${distances.infinitySpace} mm
- Tube Lens to Sensor Distance (d_TL): ${distances.tubeLensToSensor} mm
- Max Unvignetted Distance: ${results.maxUnvignettedDistanceMm} mm
- Vignetting Status: ${results.isVignetted ? 'VIGNETTED (Clipping Occurs)' : 'NOMINAL (Unvignetted)'}
- Corner Illumination: ${results.cornerIlluminationPercent}%

4. CAMERA SENSOR & FOV:
-----------------------------------------------------
- Sensor Format: ${sensor.name}
- Dimensions: ${sensor.width} mm (W) x ${sensor.height} mm (H)
- Sensor Diagonal: ${results.sensorDiagonalMm} mm
- Pixel Pitch: ${sensor.pixelSize} µm
- Object FOV (Width x Height): ${results.fovWidthUm.toFixed(1)} x ${results.fovHeightUm.toFixed(1)} µm
- Object FOV Diagonal: ${results.fovDiagonalUm.toFixed(1)} µm (${results.fovDiagonalMm.toFixed(3)} mm)
- FOV Area: ${results.fovAreaMm2.toFixed(4)} mm²

5. MAGNIFICATION & SENSOR IMAGE:
-----------------------------------------------------
- Actual Magnification: ${results.actualMagnification.toFixed(3)}x
- Relative Magnification: ${results.relativeMagnification.toFixed(3)}x
- Specimen Input Size: ${object.width} µm (W) x ${object.height} µm (H)
- Projected Size on Sensor: ${results.projectedWidthMm.toFixed(3)} x ${results.projectedHeightMm.toFixed(3)} mm
- Pixels Occupied: ${results.projectedPixelsX} x ${results.projectedPixelsY} px
- Sensor Area Coverage: ${results.sensorCoverageAreaPercent}%
- Framing: ${results.fitsSensor ? 'Fits in Sensor Frame' : 'Object Exceeds Sensor Frame'}

6. OPTICAL RESOLUTION & SAMPLING:
-----------------------------------------------------
- Imaging Wavelength (λ): ${distances.wavelength} nm
- Rayleigh Resolution Limit: ${results.rayleighLimitNm.toFixed(1)} nm (${results.rayleighLimitUm.toFixed(3)} µm)
- Abbe Diffraction Limit: ${results.abbeLimitNm.toFixed(1)} nm (${results.abbeLimitUm.toFixed(3)} µm)
- Depth of Field (DOF): ${results.depthOfFieldUm.toFixed(2)} µm
- Effective F-Number: f / ${results.effectiveFNumber.toFixed(2)}
- Airy Disc Diameter on Sensor: ${results.airyDiscDiameterSensorUm.toFixed(2)} µm
- Nyquist Sampling Ratio: ${results.airyDiscToPixelRatio.toFixed(2)} px / Airy Disc
- Detector Sampling Status: ${results.samplingState.toUpperCase()}
=====================================================`;
  };

  const jsonConfig = JSON.stringify(
    {
      system: {
        timestamp: new Date().toISOString(),
        wavelengthNm: distances.wavelength,
        actualMagnification: results.actualMagnification,
      },
      objective: {
        nominalMag: objective.nominalMagnification,
        numericalAperture: objective.numericalAperture,
        focalLengthMm: objective.focalLength,
        workingDistanceMm: objective.workingDistance,
        fieldNumberMm: objective.fieldNumber,
        designStandard: objective.referenceStandard,
        immersion: objective.immersion,
        refractiveIndex: results.refractiveIndex,
        pupilDiameterMm: results.objectivePupilDiameterMm,
      },
      tubeLens: {
        focalLengthMm: tubeLens.focalLength,
        clearApertureMm: tubeLens.clearAperture,
        manufacturer: tubeLens.manufacturer,
      },
      distances: {
        infinitySpaceMm: distances.infinitySpace,
        tubeLensToSensorMm: distances.tubeLensToSensor,
        maxUnvignettedDistanceMm: results.maxUnvignettedDistanceMm,
      },
      sensor: {
        name: sensor.name,
        widthMm: sensor.width,
        heightMm: sensor.height,
        pixelSizeUm: sensor.pixelSize,
        diagonalMm: results.sensorDiagonalMm,
      },
      fieldOfView: {
        widthUm: results.fovWidthUm,
        heightUm: results.fovHeightUm,
        diagonalUm: results.fovDiagonalUm,
        areaMm2: results.fovAreaMm2,
      },
      resolution: {
        rayleighLimitNm: results.rayleighLimitNm,
        abbeLimitNm: results.abbeLimitNm,
        airyDiscSensorUm: results.airyDiscDiameterSensorUm,
        nyquistSamplingState: results.samplingState,
        depthOfFieldUm: results.depthOfFieldUm,
      },
    },
    null,
    2
  );

  const copyText = () => {
    navigator.clipboard.writeText(generateTextReport());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(jsonConfig);
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const downloadText = () => {
    const blob = new Blob([generateTextReport()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `microscope_optics_report_${Math.round(results.actualMagnification)}x.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJson = () => {
    const exportData = {
      version: 1,
      name: `Optical Setup ${Math.round(results.actualMagnification)}x`,
      timestamp: new Date().toISOString(),
      objective,
      tubeLens,
      sensor,
      objectSpec: object,
      distances,
      calculated: {
        actualMagnification: results.actualMagnification,
        fovWidthUm: results.fovWidthUm,
        fovHeightUm: results.fovHeightUm,
        rayleighLimitNm: results.rayleighLimitNm,
        maxUnvignettedDistanceMm: results.maxUnvignettedDistanceMm,
      },
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `microscope_config_${Math.round(results.actualMagnification)}x.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (onImportConfig && (parsed.objective || parsed.tubeLens || parsed.sensor)) {
          onImportConfig({
            objective: parsed.objective || objective,
            tubeLens: parsed.tubeLens || tubeLens,
            sensor: parsed.sensor || sensor,
            object: parsed.objectSpec || parsed.object || object,
            distances: parsed.distances || distances,
          });
          onClose();
        }
      } catch (err) {
        console.error('Failed to parse uploaded optical configuration JSON:', err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Export Optical Configuration & Simulation Data
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Export specifications for lab notebooks, optical design software (Zemax/OSLO), or reports
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

        {/* Content Preview */}
        <div className="pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans">
              Simulation Specification Text Report:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyText}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono rounded border border-slate-200 dark:border-transparent flex items-center gap-1.5 transition-colors"
              >
                {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedText ? 'Copied' : 'Copy Text'}
              </button>
              <button
                onClick={downloadText}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono rounded border border-slate-200 dark:border-transparent flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                Download .TXT
              </button>
            </div>
          </div>

          <pre className="p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-mono text-slate-800 dark:text-slate-300 max-h-60 overflow-y-auto leading-relaxed select-all">
            {generateTextReport()}
          </pre>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-sans">
              JSON Simulation Parameters (Zemax / Python API format):
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyJson}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono rounded border border-slate-200 dark:border-transparent flex items-center gap-1.5 transition-colors"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedJson ? 'Copied' : 'Copy JSON'}
              </button>
              <button
                onClick={downloadJson}
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono rounded border border-slate-200 dark:border-transparent flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Download .JSON
              </button>
            </div>
          </div>

          <pre className="p-3 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-[11px] font-mono text-cyan-900 dark:text-cyan-300 max-h-40 overflow-y-auto leading-relaxed select-all">
            {jsonConfig}
          </pre>

          {/* Import section */}
          {onImportConfig && (
            <div className="p-3 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-sans">
                  Import Saved Configuration File
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                  Load a previously exported .json setup into the simulator
                </div>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-700 dark:text-cyan-300 text-xs font-mono rounded-lg border border-slate-200 dark:border-transparent flex items-center gap-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                Choose .JSON File
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors font-sans"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
