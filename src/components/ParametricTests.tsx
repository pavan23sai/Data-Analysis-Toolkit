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
  FlaskConical,
  CheckCircle2,
  XCircle,
  Calculator,
  BarChart3,
  Sigma,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react'

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
        <XCircle className="size-3 mr-1" />
      ) : (
        <CheckCircle2 className="size-3 mr-1" />
      )}
      {significant ? 'Significant' : 'Not Significant'}
    </Badge>
  )
}

// ==================== Conclusion Box ====================
function ConclusionBox({ conclusion, pValue }: { conclusion: string; pValue: number }) {
  const significant = pValue <= 0.05
  return (
    <div
      className={`mt-4 p-4 rounded-lg border ${
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
        </div>
      </div>
    </div>
  )
}

// ==================== One-Sample T-Test ====================
function OneSampleTTestPanel() {
  const { getNumericColumns, getColumnData } = useDataset()
  const numericCols = getNumericColumns()
  const [selectedCol, setSelectedCol] = useState('')
  const [mu0, setMu0] = useState('0')
  const [result, setResult] = useState<ReturnType<typeof oneSampleTTest> | null>(null)
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
    if (isNaN(mu0Val)) {
      setError('Please enter a valid μ₀ value.')
      return
    }
    setResult(oneSampleTTest(data, mu0Val))
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-200 dark:border-emerald-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" />
            One-Sample T-Test
          </CardTitle>
          <CardDescription>
            Test whether the mean of a single column differs from a hypothesized value μ₀
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
              <Calculator className="size-4 mr-1" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Results <ResultBadge pValue={result.pValue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">t-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{result.tStat}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                  <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Degrees of Freedom</TableCell>
                  <TableCell className="text-right font-mono">{result.df}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={result.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} />
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
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setResult(null)
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
    setResult(twoSampleTTest(data1, data2, equalVar))
  }

  return (
    <div className="space-y-4">
      <Card className="border-amber-200 dark:border-amber-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="size-4 text-amber-600" />
            Two-Sample T-Test (Independent)
          </CardTitle>
          <CardDescription>
            Compare the means of two independent groups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
            <div className="space-y-2">
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
              <Calculator className="size-4 mr-1" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Results <ResultBadge pValue={result.pValue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">t-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{result.tStat}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                  <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Degrees of Freedom</TableCell>
                  <TableCell className="text-right font-mono">{result.df}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Variance Assumption</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{equalVar ? 'Equal Variance' : "Welch's (Unequal)"}</Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={result.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} />
          </CardContent>
        </Card>
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
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setResult(null)
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
    setResult(pairedTTest(data1.slice(0, minLen), data2.slice(0, minLen)))
  }

  return (
    <div className="space-y-4">
      <Card className="border-teal-200 dark:border-teal-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sigma className="size-4 text-teal-600" />
            Paired T-Test
          </CardTitle>
          <CardDescription>
            Compare means from the same group at different times or under different conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
              <Calculator className="size-4 mr-1" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Results <ResultBadge pValue={result.pValue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">t-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{result.tStat}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                  <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Degrees of Freedom</TableCell>
                  <TableCell className="text-right font-mono">{result.df}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Mean Difference</TableCell>
                  <TableCell className="text-right font-mono">{result.meanDiff}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={result.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} />
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
            <Sigma className="size-4 text-orange-600" />
            One-Sample Z-Test
          </CardTitle>
          <CardDescription>
            Test the mean against a known value when the population standard deviation is known
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label className="text-sm font-medium">μ₀ (Hypothesized Mean)</Label>
              <Input
                type="number"
                value={mu0}
                onChange={(e) => setMu0(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
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
              <Calculator className="size-4 mr-1" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Results <ResultBadge pValue={result.pValue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">z-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{result.zStat}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">p-Value (two-tailed)</TableCell>
                  <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={result.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
            <BarChart3 className="size-4 text-rose-600" />
            Chi-Square Goodness of Fit Test
          </CardTitle>
          <CardDescription>
            Test whether observed categorical frequencies match expected uniform distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
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
              <Calculator className="size-4 mr-1" />
              Run Test
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4" />
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
                    <TableRow key={i}>
                      <TableCell className="font-medium">{String(row.category)}</TableCell>
                      <TableCell className="text-right font-mono">{row.observed}</TableCell>
                      <TableCell className="text-right font-mono">{row.expected}</TableCell>
                      <TableCell className="text-right font-mono">{row.contribution}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                Test Results <ResultBadge pValue={result.pValue} />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Statistic</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Chi-Square Statistic</TableCell>
                    <TableCell className="text-right font-mono">{result.chiStat}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">p-Value</TableCell>
                    <TableCell className="text-right font-mono">{result.pValue}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Degrees of Freedom</TableCell>
                    <TableCell className="text-right font-mono">{result.df}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                    <TableCell className="text-right">
                      <ResultBadge pValue={result.pValue} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <ConclusionBox conclusion={result.conclusion} pValue={result.pValue} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ==================== ANOVA + Levene Section ====================
function ANOVASsection() {
  const { getNumericColumns, getCategoricalColumns, getColumnData, getCategoricalData } =
    useDataset()
  const numericCols = getNumericColumns()
  const categoricalCols = getCategoricalColumns()
  const [numCol, setNumCol] = useState('')
  const [grpCol, setGrpCol] = useState('')
  const [anovaResult, setAnovaResult] = useState<ReturnType<typeof oneWayANOVA> | null>(null)
  const [leveneResult, setLeveneResult] = useState<ReturnType<typeof leveneTest> | null>(null)
  const [error, setError] = useState('')

  const handleRun = () => {
    setError('')
    setAnovaResult(null)
    setLeveneResult(null)
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
            <BarChart3 className="size-4 text-violet-600" />
            One-Way ANOVA + Levene&apos;s Test
          </CardTitle>
          <CardDescription>
            Compare means across multiple groups (ANOVA) and test for equal variances (Levene)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
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
            <div className="space-y-2">
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
              <Calculator className="size-4 mr-1" />
              Run Tests
            </Button>
          </div>
          {error && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <AlertTriangle className="size-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {anovaResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              One-Way ANOVA Results <ResultBadge pValue={anovaResult.pValue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Group Means */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Group Means</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Group</TableHead>
                      <TableHead className="text-right">Mean</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {anovaResult.groupMeans.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">
                          {groupNames[i] || `Group ${i + 1}`}
                        </TableCell>
                        <TableCell className="text-right font-mono">{m}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* ANOVA Table */}
              <div>
                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">
                  ANOVA Summary Table
                </h4>
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
                    <TableRow>
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
                    <TableRow>
                      <TableCell className="font-medium">Within Groups</TableCell>
                      <TableCell className="text-right font-mono">{anovaResult.ssWithin}</TableCell>
                      <TableCell className="text-right font-mono">{anovaResult.dfWithin}</TableCell>
                      <TableCell className="text-right font-mono">{anovaResult.msWithin}</TableCell>
                    </TableRow>
                    <TableRow>
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
            <ConclusionBox conclusion={anovaResult.conclusion} pValue={anovaResult.pValue} />
          </CardContent>
        </Card>
      )}

      {leveneResult && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              Levene&apos;s Test (Equality of Variances){' '}
              <ResultBadge pValue={leveneResult.pValue} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statistic</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">F-Statistic</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.fStat}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">p-Value</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.pValue}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">df₁ (Between)</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.df1}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">df₂ (Within)</TableCell>
                  <TableCell className="text-right font-mono">{leveneResult.df2}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Significance (α = 0.05)</TableCell>
                  <TableCell className="text-right">
                    <ResultBadge pValue={leveneResult.pValue} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
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
          <FlaskConical className="size-5 text-emerald-600 dark:text-emerald-400" />
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
            <TrendingUp className="size-3.5" />
            T-Test
          </TabsTrigger>
          <TabsTrigger value="z-test" className="gap-1.5">
            <Sigma className="size-3.5" />
            Z-Test
          </TabsTrigger>
          <TabsTrigger value="chi-square" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            Chi-Square GoF
          </TabsTrigger>
          <TabsTrigger value="anova" className="gap-1.5">
            <FlaskConical className="size-3.5" />
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
