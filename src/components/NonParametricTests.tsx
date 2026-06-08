'use client'

import { useState, useCallback, useMemo } from 'react'
import { useDataset } from '@/hooks/useDataset'
import {
  mannWhitneyUTest,
  wilcoxonTest,
  kruskalWallisTest,
  friedmanTest,
  median,
  standardDeviation,
} from '@/lib/statistics'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  ErrorBar,
} from 'recharts'
import {
  GitCompareArrows,
  ArrowLeftRight,
  BarChart3,
  Repeat,
  Info,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Ruler,
  Lightbulb,
  ShieldCheck,
  Gauge,
} from 'lucide-react'

// ==================== Effect Size Helpers ====================

// Rank-biserial correlation for Mann-Whitney U: r = 1 - (2U / (n1*n2))
function computeRankBiserialMW(uStat: number, n1: number, n2: number): number {
  const product = n1 * n2
  if (product === 0) return NaN
  return 1 - (2 * uStat) / product
}

// Matched rank-biserial correlation for Wilcoxon: r = Z / sqrt(N)
function computeMatchedRankBiserialWilcoxon(wStat: number, n: number): number {
  if (n === 0) return NaN
  const mu = (n * (n + 1)) / 4
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24)
  if (sigma === 0) return NaN
  const z = (wStat - mu) / sigma
  return z / Math.sqrt(n)
}

// Epsilon squared for Kruskal-Wallis: ε² = (H - k + 1) / (n - k)
function computeEpsilonSquared(hStat: number, k: number, n: number): number {
  if (n - k === 0) return NaN
  return (hStat - k + 1) / (n - k)
}

// Kendall's W for Friedman: W = χ² / (n*(k-1)) where n=subjects, k=conditions
function computeKendallsW(chiStat: number, n: number, k: number): number {
  if (k - 1 === 0) return NaN
  return chiStat / (n * (k - 1))
}

interface EffectSizeInterpretation {
  label: string
  color: string
  className: string
}

function interpretEffectSizeR(r: number): EffectSizeInterpretation {
  const absR = Math.abs(r)
  if (isNaN(r)) return { label: 'N/A', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (absR < 0.1) return { label: 'Negligible', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (absR < 0.3) return { label: 'Small', color: 'amber', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' }
  if (absR < 0.5) return { label: 'Medium', color: 'orange', className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' }
  return { label: 'Large', color: 'rose', className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' }
}

function interpretEffectSizeEpsilon(eps: number): EffectSizeInterpretation {
  const absE = Math.abs(eps)
  if (isNaN(eps)) return { label: 'N/A', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (absE < 0.01) return { label: 'Negligible', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (absE < 0.06) return { label: 'Small', color: 'amber', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' }
  if (absE < 0.14) return { label: 'Medium', color: 'orange', className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' }
  return { label: 'Large', color: 'rose', className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' }
}

function interpretKendallsW(w: number): EffectSizeInterpretation {
  if (isNaN(w)) return { label: 'N/A', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (w < 0.1) return { label: 'Negligible', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (w < 0.3) return { label: 'Small', color: 'amber', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' }
  if (w < 0.5) return { label: 'Medium', color: 'orange', className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' }
  return { label: 'Large', color: 'rose', className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' }
}

// ==================== Effect Size Badge ====================
function EffectSizeBadge({ value, label, interpretation }: { value: number; label: string; interpretation: EffectSizeInterpretation }) {
  return (
    <Badge className={interpretation.className}>
      <Ruler className="size-3 mr-1 shrink-0" />
      {label} = {isNaN(value) ? 'N/A' : value.toFixed(4)} ({interpretation.label})
    </Badge>
  )
}

// ==================== P-Value Gauge ====================
function PValueGauge({ pValue, alpha = 0.05 }: { pValue: number; alpha?: number }) {
  const significant = pValue <= alpha
  const clampedP = Math.max(0, Math.min(1, pValue))
  const needleAngle = clampedP * 180
  const angleRad = (needleAngle * Math.PI) / 180
  const needleLength = 65
  const cx = 100
  const cy = 100
  const nx = cx - needleLength * Math.cos(angleRad)
  const ny = cy - needleLength * Math.sin(angleRad)

  const alphaAngleRad = (alpha * 180 * Math.PI) / 180
  const alphaX = cx - 78 * Math.cos(alphaAngleRad)
  const alphaY = cy - 78 * Math.sin(alphaAngleRad)

  const alphaAngleDeg = alpha * 180
  const greenStartAngle = alphaAngleDeg
  const greenEndAngle = 180

  const getArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = cx - radius * Math.cos(startRad)
    const y1 = cy - radius * Math.sin(startRad)
    const x2 = cx - radius * Math.cos(endRad)
    const y2 = cy - radius * Math.sin(endRad)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 0 ${x2} ${y2}`
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-32 h-20">
        <path
          d={getArcPath(greenStartAngle, greenEndAngle, 78)}
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          opacity={0.8}
        />
        <path
          d={getArcPath(0, alphaAngleDeg, 78)}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="12"
          strokeLinecap="round"
          opacity={0.8}
        />
        <line
          x1={alphaX}
          y1={alphaY}
          x2={cx}
          y2={cy}
          stroke={significant ? '#f43f5e' : '#6b7280'}
          strokeWidth="1.5"
          strokeDasharray="4 3"
          opacity={0.6}
        />
        <text
          x={alphaX}
          y={alphaY - 6}
          textAnchor="middle"
          fontSize="8"
          fill={significant ? '#f43f5e' : '#6b7280'}
          fontWeight="600"
        >
          α={alpha}
        </text>
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={significant ? '#f43f5e' : '#10b981'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5" fill={significant ? '#f43f5e' : '#10b981'} />
        <circle cx={cx} cy={cy} r="2.5" fill="white" />
        <text x="22" y="112" fontSize="7" fill="#10b981" fontWeight="600">Not Sig.</text>
        <text x="148" y="112" fontSize="7" fill="#f43f5e" fontWeight="600">Sig.</text>
      </svg>
      <p className={`text-sm font-semibold font-mono ${significant ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
        p = {pValue.toFixed(4)}
      </p>
    </div>
  )
}

// ==================== Gradient Divider ====================
function GradientDivider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />
  )
}

// ==================== Test Interpretation Summary Card ====================
function TestInterpretationSummary({
  significant,
  testName,
  pValue,
  alpha,
  effectSizeText,
}: {
  significant: boolean
  testName: string
  pValue: number
  alpha: number
  effectSizeText?: string
}) {
  const recommendationText = significant
    ? 'The test indicates a statistically significant difference. Consider post-hoc tests to identify which specific groups differ. If normality assumptions are met, parametric alternatives may offer greater power.'
    : 'The test did not find a statistically significant difference. Consider whether the sample size provides adequate power. If data meets normality assumptions, parametric tests may be more sensitive to detecting differences.'

  return (
    <Card className={`overflow-hidden transition-shadow hover:shadow-md ${
      significant
        ? 'border-rose-200 dark:border-rose-900'
        : 'border-emerald-200 dark:border-emerald-900'
    }`}>
      {/* Visual accent bar */}
      <div className={`h-1.5 ${
        significant
          ? 'bg-gradient-to-r from-rose-400 via-rose-500 to-rose-600'
          : 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600'
      }`} />
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className={`size-5 shrink-0 ${significant ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
          Test Interpretation Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Significance conclusion */}
        <div className={`p-3 rounded-lg ${
          significant
            ? 'bg-rose-50 dark:bg-rose-950/20'
            : 'bg-emerald-50 dark:bg-emerald-950/20'
        }`}>
          <div className="flex items-center gap-2">
            {significant ? (
              <XCircle className="size-5 text-rose-500 shrink-0" />
            ) : (
              <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
            )}
            <span className={`font-bold text-sm ${significant ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {significant ? 'Significant' : 'Not Significant'}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {testName}: p = {pValue.toFixed(4)} {significant ? '≤' : '>'} α = {alpha}
          </p>
        </div>

        {/* Effect size interpretation */}
        {effectSizeText && (
          <div className="flex items-start gap-2">
            <Ruler className="size-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">{effectSizeText}</span>
          </div>
        )}

        {/* Recommendation */}
        <div className="flex items-start gap-2">
          <Lightbulb className="size-4 text-amber-500 mt-0.5 shrink-0" />
          <span className="text-sm text-muted-foreground">{recommendationText}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== Color Palette ====================
const GROUP_COLORS = ['#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16', '#ec4899', '#6366f1']

type TestMode = 'mann-whitney' | 'wilcoxon' | 'kruskal-wallis' | 'friedman'

interface TestResult {
  testName: string
  statistic: number
  statisticLabel: string
  pValue: number
  df?: number
  conclusion: string
  significant: boolean
  // Effect size data
  effectSizeValue?: number
  effectSizeLabel?: string
  effectSizeInterpretation?: EffectSizeInterpretation
  effectSizeText?: string
  // Chart data
  chartData?: { name: string; median: number; error: number[]; fill: string }[]
  overallMedian?: number
}

export default function NonParametricTests() {
  const { dataset, getNumericColumns, getColumnData, getCategoricalColumns, getCategoricalData } = useDataset()

  const [activeTest, setActiveTest] = useState<TestMode>('mann-whitney')
  const [alpha, setAlpha] = useState<number>(0.05)

  // Mann-Whitney state
  const [mwMode, setMwMode] = useState<'columns' | 'groups'>('columns')
  const [mwCol1, setMwCol1] = useState('')
  const [mwCol2, setMwCol2] = useState('')
  const [mwNumCol, setMwNumCol] = useState('')
  const [mwGroupCol, setMwGroupCol] = useState('')

  // Wilcoxon state
  const [wilCol1, setWilCol1] = useState('')
  const [wilCol2, setWilCol2] = useState('')

  // Kruskal-Wallis state
  const [kwNumCol, setKwNumCol] = useState('')
  const [kwGroupCol, setKwGroupCol] = useState('')

  // Friedman state
  const [friedmanCols, setFriedmanCols] = useState<string[]>([])

  // Results
  const [results, setResults] = useState<TestResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const numericCols = getNumericColumns()
  const categoricalCols = getCategoricalColumns()

  const getUniqueGroups = useCallback(
    (col: string): string[] => {
      const data = getCategoricalData(col)
      return [...new Set(data)]
    },
    [getCategoricalData]
  )

  // Alpha context label
  const alphaLabel = useMemo(() => {
    if (alpha === 0.01) return 'Very strict'
    if (alpha === 0.05) return 'Standard'
    return 'Lenient'
  }, [alpha])

  // Recalculate significance based on current alpha
  const adjustedResults = useMemo(() => {
    return results.map(r => ({
      ...r,
      significant: r.pValue <= alpha,
    }))
  }, [results, alpha])

  const runMannWhitney = useCallback(() => {
    setError(null)
    try {
      let group1: number[]
      let group2: number[]
      let groupNames: string[] = [mwCol1 || 'Group 1', mwCol2 || 'Group 2']

      if (mwMode === 'columns') {
        if (!mwCol1 || !mwCol2) {
          setError('Please select two numeric columns for the Mann-Whitney U Test.')
          return
        }
        group1 = getColumnData(mwCol1)
        group2 = getColumnData(mwCol2)
        groupNames = [mwCol1, mwCol2]
      } else {
        if (!mwNumCol || !mwGroupCol) {
          setError('Please select a numeric column and a grouping column.')
          return
        }
        const groups = getUniqueGroups(mwGroupCol)
        if (groups.length < 2) {
          setError('The grouping column must have at least 2 unique groups.')
          return
        }
        if (groups.length > 2) {
          setError(
            `Mann-Whitney U Test requires exactly 2 groups, but ${groups.length} found. Use Kruskal-Wallis for 3+ groups.`
          )
          return
        }
        const allNumData = getColumnData(mwNumCol)
        const allGroupData = getCategoricalData(mwGroupCol)
        const minLen = Math.min(allNumData.length, allGroupData.length)
        group1 = []
        group2 = []
        for (let i = 0; i < minLen; i++) {
          if (allGroupData[i] === groups[0]) group1.push(allNumData[i])
          else if (allGroupData[i] === groups[1]) group2.push(allNumData[i])
        }
        groupNames = groups
      }

      if (group1.length < 2 || group2.length < 2) {
        setError('Each group must have at least 2 data points.')
        return
      }

      const result = mannWhitneyUTest(group1, group2)

      // Effect size: rank-biserial correlation
      const r = computeRankBiserialMW(result.uStat, group1.length, group2.length)
      const rInterp = interpretEffectSizeR(r)
      const effectSizeText = !isNaN(r)
        ? `Effect size: rank-biserial r = ${r.toFixed(4)} (${rInterp.label} effect)`
        : undefined

      // Chart data for group mode
      let chartData: { name: string; median: number; error: number[]; fill: string }[] | undefined
      let overallMed: number | undefined
      if (mwMode === 'groups' || mwMode === 'columns') {
        const med1 = median(group1)
        const med2 = median(group2)
        const sd1 = standardDeviation(group1)
        const sd2 = standardDeviation(group2)
        overallMed = (med1 + med2) / 2
        chartData = [
          {
            name: groupNames[0],
            median: Math.round(med1 * 1000) / 1000,
            error: [Math.round(Math.max(0, med1 - sd1) * 1000) / 1000, Math.round((med1 + sd1) * 1000) / 1000],
            fill: '#14b8a6',
          },
          {
            name: groupNames[1],
            median: Math.round(med2 * 1000) / 1000,
            error: [Math.round(Math.max(0, med2 - sd2) * 1000) / 1000, Math.round((med2 + sd2) * 1000) / 1000],
            fill: '#f59e0b',
          },
        ]
      }

      setResults([
        {
          testName: 'Mann-Whitney U Test',
          statistic: result.uStat,
          statisticLabel: 'U',
          pValue: result.pValue,
          conclusion: result.conclusion,
          significant: result.pValue <= alpha,
          effectSizeValue: r,
          effectSizeLabel: 'r',
          effectSizeInterpretation: rInterp,
          effectSizeText,
          chartData,
          overallMedian: overallMed,
        },
      ])
    } catch (e) {
      setError(`Mann-Whitney U Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [mwMode, mwCol1, mwCol2, mwNumCol, mwGroupCol, getColumnData, getCategoricalData, getUniqueGroups, alpha])

  const runWilcoxon = useCallback(() => {
    setError(null)
    try {
      if (!wilCol1 || !wilCol2) {
        setError('Please select two numeric columns for the Wilcoxon Signed-Rank Test.')
        return
      }
      const data1 = getColumnData(wilCol1)
      const data2 = getColumnData(wilCol2)

      if (data1.length !== data2.length) {
        setError(
          `Both columns must have the same number of observations for paired test. Column 1: ${data1.length}, Column 2: ${data2.length}.`
        )
        return
      }

      if (data1.length < 2) {
        setError('Each column must have at least 2 data points.')
        return
      }

      const result = wilcoxonTest(data1, data2)

      // Effect size: matched rank-biserial correlation
      const diffs = data1.map((v, i) => v - data2[i]).filter(d => d !== 0)
      const r = computeMatchedRankBiserialWilcoxon(result.wStat, diffs.length)
      const rInterp = interpretEffectSizeR(r)
      const effectSizeText = !isNaN(r)
        ? `Effect size: matched rank-biserial r = ${r.toFixed(4)} (${rInterp.label} effect)`
        : undefined

      setResults([
        {
          testName: 'Wilcoxon Signed-Rank Test',
          statistic: result.wStat,
          statisticLabel: 'W',
          pValue: result.pValue,
          conclusion: result.conclusion,
          significant: result.pValue <= alpha,
          effectSizeValue: r,
          effectSizeLabel: 'r',
          effectSizeInterpretation: rInterp,
          effectSizeText,
        },
      ])
    } catch (e) {
      setError(`Wilcoxon Signed-Rank Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [wilCol1, wilCol2, getColumnData, alpha])

  const runKruskalWallis = useCallback(() => {
    setError(null)
    try {
      if (!kwNumCol || !kwGroupCol) {
        setError('Please select a numeric column and a grouping column for the Kruskal-Wallis Test.')
        return
      }
      const groups = getUniqueGroups(kwGroupCol)
      if (groups.length < 3) {
        setError(
          `Kruskal-Wallis Test requires at least 3 groups, but only ${groups.length} found. Use Mann-Whitney U for 2 groups.`
        )
        return
      }

      const allNumData = getColumnData(kwNumCol)
      const allGroupData = getCategoricalData(kwGroupCol)
      const minLen = Math.min(allNumData.length, allGroupData.length)

      const groupArrays: number[][] = groups.map(() => [])
      for (let i = 0; i < minLen; i++) {
        const gIdx = groups.indexOf(allGroupData[i])
        if (gIdx >= 0) groupArrays[gIdx].push(allNumData[i])
      }

      const validGroups = groupArrays.filter((g) => g.length >= 2)
      if (validGroups.length < 3) {
        setError('At least 3 groups with 2+ data points each are required.')
        return
      }

      const result = kruskalWallisTest(validGroups)

      // Effect size: epsilon squared
      const totalN = validGroups.reduce((sum, g) => sum + g.length, 0)
      const eps = computeEpsilonSquared(result.hStat, validGroups.length, totalN)
      const epsInterp = interpretEffectSizeEpsilon(eps)
      const effectSizeText = !isNaN(eps)
        ? `Effect size: ε² = ${eps.toFixed(4)} (${epsInterp.label} effect)`
        : undefined

      // Chart data
      const chartData = validGroups.map((g, i) => {
        const med = median(g)
        const sd = standardDeviation(g)
        return {
          name: groups[i] || `Group ${i + 1}`,
          median: Math.round(med * 1000) / 1000,
          error: [Math.round(Math.max(0, med - sd) * 1000) / 1000, Math.round((med + sd) * 1000) / 1000],
          fill: GROUP_COLORS[i % GROUP_COLORS.length],
        }
      })
      const allData = validGroups.flat()
      const overallMed = median(allData)

      setResults([
        {
          testName: 'Kruskal-Wallis Test',
          statistic: result.hStat,
          statisticLabel: 'H',
          pValue: result.pValue,
          df: result.df,
          conclusion: result.conclusion,
          significant: result.pValue <= alpha,
          effectSizeValue: eps,
          effectSizeLabel: 'ε²',
          effectSizeInterpretation: epsInterp,
          effectSizeText,
          chartData,
          overallMedian: overallMed,
        },
      ])
    } catch (e) {
      setError(`Kruskal-Wallis Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [kwNumCol, kwGroupCol, getColumnData, getCategoricalData, getUniqueGroups, alpha])

  const runFriedman = useCallback(() => {
    setError(null)
    try {
      if (friedmanCols.length < 3) {
        setError('Friedman Test requires at least 3 numeric columns (repeated measures).')
        return
      }

      const dataArrays = friedmanCols.map((col) => getColumnData(col))
      const lengths = dataArrays.map((d) => d.length)
      if (!lengths.every((l) => l === lengths[0])) {
        setError(
          `All columns must have the same number of observations for repeated measures. Lengths: ${lengths.join(', ')}`
        )
        return
      }

      if (lengths[0] < 2) {
        setError('Each column must have at least 2 data points.')
        return
      }

      const result = friedmanTest(dataArrays)

      // Effect size: Kendall's W
      const n = lengths[0]
      const k = friedmanCols.length
      const w = computeKendallsW(result.chiStat, n, k)
      const wInterp = interpretKendallsW(w)
      const effectSizeText = !isNaN(w)
        ? `Effect size: Kendall's W = ${w.toFixed(4)} (${wInterp.label} effect)`
        : undefined

      setResults([
        {
          testName: 'Friedman Test',
          statistic: result.chiStat,
          statisticLabel: 'χ²',
          pValue: result.pValue,
          df: result.df,
          conclusion: result.conclusion,
          significant: result.pValue <= alpha,
          effectSizeValue: w,
          effectSizeLabel: 'W',
          effectSizeInterpretation: wInterp,
          effectSizeText,
        },
      ])
    } catch (e) {
      setError(`Friedman Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [friedmanCols, getColumnData, alpha])

  const runTest = useCallback(() => {
    switch (activeTest) {
      case 'mann-whitney':
        runMannWhitney()
        break
      case 'wilcoxon':
        runWilcoxon()
        break
      case 'kruskal-wallis':
        runKruskalWallis()
        break
      case 'friedman':
        runFriedman()
        break
    }
  }, [activeTest, runMannWhitney, runWilcoxon, runKruskalWallis, runFriedman])

  const toggleFriedmanCol = useCallback((col: string) => {
    setFriedmanCols((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    )
  }, [])

  // Test card effect size badges for selection cards
  const testCardBadges: Record<TestMode, { label: string; className: string }> = {
    'mann-whitney': { label: 'r (rank-biserial)', className: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800' },
    'wilcoxon': { label: 'r (matched)', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' },
    'kruskal-wallis': { label: 'ε² (epsilon²)', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
    'friedman': { label: "W (Kendall's)", className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' },
  }

  const testCards: {
    id: TestMode
    title: string
    icon: React.ReactNode
    description: string
    note: string
    color: string
  }[] = [
    {
      id: 'mann-whitney',
      title: 'Mann-Whitney U Test',
      icon: <GitCompareArrows className="size-5 shrink-0" />,
      description: 'Compare 2 independent groups',
      note: '2 independent groups, non-normal data',
      color: 'text-teal-600 dark:text-teal-400',
    },
    {
      id: 'wilcoxon',
      title: 'Wilcoxon Signed-Rank',
      icon: <ArrowLeftRight className="size-5 shrink-0" />,
      description: 'Compare paired observations',
      note: 'Paired groups, before & after, non-normal data',
      color: 'text-amber-600 dark:text-amber-400',
    },
    {
      id: 'kruskal-wallis',
      title: 'Kruskal-Wallis Test',
      icon: <BarChart3 className="size-5 shrink-0" />,
      description: 'Compare 3+ independent groups',
      note: '3+ groups, like ANOVA but non-parametric',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'friedman',
      title: 'Friedman Test',
      icon: <Repeat className="size-5 shrink-0" />,
      description: 'Compare 3+ related groups',
      note: 'Repeated measures, 3+ related groups, non-normal data',
      color: 'text-orange-600 dark:text-orange-400',
    },
  ]

  const renderTestConfig = () => {
    switch (activeTest) {
      case 'mann-whitney':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-medium text-muted-foreground">Input mode:</span>
              <Select value={mwMode} onValueChange={(v: 'columns' | 'groups') => setMwMode(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="columns">Two numeric columns</SelectItem>
                  <SelectItem value="groups">Group by category</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {mwMode === 'columns' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Column 1</label>
                  <Select value={mwCol1} onValueChange={setMwCol1}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Column 2</label>
                  <Select value={mwCol2} onValueChange={setMwCol2}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Numeric Column</label>
                  <Select value={mwNumCol} onValueChange={setMwNumCol}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select numeric column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {numericCols.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Grouping Column</label>
                  <Select value={mwGroupCol} onValueChange={setMwGroupCol}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select grouping column..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoricalCols.map((col) => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {mwGroupCol && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Groups found:</span>
                      {getUniqueGroups(mwGroupCol).map((g) => (
                        <Badge key={g} variant="secondary" className="text-xs">
                          {g}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      case 'wilcoxon':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Column 1 (Before)</label>
                <Select value={wilCol1} onValueChange={setWilCol1}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {numericCols.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Column 2 (After)</label>
                <Select value={wilCol2} onValueChange={setWilCol2}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {numericCols.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {wilCol1 && wilCol2 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                <span>
                  Observations: {getColumnData(wilCol1).length} vs {getColumnData(wilCol2).length}
                  {getColumnData(wilCol1).length !== getColumnData(wilCol2).length && (
                    <span className="text-destructive ml-1">(Must be equal for paired test)</span>
                  )}
                </span>
              </div>
            )}
          </div>
        )

      case 'kruskal-wallis':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Numeric Column</label>
                <Select value={kwNumCol} onValueChange={setKwNumCol}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select numeric column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {numericCols.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Grouping Column</label>
                <Select value={kwGroupCol} onValueChange={setKwGroupCol}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select grouping column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoricalCols.map((col) => (
                      <SelectItem key={col} value={col}>
                        {col}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {kwGroupCol && (
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Groups found:</span>
                    {getUniqueGroups(kwGroupCol).map((g) => (
                      <Badge key={g} variant="secondary" className="text-xs">
                        {g}
                      </Badge>
                    ))}
                    {getUniqueGroups(kwGroupCol).length < 3 && (
                      <span className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="size-3 shrink-0" />
                        Need at least 3 groups
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 'friedman':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select 3+ numeric columns (repeated measures)
              </label>
              <div className="flex flex-wrap gap-2">
                {numericCols.map((col) => {
                  const isSelected = friedmanCols.includes(col)
                  return (
                    <Button
                      key={col}
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleFriedmanCol(col)}
                      className={
                        isSelected
                          ? 'bg-teal-600 hover:bg-teal-700 text-white'
                          : ''
                      }
                    >
                      {isSelected && <CheckCircle2 className="size-3.5 mr-1 shrink-0" />}
                      {col}
                    </Button>
                  )
                })}
              </div>
              {friedmanCols.length > 0 && friedmanCols.length < 3 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="size-3 shrink-0" />
                  Select at least 3 columns for the Friedman Test
                </p>
              )}
              {friedmanCols.length >= 3 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                  {friedmanCols.length} columns selected ✓
                </p>
              )}
            </div>
            {friedmanCols.length >= 2 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="size-3.5 shrink-0" />
                <span>
                  All columns must have equal observations:{' '}
                  {friedmanCols.map((c) => getColumnData(c).length).join(', ')}
                </span>
              </div>
            )}
          </div>
        )
    }
  }

  if (!dataset) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-teal-600 shrink-0" />
            Non-parametric Tests
          </CardTitle>
          <CardDescription>
            Statistical tests that do not assume normal distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="size-4 shrink-0" />
            <AlertTitle>No Dataset Loaded</AlertTitle>
            <AlertDescription>
              Please upload a dataset first to perform non-parametric tests.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="size-5 text-teal-600 dark:text-teal-400 shrink-0" />
            Section 7 — Non-parametric Tests
          </CardTitle>
          <CardDescription>
            Statistical tests for data that does not follow a normal distribution. Choose a test
            based on your data structure and research question.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Test Selection Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {testCards.map((test) => {
          const isActive = activeTest === test.id
          const badge = testCardBadges[test.id]
          return (
            <button
              key={test.id}
              onClick={() => {
                setActiveTest(test.id)
                setResults([])
                setError(null)
              }}
              className={`text-left rounded-xl border p-4 min-h-[120px] transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                isActive
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 ring-2 ring-teal-500/20 shadow-sm'
                  : 'border-border bg-card hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={test.color}>{test.icon}</span>
                <span className="font-semibold text-sm">{test.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{test.description}</p>
              <div className="flex flex-col gap-1.5">
                <Badge
                  variant="outline"
                  className="text-[10px] font-normal"
                >
                  {test.note}
                </Badge>
                <Badge className={`text-[10px] font-normal ${badge.className}`}>
                  <Ruler className="size-2.5 mr-0.5 shrink-0" />
                  {badge.label}
                </Badge>
              </div>
            </button>
          )
        })}
      </div>

      {/* Test Configuration */}
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {testCards.find((t) => t.id === activeTest)?.icon}
            {testCards.find((t) => t.id === activeTest)?.title} — Configuration
          </CardTitle>
          <CardDescription>
            {activeTest === 'mann-whitney' &&
              'Compare two independent groups when data is not normally distributed. Alternative to independent t-test.'}
            {activeTest === 'wilcoxon' &&
              'Compare paired/related observations when differences are not normally distributed. Alternative to paired t-test.'}
            {activeTest === 'kruskal-wallis' &&
              'Compare three or more independent groups. Non-parametric alternative to one-way ANOVA.'}
            {activeTest === 'friedman' &&
              'Compare three or more related groups (repeated measures). Non-parametric alternative to repeated measures ANOVA.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderTestConfig()}

          {/* Interactive Alpha Selector */}
          <GradientDivider />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Gauge className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium">Significance Level (α)</span>
              <Badge variant="outline" className="font-mono text-xs">
                α = {alpha}
              </Badge>
              <span className="text-xs text-muted-foreground italic">{alphaLabel} criterion</span>
            </div>
            <div className="flex gap-2">
              {[
                { value: 0.01, label: '0.01' },
                { value: 0.05, label: '0.05' },
                { value: 0.10, label: '0.10' },
              ].map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={alpha === opt.value ? 'default' : 'outline'}
                  className={alpha === opt.value ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm' : ''}
                  onClick={() => setAlpha(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={runTest}
              className="gap-2 px-6 py-2.5 rounded-xl font-semibold bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Play className="size-4 shrink-0" />
              Run Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {adjustedResults.length > 0 && (
        <>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  Test Results
                  <Badge className={adjustedResults[0].significant
                    ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                    : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                  }>
                    {adjustedResults[0].significant ? (
                      <XCircle className="size-3 mr-1 shrink-0" />
                    ) : (
                      <CheckCircle2 className="size-3 mr-1 shrink-0" />
                    )}
                    {adjustedResults[0].significant ? 'Significant' : 'Not Significant'}
                  </Badge>
                </CardTitle>
                <PValueGauge pValue={adjustedResults[0].pValue} alpha={alpha} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead className="text-center">Statistic</TableHead>
                    <TableHead className="text-center">p-value</TableHead>
                    <TableHead className="text-center">df</TableHead>
                    <TableHead className="text-center">Effect Size</TableHead>
                    <TableHead>Conclusion</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustedResults.map((result, idx) => (
                    <TableRow key={idx} className="transition-colors hover:bg-muted/50">
                      <TableCell className="py-3 font-medium truncate max-w-[200px]">{result.testName}</TableCell>
                      <TableCell className="py-3 text-center">
                        <span className="font-mono text-sm">
                          {result.statisticLabel} = {result.statistic}
                        </span>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge
                          variant={result.significant ? 'destructive' : 'secondary'}
                          className="font-mono text-xs"
                        >
                          {result.pValue}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {result.df !== undefined ? (
                          <span className="font-mono text-sm">{result.df}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        {result.effectSizeValue !== undefined && result.effectSizeLabel && result.effectSizeInterpretation ? (
                          <EffectSizeBadge
                            value={result.effectSizeValue}
                            label={result.effectSizeLabel}
                            interpretation={result.effectSizeInterpretation}
                          />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-start gap-2">
                          {result.significant ? (
                            <XCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                          ) : (
                            <CheckCircle2 className="size-4 text-emerald-500 mt-0.5 shrink-0" />
                          )}
                          <span className="text-sm">{result.conclusion}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>

              {/* Detailed Effect Size Section */}
              {adjustedResults[0].effectSizeValue !== undefined && !isNaN(adjustedResults[0].effectSizeValue) && (
                <>
                  <GradientDivider />
                  <div className="p-4 rounded-lg bg-muted/20 border">
                    <div className="flex items-center gap-2 mb-2">
                      <Ruler className="size-4 text-muted-foreground shrink-0" />
                      <span className="font-medium text-sm">Effect Size Detail</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {adjustedResults[0].effectSizeText}
                    </p>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-md bg-slate-50 dark:bg-slate-800/40 p-2 border border-slate-200 dark:border-slate-700">
                        <span className="text-slate-600 dark:text-slate-400">Negligible</span>
                        <br />
                        <span className="font-mono">
                          {adjustedResults[0].effectSizeLabel === 'ε²' ? '|ε²| < 0.01' : adjustedResults[0].effectSizeLabel === 'W' ? 'W < 0.1' : '|r| < 0.1'}
                        </span>
                      </div>
                      <div className="rounded-md bg-amber-50 dark:bg-amber-900/20 p-2 border border-amber-200 dark:border-amber-800">
                        <span className="text-amber-600 dark:text-amber-400">Small</span>
                        <br />
                        <span className="font-mono">
                          {adjustedResults[0].effectSizeLabel === 'ε²' ? '0.01 – 0.06' : adjustedResults[0].effectSizeLabel === 'W' ? '0.1 – 0.3' : '0.1 – 0.3'}
                        </span>
                      </div>
                      <div className="rounded-md bg-orange-50 dark:bg-orange-900/20 p-2 border border-orange-200 dark:border-orange-800">
                        <span className="text-orange-600 dark:text-orange-400">Medium</span>
                        <br />
                        <span className="font-mono">
                          {adjustedResults[0].effectSizeLabel === 'ε²' ? '0.06 – 0.14' : adjustedResults[0].effectSizeLabel === 'W' ? '0.3 – 0.5' : '0.3 – 0.5'}
                        </span>
                      </div>
                      <div className="rounded-md bg-rose-50 dark:bg-rose-900/20 p-2 border border-rose-200 dark:border-rose-800">
                        <span className="text-rose-600 dark:text-rose-400">Large</span>
                        <br />
                        <span className="font-mono">
                          {adjustedResults[0].effectSizeLabel === 'ε²' ? '> 0.14' : adjustedResults[0].effectSizeLabel === 'W' ? '> 0.5' : '> 0.5'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Comparison Bar Charts */}
          {adjustedResults[0].chartData && adjustedResults[0].chartData!.length > 0 && (
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-teal-600 shrink-0" />
                  Group Median Comparison
                </CardTitle>
                <CardDescription>
                  Median ± 1 standard deviation for each group with overall median reference line
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-72">
                  <BarChart
                    data={adjustedResults[0].chartData}
                    width={undefined}
                    height={280}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(4), 'Median']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend />
                    {adjustedResults[0].overallMedian !== undefined && (
                      <ReferenceLine
                        y={Math.round(adjustedResults[0].overallMedian! * 1000) / 1000}
                        stroke="#6b7280"
                        strokeDasharray="5 5"
                        label={{ value: 'Overall Median', position: 'insideTopRight', fontSize: 10, fill: '#6b7280' }}
                      />
                    )}
                    <Bar dataKey="median" name="Median" radius={[4, 4, 0, 0]}>
                      {adjustedResults[0].chartData!.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <ErrorBar dataKey="error" width={4} strokeWidth={1.5} color="#374151" />
                    </Bar>
                  </BarChart>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Test Interpretation Summary Card */}
          <TestInterpretationSummary
            significant={adjustedResults[0].significant}
            testName={adjustedResults[0].testName}
            pValue={adjustedResults[0].pValue}
            alpha={alpha}
            effectSizeText={adjustedResults[0].effectSizeText}
          />
        </>
      )}

      {/* When to Use Guide */}
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            When to Use Non-parametric Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-2 min-w-0 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <GitCompareArrows className="size-4 text-teal-600 shrink-0" />
                <span className="font-medium text-sm">Mann-Whitney U</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>2 independent groups</li>
                <li>Data is not normally distributed</li>
                <li>Ordinal data or small samples</li>
                <li>Non-parametric alternative to independent t-test</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 space-y-2 min-w-0 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="size-4 text-amber-600 shrink-0" />
                <span className="font-medium text-sm">Wilcoxon Signed-Rank</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Paired groups (before & after)</li>
                <li>Non-normal differences between pairs</li>
                <li>Related samples or repeated measures</li>
                <li>Non-parametric alternative to paired t-test</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 space-y-2 min-w-0 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-sm">Kruskal-Wallis</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>3+ independent groups</li>
                <li>Like ANOVA but non-parametric</li>
                <li>Does not assume normal distribution</li>
                <li>Tests if at least one group differs</li>
              </ul>
            </div>
            <div className="rounded-lg border p-4 space-y-2 min-w-0 transition-colors hover:bg-muted/30">
              <div className="flex items-center gap-2">
                <Repeat className="size-4 text-orange-600 shrink-0" />
                <span className="font-medium text-sm">Friedman</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                <li>Repeated measures, 3+ related groups</li>
                <li>Non-normal data with repeated observations</li>
                <li>Same subjects under different conditions</li>
                <li>Non-parametric alternative to repeated measures ANOVA</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
