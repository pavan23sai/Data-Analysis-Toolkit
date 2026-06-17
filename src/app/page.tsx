'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { useDataset } from '@/hooks/useDataset';
import { computeColumnSummary, mean, standardDeviation } from '@/lib/statistics';
import { downloadAsFile, exportNumber } from '@/lib/export';
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
  Keyboard,
  Download,
  Rows3,
  Columns3,
  Hash,
  Tag,
  Info,
  ArrowUp,
} from 'lucide-react';
import StatisticalGlossary from '@/components/StatisticalGlossary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

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

// Count-up animation hook using ref to avoid sync setState in effect
function useCountUp(target: number, duration: number = 800, enabled: boolean = true) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      countRef.current = 0;
      return;
    }
    if (target === 0) {
      countRef.current = 0;
      return;
    }

    let startTime: number | null = null;
    let animationId: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const newVal = Math.round(eased * target);
      countRef.current = newVal;
      setCount(newVal);
      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      }
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [target, duration, enabled]);

  return count;
}

// Animated stat card component - uses CSS animations instead of JS state for entrance
function AnimatedStatCard({
  icon: Icon,
  value,
  label,
  gradientFrom,
  gradientTo,
  iconBg,
  delay,
  visible,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
  gradientFrom: string;
  gradientTo: string;
  iconBg: string;
  delay: number;
  visible: boolean;
}) {
  const count = useCountUp(value, 800, visible);

  if (!visible) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-4 animate-[fadeInSlideUp_0.5s_ease-out_forwards]"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      {/* Subtle gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientFrom} ${gradientTo} opacity-[0.07] dark:opacity-[0.12]`} />
      <div className="relative flex items-center gap-3">
        <div className={`shrink-0 w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="text-2xl font-bold tabular-nums tracking-tight text-slate-800 dark:text-white">
            {count.toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-300 font-medium">{label}</div>
        </div>
      </div>
    </div>
  );
}

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
  const [fadeKey, setFadeKey] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const dataset = useDataset(s => s.dataset);
  const { getNumericColumns, getColumnData, getCategoricalColumns } = useDataset();
  const contentRef = useRef<HTMLDivElement>(null);

  // Compute stats for dashboard cards
  const dashboardStats = useMemo(() => {
    if (!dataset) return null;
    const numericCols = getNumericColumns();
    const catCols = getCategoricalColumns();
    return {
      totalRows: dataset.rows.length,
      totalCols: dataset.headers.length,
      numericCols: numericCols.length,
      categoricalCols: catCols.length,
    };
  }, [dataset, getNumericColumns, getCategoricalColumns]);

  // Export All Results handler
  const handleExportAll = useCallback(() => {
    if (!dataset) return;

    const numericCols = getNumericColumns();
    const lines: string[] = [];

    lines.push('========================================');
    lines.push('  Data Analysis Toolkit — Full Report');
    lines.push('========================================');
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    // Data Overview
    lines.push('--- Data Overview ---');
    lines.push(`File Name: ${dataset.fileName}`);
    lines.push(`Total Rows: ${dataset.rows.length}`);
    lines.push(`Total Columns: ${dataset.headers.length}`);
    lines.push(`Column Names: ${dataset.headers.join(', ')}`);
    lines.push(`Numeric Columns (${numericCols.length}): ${numericCols.join(', ')}`);
    lines.push('');

    // Numeric Column Summaries
    if (numericCols.length > 0) {
      lines.push('--- Numeric Column Summaries ---');
      lines.push('');
      for (const col of numericCols) {
        const data = getColumnData(col);
        if (data.length === 0) continue;
        const summary = computeColumnSummary(col, data);
        lines.push(`Column: ${col}`);
        lines.push(`  Count:      ${exportNumber(summary.count, 0)}`);
        lines.push(`  Mean:       ${exportNumber(summary.mean)}`);
        lines.push(`  Std Dev:    ${exportNumber(summary.stdDev)}`);
        lines.push(`  Min:        ${exportNumber(summary.min)}`);
        lines.push(`  Max:        ${exportNumber(summary.max)}`);
        lines.push(`  Median:     ${exportNumber(summary.median)}`);
        lines.push(`  Q1:         ${exportNumber(summary.q1)}`);
        lines.push(`  Q3:         ${exportNumber(summary.q3)}`);
        lines.push(`  IQR:        ${exportNumber(summary.iqr)}`);
        lines.push(`  Skewness:   ${exportNumber(summary.skewness)}`);
        lines.push(`  Kurtosis:   ${exportNumber(summary.kurtosis)}`);
        lines.push(`  Missing:    ${summary.missing}`);
        lines.push('');
      }
    }

    // Categorical column summaries
    const catCols = dataset.headers.filter(h => !numericCols.includes(h));
    if (catCols.length > 0) {
      lines.push('--- Categorical Column Summaries ---');
      lines.push('');
      for (const col of catCols) {
        const idx = dataset.headers.indexOf(col);
        const values = dataset.rows.map(row => String(row[idx] ?? '')).filter(v => v !== '');
        const freq = new Map<string, number>();
        values.forEach(v => freq.set(v, (freq.get(v) || 0) + 1));
        const sorted = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
        lines.push(`Column: ${col}`);
        lines.push(`  Unique Values: ${freq.size}`);
        lines.push(`  Total Count: ${values.length}`);
        lines.push(`  Top 5 Values:`);
        for (const [val, count] of sorted.slice(0, 5)) {
          lines.push(`    ${val}: ${count}`);
        }
        lines.push('');
      }
    }

    lines.push('========================================');
    lines.push('  End of Full Report');
    lines.push('========================================');

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadAsFile(`data-analysis-full-report-${timestamp}.txt`, lines.join('\n'), 'text/plain');
  }, [dataset, getNumericColumns, getColumnData]);

  const handleSectionChange = useCallback((sectionId: string) => {
    if (activeSection === sectionId) return;
    setIsFading(true);
    setTimeout(() => {
      setActiveSection(sectionId);
      setFadeKey(prev => prev + 1);
      setIsFading(false);
    }, 150);
  }, [activeSection]);

  // Scroll listener for back-to-top button and scroll progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowBackToTop(scrollY > 400);

      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollY / docHeight) * 100 : 0;
      setScrollProgress(Math.min(progress, 100));
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Keyboard shortcuts: Alt+1 through Alt+8
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx >= 0 && idx < sections.length) {
          const section = sections[idx];
          const needsData = section.id !== 'upload' && section.id !== 'distributions';
          const isDisabled = needsData && !dataset;
          if (!isDisabled) {
            handleSectionChange(section.id);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dataset, handleSectionChange]);

  const activeIndex = sections.findIndex(s => s.id === activeSection);

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
      {/* Header with dot pattern */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
        {/* Dot pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
        {/* Gradient shine effect on header border-bottom when data is loaded */}
        {dataset && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-teal-500 to-transparent animate-pulse" />
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-500/20 ${dataset ? 'animate-pulse' : ''}`}>
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Data Analysis Toolkit</h1>
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-mono border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 shrink-0">
                      v1.0
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Statistical Analysis Made Simple</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportAll}
                disabled={!dataset}
                className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:scale-105 hover:shadow-md active:scale-95 dark:text-emerald-300 dark:border-emerald-700 dark:hover:bg-emerald-950/50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 transition-all duration-200"
                aria-label="Export all results"
              >
                <Download className="h-4 w-4 transition-transform duration-200 group-hover:animate-bounce" />
                <span className="hidden sm:inline">Export All</span>
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Section Navigation */}
      <nav className="sticky top-16 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-2">
            {/* Progress indicator */}
            <div className="hidden sm:flex items-center gap-1.5 mr-3 shrink-0">
              <div className="flex items-center gap-1">
                {sections.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === activeIndex
                        ? 'w-6 bg-gradient-to-r ' + sections[idx].color
                        : idx < activeIndex
                          ? 'w-1.5 bg-emerald-400 dark:bg-emerald-600'
                          : 'w-1.5 bg-slate-200 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground tabular-nums ml-1">
                {activeIndex + 1}/{sections.length}
              </span>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-1 overflow-x-auto scrollbar-hide -mx-1 px-1">
              <TooltipProvider delayDuration={500}>
                {sections.map((section, idx) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  const needsData = section.id !== 'upload' && section.id !== 'distributions';
                  const isDisabled = needsData && !dataset;
                  return (
                    <Tooltip key={section.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => !isDisabled && handleSectionChange(section.id)}
                          disabled={isDisabled}
                          className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap shrink-0
                            ${isActive
                              ? `bg-gradient-to-r ${section.color} text-white shadow-md`
                              : isDisabled
                                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                            }`}
                        >
                          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                          <span className="hidden md:inline">{section.label}</span>
                          <span className="md:hidden">{section.shortLabel}</span>
                          {/* Animated gradient border for active tab */}
                          {isActive && (
                            <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 h-[2px] w-3/4 rounded-full bg-gradient-to-r from-white/80 via-white to-white/80 animate-pulse" />
                          )}
                          {/* Keyboard shortcut hint */}
                          <kbd className={`hidden lg:inline-flex items-center ml-1 px-1 py-0.5 text-[9px] font-mono rounded border leading-none
                            ${isActive
                              ? 'border-white/30 text-white/60'
                              : isDisabled
                                ? 'border-slate-200 dark:border-slate-700 text-slate-300 dark:text-slate-600'
                                : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            ⌥{idx + 1}
                          </kbd>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        {isDisabled ? 'Load data first to enable this section' : `${section.label} (Alt+${idx + 1})`}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </TooltipProvider>
            </div>

            {/* Keyboard hint badge */}
            <div className="hidden lg:flex items-center gap-1 ml-auto shrink-0">
              <Keyboard className="w-3 h-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">Alt+1-8</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Data Overview Dashboard Cards - visible when dataset is loaded */}
      {dashboardStats && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <AnimatedStatCard
              icon={Rows3}
              value={dashboardStats.totalRows}
              label="Total Rows"
              gradientFrom="from-teal-50"
              gradientTo="to-teal-100/50"
              iconBg="bg-gradient-to-br from-teal-500 to-teal-600"
              delay={0}
              visible={!!dataset}
            />
            <AnimatedStatCard
              icon={Columns3}
              value={dashboardStats.totalCols}
              label="Total Columns"
              gradientFrom="from-emerald-50"
              gradientTo="to-emerald-100/50"
              iconBg="bg-gradient-to-br from-emerald-500 to-emerald-600"
              delay={80}
              visible={!!dataset}
            />
            <AnimatedStatCard
              icon={Hash}
              value={dashboardStats.numericCols}
              label="Numeric Columns"
              gradientFrom="from-amber-50"
              gradientTo="to-amber-100/50"
              iconBg="bg-gradient-to-br from-amber-500 to-amber-600"
              delay={160}
              visible={!!dataset}
            />
            <AnimatedStatCard
              icon={Tag}
              value={dashboardStats.categoricalCols}
              label="Categorical Columns"
              gradientFrom="from-rose-50"
              gradientTo="to-rose-100/50"
              iconBg="bg-gradient-to-br from-rose-500 to-rose-600"
              delay={240}
              visible={!!dataset}
            />
          </div>
        </div>
      )}

      {/* Welcome state info banner - shows when upload tab is active and no dataset */}
      {activeSection === 'upload' && !dataset && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
          <div className="flex items-start gap-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/50 px-4 py-3">
            <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Start by uploading a CSV file or loading the sample dataset to begin your analysis
            </p>
          </div>
        </div>
      )}

      {/* Main Content with fade animation and gradient background */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 relative">
        {/* Subtle gradient background behind active tab content */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-50/30 via-transparent to-emerald-50/20 dark:from-teal-950/10 dark:via-transparent dark:to-emerald-950/10 pointer-events-none" />
        <div
          ref={contentRef}
          className={`relative transition-opacity duration-150 ${isFading ? 'opacity-0' : 'opacity-100'}`}
        >
          {renderSection()}
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="mt-auto bg-white dark:bg-slate-900 relative overflow-hidden">
        {/* Animated gradient top border */}
        <div className="h-[2px] bg-gradient-to-r from-teal-500/40 via-emerald-500/60 to-teal-500/40 animate-[shimmer_3s_ease-in-out_infinite]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-8">
            {/* Left column - Project info */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center">
                  <BookOpen className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Data Analysis Toolkit</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
                A comprehensive statistical analysis toolkit for data exploration, hypothesis testing, and probability distributions.
              </p>
            </div>

            {/* Center column - Tech stack */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Tech Stack</span>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="h-6 px-2 text-[10px] font-mono border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-teal-400 hover:text-teal-600 dark:hover:border-teal-600 dark:hover:text-teal-400 hover:shadow-sm transition-all duration-200 cursor-default">
                  Next.js
                </Badge>
                <Badge variant="outline" className="h-6 px-2 text-[10px] font-mono border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-emerald-400 hover:text-emerald-600 dark:hover:border-emerald-600 dark:hover:text-emerald-400 hover:shadow-sm transition-all duration-200 cursor-default">
                  React
                </Badge>
                <Badge variant="outline" className="h-6 px-2 text-[10px] font-mono border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-400 hover:text-amber-600 dark:hover:border-amber-600 dark:hover:text-amber-400 hover:shadow-sm transition-all duration-200 cursor-default">
                  shadcn/ui
                </Badge>
                <Badge variant="outline" className="h-6 px-2 text-[10px] font-mono border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-rose-400 hover:text-rose-600 dark:hover:border-rose-600 dark:hover:text-rose-400 hover:shadow-sm transition-all duration-200 cursor-default">
                  Recharts
                </Badge>
              </div>
            </div>

            {/* Right column - Quick links */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quick Links</span>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Keyboard className="w-3.5 h-3.5" />
                <span>Keyboard Shortcuts: <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">Alt</kbd> + <kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">1</kbd>–<kbd className="px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-mono text-[10px]">8</kbd></span>
              </div>
            </div>
          </div>

          <Separator className="my-5 bg-slate-200/60 dark:bg-slate-700/60" />

          <div className="flex items-center justify-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              © {new Date().getFullYear()} Data Analysis Toolkit — Course Assignment
            </p>
          </div>
        </div>
      </footer>

      {/* Scroll Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-1 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-teal-500 via-emerald-400 to-teal-500 transition-all duration-150 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Back to Top Floating Button */}
      <button
        onClick={handleScrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/30 flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:shadow-teal-500/40 hover:scale-110 active:scale-95 ${
          showBackToTop
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp className="w-5 h-5" />
      </button>

      {/* Statistical Glossary Floating Button & Dialog */}
      <StatisticalGlossary />
    </div>
  );
}
