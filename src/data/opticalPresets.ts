/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PresetConfiguration, SensorSpec, TubeLensSpec } from '../types/optics';

export const STANDARD_SENSORS: SensorSpec[] = [
  { id: '1/3', name: '1/3" (4.8 × 3.6 mm)', width: 4.8, height: 3.6, pixelSize: 3.75 },
  { id: '1/2', name: '1/2" (6.4 × 4.8 mm)', width: 6.4, height: 4.8, pixelSize: 3.45 },
  { id: '1/1.8', name: '1/1.8" (7.18 × 5.32 mm)', width: 7.18, height: 5.32, pixelSize: 2.4 },
  { id: '2/3', name: '2/3" (8.8 × 6.6 mm)', width: 8.8, height: 6.6, pixelSize: 3.45 },
  { id: '1', name: '1" (13.2 × 8.8 mm)', width: 13.2, height: 8.8, pixelSize: 2.4 },
  { id: '1.1', name: '1.1" Sony IMX253 (14.1 × 10.6 mm)', width: 14.1, height: 10.6, pixelSize: 3.45 },
  { id: '4/3', name: '4/3" Micro Four Thirds (17.3 × 13.0 mm)', width: 17.3, height: 13.0, pixelSize: 3.8 },
  { id: 'scmos', name: 'sCMOS 2K (13.3 × 13.3 mm, 6.5 µm)', width: 13.31, height: 13.31, pixelSize: 6.5 },
  { id: 'aps-c', name: 'APS-C (23.6 × 15.6 mm)', width: 23.6, height: 15.6, pixelSize: 3.9 },
  { id: 'full-frame', name: 'Full Frame 35mm (36.0 × 24.0 mm)', width: 36.0, height: 24.0, pixelSize: 4.5 },
];

export const STANDARD_TUBE_LENSES: TubeLensSpec[] = [
  {
    id: 'nikon-200',
    name: 'Nikon MXA20696 Tube Lens (200 mm, Ø25 mm)',
    focalLength: 200,
    clearAperture: 25,
    manufacturer: 'Nikon',
  },
  {
    id: 'olympus-180',
    name: 'Olympus SWTLU-C Tube Lens (180 mm, Ø25 mm)',
    focalLength: 180,
    clearAperture: 25,
    manufacturer: 'Olympus',
  },
  {
    id: 'zeiss-164.5',
    name: 'Zeiss Tube Lens (164.5 mm, Ø24 mm)',
    focalLength: 164.5,
    clearAperture: 24,
    manufacturer: 'Zeiss',
  },
  {
    id: 'leica-200',
    name: 'Leica Tube Lens (200 mm, Ø25 mm)',
    focalLength: 200,
    clearAperture: 25,
    manufacturer: 'Leica',
  },
  {
    id: 'thorlabs-itl200',
    name: 'Thorlabs ITL200 Infinity Corrected (200 mm, Ø30 mm)',
    focalLength: 200,
    clearAperture: 30,
    manufacturer: 'Thorlabs',
  },
  {
    id: 'thorlabs-ttl165',
    name: 'Thorlabs TTL165-A (165 mm, Ø25 mm)',
    focalLength: 165,
    clearAperture: 25,
    manufacturer: 'Thorlabs',
  },
  {
    id: 'macro-135',
    name: 'Macro Camera Telephoto (135 mm, Ø45 mm)',
    focalLength: 135,
    clearAperture: 45,
    manufacturer: 'Custom / DSLR',
  },
];

export const OPTICAL_PRESETS: PresetConfiguration[] = [
  {
    id: 'nikon-plan-apo-20x',
    name: 'Nikon Plan Apo 20x + 1" Sensor',
    category: 'Biological',
    description: 'High-resolution widefield fluorescence system with 20x/0.75 objective and 1" format sensor.',
    objective: {
      nominalMagnification: 20,
      numericalAperture: 0.75,
      focalLength: 10,
      workingDistance: 1.0,
      fieldNumber: 25,
      referenceStandard: 'nikon',
      immersion: 'air',
      parfocalDistance: 60,
    },
    tubeLens: STANDARD_TUBE_LENSES[0], // Nikon 200mm
    sensor: STANDARD_SENSORS[4], // 1"
    object: {
      width: 400,
      height: 300,
      type: 'cell',
    },
    distances: {
      infinitySpace: 120,
      tubeLensToSensor: 200,
      wavelength: 550,
    },
  },
  {
    id: 'olympus-oil-60x',
    name: 'Olympus UPlanSApo 60x Oil + 4/3" Sensor',
    category: 'Fluorescence / Super-Res',
    description: 'High-NA oil immersion 60x/1.35 imaging single-cell organelle ultrastructure.',
    objective: {
      nominalMagnification: 60,
      numericalAperture: 1.35,
      focalLength: 3.0,
      workingDistance: 0.15,
      fieldNumber: 26.5,
      referenceStandard: 'olympus',
      immersion: 'oil',
      parfocalDistance: 45,
    },
    tubeLens: STANDARD_TUBE_LENSES[1], // Olympus 180mm
    sensor: STANDARD_SENSORS[6], // 4/3"
    object: {
      width: 150,
      height: 120,
      type: 'cell',
    },
    distances: {
      infinitySpace: 90,
      tubeLensToSensor: 180,
      wavelength: 520,
    },
  },
  {
    id: 'mitutoyo-long-wd-10x',
    name: 'Mitutoyo M Plan Apo 10x + APS-C Sensor',
    category: 'Industrial / Inspection',
    description: 'Ultra-long 34mm working distance industrial inspection of silicon wafers & microchips.',
    objective: {
      nominalMagnification: 10,
      numericalAperture: 0.28,
      focalLength: 20,
      workingDistance: 34.0,
      fieldNumber: 24,
      referenceStandard: 'mitutoyo',
      immersion: 'air',
      parfocalDistance: 95,
    },
    tubeLens: STANDARD_TUBE_LENSES[4], // Thorlabs ITL200 (200mm, 30mm)
    sensor: STANDARD_SENSORS[8], // APS-C
    object: {
      width: 1200,
      height: 900,
      type: 'wafer',
    },
    distances: {
      infinitySpace: 110,
      tubeLensToSensor: 200,
      wavelength: 550,
    },
  },
  {
    id: 'usaf-resolution-test-40x',
    name: 'USAF 1951 Benchmark 40x / 0.95',
    category: 'Industrial / Inspection',
    description: 'Standard optical resolution target evaluation with dry 40x objective and 1.1" sensor.',
    objective: {
      nominalMagnification: 40,
      numericalAperture: 0.95,
      focalLength: 5.0,
      workingDistance: 0.3,
      fieldNumber: 22,
      referenceStandard: 'nikon',
      immersion: 'air',
      parfocalDistance: 60,
    },
    tubeLens: STANDARD_TUBE_LENSES[0], // Nikon 200mm
    sensor: STANDARD_SENSORS[5], // 1.1" Sony IMX253
    object: {
      width: 280,
      height: 220,
      type: 'usaf',
    },
    distances: {
      infinitySpace: 100,
      tubeLensToSensor: 200,
      wavelength: 550,
    },
  },
  {
    id: 'macro-diy-135mm',
    name: 'DIY Rail: Nikon 10x with 135mm Camera Lens',
    category: 'Custom / Macro',
    description: 'Off-axis tube lens substitution: using a 135mm DSLR telephoto yields 6.75x reduced magnification.',
    objective: {
      nominalMagnification: 10,
      numericalAperture: 0.30,
      focalLength: 20,
      workingDistance: 16.0,
      fieldNumber: 25,
      referenceStandard: 'nikon',
      immersion: 'air',
      parfocalDistance: 60,
    },
    tubeLens: STANDARD_TUBE_LENSES[6], // 135mm camera lens
    sensor: STANDARD_SENSORS[9], // Full Frame
    object: {
      width: 2500,
      height: 1800,
      type: 'grid',
    },
    distances: {
      infinitySpace: 150,
      tubeLensToSensor: 135,
      wavelength: 550,
    },
  },
];
