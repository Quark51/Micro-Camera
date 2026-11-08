/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ObjectiveSpec,
  TubeLensSpec,
  SensorSpec,
  ObjectSpec,
  DistanceSettings,
  OpticalCalculationResults,
  ImmersionMedium,
} from '../types/optics';

export const REFRACTIVE_INDICES: Record<ImmersionMedium, number> = {
  air: 1.000,
  water: 1.333,
  silicone: 1.406,
  oil: 1.518,
};

export const STANDARD_TUBE_LENS_FOCAL_LENGTHS: Record<string, number> = {
  nikon: 200,
  olympus: 180,
  zeiss: 164.5,
  leica: 200,
  mitutoyo: 200,
  custom: 200,
};

/**
 * Calculates objective focal length from nominal magnification and standard reference tube lens.
 */
export function calculateObjectiveFocalLength(
  nominalMagnification: number,
  referenceStandard: string
): number {
  if (nominalMagnification <= 0) return 10;
  const refTL = STANDARD_TUBE_LENS_FOCAL_LENGTHS[referenceStandard] ?? 200;
  return Number((refTL / nominalMagnification).toFixed(3));
}

/**
 * Calculates nominal magnification from objective focal length and standard reference tube lens.
 */
export function calculateNominalMagnification(
  focalLength: number,
  referenceStandard: string
): number {
  if (focalLength <= 0) return 10;
  const refTL = STANDARD_TUBE_LENS_FOCAL_LENGTHS[referenceStandard] ?? 200;
  return Number((refTL / focalLength).toFixed(2));
}

/**
 * Main Optical Simulation Engine
 */
export function calculateOpticalSystem(
  objective: ObjectiveSpec,
  tubeLens: TubeLensSpec,
  sensor: SensorSpec,
  object: ObjectSpec,
  distances: DistanceSettings
): OpticalCalculationResults {
  const n = REFRACTIVE_INDICES[objective.immersion] ?? 1.0;
  const lambdaUm = (distances.wavelength || 550) / 1000; // in micrometers (0.55 um for 550nm)
  const lambdaMm = lambdaUm / 1000;

  // Actual System Magnification: M = f_TL / f_obj
  const fObj = Math.max(0.1, objective.focalLength);
  const fTL = Math.max(1, tubeLens.focalLength);
  const actualMagnification = fTL / fObj;
  const relativeMagnification = actualMagnification / Math.max(0.1, objective.nominalMagnification);

  // Sensor geometry
  const sensorWidthMm = Math.max(0.1, sensor.width);
  const sensorHeightMm = Math.max(0.1, sensor.height);
  const sensorDiagonalMm = Math.sqrt(sensorWidthMm * sensorWidthMm + sensorHeightMm * sensorHeightMm);

  // Field of View on Object plane: FOV = Sensor / M
  const fovWidthMm = sensorWidthMm / actualMagnification;
  const fovHeightMm = sensorHeightMm / actualMagnification;
  const fovDiagonalMm = sensorDiagonalMm / actualMagnification;
  const fovWidthUm = fovWidthMm * 1000;
  const fovHeightUm = fovHeightMm * 1000;
  const fovDiagonalUm = fovDiagonalMm * 1000;
  const fovAreaMm2 = fovWidthMm * fovHeightMm;

  // Projected Image of Specimen on Sensor
  const objectWidthMm = (object.width || 100) / 1000;
  const objectHeightMm = (object.height || 100) / 1000;
  const projectedWidthMm = objectWidthMm * actualMagnification;
  const projectedHeightMm = objectHeightMm * actualMagnification;

  const pixelSizeMm = Math.max(0.1, sensor.pixelSize) / 1000;
  const projectedPixelsX = Math.round(projectedWidthMm / pixelSizeMm);
  const projectedPixelsY = Math.round(projectedHeightMm / pixelSizeMm);

  const sensorAreaMm2 = sensorWidthMm * sensorHeightMm;
  const projectedAreaMm2 = projectedWidthMm * projectedHeightMm;
  const sensorCoverageAreaPercent = Math.min(100, Number(((projectedAreaMm2 / sensorAreaMm2) * 100).toFixed(1)));

  const isClippedX = projectedWidthMm > sensorWidthMm;
  const isClippedY = projectedHeightMm > sensorHeightMm;
  const fitsSensor = !isClippedX && !isClippedY;

  // Numerical Aperture & Resolution Limits
  const na = Math.min(n * 0.99, Math.max(0.01, objective.numericalAperture));
  const sinTheta = Math.min(1.0, na / n);
  const halfAngleRad = Math.asin(sinTheta);
  const halfAngleDeg = (halfAngleRad * 180) / Math.PI;

  // Rayleigh Limit: r = 0.61 * lambda / NA
  const rayleighLimitUm = (0.61 * lambdaUm) / na;
  const rayleighLimitNm = rayleighLimitUm * 1000;

  // Abbe Limit: d = lambda / (2 * NA)
  const abbeLimitUm = lambdaUm / (2 * na);
  const abbeLimitNm = abbeLimitUm * 1000;

  // Depth of field: DOF = (lambda * n / NA^2) + (n * e / (M * NA))
  // where e is sensor pixel pitch or detection threshold
  const dofWaveOpticalUm = (lambdaUm * n) / (na * na);
  const dofGeometricUm = (n * (sensor.pixelSize || 3.45)) / (actualMagnification * na);
  const depthOfFieldUm = dofWaveOpticalUm + dofGeometricUm;

  // Objective Pupil Diameter: D_pupil = 2 * f_obj * NA
  const objectivePupilDiameterMm = 2 * fObj * na;

  // Working / Effective F-number: N_w = M / (2 * NA)
  const effectiveFNumber = actualMagnification / (2 * na);

  // Airy Disc Diameter at Sensor plane:
  // D_Airy_sensor = 2 * 0.61 * lambda / NA * M = 1.22 * lambda * M / NA
  const airyDiscDiameterSensorUm = 2 * rayleighLimitUm * actualMagnification;
  const airyDiscToPixelRatio = airyDiscDiameterSensorUm / Math.max(0.1, sensor.pixelSize);
  
  // Nyquist pixel size: pixel <= D_Airy / 2
  const nyquistPixelSizeUm = airyDiscDiameterSensorUm / 2;

  let samplingState: 'undersampled' | 'nyquist_optimal' | 'oversampled' = 'nyquist_optimal';
  if (airyDiscToPixelRatio < 1.8) {
    samplingState = 'undersampled'; // Risk of spatial aliasing, optical resolution exceeds sensor sampling
  } else if (airyDiscToPixelRatio > 3.5) {
    samplingState = 'oversampled'; // Empty magnification, sensor pixel is much smaller than needed
  } else {
    samplingState = 'nyquist_optimal'; // Ideal sampling matching Shannon-Nyquist theorem
  }

  // Vignetting in Infinity Space:
  // Chief ray angle: tan(alpha) = (D_sensor / 2) / f_TL
  // Off-axis ray bundle width at distance L_inf: W = D_pupil + 2 * L_inf * tan(alpha) = D_pupil + L_inf * (D_sensor / f_TL)
  // Max unvignetted distance occurs when W = D_TL (tube lens clear aperture):
  // L_inf_max = (D_TL - D_pupil) / (D_sensor / f_TL)
  const tubeLensApertureMm = Math.max(1, tubeLens.clearAperture);
  const fieldAngleTan = (sensorDiagonalMm / 2) / fTL;
  
  let maxUnvignettedDistanceMm = 0;
  if (fieldAngleTan > 0) {
    maxUnvignettedDistanceMm = Math.max(0, (tubeLensApertureMm - objectivePupilDiameterMm) / (2 * fieldAngleTan));
  }

  const currentInfSpace = Math.max(0, distances.infinitySpace);
  const isVignetted = currentInfSpace > maxUnvignettedDistanceMm;
  const vignettingMarginMm = Number((maxUnvignettedDistanceMm - currentInfSpace).toFixed(1));

  // Corner illumination approximation
  // Required beam diameter at tube lens plane
  const requiredApertureAtTL = objectivePupilDiameterMm + 2 * currentInfSpace * fieldAngleTan;
  let cornerIlluminationPercent = 100;
  if (requiredApertureAtTL > tubeLensApertureMm) {
    // Relative overlapping circular area ratio or linear transmission
    const ratio = tubeLensApertureMm / requiredApertureAtTL;
    cornerIlluminationPercent = Math.max(0, Math.min(100, Math.round(ratio * ratio * 100)));
  }

  // Objective Image Circle vs Sensor Diagonal
  const objectiveImageCircleMm = objective.fieldNumber || 22;
  const cornerClippingRisk = sensorDiagonalMm > objectiveImageCircleMm;

  return {
    actualMagnification: Number(actualMagnification.toFixed(3)),
    relativeMagnification: Number(relativeMagnification.toFixed(3)),

    fovWidthUm: Number(fovWidthUm.toFixed(2)),
    fovHeightUm: Number(fovHeightUm.toFixed(2)),
    fovDiagonalUm: Number(fovDiagonalUm.toFixed(2)),
    fovWidthMm: Number(fovWidthMm.toFixed(4)),
    fovHeightMm: Number(fovHeightMm.toFixed(4)),
    fovDiagonalMm: Number(fovDiagonalMm.toFixed(4)),
    fovAreaMm2: Number(fovAreaMm2.toFixed(4)),

    projectedWidthMm: Number(projectedWidthMm.toFixed(4)),
    projectedHeightMm: Number(projectedHeightMm.toFixed(4)),
    projectedPixelsX,
    projectedPixelsY,
    sensorCoverageAreaPercent,
    isClippedX,
    isClippedY,
    fitsSensor,

    refractiveIndex: n,
    halfAngleRad: Number(halfAngleRad.toFixed(4)),
    halfAngleDeg: Number(halfAngleDeg.toFixed(2)),
    rayleighLimitUm: Number(rayleighLimitUm.toFixed(4)),
    rayleighLimitNm: Number(rayleighLimitNm.toFixed(1)),
    abbeLimitUm: Number(abbeLimitUm.toFixed(4)),
    abbeLimitNm: Number(abbeLimitNm.toFixed(1)),
    depthOfFieldUm: Number(depthOfFieldUm.toFixed(2)),

    objectivePupilDiameterMm: Number(objectivePupilDiameterMm.toFixed(2)),
    effectiveFNumber: Number(effectiveFNumber.toFixed(2)),

    airyDiscDiameterSensorUm: Number(airyDiscDiameterSensorUm.toFixed(2)),
    airyDiscToPixelRatio: Number(airyDiscToPixelRatio.toFixed(2)),
    nyquistPixelSizeUm: Number(nyquistPixelSizeUm.toFixed(2)),
    samplingState,

    maxUnvignettedDistanceMm: Number(maxUnvignettedDistanceMm.toFixed(1)),
    isVignetted,
    vignettingMarginMm,
    cornerIlluminationPercent,

    objectiveImageCircleMm,
    sensorDiagonalMm: Number(sensorDiagonalMm.toFixed(2)),
    cornerClippingRisk,
  };
}
