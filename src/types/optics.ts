/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ImmersionMedium = 'air' | 'water' | 'silicone' | 'oil';

export interface ObjectiveSpec {
  nominalMagnification: number; // e.g. 20 (20x)
  numericalAperture: number;    // e.g. 0.75
  focalLength: number;          // mm, e.g. 10.0
  workingDistance: number;      // mm, e.g. 1.0
  fieldNumber: number;          // mm, e.g. 22 or 25
  referenceStandard: 'nikon' | 'olympus' | 'zeiss' | 'leica' | 'mitutoyo' | 'custom';
  immersion: ImmersionMedium;
  parfocalDistance: number;     // mm, e.g. 45 or 60 or 95
}

export interface TubeLensSpec {
  id: string;
  name: string;
  focalLength: number;          // mm, e.g. 200, 180, 164.5
  clearAperture: number;        // mm, e.g. 25, 30, 40
  manufacturer: string;
}

export interface SensorSpec {
  id: string;
  name: string;
  width: number;                // mm, e.g. 13.2
  height: number;               // mm, e.g. 8.8
  pixelSize: number;            // um, e.g. 3.45
}

export interface ObjectSpec {
  width: number;                // um (micrometers), e.g. 500 um
  height: number;               // um (micrometers), e.g. 400 um
  type: 'usaf' | 'cell' | 'wafer' | 'grid' | 'points';
  targetContrast?: number;      // 0 to 1
  pointSeparation?: number;     // um (for dual points resolution test)
}

export interface DistanceSettings {
  infinitySpace: number;        // mm, distance from objective shoulder/exit pupil to tube lens
  tubeLensToSensor: number;     // mm, distance from tube lens to sensor (nominally = f_TL)
  wavelength: number;           // nm, e.g. 550nm green light
}

export interface OpticalCalculationResults {
  actualMagnification: number;
  relativeMagnification: number;  // actual / nominal
  
  // Field of View on Object plane
  fovWidthUm: number;
  fovHeightUm: number;
  fovDiagonalUm: number;
  fovWidthMm: number;
  fovHeightMm: number;
  fovDiagonalMm: number;
  fovAreaMm2: number;
  
  // Projected image on sensor
  projectedWidthMm: number;
  projectedHeightMm: number;
  projectedPixelsX: number;
  projectedPixelsY: number;
  sensorCoverageAreaPercent: number;
  isClippedX: boolean;
  isClippedY: boolean;
  fitsSensor: boolean;

  // Optical Resolution & Diffraction limits
  refractiveIndex: number;
  halfAngleRad: number;
  halfAngleDeg: number;
  rayleighLimitUm: number;
  rayleighLimitNm: number;
  abbeLimitUm: number;
  abbeLimitNm: number;
  depthOfFieldUm: number;
  
  // Pupil & Geometric Parameters
  objectivePupilDiameterMm: number;
  effectiveFNumber: number;
  
  // Airy Disc on Sensor
  airyDiscDiameterSensorUm: number;
  airyDiscToPixelRatio: number;
  nyquistPixelSizeUm: number;
  samplingState: 'undersampled' | 'nyquist_optimal' | 'oversampled';
  
  // Vignetting in Infinity Space
  maxUnvignettedDistanceMm: number;
  isVignetted: boolean;
  vignettingMarginMm: number;
  cornerIlluminationPercent: number;
  
  // Image Circle & Sensor diagonal
  objectiveImageCircleMm: number;
  sensorDiagonalMm: number;
  cornerClippingRisk: boolean;
}

export interface PresetConfiguration {
  id: string;
  name: string;
  category: 'Biological' | 'Industrial / Inspection' | 'Fluorescence / Super-Res' | 'Custom / Macro';
  description: string;
  objective: ObjectiveSpec;
  tubeLens: TubeLensSpec;
  sensor: SensorSpec;
  object: ObjectSpec;
  distances: DistanceSettings;
}
