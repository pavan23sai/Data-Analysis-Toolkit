'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  AreaChart, Area, LineChart, Line, ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dice3, TrendingUp, BarChart3, GitCompare, Info,
  Calculator, BookOpen, ArrowRight, Sigma, Sparkles, ChevronRight,
} from 'lucide-react';

import {
  binomialPlotData, binomialStats,
  bernoulliPlotData, bernoulliStats,
  poissonPlotData, poissonStats,
  normalPlotData, normalStats,
  exponentialPlotData, exponentialStats,
  uniformPlotData, uniformStats,
  empiricalRuleData,
  normalPDF, normalCDF,
  binomialPMF, binomialCDF,
  poissonPMF, poissonCDF,
  exponentialPDF, exponentialCDF,
  uniformPDF, uniformCDF,
} from '@/lib/distributions';

import {
  chiSquarePDF, chiSquareCDF,
  tPDF, tCDF,
  fPDF, fCDF,
} from '@/lib/statistics';

// ==================== COLOR PALETTE (teal/emerald/warm) ====================
const COLORS = {
  pmf: '#0d9488',       // teal-600
  pmfFill: '#0d948880', // teal-600 with alpha
  cdf: '#d97706',       // amber-600
  cdfFill: '#d9770680', // amber-600 with alpha
  pdf: '#059669',       // emerald-600
  pdfFill: '#05966980', // emerald-600 with alpha
  comp1: '#0d9488',     // teal-600
  comp1Fill: '#0d948840',
  comp2: '#dc2626',     // red-600
  comp2Fill: '#dc262640',
  sigma1: '#0d9488',
  sigma2: '#d97706',
  sigma3: '#dc2626',
  calcArea: '#0d948840', // teal with alpha for calculator area
  calcStroke: '#0d9488',
};

// ==================== CALCULATOR DISTRIBUTION TYPES ====================
type CalcDistType = 'normal' | 'binomial' | 'poisson' | 'exponential' | 'uniform' | 'chiSquare' | 'tDist' | 'fDist';

type CalcMode = 'le' | 'gt' | 'range';

interface CalcParams {
  normal: { mu: number; sigma: number };
  binomial: { n: number; p: number };
  poisson: { lambda: number };
  exponential: { lambda: number };
  uniform: { a: number; b: number };
  chiSquare: { k: number };
  tDist: { df: number };
  fDist: { d1: number; d2: number };
}

const CALC_DIST_LABELS: Record<CalcDistType, string> = {
  normal: 'Normal',
  binomial: 'Binomial',
  poisson: 'Poisson',
  exponential: 'Exponential',
  uniform: 'Uniform',
  chiSquare: 'Chi-Square',
  tDist: 't-Distribution',
  fDist: 'F-Distribution',
};

const CALC_DIST_TYPES: { key: CalcDistType; label: string; category: 'continuous' | 'discrete' }[] = [
  { key: 'normal', label: 'Normal', category: 'continuous' },
  { key: 'binomial', label: 'Binomial', category: 'discrete' },
  { key: 'poisson', label: 'Poisson', category: 'discrete' },
  { key: 'exponential', label: 'Exponential', category: 'continuous' },
  { key: 'uniform', label: 'Uniform', category: 'continuous' },
  { key: 'chiSquare', label: 'Chi-Square', category: 'continuous' },
  { key: 'tDist', label: 't-Distribution', category: 'continuous' },
  { key: 'fDist', label: 'F-Distribution', category: 'continuous' },
];

const DEFAULT_PARAMS: CalcParams = {
  normal: { mu: 0, sigma: 1 },
  binomial: { n: 20, p: 0.5 },
  poisson: { lambda: 5 },
  exponential: { lambda: 1 },
  uniform: { a: 0, b: 10 },
  chiSquare: { k: 5 },
  tDist: { df: 10 },
  fDist: { d1: 5, d2: 10 },
};

// ==================== PROBABILITY CALCULATOR ====================
function ProbabilityCalculator({ onFillFromRef }: { onFillFromRef?: (dist: CalcDistType, params: Record<string, number>) => void }) {
  const [distType, setDistType] = useState<CalcDistType>('normal');
  const [params, setParams] = useState<CalcParams['normal']>(DEFAULT_PARAMS.normal);
  const [calcMode, setCalcMode] = useState<CalcMode>('le');
  const [xValue, setXValue] = useState<string>('1');
  const [x1Value, setX1Value] = useState<string>('-1');
  const [x2Value, setX2Value] = useState<string>('1');
  const [computedResult, setComputedResult] = useState<number | null>(null);

  const updateParam = useCallback((key: string, value: number) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDistChange = useCallback((newType: CalcDistType) => {
    setDistType(newType);
    setParams(DEFAULT_PARAMS[newType] as Record<string, number>);
    setComputedResult(null);
    // Set sensible default x values
    switch (newType) {
      case 'normal': setXValue('1'); setX1Value('-1'); setX2Value('1'); break;
      case 'binomial': setXValue('10'); setX1Value('8'); setX2Value('12'); break;
      case 'poisson': setXValue('5'); setX1Value('3'); setX2Value('7'); break;
      case 'exponential': setXValue('1'); setX1Value('0.5'); setX2Value('1.5'); break;
      case 'uniform': setXValue('5'); setX1Value('2'); setX2Value('8'); break;
      case 'chiSquare': setXValue('5'); setX1Value('2'); setX2Value('10'); break;
      case 'tDist': setXValue('1'); setX1Value('-1'); setX2Value('1'); break;
      case 'fDist': setXValue('2'); setX1Value('0.5'); setX2Value('3'); break;
    }
  }, []);

  // Expose handleDistChange for ref card clicks
  const fillFromRef = useCallback((dist: CalcDistType, newParams: Record<string, number>) => {
    setDistType(dist);
    setParams(newParams);
    setComputedResult(null);
    switch (dist) {
      case 'normal': setXValue('1'); setX1Value('-1'); setX2Value('1'); break;
      case 'binomial': setXValue('10'); setX1Value('8'); setX2Value('12'); break;
      case 'poisson': setXValue('5'); setX1Value('3'); setX2Value('7'); break;
      case 'exponential': setXValue('1'); setX1Value('0.5'); setX2Value('1.5'); break;
      case 'uniform': setXValue('5'); setX1Value('2'); setX2Value('8'); break;
      case 'chiSquare': setXValue('5'); setX1Value('2'); setX2Value('10'); break;
      case 'tDist': setXValue('1'); setX1Value('-1'); setX2Value('1'); break;
      case 'fDist': setXValue('2'); setX1Value('0.5'); setX2Value('3'); break;
    }
  }, []);

  // Allow parent to call fillFromRef
  if (onFillFromRef) {
    // We store the callback so the parent can trigger it via the ref card
    // This is handled via the ref card's onClick directly
  }

  // Calculate probability
  const calculate = useCallback(() => {
    const x = parseFloat(xValue);
    const x1 = parseFloat(x1Value);
    const x2 = parseFloat(x2Value);

    let result = NaN;

    try {
      switch (distType) {
        case 'normal': {
          const { mu, sigma } = params as CalcParams['normal'];
          if (sigma <= 0) break;
          if (calcMode === 'le') result = normalCDF(x, mu, sigma);
          else if (calcMode === 'gt') result = 1 - normalCDF(x, mu, sigma);
          else result = normalCDF(x2, mu, sigma) - normalCDF(x1, mu, sigma);
          break;
        }
        case 'binomial': {
          const { n, p } = params as CalcParams['binomial'];
          if (n < 1 || p < 0 || p > 1) break;
          const kLe = Math.floor(calcMode === 'range' ? parseFloat(x2Value) : x);
          const kGt = Math.floor(x);
          const k1 = Math.floor(parseFloat(x1Value));
          const k2 = Math.floor(parseFloat(x2Value));
          if (calcMode === 'le') result = binomialCDF(kLe, n, p);
          else if (calcMode === 'gt') result = 1 - binomialCDF(kGt, n, p);
          else result = binomialCDF(k2, n, p) - binomialCDF(Math.max(0, k1 - 1), n, p);
          break;
        }
        case 'poisson': {
          const { lambda } = params as CalcParams['poisson'];
          if (lambda <= 0) break;
          const kLe = Math.floor(calcMode === 'range' ? parseFloat(x2Value) : x);
          const kGt = Math.floor(x);
          const k1 = Math.floor(parseFloat(x1Value));
          const k2 = Math.floor(parseFloat(x2Value));
          if (calcMode === 'le') result = poissonCDF(kLe, lambda);
          else if (calcMode === 'gt') result = 1 - poissonCDF(kGt, lambda);
          else result = poissonCDF(k2, lambda) - poissonCDF(Math.max(0, k1 - 1), lambda);
          break;
        }
        case 'exponential': {
          const { lambda } = params as CalcParams['exponential'];
          if (lambda <= 0) break;
          if (calcMode === 'le') result = exponentialCDF(x, lambda);
          else if (calcMode === 'gt') result = 1 - exponentialCDF(x, lambda);
          else result = exponentialCDF(x2, lambda) - exponentialCDF(x1, lambda);
          break;
        }
        case 'uniform': {
          const { a, b } = params as CalcParams['uniform'];
          if (b <= a) break;
          if (calcMode === 'le') result = uniformCDF(x, a, b);
          else if (calcMode === 'gt') result = 1 - uniformCDF(x, a, b);
          else result = uniformCDF(x2, a, b) - uniformCDF(x1, a, b);
          break;
        }
        case 'chiSquare': {
          const { k } = params as CalcParams['chiSquare'];
          if (k < 1) break;
          if (calcMode === 'le') result = chiSquareCDF(Math.max(0, x), k);
          else if (calcMode === 'gt') result = 1 - chiSquareCDF(Math.max(0, x), k);
          else result = chiSquareCDF(Math.max(0, x2), k) - chiSquareCDF(Math.max(0, x1), k);
          break;
        }
        case 'tDist': {
          const { df } = params as CalcParams['tDist'];
          if (df < 1) break;
          if (calcMode === 'le') result = tCDF(x, df);
          else if (calcMode === 'gt') result = 1 - tCDF(x, df);
          else result = tCDF(x2, df) - tCDF(x1, df);
          break;
        }
        case 'fDist': {
          const { d1, d2 } = params as CalcParams['fDist'];
          if (d1 < 1 || d2 < 1) break;
          if (calcMode === 'le') result = fCDF(Math.max(0, x), d1, d2);
          else if (calcMode === 'gt') result = 1 - fCDF(Math.max(0, x), d1, d2);
          else result = fCDF(Math.max(0, x2), d1, d2) - fCDF(Math.max(0, x1), d1, d2);
          break;
        }
      }
    } catch {
      result = NaN;
    }

    setComputedResult(isFinite(result) ? Math.max(0, Math.min(1, result)) : NaN);
  }, [distType, params, calcMode, xValue, x1Value, x2Value]);

  // Mini visualization data for the calculator
  const calcPlotData = useMemo(() => {
    switch (distType) {
      case 'normal': {
        const { mu, sigma } = params as CalcParams['normal'];
        return normalPlotData(mu, sigma, 150);
      }
      case 'binomial': {
        const { n, p } = params as CalcParams['binomial'];
        return binomialPlotData(n, p);
      }
      case 'poisson': {
        const { lambda } = params as CalcParams['poisson'];
        return poissonPlotData(lambda);
      }
      case 'exponential': {
        const { lambda } = params as CalcParams['exponential'];
        return exponentialPlotData(lambda);
      }
      case 'uniform': {
        const { a, b } = params as CalcParams['uniform'];
        return uniformPlotData(a, b);
      }
      case 'chiSquare': {
        const { k } = params as CalcParams['chiSquare'];
        const minVal = 0;
        const maxVal = Math.max(k + 4 * Math.sqrt(2 * k), 10);
        const data = [];
        for (let i = 0; i <= 100; i++) {
          const x = minVal + (maxVal - minVal) * i / 100;
          data.push({ x: Math.round(x * 100) / 100, pdf: chiSquarePDF(x, k), cdf: chiSquareCDF(x, k) });
        }
        return data;
      }
      case 'tDist': {
        const { df } = params as CalcParams['tDist'];
        const range = Math.max(3, 3 + df * 0.1);
        const data = [];
        for (let i = 0; i <= 100; i++) {
          const x = -range + 2 * range * i / 100;
          data.push({ x: Math.round(x * 100) / 100, pdf: tPDF(x, df), cdf: tCDF(x, df) });
        }
        return data;
      }
      case 'fDist': {
        const { d1, d2 } = params as CalcParams['fDist'];
        const maxVal = Math.min(10, Math.max(3, (d1 * d2) / (d2 - 2)));
        const data = [];
        for (let i = 0; i <= 100; i++) {
          const x = 0.01 + maxVal * i / 100;
          data.push({ x: Math.round(x * 100) / 100, pdf: fPDF(x, d1, d2), cdf: fCDF(x, d1, d2) });
        }
        return data;
      }
      default:
        return [];
    }
  }, [distType, params]);

  const isDiscrete = distType === 'binomial' || distType === 'poisson';

  // Build area data for mini visualization
  const areaData = useMemo(() => {
    if (!computedResult || computedResult !== computedResult) return [];
    const x = parseFloat(xValue);
    const x1 = parseFloat(x1Value);
    const x2 = parseFloat(x2Value);

    if (isDiscrete) {
      const data = calcPlotData as { k: number; pmf: number; cdf: number }[];
      return data.map((d) => {
        let inArea = false;
        if (calcMode === 'le') inArea = d.k <= x;
        else if (calcMode === 'gt') inArea = d.k > x;
        else inArea = d.k >= x1 && d.k <= x2;
        return { ...d, area: inArea ? d.pmf : 0 };
      });
    } else {
      const data = calcPlotData as { x: number; pdf: number; cdf: number }[];
      return data.map((d) => {
        let inArea = false;
        if (calcMode === 'le') inArea = d.x <= x;
        else if (calcMode === 'gt') inArea = d.x > x;
        else inArea = d.x >= x1 && d.x <= x2;
        return { ...d, area: inArea ? d.pdf : 0 };
      });
    }
  }, [calcPlotData, computedResult, calcMode, xValue, x1Value, x2Value, isDiscrete]);

  // Mode label helper
  const modeLabel = useMemo(() => {
    if (calcMode === 'le') return `P(X ≤ ${xValue})`;
    if (calcMode === 'gt') return `P(X > ${xValue})`;
    return `P(${x1Value} ≤ X ≤ ${x2Value})`;
  }, [calcMode, xValue, x1Value, x2Value]);

  return (
    <Card className="border-teal-200 dark:border-teal-800 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border-b border-teal-100 dark:border-teal-900">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 dark:bg-teal-900/60">
            <Calculator className="h-4 w-4 text-teal-700 dark:text-teal-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Interactive Probability Calculator</CardTitle>
            <CardDescription>Calculate probabilities for any distribution with visual area shading</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-5">
        {/* Distribution Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-1.5">
            <Sigma className="h-3.5 w-3.5" /> Distribution Type
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CALC_DIST_TYPES.map((d) => (
              <button
                key={d.key}
                onClick={() => handleDistChange(d.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg min-w-[80px] text-sm font-medium transition-all duration-200 border ${
                  distType === d.key
                    ? d.category === 'continuous'
                      ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700 shadow-sm'
                      : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700 shadow-sm'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${d.category === 'continuous' ? 'bg-teal-500' : 'bg-amber-500'}`} />
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Parameter Inputs */}
        <div className="space-y-3 rounded-lg border bg-muted/20 dark:bg-slate-800/30 p-4">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parameters</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {distType === 'normal' && (
              <>
                <ParamSlider label="(mean)" value={(params as CalcParams['normal']).mu} min={-10} max={10} step={0.1} onChange={(v) => updateParam('mu', v)} symbol="μ =" />
                <ParamSlider label="(std dev)" value={(params as CalcParams['normal']).sigma} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('sigma', v)} symbol="σ =" />
              </>
            )}
            {distType === 'binomial' && (
              <>
                <ParamSlider label="(trials)" value={(params as CalcParams['binomial']).n} min={1} max={100} step={1} onChange={(v) => updateParam('n', v)} symbol="n =" />
                <ParamSlider label="(probability)" value={(params as CalcParams['binomial']).p} min={0.01} max={0.99} step={0.01} onChange={(v) => updateParam('p', v)} symbol="p =" />
              </>
            )}
            {distType === 'poisson' && (
              <ParamSlider label="(rate)" value={(params as CalcParams['poisson']).lambda} min={0.1} max={30} step={0.1} onChange={(v) => updateParam('lambda', v)} symbol="λ =" />
            )}
            {distType === 'exponential' && (
              <ParamSlider label="(rate)" value={(params as CalcParams['exponential']).lambda} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('lambda', v)} symbol="λ =" />
            )}
            {distType === 'uniform' && (
              <>
                <ParamSlider label="(min)" value={(params as CalcParams['uniform']).a} min={-20} max={19} step={0.5} onChange={(v) => updateParam('a', v)} symbol="a =" />
                <ParamSlider label="(max)" value={(params as CalcParams['uniform']).b} min={-19} max={20} step={0.5} onChange={(v) => updateParam('b', v)} symbol="b =" />
              </>
            )}
            {distType === 'chiSquare' && (
              <ParamSlider label="(degrees of freedom)" value={(params as CalcParams['chiSquare']).k} min={1} max={30} step={1} onChange={(v) => updateParam('k', v)} symbol="k =" />
            )}
            {distType === 'tDist' && (
              <ParamSlider label="(degrees of freedom)" value={(params as CalcParams['tDist']).df} min={1} max={50} step={1} onChange={(v) => updateParam('df', v)} symbol="df =" />
            )}
            {distType === 'fDist' && (
              <>
                <ParamSlider label="(df numerator)" value={(params as CalcParams['fDist']).d1} min={1} max={30} step={1} onChange={(v) => updateParam('d1', v)} symbol="d₁ =" />
                <ParamSlider label="(df denominator)" value={(params as CalcParams['fDist']).d2} min={1} max={30} step={1} onChange={(v) => updateParam('d2', v)} symbol="d₂ =" />
              </>
            )}
          </div>
        </div>

        {/* Calculation Mode + X Value */}
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Calculation Mode</Label>
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'le' as CalcMode, label: `P(X ≤ x)`, desc: 'Cumulative' },
              { key: 'gt' as CalcMode, label: `P(X > x)`, desc: 'Upper tail' },
              { key: 'range' as CalcMode, label: `P(x₁ ≤ X ≤ x₂)`, desc: 'Interval' },
            ]).map((mode) => (
              <button
                key={mode.key}
                onClick={() => { setCalcMode(mode.key); setComputedResult(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                  calcMode === mode.key
                    ? 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-900/50 dark:text-teal-300 dark:border-teal-700'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted'
                }`}
              >
                <span className="font-mono">{mode.label}</span>
                <span className="text-xs ml-1 opacity-60">({mode.desc})</span>
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {calcMode !== 'range' ? (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">x value</Label>
                <Input
                  type="number"
                  value={xValue}
                  onChange={(e) => { setXValue(e.target.value); setComputedResult(null); }}
                  className="font-mono"
                  step="0.1"
                  placeholder="Enter x value"
                />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">x₁ (lower bound)</Label>
                  <Input
                    type="number"
                    value={x1Value}
                    onChange={(e) => { setX1Value(e.target.value); setComputedResult(null); }}
                    className="font-mono"
                    step="0.1"
                    placeholder="Lower bound"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">x₂ (upper bound)</Label>
                  <Input
                    type="number"
                    value={x2Value}
                    onChange={(e) => { setX2Value(e.target.value); setComputedResult(null); }}
                    className="font-mono"
                    step="0.1"
                    placeholder="Upper bound"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Calculate Button */}
        <Button onClick={calculate} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
          <Sparkles className="h-4 w-4 mr-2" />
          Calculate {modeLabel}
        </Button>

        {/* Result Display */}
        {computedResult !== null && (
          <div className="rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 p-5 text-center transition-all duration-300">
            <div className="text-sm font-medium text-teal-700 dark:text-teal-400 mb-1">{modeLabel}</div>
            <div className="text-3xl sm:text-4xl font-bold font-mono text-teal-800 dark:text-teal-200">
              {isNaN(computedResult) ? 'Invalid' : computedResult.toFixed(6)}
            </div>
            {!isNaN(computedResult) && (
              <div className="mt-2 text-xs text-muted-foreground">
                ≈ {(computedResult * 100).toFixed(4)}% chance
              </div>
            )}
          </div>
        )}

        {/* Mini Visualization */}
        {areaData.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Probability Area Visualization</Label>
            <div className="h-48 sm:h-56 rounded-lg border bg-gradient-to-b from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/30 overflow-hidden">
              <ResponsiveContainer width="100%" height="100%">
                {isDiscrete ? (
                  <BarChart data={areaData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="k" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '11px' }} />
                    <Bar dataKey="pmf" fill={COLORS.pmf} name="PMF" opacity={0.3} />
                    <Bar dataKey="area" fill={COLORS.calcStroke} name="Probability Area" />
                  </BarChart>
                ) : (
                  <AreaChart data={areaData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS.calcStroke} stopOpacity={0.4} />
                        <stop offset="100%" stopColor={COLORS.calcStroke} stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="x" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="pdf" stroke={COLORS.pdf} fill="transparent" strokeWidth={1.5} name="PDF" />
                    <Area type="monotone" dataKey="area" stroke={COLORS.calcStroke} fill="url(#areaGradient)" strokeWidth={2} name="Probability Area" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ==================== DISTRIBUTION QUICK REFERENCE ====================
const DIST_REFERENCE: {
  key: CalcDistType;
  name: string;
  category: 'continuous' | 'discrete';
  formula: string;
  params: { symbol: string; name: string; range: string }[];
  useCase: string;
}[] = [
  {
    key: 'normal',
    name: 'Normal (Gaussian)',
    category: 'continuous',
    formula: 'f(x) = (1/σ√2π) e^(-(x-μ)²/2σ²)',
    params: [
      { symbol: 'μ', name: 'Mean', range: '(-∞, ∞)' },
      { symbol: 'σ', name: 'Std Dev', range: '(0, ∞)' },
    ],
    useCase: 'Heights, test scores, measurement errors',
  },
  {
    key: 'binomial',
    name: 'Binomial',
    category: 'discrete',
    formula: 'P(k) = C(n,k) p^k (1-p)^(n-k)',
    params: [
      { symbol: 'n', name: 'Trials', range: '1, 2, 3, ...' },
      { symbol: 'p', name: 'Success prob', range: '[0, 1]' },
    ],
    useCase: 'Coin flips, pass/fail rates, surveys',
  },
  {
    key: 'poisson',
    name: 'Poisson',
    category: 'discrete',
    formula: 'P(k) = (λ^k e^(-λ)) / k!',
    params: [
      { symbol: 'λ', name: 'Rate', range: '(0, ∞)' },
    ],
    useCase: 'Arrivals per hour, defects per batch',
  },
  {
    key: 'exponential',
    name: 'Exponential',
    category: 'continuous',
    formula: 'f(x) = λ e^(-λx), x ≥ 0',
    params: [
      { symbol: 'λ', name: 'Rate', range: '(0, ∞)' },
    ],
    useCase: 'Time between events, equipment lifetime',
  },
  {
    key: 'uniform',
    name: 'Uniform',
    category: 'continuous',
    formula: 'f(x) = 1/(b-a), a ≤ x ≤ b',
    params: [
      { symbol: 'a', name: 'Min', range: '(-∞, b)' },
      { symbol: 'b', name: 'Max', range: '(a, ∞)' },
    ],
    useCase: 'Random number generation, fair dice',
  },
  {
    key: 'chiSquare',
    name: 'Chi-Square (χ²)',
    category: 'continuous',
    formula: 'f(x) = x^(k/2-1) e^(-x/2) / (2^(k/2) Γ(k/2))',
    params: [
      { symbol: 'k', name: 'Degrees of freedom', range: '1, 2, 3, ...' },
    ],
    useCase: 'Goodness-of-fit tests, variance tests',
  },
  {
    key: 'tDist',
    name: "Student's t",
    category: 'continuous',
    formula: 'f(t) = Γ((ν+1)/2) / (√(νπ) Γ(ν/2)) (1+t²/ν)^(-(ν+1)/2)',
    params: [
      { symbol: 'ν', name: 'Degrees of freedom', range: '1, 2, 3, ...' },
    ],
    useCase: 'Small sample means, confidence intervals',
  },
  {
    key: 'fDist',
    name: 'F-Distribution',
    category: 'continuous',
    formula: 'f(x) = √((d₁x)^d₁ d₂^d₂ / (d₁x+d₂)^(d₁+d₂)) / (x B(d₁/2, d₂/2))',
    params: [
      { symbol: 'd₁', name: 'DF numerator', range: '1, 2, 3, ...' },
      { symbol: 'd₂', name: 'DF denominator', range: '1, 2, 3, ...' },
    ],
    useCase: 'ANOVA, comparing two variances',
  },
];

// Mini SVG distribution shapes
function DistShapeSVG({ type, color }: { type: CalcDistType; color: string }) {
  const h = 40;
  const w = 80;

  const paths: Record<CalcDistType, string> = {
    normal: 'M 5 38 Q 15 36 25 28 Q 35 8 40 6 Q 45 8 55 28 Q 65 36 75 38',
    binomial: 'M 10 38 L 10 30 M 20 38 L 20 18 M 30 38 L 30 8 M 40 38 L 40 6 M 50 38 L 50 8 M 60 38 L 60 18 M 70 38 L 70 30',
    poisson: 'M 10 38 L 10 20 M 18 38 L 18 8 M 26 38 L 26 6 M 34 38 L 34 12 M 42 38 L 42 22 M 50 38 L 50 30 M 58 38 L 58 35 M 66 38 L 66 37',
    exponential: 'M 5 10 Q 15 14 25 24 Q 40 32 55 36 Q 65 38 75 38',
    uniform: 'M 15 38 L 15 10 L 65 10 L 65 38',
    chiSquare: 'M 5 38 Q 10 30 20 20 Q 30 10 35 12 Q 45 18 55 28 Q 65 35 75 38',
    tDist: 'M 2 38 Q 12 34 22 26 Q 32 10 40 6 Q 48 10 58 26 Q 68 34 78 38',
    fDist: 'M 5 30 Q 12 8 22 6 Q 35 14 48 24 Q 60 33 75 38',
  };

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="opacity-60">
      <path d={paths[type]} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DistributionQuickReference({ onSelectDist }: { onSelectDist: (dist: CalcDistType, params: Record<string, number>) => void }) {
  return (
    <Card className="border-amber-200 dark:border-amber-800 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 border-b border-amber-100 dark:border-amber-900">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/60">
            <BookOpen className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-lg">Distribution Quick Reference</CardTitle>
            <CardDescription>Click any card to load it into the calculator above</CardDescription>
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <Badge variant="outline" className="text-teal-700 border-teal-300 dark:text-teal-400 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/30">
            <div className="h-2 w-2 rounded-full bg-teal-500 mr-1.5" /> Continuous
          </Badge>
          <Badge variant="outline" className="text-amber-700 border-amber-300 dark:text-amber-400 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">
            <div className="h-2 w-2 rounded-full bg-amber-500 mr-1.5" /> Discrete
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DIST_REFERENCE.map((dist) => (
            <button
              key={dist.key}
              onClick={() => onSelectDist(dist.key, DEFAULT_PARAMS[dist.key] as Record<string, number>)}
              className={`group text-left rounded-xl border-2 p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                dist.category === 'continuous'
                  ? 'border-teal-200 bg-gradient-to-br from-teal-50/80 to-emerald-50/50 hover:border-teal-400 dark:border-teal-800 dark:from-teal-950/30 dark:to-emerald-950/20 dark:hover:border-teal-600'
                  : 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/50 hover:border-amber-400 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/20 dark:hover:border-amber-600'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <div className={`h-2 w-2 rounded-full ${dist.category === 'continuous' ? 'bg-teal-500' : 'bg-amber-500'}`} />
                    <span className="font-semibold text-sm">{dist.name}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex items-center justify-center mb-2">
                <DistShapeSVG
                  type={dist.key}
                  color={dist.category === 'continuous' ? '#0d9488' : '#d97706'}
                />
              </div>

              <div className="font-mono text-[10px] text-muted-foreground mb-2 truncate" title={dist.formula}>
                {dist.formula}
              </div>

              <div className="space-y-0.5 mb-2">
                {dist.params.map((p) => (
                  <div key={p.symbol} className="flex items-center gap-1 text-[10px]">
                    <span className="font-bold font-mono">{p.symbol}</span>
                    <span className="text-muted-foreground">{p.name}</span>
                    <span className="text-muted-foreground/60 ml-auto">{p.range}</span>
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-muted-foreground italic border-t border-border/50 pt-1.5 mt-1.5">
                📊 {dist.useCase}
              </div>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== PARAMETER SLIDER HELPER ====================
function ParamSlider({
  label, value, min, max, step, onChange, symbol,
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; symbol?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {symbol ? `${symbol} ` : ''}{label}
        </Label>
        <Badge variant="secondary" className="font-mono text-xs dark:bg-slate-800 min-w-[3rem] justify-center">
          {value.toFixed(step < 1 ? 2 : 0)}
        </Badge>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        className="w-full"
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// ==================== STATS DISPLAY ====================
function StatsDisplay({ stats }: { stats: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Object.entries(stats).map(([key, val]) => (
        <div key={key} className="min-w-0 rounded-lg border bg-muted/30 dark:bg-slate-800/50 dark:border-slate-700 p-2 text-center">
          <div className="text-xs text-muted-foreground capitalize">{key}</div>
          <div className="truncate text-sm font-semibold font-mono">
            {typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(4)) : val}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== DISCRETE: BINOMIAL ====================
function BinomialDistribution() {
  const [n, setN] = useState(20);
  const [p, setP] = useState(0.5);

  const data = useMemo(() => binomialPlotData(n, p), [n, p]);
  const stats = useMemo(() => binomialStats(n, p), [n, p]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ParamSlider label="(trials)" value={n} min={1} max={100} step={1} onChange={setN} symbol="n =" />
        <ParamSlider label="(probability)" value={p} min={0} max={1} step={0.01} onChange={setP} symbol="p =" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">PMF — P(X = k)</CardTitle>
            <CardDescription>Probability Mass Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (successes)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'P(X = k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="pmf" fill={COLORS.pmf} name="PMF" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">CDF — P(X ≤ k)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (successes)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X ≤ k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="stepAfter" dataKey="cdf" stroke={COLORS.cdf} strokeWidth={2} dot={false} name="CDF" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== DISCRETE: BERNOULLI ====================
function BernoulliDistribution() {
  const [p, setP] = useState(0.5);

  const data = useMemo(() => bernoulliPlotData(p), [p]);
  const stats = useMemo(() => bernoulliStats(p), [p]);

  return (
    <div className="space-y-6">
      <ParamSlider label="(probability of success)" value={p} min={0} max={1} step={0.01} onChange={setP} symbol="p =" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">PMF — P(X = k)</CardTitle>
            <CardDescription>Probability Mass Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (outcome)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X = k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="pmf" fill={COLORS.pmf} name="PMF" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">CDF — P(X ≤ k)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (outcome)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X ≤ k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="stepAfter" dataKey="cdf" stroke={COLORS.cdf} strokeWidth={2} dot={false} name="CDF" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== DISCRETE: POISSON ====================
function PoissonDistribution() {
  const [lambda, setLambda] = useState(5);

  const data = useMemo(() => poissonPlotData(lambda), [lambda]);
  const stats = useMemo(() => poissonStats(lambda), [lambda]);

  return (
    <div className="space-y-6">
      <ParamSlider label="(rate)" value={lambda} min={0.1} max={30} step={0.1} onChange={setLambda} symbol="λ =" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">PMF — P(X = k)</CardTitle>
            <CardDescription>Probability Mass Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (events)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'P(X = k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="pmf" fill={COLORS.pmf} name="PMF" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">CDF — P(X ≤ k)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (events)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X ≤ k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="stepAfter" dataKey="cdf" stroke={COLORS.cdf} strokeWidth={2} dot={false} name="CDF" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CONTINUOUS: NORMAL ====================
function NormalDistribution() {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);

  const data = useMemo(() => normalPlotData(mu, sigma), [mu, sigma]);
  const stats = useMemo(() => normalStats(mu, sigma), [mu, sigma]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ParamSlider label="(mean)" value={mu} min={-10} max={10} step={0.1} onChange={setMu} symbol="μ =" />
        <ParamSlider label="(std dev)" value={sigma} min={0.1} max={5} step={0.1} onChange={setSigma} symbol="σ =" />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm text-emerald-700 dark:text-emerald-400">
          For the Normal distribution: <strong>Mean = Median = Mode = {mu.toFixed(2)}</strong>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">PDF — f(x)</CardTitle>
            <CardDescription>Probability Density Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="normalPdfFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.pdf} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={COLORS.pdf} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'f(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <ReferenceLine x={mu} stroke={COLORS.cdf} strokeDasharray="5 5" label={{ value: `μ=${mu}`, position: 'top', fill: COLORS.cdf, fontSize: 11 }} />
                  <Area type="monotone" dataKey="pdf" stroke={COLORS.pdf} fill="url(#normalPdfFill)" strokeWidth={2} name="PDF" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">CDF — F(x)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'F(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <ReferenceLine x={mu} stroke={COLORS.pdf} strokeDasharray="5 5" label={{ value: `μ=${mu}`, position: 'top', fill: COLORS.pdf, fontSize: 11 }} />
                  <ReferenceLine y={0.5} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="cdf" stroke={COLORS.cdf} strokeWidth={2} dot={false} name="CDF" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CONTINUOUS: EXPONENTIAL ====================
function ExponentialDistribution() {
  const [lambda, setLambda] = useState(1);

  const data = useMemo(() => exponentialPlotData(lambda), [lambda]);
  const stats = useMemo(() => exponentialStats(lambda), [lambda]);

  return (
    <div className="space-y-6">
      <ParamSlider label="(rate)" value={lambda} min={0.1} max={5} step={0.1} onChange={setLambda} symbol="λ =" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">PDF — f(x)</CardTitle>
            <CardDescription>Probability Density Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'f(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="pdf" stroke={COLORS.pdf} fill={COLORS.pdfFill} strokeWidth={2} name="PDF" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">CDF — F(x)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'F(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="monotone" dataKey="cdf" stroke={COLORS.cdf} strokeWidth={2} dot={false} name="CDF" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== CONTINUOUS: UNIFORM ====================
function UniformDistribution() {
  const [a, setA] = useState(0);
  const [b, setB] = useState(10);

  // Ensure b > a
  const safeB = Math.max(b, a + 0.1);
  const data = useMemo(() => uniformPlotData(a, safeB), [a, safeB]);
  const stats = useMemo(() => uniformStats(a, safeB), [a, safeB]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ParamSlider label="(min)" value={a} min={-20} max={19} step={0.5} onChange={setA} symbol="a =" />
        <ParamSlider label="(max)" value={b} min={a + 0.1} max={20} step={0.5} onChange={setB} symbol="b =" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">PDF — f(x)</CardTitle>
            <CardDescription>Probability Density Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'f(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="stepAfter" dataKey="pdf" stroke={COLORS.pdf} fill={COLORS.pdfFill} strokeWidth={2} name="PDF" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">CDF — F(x)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-60 sm:h-72 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'F(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Line type="linear" dataKey="cdf" stroke={COLORS.cdf} strokeWidth={2} dot={false} name="CDF" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Distribution Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats} />
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== EMPIRICAL RULE ====================
function EmpiricalRuleSection() {
  const [mu, setMu] = useState(0);
  const [sigma, setSigma] = useState(1);

  const ruleData = useMemo(() => empiricalRuleData(mu, sigma), [mu, sigma]);
  const plotData = useMemo(() => normalPlotData(mu, sigma, 200), [mu, sigma]);

  // Data for the stacked area representation
  const sigmaBandData = useMemo(() => {
    return plotData.map((d) => {
      const dist = Math.abs(d.x - mu);
      const within1 = dist <= 1 * sigma ? d.pdf : 0;
      const within2 = dist <= 2 * sigma && dist > 1 * sigma ? d.pdf : 0;
      const within3 = dist <= 3 * sigma && dist > 2 * sigma ? d.pdf : 0;
      const outside = dist > 3 * sigma ? d.pdf : 0;
      return {
        x: d.x,
        '1σ (68.27%)': Math.round(within1 * 100000) / 100000,
        '2σ (95.45%)': Math.round(within2 * 100000) / 100000,
        '3σ (99.73%)': Math.round(within3 * 100000) / 100000,
        'Outside': Math.round(outside * 100000) / 100000,
      };
    });
  }, [plotData, mu, sigma]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ParamSlider label="(mean)" value={mu} min={-10} max={10} step={0.1} onChange={setMu} symbol="μ =" />
        <ParamSlider label="(std dev)" value={sigma} min={0.1} max={5} step={0.1} onChange={setSigma} symbol="σ =" />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm text-emerald-700 dark:text-emerald-400">
          For the Normal distribution: <strong>Mean = Median = Mode = {mu.toFixed(2)}</strong>
        </span>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
          <CardTitle className="text-base">Empirical Rule — Visual Diagram</CardTitle>
          <CardDescription>Areas under the Normal curve at 1σ, 2σ, and 3σ from the mean</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-64 sm:h-80 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sigmaBandData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  dataKey="x"
                  label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }}
                />
                <YAxis
                  label={{ value: 'f(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }}
                />
                <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <ReferenceLine x={mu} stroke="#374151" strokeDasharray="5 5" label={{ value: `μ`, position: 'top', fill: '#374151', fontSize: 12 }} />
                <ReferenceLine x={mu - sigma} stroke={COLORS.sigma1} strokeDasharray="3 3" />
                <ReferenceLine x={mu + sigma} stroke={COLORS.sigma1} strokeDasharray="3 3" />
                <ReferenceLine x={mu - 2 * sigma} stroke={COLORS.sigma2} strokeDasharray="3 3" />
                <ReferenceLine x={mu + 2 * sigma} stroke={COLORS.sigma2} strokeDasharray="3 3" />
                <ReferenceLine x={mu - 3 * sigma} stroke={COLORS.sigma3} strokeDasharray="3 3" />
                <ReferenceLine x={mu + 3 * sigma} stroke={COLORS.sigma3} strokeDasharray="3 3" />
                <Area type="monotone" dataKey="Outside" stackId="1" stroke="#94a3b8" fill="hsl(var(--muted))" strokeWidth={0} name="Outside 3σ" />
                <Area type="monotone" dataKey="3σ (99.73%)" stackId="1" stroke={COLORS.sigma3} fill="#fecaca" strokeWidth={0} name="Within 3σ" />
                <Area type="monotone" dataKey="2σ (95.45%)" stackId="1" stroke={COLORS.sigma2} fill="#fde68a" strokeWidth={0} name="Within 2σ" />
                <Area type="monotone" dataKey="1σ (68.27%)" stackId="1" stroke={COLORS.sigma1} fill="#99f6e4" strokeWidth={0} name="Within 1σ" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Empirical Rule — Summary Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Range</TableHead>
                <TableHead>Lower Bound</TableHead>
                <TableHead>Upper Bound</TableHead>
                <TableHead className="text-right">Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ruleData.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: [COLORS.sigma1, COLORS.sigma2, COLORS.sigma3][i] }}
                      />
                      {row.range}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{row.lower.toFixed(4)}</TableCell>
                  <TableCell className="font-mono">{row.upper.toFixed(4)}</TableCell>
                  <TableCell className="text-right font-mono font-semibold">{row.percent}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== DISTRIBUTION COMPARISON ====================
type DistributionType = 'normal' | 'exponential' | 'uniform' | 'binomial' | 'poisson';

interface DistConfig {
  type: DistributionType;
  params: Record<string, number>;
}

function getComparisonPlotData(config: DistConfig): { x: number; y: number; k?: number }[] {
  switch (config.type) {
    case 'normal': {
      const d = normalPlotData(config.params.mu ?? 0, config.params.sigma ?? 1);
      return d.map((p) => ({ x: p.x, y: p.pdf }));
    }
    case 'exponential': {
      const d = exponentialPlotData(config.params.lambda ?? 1);
      return d.map((p) => ({ x: p.x, y: p.pdf }));
    }
    case 'uniform': {
      const d = uniformPlotData(config.params.a ?? 0, config.params.b ?? 10);
      return d.map((p) => ({ x: p.x, y: p.pdf }));
    }
    case 'binomial': {
      const d = binomialPlotData(config.params.n ?? 20, config.params.p ?? 0.5);
      return d.map((p) => ({ x: p.k, y: p.pmf, k: p.k }));
    }
    case 'poisson': {
      const d = poissonPlotData(config.params.lambda ?? 5);
      return d.map((p) => ({ x: p.k, y: p.pmf, k: p.k }));
    }
    default:
      return [];
  }
}

function getComparisonStats(config: DistConfig): Record<string, number> {
  switch (config.type) {
    case 'normal':
      return normalStats(config.params.mu ?? 0, config.params.sigma ?? 1) as Record<string, number>;
    case 'exponential':
      return exponentialStats(config.params.lambda ?? 1) as Record<string, number>;
    case 'uniform':
      return uniformStats(config.params.a ?? 0, config.params.b ?? 10) as Record<string, number>;
    case 'binomial':
      return binomialStats(config.params.n ?? 20, config.params.p ?? 0.5) as Record<string, number>;
    case 'poisson':
      return poissonStats(config.params.lambda ?? 5) as Record<string, number>;
    default:
      return {};
  }
}

const DIST_LABELS: Record<DistributionType, string> = {
  normal: 'Normal',
  exponential: 'Exponential',
  uniform: 'Uniform',
  binomial: 'Binomial',
  poisson: 'Poisson',
};

function DistConfigPanel({
  config, onChange, label,
}: {
  config: DistConfig; onChange: (c: DistConfig) => void; label: string;
}) {
  const updateParam = (key: string, value: number) => {
    onChange({ ...config, params: { ...config.params, [key]: value } });
  };

  return (
    <Card className="min-w-0 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Distribution Type</Label>
          <Select
            value={config.type}
            onValueChange={(v) => {
              const newType = v as DistributionType;
              const defaultParams: Record<DistributionType, Record<string, number>> = {
                normal: { mu: 0, sigma: 1 },
                exponential: { lambda: 1 },
                uniform: { a: 0, b: 10 },
                binomial: { n: 20, p: 0.5 },
                poisson: { lambda: 5 },
              };
              onChange({ type: newType, params: defaultParams[newType] });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIST_LABELS).map(([key, lbl]) => (
                <SelectItem key={key} value={key}>{lbl}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.type === 'normal' && (
          <>
            <ParamSlider label="(mean)" value={config.params.mu ?? 0} min={-10} max={10} step={0.1} onChange={(v) => updateParam('mu', v)} symbol="μ =" />
            <ParamSlider label="(std dev)" value={config.params.sigma ?? 1} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('sigma', v)} symbol="σ =" />
          </>
        )}
        {config.type === 'exponential' && (
          <ParamSlider label="(rate)" value={config.params.lambda ?? 1} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('lambda', v)} symbol="λ =" />
        )}
        {config.type === 'uniform' && (
          <>
            <ParamSlider label="(min)" value={config.params.a ?? 0} min={-20} max={19} step={0.5} onChange={(v) => updateParam('a', v)} symbol="a =" />
            <ParamSlider label="(max)" value={config.params.b ?? 10} min={(config.params.a ?? 0) + 0.1} max={20} step={0.5} onChange={(v) => updateParam('b', v)} symbol="b =" />
          </>
        )}
        {config.type === 'binomial' && (
          <>
            <ParamSlider label="(trials)" value={config.params.n ?? 20} min={1} max={100} step={1} onChange={(v) => updateParam('n', v)} symbol="n =" />
            <ParamSlider label="(probability)" value={config.params.p ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => updateParam('p', v)} symbol="p =" />
          </>
        )}
        {config.type === 'poisson' && (
          <ParamSlider label="(rate)" value={config.params.lambda ?? 5} min={0.1} max={30} step={0.1} onChange={(v) => updateParam('lambda', v)} symbol="λ =" />
        )}
      </CardContent>
    </Card>
  );
}

function DistributionComparison() {
  const [config1, setConfig1] = useState<DistConfig>({ type: 'normal', params: { mu: 0, sigma: 1 } });
  const [config2, setConfig2] = useState<DistConfig>({ type: 'normal', params: { mu: 2, sigma: 1.5 } });

  const data1 = useMemo(() => getComparisonPlotData(config1), [config1]);
  const data2 = useMemo(() => getComparisonPlotData(config2), [config2]);

  const stats1 = useMemo(() => getComparisonStats(config1), [config1]);
  const stats2 = useMemo(() => getComparisonStats(config2), [config2]);

  // Build comparison chart data - merge both datasets on a common x range
  const isDiscrete1 = config1.type === 'binomial' || config1.type === 'poisson';
  const isDiscrete2 = config2.type === 'binomial' || config2.type === 'poisson';
  const bothDiscrete = isDiscrete1 && isDiscrete2;

  // Discrete merge data
  const mergedDiscreteData = useMemo(() => {
    const allKs = new Set([...data1.map((d) => d.k ?? d.x), ...data2.map((d) => d.k ?? d.x)]);
    const sortedKs = [...allKs].sort((a, b) => a - b);
    return sortedKs.map((k) => {
      const d1 = data1.find((d) => (d.k ?? d.x) === k);
      const d2 = data2.find((d) => (d.k ?? d.x) === k);
      return {
        k,
        [DIST_LABELS[config1.type]]: d1?.y ?? 0,
        [DIST_LABELS[config2.type]]: d2?.y ?? 0,
      };
    });
  }, [data1, data2, config1.type, config2.type]);

  // Continuous merge data
  const mergedContinuousData = useMemo(() => {
    const allXs = new Set([...data1.map((d) => d.x), ...data2.map((d) => d.x)]);
    const sortedXs = [...allXs].sort((a, b) => a - b);
    // Sample down to ~200 points for performance
    const step = Math.max(1, Math.floor(sortedXs.length / 200));
    const sampled = sortedXs.filter((_, i) => i % step === 0);

    return sampled.map((x) => {
      // Find nearest point in each dataset
      const nearest1 = data1.reduce((best, d) =>
        Math.abs(d.x - x) < Math.abs(best.x - x) ? d : best, data1[0]);
      const nearest2 = data2.reduce((best, d) =>
        Math.abs(d.x - x) < Math.abs(best.x - x) ? d : best, data2[0]);
      return {
        x: Math.round(x * 1000) / 1000,
        [DIST_LABELS[config1.type]]: nearest1?.y ?? 0,
        [DIST_LABELS[config2.type]]: nearest2?.y ?? 0,
      };
    });
  }, [data1, data2, config1.type, config2.type]);

  const configPanelRow = (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="min-w-0">
        <DistConfigPanel config={config1} onChange={setConfig1} label="Distribution A" />
      </div>
      <div className="min-w-0">
        <DistConfigPanel config={config2} onChange={setConfig2} label="Distribution B" />
      </div>
    </div>
  );

  const statsRow = (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{DIST_LABELS[config1.type]} Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats1} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{DIST_LABELS[config2.type]} Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <StatsDisplay stats={stats2} />
        </CardContent>
      </Card>
    </div>
  );

  if (bothDiscrete) {
    return (
      <div className="space-y-6">
        {configPanelRow}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
            <CardTitle className="text-base">Side-by-Side Comparison — PMF</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 sm:h-80 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mergedDiscreteData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'Probability', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Bar dataKey={DIST_LABELS[config1.type]} fill={COLORS.comp1} name={DIST_LABELS[config1.type]} radius={[2, 2, 0, 0]} />
                  <Bar dataKey={DIST_LABELS[config2.type]} fill={COLORS.comp2} name={DIST_LABELS[config2.type]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        {statsRow}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {configPanelRow}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-slate-800/30 dark:to-slate-900/20">
          <CardTitle className="text-base">
            {bothDiscrete ? 'Side-by-Side Comparison — PMF' : 'Overlaid Comparison — PDF/PMF'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="h-64 sm:h-80 rounded-lg bg-gradient-to-b from-muted/20 to-transparent dark:from-slate-800/20 dark:to-transparent">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedContinuousData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                <YAxis label={{ value: 'Density', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Area type="monotone" dataKey={DIST_LABELS[config1.type]} stroke={COLORS.comp1} fill={COLORS.comp1Fill} strokeWidth={2} name={DIST_LABELS[config1.type]} />
                <Area type="monotone" dataKey={DIST_LABELS[config2.type]} stroke={COLORS.comp2} fill={COLORS.comp2Fill} strokeWidth={2} name={DIST_LABELS[config2.type]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {statsRow}
    </div>
  );
}

// ==================== SECTION HEADER COMPONENT ====================
function SectionHeader({ icon, iconBg, iconColor, title, description }: {
  icon: React.ReactNode; iconBg: string; iconColor: string; title: string; description: string;
}) {
  return (
    <div className="flex items-center gap-3 pb-1">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg} ${iconColor} shrink-0`}>
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-bold tracking-tight">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}

// ==================== MAIN EXPORT ====================
export default function ProbabilityDistributions() {
  // State to allow ref card to fill calculator
  const [calcKey, setCalcKey] = useState(0);
  const [calcDist, setCalcDist] = useState<CalcDistType>('normal');
  const [calcParams, setCalcParams] = useState<Record<string, number>>(DEFAULT_PARAMS.normal);

  const handleSelectFromRef = useCallback((dist: CalcDistType, params: Record<string, number>) => {
    setCalcDist(dist);
    setCalcParams(params);
    setCalcKey((k) => k + 1);
    // Scroll to calculator
    const el = document.getElementById('probability-calculator');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <section id="probability-distributions" className="space-y-8">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
          <BarChart3 className="h-5 w-5 shrink-0" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Section 4: Probability Distributions</h2>
          <p className="text-muted-foreground text-sm">
            Interactive exploration of discrete and continuous probability distributions
          </p>
        </div>
      </div>

      {/* Probability Calculator — FIRST card */}
      <div id="probability-calculator">
        <SectionHeader
          icon={<Calculator className="h-5 w-5 shrink-0" />}
          iconBg="bg-teal-100 dark:bg-teal-900/40"
          iconColor="text-teal-700 dark:text-teal-400"
          title="Probability Calculator"
          description="Compute exact probabilities for any distribution with visual area shading"
        />
        <div className="mt-3">
          <ProbabilityCalculator key={calcKey} />
        </div>
      </div>

      {/* Distribution Quick Reference — SECOND card */}
      <div>
        <SectionHeader
          icon={<BookOpen className="h-5 w-5 shrink-0" />}
          iconBg="bg-amber-100 dark:bg-amber-900/40"
          iconColor="text-amber-700 dark:text-amber-400"
          title="Distribution Reference Guide"
          description="Quick reference with formulas, parameters, and use cases — click to load into calculator"
        />
        <div className="mt-3">
          <DistributionQuickReference onSelectDist={handleSelectFromRef} />
        </div>
      </div>

      {/* Discrete Distributions */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-950/20 dark:to-transparent">
          <div className="flex items-center gap-2">
            <Dice3 className="h-5 w-5 shrink-0 text-teal-600" />
            <CardTitle>Discrete Distributions</CardTitle>
          </div>
          <CardDescription>
            Probability Mass Function (PMF) and Cumulative Distribution Function (CDF) for discrete random variables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="binomial" className="w-full">
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="binomial">Binomial</TabsTrigger>
              <TabsTrigger value="bernoulli">Bernoulli</TabsTrigger>
              <TabsTrigger value="poisson">Poisson</TabsTrigger>
            </TabsList>
            <TabsContent value="binomial" className="transition-opacity duration-200">
              <BinomialDistribution />
            </TabsContent>
            <TabsContent value="bernoulli" className="transition-opacity duration-200">
              <BernoulliDistribution />
            </TabsContent>
            <TabsContent value="poisson" className="transition-opacity duration-200">
              <PoissonDistribution />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Continuous Distributions */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-950/20 dark:to-transparent">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>Continuous Distributions</CardTitle>
          </div>
          <CardDescription>
            Probability Density Function (PDF) and Cumulative Distribution Function (CDF) for continuous random variables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="normal" className="w-full">
            <TabsList className="mb-4 w-full sm:w-auto">
              <TabsTrigger value="normal">Normal</TabsTrigger>
              <TabsTrigger value="exponential">Exponential</TabsTrigger>
              <TabsTrigger value="uniform">Uniform</TabsTrigger>
            </TabsList>
            <TabsContent value="normal" className="transition-opacity duration-200">
              <NormalDistribution />
            </TabsContent>
            <TabsContent value="exponential" className="transition-opacity duration-200">
              <ExponentialDistribution />
            </TabsContent>
            <TabsContent value="uniform" className="transition-opacity duration-200">
              <UniformDistribution />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Empirical Rule */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/20 dark:to-transparent">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 shrink-0 text-amber-600" />
            <CardTitle>Empirical Rule for Normal Distribution</CardTitle>
          </div>
          <CardDescription>
            The 68-95-99.7 rule: percentage of observations within 1σ, 2σ, and 3σ of the mean
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmpiricalRuleSection />
        </CardContent>
      </Card>

      {/* Distribution Comparison */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-950/20 dark:to-transparent">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 shrink-0 text-rose-600" />
            <CardTitle>Distribution Comparison</CardTitle>
          </div>
          <CardDescription>
            Compare two distributions side by side with overlaid plots and statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DistributionComparison />
        </CardContent>
      </Card>
    </section>
  );
}
