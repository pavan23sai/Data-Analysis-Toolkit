'use client';

import { useState, useMemo } from 'react';
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
import {
  Dice3, TrendingUp, BarChart3, GitCompare, Info,
} from 'lucide-react';

import {
  binomialPlotData, binomialStats,
  bernoulliPlotData, bernoulliStats,
  poissonPlotData, poissonStats,
  normalPlotData, normalStats,
  exponentialPlotData, exponentialStats,
  uniformPlotData, uniformStats,
  empiricalRuleData,
} from '@/lib/distributions';

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
};

// ==================== PARAMETER SLIDER HELPER ====================
function ParamSlider({
  label, value, min, max, step, onChange, symbol,
}: {
  label: string; value: number; min: number; max: number;
  step: number; onChange: (v: number) => void; symbol?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {symbol ? `${symbol} ` : ''}{label}
        </Label>
        <Badge variant="secondary" className="font-mono text-xs dark:bg-slate-800">
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
        <ParamSlider label="n (trials)" value={n} min={1} max={100} step={1} onChange={setN} symbol="n =" />
        <ParamSlider label="p (probability)" value={p} min={0} max={1} step={0.01} onChange={setP} symbol="p =" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PMF — P(X = k)</CardTitle>
            <CardDescription>Probability Mass Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (successes)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'P(X = k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                  <Bar dataKey="pmf" fill={COLORS.pmf} name="PMF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CDF — P(X ≤ k)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (successes)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X ≤ k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
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
      <ParamSlider label="p (probability of success)" value={p} min={0} max={1} step={0.01} onChange={setP} symbol="p =" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PMF — P(X = k)</CardTitle>
            <CardDescription>Probability Mass Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (outcome)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X = k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                  <Bar dataKey="pmf" fill={COLORS.pmf} name="PMF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CDF — P(X ≤ k)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (outcome)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X ≤ k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
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
      <ParamSlider label="λ (rate)" value={lambda} min={0.1} max={30} step={0.1} onChange={setLambda} symbol="λ =" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PMF — P(X = k)</CardTitle>
            <CardDescription>Probability Mass Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (events)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'P(X = k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                  <Bar dataKey="pmf" fill={COLORS.pmf} name="PMF" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CDF — P(X ≤ k)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k (events)', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'P(X ≤ k)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
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
        <ParamSlider label="μ (mean)" value={mu} min={-10} max={10} step={0.1} onChange={setMu} symbol="μ =" />
        <ParamSlider label="σ (std dev)" value={sigma} min={0.1} max={5} step={0.1} onChange={setSigma} symbol="σ =" />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm text-emerald-700 dark:text-emerald-400">
          For the Normal distribution: <strong>Mean = Median = Mode = {mu.toFixed(2)}</strong>
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PDF — f(x)</CardTitle>
            <CardDescription>Probability Density Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'f(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                  <ReferenceLine x={mu} stroke={COLORS.cdf} strokeDasharray="5 5" label={{ value: `μ=${mu}`, position: 'top', fill: COLORS.cdf, fontSize: 11 }} />
                  <Area type="monotone" dataKey="pdf" stroke={COLORS.pdf} fill={COLORS.pdfFill} strokeWidth={2} name="PDF" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CDF — F(x)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'F(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
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
      <ParamSlider label="λ (rate)" value={lambda} min={0.1} max={5} step={0.1} onChange={setLambda} symbol="λ =" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PDF — f(x)</CardTitle>
            <CardDescription>Probability Density Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'f(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                  <Area type="monotone" dataKey="pdf" stroke={COLORS.pdf} fill={COLORS.pdfFill} strokeWidth={2} name="PDF" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CDF — F(x)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'F(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
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
        <ParamSlider label="a (min)" value={a} min={-20} max={19} step={0.5} onChange={setA} symbol="a =" />
        <ParamSlider label="b (max)" value={b} min={a + 0.1} max={20} step={0.5} onChange={setB} symbol="b =" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">PDF — f(x)</CardTitle>
            <CardDescription>Probability Density Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'f(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                  <Area type="stepAfter" dataKey="pdf" stroke={COLORS.pdf} fill={COLORS.pdfFill} strokeWidth={2} name="PDF" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CDF — F(x)</CardTitle>
            <CardDescription>Cumulative Distribution Function</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis domain={[0, 1]} label={{ value: 'F(x)', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
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

  // Build the overlaid PDF with sigma bands
  const pdfWithBands = useMemo(() => {
    return plotData.map((d) => {
      const dist = Math.abs(d.x - mu);
      let band: string | null = null;
      if (dist <= 3 * sigma) band = '3σ';
      if (dist <= 2 * sigma) band = '2σ';
      if (dist <= 1 * sigma) band = '1σ';
      return { ...d, band };
    });
  }, [plotData, mu, sigma]);

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
        <ParamSlider label="μ (mean)" value={mu} min={-10} max={10} step={0.1} onChange={setMu} symbol="μ =" />
        <ParamSlider label="σ (std dev)" value={sigma} min={0.1} max={5} step={0.1} onChange={setSigma} symbol="σ =" />
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
        <Info className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <span className="text-sm text-emerald-700 dark:text-emerald-400">
          For the Normal distribution: <strong>Mean = Median = Mode = {mu.toFixed(2)}</strong>
        </span>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Empirical Rule — Visual Diagram</CardTitle>
          <CardDescription>Areas under the Normal curve at 1σ, 2σ, and 3σ from the mean</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80">
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
                <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
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
            <ParamSlider label="μ (mean)" value={config.params.mu ?? 0} min={-10} max={10} step={0.1} onChange={(v) => updateParam('mu', v)} symbol="μ =" />
            <ParamSlider label="σ (std dev)" value={config.params.sigma ?? 1} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('sigma', v)} symbol="σ =" />
          </>
        )}
        {config.type === 'exponential' && (
          <ParamSlider label="λ (rate)" value={config.params.lambda ?? 1} min={0.1} max={5} step={0.1} onChange={(v) => updateParam('lambda', v)} symbol="λ =" />
        )}
        {config.type === 'uniform' && (
          <>
            <ParamSlider label="a (min)" value={config.params.a ?? 0} min={-20} max={19} step={0.5} onChange={(v) => updateParam('a', v)} symbol="a =" />
            <ParamSlider label="b (max)" value={config.params.b ?? 10} min={(config.params.a ?? 0) + 0.1} max={20} step={0.5} onChange={(v) => updateParam('b', v)} symbol="b =" />
          </>
        )}
        {config.type === 'binomial' && (
          <>
            <ParamSlider label="n (trials)" value={config.params.n ?? 20} min={1} max={100} step={1} onChange={(v) => updateParam('n', v)} symbol="n =" />
            <ParamSlider label="p (probability)" value={config.params.p ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => updateParam('p', v)} symbol="p =" />
          </>
        )}
        {config.type === 'poisson' && (
          <ParamSlider label="λ (rate)" value={config.params.lambda ?? 5} min={0.1} max={30} step={0.1} onChange={(v) => updateParam('lambda', v)} symbol="λ =" />
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Side-by-Side Comparison — PMF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mergedDiscreteData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="k" label={{ value: 'k', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                  <YAxis label={{ value: 'Probability', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                  <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                  <Legend />
                  <Bar dataKey={DIST_LABELS[config1.type]} fill={COLORS.comp1} />
                  <Bar dataKey={DIST_LABELS[config2.type]} fill={COLORS.comp2} />
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
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overlay Comparison — PDF/PMF</CardTitle>
          <CardDescription>Both distributions plotted on the same axes for comparison</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mergedContinuousData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="x" label={{ value: 'x', position: 'insideBottom', offset: -2, style: { fontSize: 12 } }} />
                <YAxis label={{ value: 'Density / Probability', angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 12 } }} />
                <Tooltip formatter={(v: number) => v.toFixed(6)} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', fontSize: '12px', }} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey={DIST_LABELS[config1.type]}
                  stroke={COLORS.comp1}
                  fill={COLORS.comp1Fill}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey={DIST_LABELS[config2.type]}
                  stroke={COLORS.comp2}
                  fill={COLORS.comp2Fill}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      {statsRow}
    </div>
  );
}

// ==================== MAIN EXPORT ====================
export default function ProbabilityDistributions() {
  return (
    <section id="probability-distributions" className="space-y-8">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400">
          <BarChart3 className="h-5 w-5 shrink-0" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Section 3: Probability Distributions</h2>
          <p className="text-muted-foreground text-sm">
            Interactive exploration of discrete and continuous probability distributions
          </p>
        </div>
      </div>

      {/* Discrete Distributions */}
      <Card>
        <CardHeader>
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
            <TabsContent value="binomial">
              <BinomialDistribution />
            </TabsContent>
            <TabsContent value="bernoulli">
              <BernoulliDistribution />
            </TabsContent>
            <TabsContent value="poisson">
              <PoissonDistribution />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Continuous Distributions */}
      <Card>
        <CardHeader>
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
            <TabsContent value="normal">
              <NormalDistribution />
            </TabsContent>
            <TabsContent value="exponential">
              <ExponentialDistribution />
            </TabsContent>
            <TabsContent value="uniform">
              <UniformDistribution />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Empirical Rule */}
      <Card>
        <CardHeader>
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
      <Card>
        <CardHeader>
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
