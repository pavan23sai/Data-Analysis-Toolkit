'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  Search,
  AlertTriangle,
  Copy,
  Trash2,
  Droplets,
  BarChart3,
  TableProperties,
  FileWarning,
  CheckCircle2,
  XCircle,
  ArrowDown,
  ArrowUp,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDataset } from '@/hooks/useDataset';
import {
  analyzeMissingValues,
  findDuplicates,
  detectOutliersIQR,
  quartiles,
  mean,
  median,
  mode,
  min as statMin,
  max as statMax,
} from '@/lib/statistics';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';

export default function DataExploration() {
  const { dataset, setDataset, getNumericColumns, getColumnData } = useDataset();

  // ===== Missing Value Analysis =====
  const missingAnalysis = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return [];
    const columnData: Record<string, (string | number | null | undefined)[]> = {};
    dataset.headers.forEach((header, idx) => {
      columnData[header] = dataset.rows.map((row) => row[idx] ?? null);
    });
    return analyzeMissingValues(columnData);
  }, [dataset]);

  const totalMissing = useMemo(
    () => missingAnalysis.reduce((sum, col) => sum + col.missingCount, 0),
    [missingAnalysis]
  );

  // ===== Duplicate Analysis =====
  const duplicateResult = useMemo(() => {
    if (!dataset || dataset.rows.length === 0) return null;
    const rowsAsObjects: Record<string, string | number | null | undefined>[] =
      dataset.rows.map((row) => {
        const obj: Record<string, string | number | null | undefined> = {};
        dataset.headers.forEach((header, idx) => {
          obj[header] = row[idx] ?? null;
        });
        return obj;
      });
    return findDuplicates(rowsAsObjects);
  }, [dataset]);

  // ===== Data Cleaning =====
  const [cleaningMessage, setCleaningMessage] = useState<string | null>(null);

  const handleDropMissingRows = useCallback(() => {
    if (!dataset || dataset.rows.length === 0) return;
    const filtered = dataset.rows.filter((row) =>
      row.every((val) => val !== null && val !== undefined && val !== '')
    );
    const dropped = dataset.rows.length - filtered.length;
    setDataset({ ...dataset, rows: filtered, rawRows: filtered.map((row) => {
      const obj: Record<string, string | number | null> = {};
      dataset.headers.forEach((header, idx) => {
        obj[header] = row[idx] ?? null;
      });
      return obj;
    })});
    setCleaningMessage(`Dropped ${dropped} row(s) with missing values.`);
    setTimeout(() => setCleaningMessage(null), 3000);
  }, [dataset, setDataset]);

  const handleFillMissing = useCallback(
    (strategy: 'mean' | 'median' | 'mode') => {
      if (!dataset || dataset.rows.length === 0) return;
      const numericCols = getNumericColumns();
      const newRows = dataset.rows.map((row) => {
        return row.map((val, idx) => {
          const header = dataset.headers[idx];
          if (
            (val === null || val === undefined || val === '') &&
            numericCols.includes(header)
          ) {
            const colData = getColumnData(header);
            if (colData.length === 0) return val;
            switch (strategy) {
              case 'mean':
                return Number(mean(colData).toFixed(4));
              case 'median':
                return Number(median(colData).toFixed(4));
              case 'mode': {
                const modeVals = mode(colData);
                return modeVals.length > 0 ? modeVals[0] : val;
              }
            }
          }
          return val;
        });
      });
      let filledCount = 0;
      dataset.rows.forEach((row, rowIdx) => {
        row.forEach((val, colIdx) => {
          if (
            (val === null || val === undefined || val === '') &&
            numericCols.includes(dataset.headers[colIdx]) &&
            newRows[rowIdx][colIdx] !== val
          ) {
            filledCount++;
          }
        });
      });
      setDataset({ ...dataset, rows: newRows, rawRows: newRows.map((row) => {
        const obj: Record<string, string | number | null> = {};
        dataset.headers.forEach((header, idx) => {
          obj[header] = row[idx] ?? null;
        });
        return obj;
      })});
      setCleaningMessage(
        `Filled ${filledCount} missing value(s) with ${strategy}.`
      );
      setTimeout(() => setCleaningMessage(null), 3000);
    },
    [dataset, setDataset, getNumericColumns, getColumnData]
  );

  const handleRemoveDuplicates = useCallback(() => {
    if (!dataset || !duplicateResult || dataset.rows.length === 0) return;
    const indicesToRemove = new Set(duplicateResult.duplicateRowIndices);
    const filtered = dataset.rows.filter(
      (_, idx) => !indicesToRemove.has(idx)
    );
    const removed = dataset.rows.length - filtered.length;
    setDataset({ ...dataset, rows: filtered, rawRows: filtered.map((row) => {
      const obj: Record<string, string | number | null> = {};
      dataset.headers.forEach((header, idx) => {
        obj[header] = row[idx] ?? null;
      });
      return obj;
    })});
    setCleaningMessage(`Removed ${removed} duplicate row(s).`);
    setTimeout(() => setCleaningMessage(null), 3000);
  }, [dataset, setDataset, duplicateResult]);

  // ===== Outlier Detection =====
  const numericCols = getNumericColumns();
  const [selectedOutlierCol, setSelectedOutlierCol] = useState<string>('');

  const outlierResult = useMemo(() => {
    if (!selectedOutlierCol) return null;
    const colData = getColumnData(selectedOutlierCol);
    if (colData.length === 0) return null;
    const result = detectOutliersIQR(colData);
    const q = quartiles(colData);
    return {
      ...result,
      min: statMin(colData),
      max: statMax(colData),
      q1: q.q1,
      q2: q.q2,
      q3: q.q3,
    };
  }, [selectedOutlierCol, getColumnData]);

  // Boxplot data: use BarChart to simulate a boxplot with 5-number summary
  const boxplotData = useMemo(() => {
    if (!outlierResult) return [];
    const { min: dataMin, q1, q2, q3, max: dataMax, lowerBound, upperBound } = outlierResult;
    // We create segments that when stacked form the boxplot
    return [
      {
        name: 'Boxplot',
        // Segments from bottom to top
        whiskerLow: Math.max(dataMin, lowerBound) - Math.min(dataMin, lowerBound) > 0
          ? Math.max(dataMin, lowerBound) - dataMin
          : 0,
        q1Segment: q1 - Math.max(dataMin, lowerBound),
        median: q2 - q1,
        q3Segment: q3 - q2,
        whiskerHigh: dataMax - q3,
      },
    ];
  }, [outlierResult]);

  // Better approach: 5-number summary as individual bars for visualization
  const fiveNumberData = useMemo(() => {
    if (!outlierResult) return [];
    return [
      { label: 'Min', value: outlierResult.min, type: 'whisker' },
      { label: 'Q1', value: outlierResult.q1, type: 'box' },
      { label: 'Median', value: outlierResult.q2, type: 'median' },
      { label: 'Q3', value: outlierResult.q3, type: 'box' },
      { label: 'Max', value: outlierResult.max, type: 'whisker' },
    ];
  }, [outlierResult]);

  if (!dataset || dataset.rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <FileWarning className="size-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-sm">
            No dataset loaded. Upload a CSV file to explore data quality.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== 1. Missing Value Analysis ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Missing Value Analysis</CardTitle>
          </div>
          <CardDescription>
            Overview of missing data across all columns
            {totalMissing > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                {totalMissing} missing total
              </Badge>
            )}
            {totalMissing === 0 && (
              <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-800 border-emerald-200">
                No missing values
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Column</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Missing</TableHead>
                  <TableHead className="text-right">Missing %</TableHead>
                  <TableHead className="text-right">Present</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {missingAnalysis.map((col) => (
                  <TableRow key={col.column}>
                    <TableCell className="font-medium">{col.column}</TableCell>
                    <TableCell className="text-right">{col.totalCount}</TableCell>
                    <TableCell className="text-right">
                      {col.missingCount > 0 ? (
                        <span className="text-amber-600 font-medium">{col.missingCount}</span>
                      ) : (
                        <span>{col.missingCount}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {col.missingPercent > 0 ? (
                        <span className="text-amber-600 font-medium">
                          {col.missingPercent.toFixed(1)}%
                        </span>
                      ) : (
                        <span>0%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{col.presentCount}</TableCell>
                    <TableCell className="text-center">
                      {col.missingCount === 0 ? (
                        <CheckCircle2 className="size-4 text-emerald-500 inline-block" />
                      ) : col.missingPercent > 30 ? (
                        <XCircle className="size-4 text-red-500 inline-block" />
                      ) : (
                        <AlertTriangle className="size-4 text-amber-500 inline-block" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* ===== 2. Duplicate Analysis ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Copy className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Duplicate Analysis</CardTitle>
          </div>
          <CardDescription>
            Identify and quantify duplicate rows in your dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          {duplicateResult && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {dataset.rows.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {duplicateResult.duplicateCount}
                </p>
                <p className="text-sm text-muted-foreground">Duplicate Rows</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">
                  {duplicateResult.uniqueCount}
                </p>
                <p className="text-sm text-muted-foreground">Unique Rows</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== 3. Data Cleaning Options ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Droplets className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Data Cleaning</CardTitle>
          </div>
          <CardDescription>
            Clean your dataset by handling missing values and duplicates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Missing Value Handling */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Handle Missing Values
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDropMissingRows}
                  disabled={totalMissing === 0}
                  className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                >
                  <Trash2 className="size-3.5 mr-1" />
                  Drop Rows with Missing
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFillMissing('mean')}
                  disabled={totalMissing === 0}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Fill with Mean
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFillMissing('median')}
                  disabled={totalMissing === 0}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Fill with Median
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFillMissing('mode')}
                  disabled={totalMissing === 0}
                  className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                >
                  Fill with Mode
                </Button>
              </div>
            </div>

            {/* Duplicate Handling */}
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Handle Duplicates
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveDuplicates}
                disabled={!duplicateResult || duplicateResult.duplicateCount === 0}
                className="border-amber-200 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              >
                <Trash2 className="size-3.5 mr-1" />
                Remove Duplicate Rows
              </Button>
            </div>

            {/* Cleaning Message */}
            {cleaningMessage && (
              <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                <CheckCircle2 className="size-4 shrink-0" />
                {cleaningMessage}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ===== 4. Outlier Detection (IQR) ===== */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="size-5 text-emerald-600" />
            <CardTitle className="text-lg">Outlier Detection (IQR)</CardTitle>
          </div>
          <CardDescription>
            Select a numeric column to detect outliers using the Interquartile Range method
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Column Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                Numeric Column:
              </label>
              <Select
                value={selectedOutlierCol}
                onValueChange={setSelectedOutlierCol}
              >
                <SelectTrigger className="w-60">
                  <SelectValue placeholder="Select a column..." />
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

            {outlierResult && (
              <>
                {/* IQR Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Lower Bound</p>
                    <p className="text-lg font-bold text-amber-600">
                      {outlierResult.lowerBound.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Upper Bound</p>
                    <p className="text-lg font-bold text-amber-600">
                      {outlierResult.upperBound.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">IQR</p>
                    <p className="text-lg font-bold text-foreground">
                      {(outlierResult.q3 - outlierResult.q1).toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-1">Outliers Found</p>
                    <p className={`text-lg font-bold ${outlierResult.outliers.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {outlierResult.outliers.length}
                    </p>
                  </div>
                </div>

                {/* Five-Number Summary */}
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                    <TableProperties className="size-4" />
                    Five-Number Summary
                  </h4>
                  <div className="flex items-center justify-between text-sm">
                    <div className="text-center">
                      <p className="font-bold text-foreground">{outlierResult.min.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Min</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90" />
                    <div className="text-center">
                      <p className="font-bold text-foreground">{outlierResult.q1.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Q1</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90" />
                    <div className="text-center">
                      <p className="font-bold text-emerald-600">{outlierResult.q2.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Median</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90" />
                    <div className="text-center">
                      <p className="font-bold text-foreground">{outlierResult.q3.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Q3</p>
                    </div>
                    <ArrowUp className="size-3 text-muted-foreground rotate-90" />
                    <div className="text-center">
                      <p className="font-bold text-foreground">{outlierResult.max.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Max</p>
                    </div>
                  </div>
                </div>

                {/* Boxplot Visualization using BarChart */}
                <div className="rounded-lg border p-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
                    <BarChart3 className="size-4" />
                    Boxplot Visualization
                  </h4>
                  <div className="h-64">
                    <BarChart
                      data={fiveNumberData}
                      margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        width={60}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [value.toFixed(4), 'Value']}
                        contentStyle={{
                          borderRadius: '8px',
                          fontSize: '12px',
                          border: '1px solid hsl(var(--border))',
                        }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 4, 4]} barSize={36}>
                        {fiveNumberData.map((entry, index) => {
                          let fill = '#10b981'; // emerald-500
                          if (entry.type === 'whisker') fill = '#6ee7b7'; // emerald-300
                          if (entry.type === 'median') fill = '#f59e0b'; // amber-500
                          if (entry.type === 'box') fill = '#34d399'; // emerald-400
                          return <Cell key={index} fill={fill} />;
                        })}
                      </Bar>
                      {outlierResult.lowerBound !== -Infinity && (
                        <ReferenceLine
                          x={outlierResult.lowerBound}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          label={{
                            value: 'Lower',
                            position: 'top',
                            fill: '#f59e0b',
                            fontSize: 10,
                          }}
                        />
                      )}
                      {outlierResult.upperBound !== Infinity && (
                        <ReferenceLine
                          x={outlierResult.upperBound}
                          stroke="#f59e0b"
                          strokeDasharray="4 4"
                          label={{
                            value: 'Upper',
                            position: 'top',
                            fill: '#f59e0b',
                            fontSize: 10,
                          }}
                        />
                      )}
                    </BarChart>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-sm bg-emerald-300" />
                      Whiskers (Min/Max)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-sm bg-emerald-400" />
                      Quartiles (Q1/Q3)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-3 rounded-sm bg-amber-500" />
                      Median (Q2)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 border-t-2 border-dashed border-amber-500" />
                      IQR Bounds
                    </div>
                  </div>
                </div>

                {/* Outlier Values List */}
                {outlierResult.outliers.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50/50 p-4">
                    <h4 className="text-sm font-medium text-red-800 mb-2 flex items-center gap-1.5">
                      <AlertTriangle className="size-4" />
                      Outlier Values ({outlierResult.outliers.length} detected)
                    </h4>
                    <ScrollArea className="max-h-40">
                      <div className="flex flex-wrap gap-2">
                        {outlierResult.outliers.map((val, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className="border-red-300 text-red-700 bg-red-50"
                          >
                            Row {outlierResult.indices[idx] + 1}: {typeof val === 'number' ? val.toFixed(4) : val}
                          </Badge>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {outlierResult.outliers.length === 0 && (
                  <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="size-4 shrink-0" />
                    No outliers detected in this column.
                  </div>
                )}
              </>
            )}

            {!selectedOutlierCol && numericCols.length > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-4 text-sm text-muted-foreground justify-center">
                <Info className="size-4 shrink-0" />
                Select a numeric column to detect outliers
              </div>
            )}

            {numericCols.length === 0 && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 border px-3 py-4 text-sm text-muted-foreground justify-center">
                <Info className="size-4 shrink-0" />
                No numeric columns available for outlier detection
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
