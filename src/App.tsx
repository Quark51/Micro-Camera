/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ObjectiveSpec,
  TubeLensSpec,
  SensorSpec,
  ObjectSpec,
  DistanceSettings,
  PresetConfiguration,
} from './types/optics';
import {
  OPTICAL_PRESETS,
  STANDARD_SENSORS,
  STANDARD_TUBE_LENSES,
} from './data/opticalPresets';
import {
  calculateOpticalSystem,
} from './utils/opticsCalculations';
import { RayPathCanvas } from './components/RayPathCanvas';
import { SensorSimulationView } from './components/SensorSimulationView';
import { ParameterControls } from './components/ParameterControls';
import { OpticalTelemetryCard } from './components/OpticalTelemetryCard';
import { OpticalFormulasModal } from './components/OpticalFormulasModal';
import { ExportReportModal } from './components/ExportReportModal';
import {
  Compass,
  Sliders,
  Maximize2,
  Columns,
  Share2,
  BookOpen,
  Sparkles,
  Info,
  CheckCircle2,
  RotateCcw,
  Sun,
  Moon,
} from 'lucide-react';

export default function App() {
  const STORAGE_KEY = 'microscope_optical_simulator_state';
  const THEME_KEY = 'microscope_simulator_theme';

  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  // Apply theme to <html> element
  React.useEffect(() => {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Load initial state from localStorage if available
  const savedState = useMemo(() => {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) return JSON.parse(item);
    } catch (e) {
      console.warn('Failed to load saved state from localStorage:', e);
    }
    return null;
  }, []);

  // Active Preset State (Default: Nikon Plan Apo 20x)
  const [activePresetId, setActivePresetId] = useState<string>(
    savedState?.activePresetId ?? OPTICAL_PRESETS[0].id
  );

  // Optical System Parameters State
  const [objective, setObjective] = useState<ObjectiveSpec>(
    savedState?.objective ?? OPTICAL_PRESETS[0].objective
  );
  const [tubeLens, setTubeLens] = useState<TubeLensSpec>(
    savedState?.tubeLens ?? OPTICAL_PRESETS[0].tubeLens
  );
  const [sensor, setSensor] = useState<SensorSpec>(
    savedState?.sensor ?? OPTICAL_PRESETS[0].sensor
  );
  const [objectSpec, setObjectSpec] = useState<ObjectSpec>(
    savedState?.objectSpec ?? OPTICAL_PRESETS[0].object
  );
  const [distances, setDistances] = useState<DistanceSettings>(
    savedState?.distances ?? OPTICAL_PRESETS[0].distances
  );

  // Automatically persist any parameter changes to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activePresetId,
          objective,
          tubeLens,
          sensor,
          objectSpec,
          distances,
        })
      );
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }, [activePresetId, objective, tubeLens, sensor, objectSpec, distances]);

  // View Mode: 'split' | 'rays' | 'sensor'
  const [viewMode, setViewMode] = useState<'split' | 'rays' | 'sensor'>('split');

  // Modal Dialogs
  const [showFormulasModal, setShowFormulasModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Optical Calculations Memo
  const results = useMemo(() => {
    return calculateOpticalSystem(objective, tubeLens, sensor, objectSpec, distances);
  }, [objective, tubeLens, sensor, objectSpec, distances]);

  // Load a Preset
  const handleLoadPreset = (preset: PresetConfiguration) => {
    setActivePresetId(preset.id);
    setObjective({ ...preset.objective });
    setTubeLens({ ...preset.tubeLens });
    setSensor({ ...preset.sensor });
    setObjectSpec({ ...preset.object });
    setDistances({ ...preset.distances });
  };

  // State Updaters
  const handleUpdateObjective = (updates: Partial<ObjectiveSpec>) => {
    setObjective((prev) => ({ ...prev, ...updates }));
    setActivePresetId('');
  };

  const handleUpdateTubeLens = (updates: Partial<TubeLensSpec>) => {
    setTubeLens((prev) => ({ ...prev, ...updates }));
    setActivePresetId('');
  };

  const handleUpdateSensor = (updates: Partial<SensorSpec>) => {
    setSensor((prev) => ({ ...prev, ...updates }));
    setActivePresetId('');
  };

  const handleUpdateObject = (updates: Partial<ObjectSpec>) => {
    setObjectSpec((prev) => ({ ...prev, ...updates }));
  };

  const handleUpdateDistances = (updates: Partial<DistanceSettings>) => {
    setDistances((prev) => ({ ...prev, ...updates }));
  };

  // Reset to current preset
  const handleResetCurrent = () => {
    const found = OPTICAL_PRESETS.find((p) => p.id === activePresetId) ?? OPTICAL_PRESETS[0];
    handleLoadPreset(found);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      {/* 1. TOP BAR CONTRACT: Single-line brand wordmark — Nav links — 1 primary action */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white/95 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 sticky top-0 z-40 backdrop-blur-xs">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950 border border-cyan-300 dark:border-cyan-800 flex items-center justify-center text-cyan-700 dark:text-cyan-400 font-bold">
            <Compass className="w-4 h-4" />
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
            OptiMicro Ray & Sensor Simulator
          </span>
        </div>

        {/* Zone 2: Concise single-line navigation tabs / view switches */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800/90 text-xs font-medium text-slate-600 dark:text-slate-400">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'split'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Columns className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Dual Split View
          </button>
          <button
            onClick={() => setViewMode('rays')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'rays'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            Ray Bench
          </button>
          <button
            onClick={() => setViewMode('sensor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0 ${
              viewMode === 'sensor'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Sensor Capture
          </button>
          <button
            onClick={() => setShowFormulasModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            Formulas
          </button>
        </nav>

        {/* Zone 3: 1 primary action + display mode toggle */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
            aria-label={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs shadow-cyan-950/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            Export System
          </button>
        </div>
      </header>

      {/* 2. SUB-HEADER PRESETS STRIP */}
      <div className="bg-slate-100/70 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800/80 px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto text-xs">
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
            System Presets:
          </span>
          <div className="flex items-center gap-1.5">
            {OPTICAL_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleLoadPreset(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  activePresetId === p.id
                    ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800/80 font-semibold shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleResetCurrent}
          className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 flex items-center gap-1 shrink-0 whitespace-nowrap transition-colors"
          title="Reset to default preset values"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Preset
        </button>
      </div>

      {/* 3. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Top KPI Telemetry Card */}
        <OpticalTelemetryCard
          results={results}
          objective={objective}
          tubeLens={tubeLens}
          sensor={sensor}
          object={objectSpec}
          distances={distances}
          onOpenFormulas={() => setShowFormulasModal(true)}
        />

        {/* Visual Simulation Canvas Viewport */}
        <div className="space-y-6">
          {viewMode === 'split' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
              <RayPathCanvas
                objective={objective}
                tubeLens={tubeLens}
                sensor={sensor}
                object={objectSpec}
                distances={distances}
                results={results}
                onUpdateDistances={handleUpdateDistances}
              />
              <SensorSimulationView
                objective={objective}
                tubeLens={tubeLens}
                sensor={sensor}
                object={objectSpec}
                distances={distances}
                results={results}
                onUpdateObject={handleUpdateObject}
              />
            </div>
          )}

          {viewMode === 'rays' && (
            <RayPathCanvas
              objective={objective}
              tubeLens={tubeLens}
              sensor={sensor}
              object={objectSpec}
              distances={distances}
              results={results}
              onUpdateDistances={handleUpdateDistances}
            />
          )}

          {viewMode === 'sensor' && (
            <SensorSimulationView
              objective={objective}
              tubeLens={tubeLens}
              sensor={sensor}
              object={objectSpec}
              distances={distances}
              results={results}
              onUpdateObject={handleUpdateObject}
            />
          )}
        </div>

        {/* Parameter Controls Section */}
        <ParameterControls
          objective={objective}
          tubeLens={tubeLens}
          sensor={sensor}
          object={objectSpec}
          distances={distances}
          results={results}
          onUpdateObjective={handleUpdateObjective}
          onUpdateTubeLens={handleUpdateTubeLens}
          onUpdateSensor={handleUpdateSensor}
          onUpdateObject={handleUpdateObject}
          onUpdateDistances={handleUpdateDistances}
        />
      </main>

      {/* Modals */}
      <OpticalFormulasModal
        isOpen={showFormulasModal}
        onClose={() => setShowFormulasModal(false)}
        results={results}
        objective={objective}
        tubeLens={tubeLens}
        sensor={sensor}
        object={objectSpec}
        distances={distances}
      />

      <ExportReportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        results={results}
        objective={objective}
        tubeLens={tubeLens}
        sensor={sensor}
        object={objectSpec}
        distances={distances}
        onImportConfig={(imported) => {
          setObjective(imported.objective);
          setTubeLens(imported.tubeLens);
          setSensor(imported.sensor);
          setObjectSpec(imported.object);
          setDistances(imported.distances);
          setActivePresetId('');
        }}
      />

      {/* Clean Technical Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 px-6 py-4 text-xs text-slate-500 dark:text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span>Microscope Optical Simulation Bench</span>
          <span aria-hidden="true">·</span>
          <span>Infinity-Corrected Architecture</span>
          <span aria-hidden="true">·</span>
          <span>Rayleigh & Abbe Diffraction Limits</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500">
          M = f_TL / f_obj · FOV = Sensor / M
        </div>
      </footer>
    </div>
  );
}
