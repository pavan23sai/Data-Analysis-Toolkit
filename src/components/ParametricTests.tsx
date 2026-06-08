'use client'

import { useState, useMemo } from 'react'
import {
  oneSampleTTest,
  twoSampleTTest,
  pairedTTest,
  oneSampleZTest,
  chiSquareGoFTest,
  oneWayANOVA,
  leveneTest,
  mean,
  standardDeviation,
  variance,
} from '@/lib/statistics'
import { useDataset } from '@/hooks/useDataset'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
  FlaskConical,
  CheckCircle2,
  XCircle,
  Calculator,
  BarChart3,
  Sigma,
  TrendingUp,
  AlertTriangle,
  Gauge,
  Ruler,
} from 'lucide-react'

// ==================== Cohen's d Helpers ====================
function computeCohensDOneSample(data: number[], mu0: number): number {
  const sd = standardDeviation(data)
  if (sd === 0 || isNaN(sd)) return NaN
  return (mean(data) - mu0) / sd
}

function computeCohensDTwoSample(data1: number[], data2: number[]): number {
  const n1 = data1.length
  const n2 = data2.length
  const v1 = variance(data1)
  const v2 = variance(data2)
  const pooledStdDev = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))
  if (pooledStdDev === 0 || isNaN(pooledStdDev)) return NaN
  return (mean(data1) - mean(data2)) / pooledStdDev
}

function computeCohensDPaired(data1: number[], data2: number[]): number {
  const diffs = data1.map((v, i) => v - data2[i])
  const sd = standardDeviation(diffs)
  if (sd === 0 || isNaN(sd)) return NaN
  return mean(diffs) / sd
}

function interpretCohensD(d: number): { label: string; color: string; className: string } {
  const absD = Math.abs(d)
  if (isNaN(d)) return { label: 'N/A', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (absD < 0.2) return { label: 'Negligible', color: 'slate', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/40 dark:text-slate-300 dark:border-slate-700' }
  if (absD < 0.5) return { label: 'Small', color: 'amber', className: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' }
  if (absD < 0.8) return { label: 'Medium', color: 'orange', className: 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800' }
  return { label: 'Large', color: 'rose', className: 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800' }
}

// ==================== Effect Size Badge ====================
function EffectSizeBadge({ d }: { d: number }) {
  const interp = interpretCohensD(d)
  return (
    <Badge className={interp.className}>
      <Ruler className="size-3 mr-1 shrink-0" />
      d = {isNaN(d) ? 'N/A' : d.toFixed(4)} ({interp.label})
    </Badge>
  )
}

// ==================== P-Value Gauge ====================
function PValueGauge({ pValue, alpha = 0.05 }: { pValue: number; alpha?: number }) {
  const significant = pValue <= alpha
  // Needle angle: 0 at left (p=1, not significant), 180 at right (p=0, significant)
  const clampedP = Math.max(0, Math.min(1, pValue))
  const needleAngle = clampedP * 180 // 0=right(significant), 180=left(not significant)
  // Convert angle to SVG coordinates (0° = left, 180° = right)
  const angleRad = (needleAngle * Math.PI) / 180
  const needleLength = 65
  const cx = 100
  const cy = 100
  const nx = cx - needleLength * Math.cos(angleRad)
  const ny = cy - needleLength * Math.sin(angleRad)

  // Alpha threshold position (p = alpha)
  const alphaAngleRad = (alpha * 180 * Math.PI) / 180
  const alphaX = cx - 78 * Math.cos(alphaAngleRad)
  const alphaY = cy - 78 * Math.sin(alphaAngleRad)

  // Calculate arc segments for green and red zones
  // Green zone: p from alpha to 1.0 (left side)
  // Red zone: p from 0 to alpha (right side)
  const alphaAngleDeg = alpha * 180
  const greenStartAngle = alphaAngleDeg
  const greenEndAngle = 180

  // Helper to get arc path
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
        {/* Green zone (not significant): from alpha threshold to left end */}
        <path
          d={getArcPath(greenStartAngle, greenEndAngle, 78)}
          fill="none"
          stroke="#10b981"
          strokeWidth="12"
          strokeLinecap="round"
          opacity={0.8}
        />
        {/* Red zone (significant): from right end to alpha threshold */}
        <path
          d={getArcPath(0, alphaAngleDeg, 78)}
          fill="none"
          stroke="#f43f5e"
          strokeWidth="12"
          strokeLinecap="round"
          opacity={0.8}
        />
        {/* Alpha threshold dashed line */}
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
        {/* Small label for alpha */}
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
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={significant ? '#f43f5e' : '#10b981'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="5" fill={significant ? '#f43f5e' : '#10b981'} />
        <circle cx={cx} cy={cy} r="2.5" fill="white" />
        {/* Labels */}
        <text x="22" y="112" fontSize="7" fill="#10b981" fontWeight="600">Not Sig.</text>
        <text x="148" y="112" fontSize="7" fill="#f43f5e" fontWeight="600">Sig.</text>
      </svg>
      <p className={`text-sm font-semibold font-mono ${significant ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
        p = {pValue.toFixed(4)}
      </p>
    </div>
  )
}

// ==================== Result Badge ====================
function ResultBadge({ pValue }: { pValue: number }) {
  const significant = pValue <= 0.05
  return (
    <Badge
      className={
        significant
          ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
          : 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
      }
    >
      {significant ? (
        <XCircle className="size-3 mr-1 shrink-0" />
      ) : (
        <CheckCircle2 className="size-3 mr-1 shrink-0" />
      )}
      {significant ? 'Significant' : 'Not Significant'}
    </Badge>
  )
}

// ==================== Conclusion Box (with fade-in animation) ====================
function ConclusionBox({ conclusion, pValue, effectSizeText }: { conclusion: string; pValue: number; effectSizeText?: string }) {
  const significant = pValue <= 0.05
  return (
    <div
      className={`mt-4 p-4 rounded-lg border animate-in fade-in duration-500 ${
        significant
          ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
          : 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
      }`}
    >
      <div className="flex items-start gap-2">
        {significant ? (
          <XCircle className="size-5 text-red-500 mt-0.5 shrink-0" />
        ) : (
          <CheckCircle2 className="size-5 text-emerald-500 mt-0.5 shrink-0" />
        )}
        <div>
          <p className="font-semibold text-sm">
            {significant ? 'Reject H₀' : 'Fail to Reject H₀'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">{conclusion}</p>
          {effectSizeText && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Ruler className="size-3.5 shrink-0" />
              {effectSizeText}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== Gradient Divider ====================
function GradientDivider() {
  return (
    <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent my-4" />
  )
}

// ==================== One-Sample T-Test ====================
function OneSampleTTestPanel() {
  const { getNumericColumns, getColumnData } = useDataset()
  const numericCols = getNumericColumns()
  const [selectedCol, setSelectedCol] = useState('')
  const [mu0, setMu0] = useState('0')
  const [result, setResult] = useState<ReturnType<typeof oneSampleTTest> | null>(null)
  const [cohensD, setCohensD] = useState<number>(NaN)
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setResult(null)
    setCohensD(NaN)
    if (!selectedCol) {
      setError('Please select a column.')
      return
    }
    const data = getColumnData(selectedCol)
    if (data.length < 2) {
      setError('Need at least 2 data points.')
      return
    }
    const mu0Val = parseFloat(mu0)
    if (isNaN(mu0Val)) {
      setError('Please enter a valid μ₀ value.')
      return
    }
    const testResult = oneSampleTTest(data, mu0Val)
    setResult(testResult)
    setCohensD(computeCohensDOneSample(data, mu0Val))
  }

  const effectSizeInterp = interpretCohensD(cohensD)
  const effectSizeText = !isNaN(cohensD)
    ? `Effect size: Cohen's d = ${cohensD.toFixed(4)} (${effectSizeInterp.label} effect)`
    : undefined

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600 shrink-0" />
            One-Sample T-Test
          </CardTitle>
          <CardDescription>
            Test whether the mean of a single column differs from a hypothesized value μ₀
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Column</Label>
              <Select value={selectedCol} onValueChange={setSelectedCol}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">μ₀ (Hypothesized Mean)</Label>
              <Input
                type="number"
                value={mu0}
                onChange={(e) => setMu0(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button
              onClick={handleRun}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Calculator className="size-4 mr-1 shrink-0" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                Results <ResultBadge pValue={result.pValue} />
              </CardTitle>
              <PValueGauge pValue={result.pValue} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">t-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{result.tStat}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                  <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">Degrees of Freedom</TableCell>
                  <TableCell className="text-right font-mono">{result.df}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50 bg-muted/20">
                  <TableCell className="font-medium flex items-center gap-1.5">
                    <Ruler className="size-3.5 text-muted-foreground shrink-0" />
                    Cohen&apos;s d (Effect Size)
                  </TableCell>
                  <TableCell className="text-right">
                    <EffectSizeBadge d={cohensD} />
                  </TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={result.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
            <GradientDivider />
            <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} effectSizeText={effectSizeText} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== Two-Sample T-Test ====================
function TwoSampleTTestPanel() {
  const { getNumericColumns, getColumnData } = useDataset()
  const numericCols = getNumericColumns()
  const [col1, setCol1] = useState('')
  const [col2, setCol2] = useState('')
  const [equalVar, setEqualVar] = useState(true)
  const [result, setResult] = useState<ReturnType<typeof twoSampleTTest> | null>(null)
  const [cohensD, setCohensD] = useState<number>(NaN)
  const [chartData, setChartData] = useState<{ name: string; mean: number; error: number[]; fill: string }[]>([])
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setResult(null)
    setCohensD(NaN)
    setChartData([])
    if (!col1 || !col2) {
      setError('Please select both columns.')
      return
    }
    if (col1 === col2) {
      setError('Please select two different columns.')
      return
    }
    const data1 = getColumnData(col1)
    const data2 = getColumnData(col2)
    if (data1.length < 2 || data2.length < 2) {
      setError('Each column needs at least 2 data points.')
      return
    }
    const testResult = twoSampleTTest(data1, data2, equalVar)
    setResult(testResult)
    setCohensD(computeCohensDTwoSample(data1, data2))
    // Build chart data
    const m1 = mean(data1)
    const m2 = mean(data2)
    const sd1 = standardDeviation(data1)
    const sd2 = standardDeviation(data2)
    setChartData([
      { name: col1, mean: Math.round(m1 * 1000) / 1000, error: [Math.max(0, Math.round((m1 - sd1) * 1000) / 1000), Math.round((m1 + sd1) * 1000) / 1000], fill: '#14b8a6' },
      { name: col2, mean: Math.round(m2 * 1000) / 1000, error: [Math.max(0, Math.round((m2 - sd2) * 1000) / 1000), Math.round((m2 + sd2) * 1000) / 1000], fill: '#f59e0b' },
    ])
  }

  const effectSizeInterp = interpretCohensD(cohensD)
  const effectSizeText = !isNaN(cohensD)
    ? `Effect size: Cohen's d = ${cohensD.toFixed(4)} (${effectSizeInterp.label} effect)`
    : undefined

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-amber-600 shrink-0" />
            Two-Sample T-Test (Independent)
          </CardTitle>
          <CardDescription>
            Compare the means of two independent groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Column 1</Label>
              <Select value={col1} onValueChange={setCol1}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Column 2</Label>
              <Select value={col2} onValueChange={setCol2}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Variance Assumption</Label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={equalVar ? 'default' : 'outline'}
                  className={equalVar ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                  onClick={() => setEqualVar(true)}
                >
                  Equal
                </Button>
                <Button
                  size="sm"
                  variant={!equalVar ? 'default' : 'outline'}
                  className={!equalVar ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''}
                  onClick={() => setEqualVar(false)}
                >
                  Unequal
                </Button>
              </div>
            </div>
            <Button
              onClick={handleRun}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Calculator className="size-4 mr-1 shrink-0" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Results <ResultBadge pValue={result.pValue} />
                </CardTitle>
                <PValueGauge pValue={result.pValue} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statistic</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">t-Statistic</TableCell>
                    <TableCell className="text-right font-mono">{result.tStat}</TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                    <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">Degrees of Freedom</TableCell>
                    <TableCell className="text-right font-mono">{result.df}</TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">Variance Assumption</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{equalVar ? 'Equal Variance' : "Welch's (Unequal)"}</Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50 bg-muted/20">
                    <TableCell className="font-medium flex items-center gap-1.5">
                      <Ruler className="size-3.5 text-muted-foreground shrink-0" />
                      Cohen&apos;s d (Effect Size)
                    </TableCell>
                    <TableCell className="text-right">
                      <EffectSizeBadge d={cohensD} />
                    </TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                    <TableCell className="text-right">
                      <ResultBadge pValue={result.pValue} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              </div>
              <GradientDivider />
              <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} effectSizeText={effectSizeText} />
            </CardContent>
          </Card>

          {/* Comparison Bar Chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-amber-600 shrink-0" />
                  Group Means Comparison
                </CardTitle>
                <CardDescription>
                  Mean ± 1 standard deviation for each group
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-64">
                  <BarChart
                    data={chartData}
                    width={undefined}
                    height={250}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(4), 'Mean']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend />
                    <ReferenceLine
                      y={(chartData[0].mean + chartData[1].mean) / 2}
                      stroke="#6b7280"
                      strokeDasharray="5 5"
                      label={{ value: 'Overall Mean', position: 'insideTopRight', fontSize: 10, fill: '#6b7280' }}
                    />
                    <Bar dataKey="mean" name="Mean" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <ErrorBar dataKey="error" width={4} strokeWidth={1.5} color="#374151" />
                    </Bar>
                  </BarChart>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ==================== Paired T-Test ====================
function PairedTTestPanel() {
  const { getNumericColumns, getColumnData } = useDataset()
  const numericCols = getNumericColumns()
  const [col1, setCol1] = useState('')
  const [col2, setCol2] = useState('')
  const [result, setResult] = useState<ReturnType<typeof pairedTTest> | null>(null)
  const [cohensD, setCohensD] = useState<number>(NaN)
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setResult(null)
    setCohensD(NaN)
    if (!col1 || !col2) {
      setError('Please select both columns.')
      return
    }
    if (col1 === col2) {
      setError('Please select two different columns.')
      return
    }
    const data1 = getColumnData(col1)
    const data2 = getColumnData(col2)
    if (data1.length < 2 || data2.length < 2) {
      setError('Each column needs at least 2 data points.')
      return
    }
    const minLen = Math.min(data1.length, data2.length)
    const d1 = data1.slice(0, minLen)
    const d2 = data2.slice(0, minLen)
    const testResult = pairedTTest(d1, d2)
    setResult(testResult)
    setCohensD(computeCohensDPaired(d1, d2))
  }

  const effectSizeInterp = interpretCohensD(cohensD)
  const effectSizeText = !isNaN(cohensD)
    ? `Effect size: Cohen's d = ${cohensD.toFixed(4)} (${effectSizeInterp.label} effect)`
    : undefined

  return (
    <div className="space-y-4">
      <Card className="border-teal-200 dark:border-teal-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sigma className="size-4 text-teal-600 shrink-0" />
            Paired T-Test
          </CardTitle>
          <CardDescription>
            Compare means from the same group at different times or under different conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Column 1 (Before)</Label>
              <Select value={col1} onValueChange={setCol1}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Column 2 (After)</Label>
              <Select value={col2} onValueChange={setCol2}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <Button
              onClick={handleRun}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Calculator className="size-4 mr-1 shrink-0" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                Results <ResultBadge pValue={result.pValue} />
              </CardTitle>
              <PValueGauge pValue={result.pValue} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">t-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{result.tStat}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                  <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">Degrees of Freedom</TableCell>
                  <TableCell className="text-right font-mono">{result.df}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">Mean Difference</TableCell>
                  <TableCell className="text-right font-mono">{result.meanDiff}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50 bg-muted/20">
                  <TableCell className="font-medium flex items-center gap-1.5">
                    <Ruler className="size-3.5 text-muted-foreground shrink-0" />
                    Cohen&apos;s d (Effect Size)
                  </TableCell>
                  <TableCell className="text-right">
                    <EffectSizeBadge d={cohensD} />
                  </TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={result.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
            <GradientDivider />
            <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} effectSizeText={effectSizeText} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== T-Test Section ====================
function TTestSection() {
  return (
    <Tabs defaultValue="one-sample" className="w-full">
      <TabsList className="mb-2">
        <TabsTrigger value="one-sample">One-Sample</TabsTrigger>
        <TabsTrigger value="two-sample">Two-Sample</TabsTrigger>
        <TabsTrigger value="paired">Paired</TabsTrigger>
      </TabsList>
      <TabsContent value="one-sample">
        <OneSampleTTestPanel />
      </TabsContent>
      <TabsContent value="two-sample">
        <TwoSampleTTestPanel />
      </TabsContent>
      <TabsContent value="paired">
        <PairedTTestPanel />
      </TabsContent>
    </Tabs>
  )
}

// ==================== Z-Test Section ====================
function ZTestSection() {
  const { getNumericColumns, getColumnData } = useDataset()
  const numericCols = getNumericColumns()
  const [selectedCol, setSelectedCol] = useState('')
  const [mu0, setMu0] = useState('0')
  const [knownSigma, setKnownSigma] = useState('')
  const [result, setResult] = useState<ReturnType<typeof oneSampleZTest> | null>(null)
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setResult(null)
    if (!selectedCol) {
      setError('Please select a column.')
      return
    }
    const data = getColumnData(selectedCol)
    if (data.length < 2) {
      setError('Need at least 2 data points.')
      return
    }
    const mu0Val = parseFloat(mu0)
    const sigmaVal = parseFloat(knownSigma)
    if (isNaN(mu0Val)) {
      setError('Please enter a valid μ₀ value.')
      return
    }
    if (isNaN(sigmaVal) || sigmaVal <= 0) {
      setError('Please enter a valid known σ (must be > 0).')
      return
    }
    setResult(oneSampleZTest(data, mu0Val, sigmaVal))
  }

  return (
    <div className="space-y-4">
      <Card className="border-orange-200 dark:border-orange-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sigma className="size-4 text-orange-600 shrink-0" />
            One-Sample Z-Test
          </CardTitle>
          <CardDescription>
            Test the mean against a known value when the population standard deviation is known
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Column</Label>
              <Select value={selectedCol} onValueChange={setSelectedCol}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">μ₀ (Hypothesized Mean)</Label>
              <Input
                type="number"
                value={mu0}
                onChange={(e) => setMu0(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Known σ (Population SD)</Label>
              <Input
                type="number"
                value={knownSigma}
                onChange={(e) => setKnownSigma(e.target.value)}
                placeholder="e.g. 1.5"
                min="0.001"
                step="0.1"
              />
            </div>
            <Button
              onClick={handleRun}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              <Calculator className="size-4 mr-1 shrink-0" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                Results <ResultBadge pValue={result.pValue} />
              </CardTitle>
              <PValueGauge pValue={result.pValue} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">z-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{result.zStat}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                  <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={result.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
            <GradientDivider />
            <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== Chi-Square GoF Section ====================
function ChiSquareGoFSection() {
  const { getCategoricalColumns, getCategoricalData } = useDataset()
  const categoricalCols = getCategoricalColumns()
  const [selectedCol, setSelectedCol] = useState('')
  const [result, setResult] = useState<ReturnType<typeof chiSquareGoFTest> | null>(null)
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setResult(null)
    if (!selectedCol) {
      setError('Please select a categorical column.')
      return
    }
    const catData = getCategoricalData(selectedCol)
    if (catData.length < 2) {
      setError('Need at least 2 data points.')
      return
    }

    // Count observed frequencies
    const freq = new Map<string, number>()
    catData.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1))
    const categories = [...freq.keys()]
    const observed = categories.map((c) => freq.get(c)!)

    if (categories.length < 2) {
      setError('Need at least 2 categories for chi-square test.')
      return
    }

    const testResult = chiSquareGoFTest(observed)
    setResult({
      ...testResult,
      table: testResult.table.map((row, i) => ({
        ...row,
        category: categories[i] as unknown as number,
      })),
    })
  }

  // Re-map table category labels for display
  const displayTable = useMemo(() => {
    if (!result) return []
    const catData = getCategoricalData(selectedCol)
    const freq = new Map<string, number>()
    catData.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1))
    const categories = [...freq.keys()]
    return result.table.map((row, i) => ({
      category: categories[i] || String(row.category),
      observed: row.observed,
      expected: row.expected,
      contribution: row.contribution,
    }))
  }, [result, selectedCol, getCategoricalData])

  return (
    <div className="space-y-4">
      <Card className="border-rose-200 dark:border-rose-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-rose-600 shrink-0" />
            Chi-Square Goodness of Fit Test
          </CardTitle>
          <CardDescription>
            Test whether observed categorical frequencies match expected uniform distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Categorical Column</Label>
              <Select value={selectedCol} onValueChange={setSelectedCol}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <Button
              onClick={handleRun}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              <Calculator className="size-4 mr-1 shrink-0" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Frequency Table
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Observed</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                    <TableHead className="text-right">Contribution (O-E)²/E</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayTable.map((row, i) => (
                    <TableRow key={i} className="transition-colors hover:bg-muted/50">
                      <TableCell className="font-medium">{String(row.category)}</TableCell>
                      <TableCell className="text-right font-mono">{row.observed}</TableCell>
                      <TableCell className="text-right font-mono">{row.expected}</TableCell>
                      <TableCell className="text-right font-mono">{row.contribution}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  Test Results <ResultBadge pValue={result.pValue} />
                </CardTitle>
                <PValueGauge pValue={result.pValue} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statistic</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">Chi-Square Statistic</TableCell>
                    <TableCell className="text-right font-mono">{result.chiStat}</TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">p-Value</TableCell>
                    <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">Degrees of Freedom</TableCell>
                    <TableCell className="text-right font-mono">{result.df}</TableCell>
                  </TableRow>
                  <TableRow className="transition-colors hover:bg-muted/50">
                    <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                    <TableCell className="text-right">
                      <ResultBadge pValue={result.pValue} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              </div>
              <GradientDivider />
              <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ==================== ANOVA + Levene Section ====================
const ANOVA_COLORS = ['#14b8a6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4', '#84cc16', '#ec4899', '#6366f1']

function ANOVASsection() {
  const { getNumericColumns, getCategoricalColumns, getColumnData, getCategoricalData } =
    useDataset()
  const numericCols = getNumericColumns()
  const categoricalCols = getCategoricalColumns()
  const [numCol, setNumCol] = useState('')
  const [grpCol, setGrpCol] = useState('')
  const [anovaResult, setAnovaResult] = useState<ReturnType<typeof oneWayANOVA> | null>(null)
  const [leveneResult, setLeveneResult] = useState<ReturnType<typeof leveneTest> | null>(null)
  const [anovaChartData, setAnovaChartData] = useState<{ name: string; mean: number; error: number[]; fill: string }[]>([])
  const [overallMean, setOverallMean] = useState<number>(0)
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setAnovaResult(null)
    setLeveneResult(null)
    setAnovaChartData([])
    setOverallMean(0)
    if (!numCol || !grpCol) {
      setError('Please select both a numeric and a grouping column.')
      return
    }
    const numData = getColumnData(numCol)
    const grpData = getCategoricalData(grpCol)
    if (numData.length < 3) {
      setError('Need at least 3 data points.')
      return
    }

    const minLen = Math.min(numData.length, grpData.length)

    // Build groups
    const groupMap = new Map<string, number[]>()
    for (let i = 0; i < minLen; i++) {
      const g = grpData[i]
      if (!groupMap.has(g)) groupMap.set(g, [])
      groupMap.get(g)!.push(numData[i])
    }

    const groups = [...groupMap.values()].filter((g) => g.length >= 1)
    const groupNames = [...groupMap.keys()]

    if (groups.length < 2) {
      setError('Need at least 2 groups for ANOVA.')
      return
    }

    const anova = oneWayANOVA(groups)
    // Attach group names for display
    ;(anova as typeof anova & { groupNames: string[] }).groupNames = groupNames.filter(
      (_, i) => groupMap.get(groupNames[i])!.length >= 1
    )
    setAnovaResult(anova)

    // Build ANOVA chart data
    const chartData = groups.map((g, i) => {
      const m = mean(g)
      const sd = standardDeviation(g)
      return {
        name: groupNames[i] || `Group ${i + 1}`,
        mean: Math.round(m * 1000) / 1000,
        error: [Math.round(Math.max(0, m - sd) * 1000) / 1000, Math.round((m + sd) * 1000) / 1000],
        fill: ANOVA_COLORS[i % ANOVA_COLORS.length],
      }
    })
    setAnovaChartData(chartData)
    setOverallMean(mean(numData.slice(0, minLen)))

    const lev = leveneTest(groups)
    ;(lev as typeof lev & { groupNames: string[] }).groupNames = groupNames.filter(
      (_, i) => groupMap.get(groupNames[i])!.length >= 1
    )
    setLeveneResult(lev)
  }

  const groupNames = (anovaResult as typeof anovaResult & { groupNames?: string[] })
    ?.groupNames || []

  return (
    <div className="space-y-4">
      <Card className="border-violet-200 dark:border-violet-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-violet-600 shrink-0" />
            One-Way ANOVA + Levene&apos;s Test
          </CardTitle>
          <CardDescription>
            Compare means across multiple groups (ANOVA) and test for equal variances (Levene)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Numeric Column</Label>
              <Select value={numCol} onValueChange={setNumCol}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <div className="space-y-2 min-w-0">
              <Label className="text-sm font-medium">Grouping Column</Label>
              <Select value={grpCol} onValueChange={setGrpCol}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select column" />
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
            <Button
              onClick={handleRun}
              className="bg-violet-600 hover:bg-violet-700 text-white"
            >
              <Calculator className="size-4 mr-1 shrink-0" />
              Run Tests
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {anovaResult && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  One-Way ANOVA Results <ResultBadge pValue={anovaResult.pValue} />
                </CardTitle>
                <PValueGauge pValue={anovaResult.pValue} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Group Means */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Group Means</h4>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Group</TableHead>
                        <TableHead className="text-right">Mean</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {anovaResult.groupMeans.map((m, i) => (
                        <TableRow key={i} className="transition-colors hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {groupNames[i] || `Group ${i + 1}`}
                          </TableCell>
                          <TableCell className="text-right font-mono">{m}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </div>

                {/* ANOVA Table */}
                <div>
                  <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                    ANOVA Summary Table
                  </h4>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead className="text-right">SS</TableHead>
                        <TableHead className="text-right">df</TableHead>
                        <TableHead className="text-right">MS</TableHead>
                        <TableHead className="text-right">F</TableHead>
                        <TableHead className="text-right">p-Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="transition-colors hover:bg-muted/50">
                        <TableCell className="font-medium">Between Groups</TableCell>
                        <TableCell className="text-right font-mono">{anovaResult.ssBetween}</TableCell>
                        <TableCell className="text-right font-mono">{anovaResult.dfBetween}</TableCell>
                        <TableCell className="text-right font-mono">{anovaResult.msBetween}</TableCell>
                        <TableCell className="text-right font-mono" rowSpan={2}>
                          {anovaResult.fStat}
                        </TableCell>
                        <TableCell className="text-right font-mono" rowSpan={2}>
                          {anovaResult.pValue}
                        </TableCell>
                      </TableRow>
                      <TableRow className="transition-colors hover:bg-muted/50">
                        <TableCell className="font-medium">Within Groups</TableCell>
                        <TableCell className="text-right font-mono">{anovaResult.ssWithin}</TableCell>
                        <TableCell className="text-right font-mono">{anovaResult.dfWithin}</TableCell>
                        <TableCell className="text-right font-mono">{anovaResult.msWithin}</TableCell>
                      </TableRow>
                      <TableRow className="transition-colors hover:bg-muted/50">
                        <TableCell className="font-medium">Total</TableCell>
                        <TableCell className="text-right font-mono">{anovaResult.ssTotal}</TableCell>
                        <TableCell className="text-right font-mono">
                          {anovaResult.dfBetween + anovaResult.dfWithin}
                        </TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">—</TableCell>
                        <TableCell className="text-right">—</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  </div>
                </div>
              </div>
              <GradientDivider />
              <ConclusionBox conclusion={anovaResult.conclusion} pValue={anovaResult.pValue} />
            </CardContent>
          </Card>

          {/* ANOVA Group Comparison Chart */}
          {anovaChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="size-4 text-violet-600 shrink-0" />
                  Group Means Comparison
                </CardTitle>
                <CardDescription>
                  Mean ± 1 standard deviation for each group with overall mean reference line
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-72">
                  <BarChart
                    data={anovaChartData}
                    width={undefined}
                    height={280}
                    margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(4), 'Mean']}
                      contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    />
                    <Legend />
                    <ReferenceLine
                      y={Math.round(overallMean * 1000) / 1000}
                      stroke="#6b7280"
                      strokeDasharray="5 5"
                      label={{ value: `Overall Mean (${(overallMean).toFixed(2)})`, position: 'insideTopRight', fontSize: 10, fill: '#6b7280' }}
                    />
                    <Bar dataKey="mean" name="Mean" radius={[4, 4, 0, 0]}>
                      {anovaChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                      <ErrorBar dataKey="error" width={4} strokeWidth={1.5} color="#374151" />
                    </Bar>
                  </BarChart>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {leveneResult && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                Levene&apos;s Test (Equality of Variances){' '}
                <ResultBadge pValue={leveneResult.pValue} />
              </CardTitle>
              <PValueGauge pValue={leveneResult.pValue} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">F-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.fStat}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">p-Value</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.pValue}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">df₁ (Between)</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.df1}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">df₂ (Within)</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.df2}</TableCell>
                </TableRow>
                <TableRow className="transition-colors hover:bg-muted/50">
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={leveneResult.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            </div>
            <GradientDivider />
            <ConclusionBox conclusion={leveneResult.conclusion} pValue={leveneResult.pValue} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ==================== Main Component ====================
export default function ParametricTests() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
          <FlaskConical className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Parametric Hypothesis Tests</h2>
          <p className="text-sm text-muted-foreground">
            T-Tests, Z-Test, Chi-Square, and ANOVA with assumptions checks
          </p>
        </div>
      </div>

      <Tabs defaultValue="t-test" className="w-full">
        <TabsList className="flex-wrap">
          <TabsTrigger value="t-test" className="gap-1.5">
            <TrendingUp className="size-3.5 shrink-0" />
            T-Test
          </TabsTrigger>
          <TabsTrigger value="z-test" className="gap-1.5">
            <Sigma className="size-3.5 shrink-0" />
            Z-Test
          </TabsTrigger>
          <TabsTrigger value="chi-square" className="gap-1.5">
            <BarChart3 className="size-3.5 shrink-0" />
            Chi-Square GoF
          </TabsTrigger>
          <TabsTrigger value="anova" className="gap-1.5">
            <FlaskConical className="size-3.5 shrink-0" />
            ANOVA + Levene
          </TabsTrigger>
        </TabsList>

        <TabsContent value="t-test">
          <TTestSection />
        </TabsContent>

        <TabsContent value="z-test">
          <ZTestSection />
        </TabsContent>

        <TabsContent value="chi-square">
          <ChiSquareGoFSection />
        </TabsContent>

        <TabsContent value="anova">
          <ANOVASsection />
        </TabsContent>
      </Tabs>
    </div>
  )
}
