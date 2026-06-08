'use client'

import { useState, useCallback } from 'react'
import { useDataset } from '@/hooks/useDataset'
import {
  mannWhitneyUTest,
  wilcoxonTest,
  kruskalWallisTest,
  friedmanTest,
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
  GitCompareArrows,
  ArrowLeftRight,
  BarChart3,
  Repeat,
  Info,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react'

type TestMode = 'mann-whitney' | 'wilcoxon' | 'kruskal-wallis' | 'friedman'

interface TestResult {
  testName: string
  statistic: number
  statisticLabel: string
  pValue: number
  df?: number
  conclusion: string
  significant: boolean
}

export default function NonParametricTests() {
  const { dataset, getNumericColumns, getColumnData, getCategoricalColumns, getCategoricalData } = useDataset()

  const [activeTest, setActiveTest] = useState<TestMode>('mann-whitney')

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

  const runMannWhitney = useCallback(() => {
    setError(null)
    try {
      let group1: number[]
      let group2: number[]

      if (mwMode === 'columns') {
        if (!mwCol1 || !mwCol2) {
          setError('Please select two numeric columns for the Mann-Whitney U Test.')
          return
        }
        group1 = getColumnData(mwCol1)
        group2 = getColumnData(mwCol2)
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
      }

      if (group1.length < 2 || group2.length < 2) {
        setError('Each group must have at least 2 data points.')
        return
      }

      const result = mannWhitneyUTest(group1, group2)
      setResults([
        {
          testName: 'Mann-Whitney U Test',
          statistic: result.uStat,
          statisticLabel: 'U',
          pValue: result.pValue,
          conclusion: result.conclusion,
          significant: result.pValue <= 0.05,
        },
      ])
    } catch (e) {
      setError(`Mann-Whitney U Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [mwMode, mwCol1, mwCol2, mwNumCol, mwGroupCol, getColumnData, getCategoricalData, getUniqueGroups])

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
      setResults([
        {
          testName: 'Wilcoxon Signed-Rank Test',
          statistic: result.wStat,
          statisticLabel: 'W',
          pValue: result.pValue,
          conclusion: result.conclusion,
          significant: result.pValue <= 0.05,
        },
      ])
    } catch (e) {
      setError(`Wilcoxon Signed-Rank Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [wilCol1, wilCol2, getColumnData])

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
      setResults([
        {
          testName: 'Kruskal-Wallis Test',
          statistic: result.hStat,
          statisticLabel: 'H',
          pValue: result.pValue,
          df: result.df,
          conclusion: result.conclusion,
          significant: result.pValue <= 0.05,
        },
      ])
    } catch (e) {
      setError(`Kruskal-Wallis Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [kwNumCol, kwGroupCol, getColumnData, getCategoricalData, getUniqueGroups])

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
      setResults([
        {
          testName: 'Friedman Test',
          statistic: result.chiStat,
          statisticLabel: 'χ²',
          pValue: result.pValue,
          df: result.df,
          conclusion: result.conclusion,
          significant: result.pValue <= 0.05,
        },
      ])
    } catch (e) {
      setError(`Friedman Test failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
    }
  }, [friedmanCols, getColumnData])

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
        <CardHeader>
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
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {testCards.map((test) => {
          const isActive = activeTest === test.id
          return (
            <button
              key={test.id}
              onClick={() => {
                setActiveTest(test.id)
                setResults([])
                setError(null)
              }}
              className={`text-left rounded-xl border p-4 transition-all duration-200 cursor-pointer ${
                isActive
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/30 ring-2 ring-teal-500/20 shadow-sm'
                  : 'border-border bg-card hover:border-teal-300 dark:hover:border-teal-700 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={test.color}>{test.icon}</span>
                <span className="font-semibold text-sm">{test.title}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">{test.description}</p>
              <Badge
                variant="outline"
                className="text-[10px] font-normal"
              >
                {test.note}
              </Badge>
            </button>
          )
        })}
      </div>

      {/* Test Configuration */}
      <Card>
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
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Play className="size-4 shrink-0" />
              Run Test
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
              Test Results
            </CardTitle>
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
                  <TableHead>Conclusion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium truncate max-w-[200px]">{result.testName}</TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm">
                        {result.statisticLabel} = {result.statistic}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={result.significant ? 'destructive' : 'secondary'}
                        className="font-mono text-xs"
                      >
                        {result.pValue}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {result.df !== undefined ? (
                        <span className="font-mono text-sm">{result.df}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
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
          </CardContent>
        </Card>
      )}

      {/* When to Use Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
            When to Use Non-parametric Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border p-4 space-y-2 min-w-0">
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
            <div className="rounded-lg border p-4 space-y-2 min-w-0">
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
            <div className="rounded-lg border p-4 space-y-2 min-w-0">
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
            <div className="rounded-lg border p-4 space-y-2 min-w-0">
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
