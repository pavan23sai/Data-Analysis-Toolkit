'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useDataset } from '@/hooks/useDataset';
import DataUpload from '@/components/DataUpload';
import DataExploration from '@/components/DataExploration';
import DescriptiveStatistics from '@/components/DescriptiveStatistics';
import ProbabilityDistributions from '@/components/ProbabilityDistributions';
import NormalityTesting from '@/components/NormalityTesting';
import ZScoreCLT from '@/components/ZScoreCLT';
import ParametricTests from '@/components/ParametricTests';
import NonParametricTests from '@/components/NonParametricTests';
import {
  Upload,
  Search,
  BarChart3,
  Bell,
  CheckSquare,
  Calculator,
  FlaskConical,
  Shuffle,
  BookOpen,
  Sun,
  Moon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const sections = [
  { id: 'upload', label: 'Data Upload', icon: Upload, color: 'from-teal-500 to-emerald-600', shortLabel: 'Upload' },
  { id: 'exploration', label: 'Data Exploration', icon: Search, color: 'from-emerald-500 to-green-600', shortLabel: 'Explore' },
  { id: 'descriptive', label: 'Descriptive Statistics', icon: BarChart3, color: 'from-amber-500 to-orange-600', shortLabel: 'Statistics' },
  { id: 'distributions', label: 'Probability Distributions', icon: Bell, color: 'from-rose-500 to-pink-600', shortLabel: 'Distributions' },
  { id: 'normality', label: 'Normality Testing', icon: CheckSquare, color: 'from-violet-500 to-purple-600', shortLabel: 'Normality' },
  { id: 'zscore', label: 'Z-Score & CLT', icon: Calculator, color: 'from-sky-500 to-cyan-600', shortLabel: 'Z/CLT' },
  { id: 'parametric', label: 'Parametric Tests', icon: FlaskConical, color: 'from-orange-500 to-red-500', shortLabel: 'Parametric' },
  { id: 'nonparametric', label: 'Non-Parametric Tests', icon: Shuffle, color: 'from-fuchsia-500 to-pink-500', shortLabel: 'Non-Param' },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="h-9 w-9 rounded-lg hover:bg-muted"
      aria-label="Toggle theme"
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

export default function Home() {
  const [activeSection, setActiveSection] = useState('upload');
  const dataset = useDataset(s => s.dataset);

  const renderSection = () => {
    switch (activeSection) {
      case 'upload': return <DataUpload />;
      case 'exploration': return <DataExploration />;
      case 'descriptive': return <DescriptiveStatistics />;
      case 'distributions': return <ProbabilityDistributions />;
      case 'normality': return <NormalityTesting />;
      case 'zscore': return <ZScoreCLT />;
      case 'parametric': return <ParametricTests />;
      case 'nonparametric': return <NonParametricTests />;
      default: return <DataUpload />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Data Analysis Toolkit</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Statistical Analysis Made Simple</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {dataset ? (
                <Badge variant="secondary" className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  {dataset.fileName} • {dataset.rows.length} rows • {dataset.headers.length} cols
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 text-xs sm:text-sm">
                  No data loaded
                </Badge>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Section Navigation */}
      <nav className="sticky top-16 z-40 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2 overflow-x-auto scrollbar-hide">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              const needsData = section.id !== 'upload' && section.id !== 'distributions';
              const isDisabled = needsData && !dataset;
              return (
                <button
                  key={section.id}
                  onClick={() => !isDisabled && setActiveSection(section.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
                    ${isActive
                      ? `bg-gradient-to-r ${section.color} text-white shadow-md`
                      : isDisabled
                        ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{section.label}</span>
                  <span className="sm:hidden">{section.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {renderSection()}
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <BookOpen className="w-4 h-4" />
              <span>Data Analysis Toolkit — Course Assignment</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
              <span>Built with Next.js & React</span>
              <span>•</span>
              <span>Powered by shadcn/ui & Recharts</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
