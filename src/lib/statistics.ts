// Comprehensive Statistics Library for Data Analysis Toolkit

// ==================== BASIC STATISTICS ====================

export function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, val) => sum + val, 0) / data.length;
}

export function median(data: number[]): number {
  if (data.length === 0) return 0;
  const sorted = [...data].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function mode(data: number[]): number[] {
  if (data.length === 0) return [];
  const freq = new Map<number, number>();
  data.forEach(val => freq.set(val, (freq.get(val) || 0) + 1));
  const maxFreq = Math.max(...freq.values());
  if (maxFreq === 1) return []; // no mode
  return [...freq.entries()].filter(([, f]) => f === maxFreq).map(([v]) => v);
}

export function variance(data: number[], population = false): number {
  if (data.length < 2) return 0;
  const m = mean(data);
  const n = population ? data.length : data.length - 1;
  return data.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / n;
}

export function standardDeviation(data: number[], population = false): number {
  return Math.sqrt(variance(data, population));
}

export function quartiles(data: number[]): { q1: number; q2: number; q3: number } {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  
  const percentile = (arr: number[], p: number): number => {
    const index = p * (arr.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return arr[lower];
    return arr[lower] + (index - lower) * (arr[upper] - arr[lower]);
  };

  return {
    q1: percentile(sorted, 0.25),
    q2: percentile(sorted, 0.5),
    q3: percentile(sorted, 0.75),
  };
}

export function iqr(data: number[]): number {
  const { q1, q3 } = quartiles(data);
  return q3 - q1;
}

export function skewness(data: number[]): number {
  if (data.length < 3) return 0;
  const n = data.length;
  const m = mean(data);
  const s = standardDeviation(data, true);
  if (s === 0) return 0;
  const m3 = data.reduce((sum, val) => sum + Math.pow((val - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * m3;
}

export function kurtosis(data: number[]): number {
  if (data.length < 4) return 0;
  const n = data.length;
  const m = mean(data);
  const s = standardDeviation(data, true);
  if (s === 0) return 0;
  const m4 = data.reduce((sum, val) => sum + Math.pow((val - m) / s, 4), 0);
  const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  return k; // excess kurtosis
}

export function min(data: number[]): number {
  return Math.min(...data);
}

export function max(data: number[]): number {
  return Math.max(...data);
}

export function range(data: number[]): number {
  return max(data) - min(data);
}

export function sum(data: number[]): number {
  return data.reduce((s, v) => s + v, 0);
}

export function count(data: number[]): number {
  return data.length;
}

// ==================== OUTLIER DETECTION ====================

export function detectOutliersIQR(data: number[]): { outliers: number[]; lowerBound: number; upperBound: number; indices: number[] } {
  const { q1, q3 } = quartiles(data);
  const iqrVal = q3 - q1;
  const lowerBound = q1 - 1.5 * iqrVal;
  const upperBound = q3 + 1.5 * iqrVal;
  const outliers: number[] = [];
  const indices: number[] = [];
  data.forEach((val, idx) => {
    if (val < lowerBound || val > upperBound) {
      outliers.push(val);
      indices.push(idx);
    }
  });
  return { outliers, lowerBound, upperBound, indices };
}

// ==================== MISSING VALUE ANALYSIS ====================

export function analyzeMissingValues(data: Record<string, (string | number | null | undefined)[]>): {
  column: string;
  totalCount: number;
  missingCount: number;
  missingPercent: number;
  presentCount: number;
}[] {
  return Object.entries(data).map(([col, values]) => {
    const totalCount = values.length;
    const missingCount = values.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length;
    return {
      column: col,
      totalCount,
      missingCount,
      missingPercent: (missingCount / totalCount) * 100,
      presentCount: totalCount - missingCount,
    };
  });
}

// ==================== DUPLICATE ANALYSIS ====================

export function findDuplicates(data: Record<string, (string | number | null | undefined)>[]): {
  duplicateCount: number;
  duplicateRowIndices: number[];
  uniqueCount: number;
} {
  const seen = new Map<string, number[]>();
  data.forEach((row, idx) => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) seen.set(key, []);
    seen.get(key)!.push(idx);
  });
  const duplicateRowIndices: number[] = [];
  seen.forEach(indices => {
    if (indices.length > 1) {
      indices.slice(1).forEach(i => duplicateRowIndices.push(i));
    }
  });
  return {
    duplicateCount: duplicateRowIndices.length,
    duplicateRowIndices,
    uniqueCount: data.length - duplicateRowIndices.length,
  };
}

// ==================== HISTOGRAM DATA ====================

export function histogramData(data: number[], bins?: number): { binStart: number; binEnd: number; frequency: number; midpoint: number }[] {
  if (data.length === 0) return [];
  const numBins = bins || Math.max(Math.ceil(Math.sqrt(data.length)), 5);
  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const binWidth = (maxVal - minVal) / numBins || 1;
  
  const result = [];
  for (let i = 0; i < numBins; i++) {
    const binStart = minVal + i * binWidth;
    const binEnd = binStart + binWidth;
    const frequency = data.filter(v => 
      i === numBins - 1 ? (v >= binStart && v <= binEnd) : (v >= binStart && v < binEnd)
    ).length;
    result.push({
      binStart: Math.round(binStart * 1000) / 1000,
      binEnd: Math.round(binEnd * 1000) / 1000,
      frequency,
      midpoint: Math.round(((binStart + binEnd) / 2) * 1000) / 1000,
    });
  }
  return result;
}

// ==================== CORRELATION ====================

export function correlation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

export function covariance(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let cov = 0;
  for (let i = 0; i < n; i++) {
    cov += (x[i] - mx) * (y[i] - my);
  }
  return cov / (n - 1);
}

// ==================== SUMMARY TABLE ====================

export interface ColumnSummary {
  name: string;
  count: number;
  missing: number;
  mean: number;
  median: number;
  mode: number[];
  stdDev: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
}

export function computeColumnSummary(name: string, data: number[]): ColumnSummary {
  const validData = data.filter(v => !isNaN(v) && v !== null && v !== undefined);
  const { q1, q2, q3 } = quartiles(validData);
  return {
    name,
    count: validData.length,
    missing: data.length - validData.length,
    mean: mean(validData),
    median: q2,
    mode: mode(validData),
    stdDev: standardDeviation(validData),
    variance: variance(validData),
    min: min(validData),
    max: max(validData),
    range: range(validData),
    q1,
    q3,
    iqr: q3 - q1,
    skewness: skewness(validData),
    kurtosis: kurtosis(validData),
  };
}

// ==================== CONFIDENCE INTERVALS ====================

export function confidenceIntervalMean(data: number[], confidence: number = 0.95): {
  mean: number;
  lower: number;
  upper: number;
  marginOfError: number;
  standardError: number;
} {
  const n = data.length;
  const m = mean(data);
  const se = standardDeviation(data) / Math.sqrt(n);
  const z = normalInvCDF((1 + confidence) / 2);
  const margin = z * se;
  return {
    mean: m,
    lower: m - margin,
    upper: m + margin,
    marginOfError: margin,
    standardError: se,
  };
}

// ==================== NORMAL DISTRIBUTION HELPERS ====================

// Standard normal PDF
export function normalPDF(x: number, mu: number = 0, sigma: number = 1): number {
  const z = (x - mu) / sigma;
  return (1 / (sigma * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
}

// Standard normal CDF (using error function approximation)
export function normalCDF(x: number, mu: number = 0, sigma: number = 1): number {
  const z = (x - mu) / sigma;
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

// Inverse normal CDF (quantile function) - Beasley-Springer-Moro algorithm
export function normalInvCDF(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  // Rational approximation
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
}

// Error function approximation
export function erf(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return sign * y;
}

// ==================== GAMMA FUNCTION (for distributions) ====================

// Lanczos approximation for log-gamma
export function lnGamma(z: number): number {
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - lnGamma(1 - z);
  }
  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
  ];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function gamma(z: number): number {
  return Math.exp(lnGamma(z));
}

// Beta function
export function beta(a: number, b: number): number {
  return Math.exp(lnGamma(a) + lnGamma(b) - lnGamma(a + b));
}

// Regularized incomplete beta function (for t-distribution, F-distribution, etc.)
export function incompleteBeta(x: number, a: number, b: number): number {
  if (x === 0 || x === 1) return x;
  
  // Use the continued fraction representation
  const lnPrefix = lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x);
  
  if (x < (a + 1) / (a + b + 2)) {
    // Continued fraction directly
    return Math.exp(lnPrefix) * betaCF(x, a, b) / a;
  } else {
    // Use symmetry
    return 1 - Math.exp(lnPrefix) * betaCF(1 - x, b, a) / b;
  }
}

// Continued fraction for incomplete beta
function betaCF(x: number, a: number, b: number): number {
  const maxIter = 200;
  const eps = 1e-10;
  
  let qab = a + b;
  let qap = a + 1;
  let qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    
    // Even step
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    
    // Odd step
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < eps) break;
  }
  
  return h;
}

// ==================== T-DISTRIBUTION ====================

export function tPDF(t: number, df: number): number {
  return (gamma((df + 1) / 2) / (Math.sqrt(df * Math.PI) * gamma(df / 2))) *
    Math.pow(1 + t * t / df, -(df + 1) / 2);
}

export function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

// ==================== CHI-SQUARE DISTRIBUTION ====================

export function chiSquarePDF(x: number, k: number): number {
  if (x <= 0) return 0;
  return (Math.pow(x, k / 2 - 1) * Math.exp(-x / 2)) / (Math.pow(2, k / 2) * gamma(k / 2));
}

export function chiSquareCDF(x: number, k: number): number {
  if (x <= 0) return 0;
  return incompleteGamma(x / 2, k / 2);
}

// Lower incomplete gamma function (regularized)
export function incompleteGamma(x: number, a: number): number {
  if (x < a + 1) {
    return gammaSeries(a, x);
  }
  return 1 - gammaCF(a, x);
}

function gammaSeries(a: number, x: number): number {
  const maxIter = 200;
  const eps = 1e-10;
  
  if (x === 0) return 0;
  
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  
  for (let n = 1; n <= maxIter; n++) {
    ap += 1;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * eps) break;
  }
  
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

function gammaCF(a: number, x: number): number {
  const maxIter = 200;
  const eps = 1e-10;
  
  let b = x + 1 - a;
  let c = 1 / 1e-30;
  let d = 1 / b;
  let h = d;
  
  for (let i = 1; i <= maxIter; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

// ==================== F-DISTRIBUTION ====================

export function fPDF(x: number, d1: number, d2: number): number {
  if (x <= 0) return 0;
  const num = gamma((d1 + d2) / 2) * Math.pow(d1 / d2, d1 / 2) * Math.pow(x, d1 / 2 - 1);
  const den = gamma(d1 / 2) * gamma(d2 / 2) * Math.pow(1 + (d1 * x) / d2, (d1 + d2) / 2);
  return num / den;
}

export function fCDF(x: number, d1: number, d2: number): number {
  return incompleteBeta((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2);
}

// ==================== Z-SCORE ====================

export function zScore(x: number, mu: number, sigma: number): number {
  return (x - mu) / sigma;
}

// ==================== EMPIRICAL RULE ====================

export function empiricalRule(data: number[]): {
  within1SD: number; within2SD: number; within3SD: number;
  percent1SD: number; percent2SD: number; percent3SD: number;
} {
  const m = mean(data);
  const sd = standardDeviation(data);
  const n = data.length;
  
  const within1SD = data.filter(v => Math.abs(v - m) <= sd).length;
  const within2SD = data.filter(v => Math.abs(v - m) <= 2 * sd).length;
  const within3SD = data.filter(v => Math.abs(v - m) <= 3 * sd).length;
  
  return {
    within1SD, within2SD, within3SD,
    percent1SD: (within1SD / n) * 100,
    percent2SD: (within2SD / n) * 100,
    percent3SD: (within3SD / n) * 100,
  };
}

// ==================== BOOTSTRAP / CLT ====================

export function cltSimulation(data: number[], sampleSize: number = 30, numSamples: number = 1000): number[] {
  const sampleMeans: number[] = [];
  for (let i = 0; i < numSamples; i++) {
    const sample: number[] = [];
    for (let j = 0; j < sampleSize; j++) {
      const idx = Math.floor(Math.random() * data.length);
      sample.push(data[idx]);
    }
    sampleMeans.push(mean(sample));
  }
  return sampleMeans;
}

// ==================== NORMALITY TESTS ====================

// Shapiro-Wilk Test (simplified for practical use)
export function shapiroWilkTest(data: number[]): { statistic: number; pValue: number; conclusion: string } {
  const n = data.length;
  if (n < 3 || n > 5000) {
    return { statistic: NaN, pValue: NaN, conclusion: 'Sample size must be between 3 and 5000' };
  }
  
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(sorted);
  
  // Compute coefficients
  const a = shapiroWilkCoefficients(n);
  if (!a) {
    return { statistic: NaN, pValue: NaN, conclusion: 'Coefficients not available for this sample size' };
  }
  
  // Compute W statistic
  let numerator = 0;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    numerator += a[i] * (sorted[n - 1 - i] - sorted[i]);
  }
  
  const denominator = sorted.reduce((sum, val) => sum + Math.pow(val - m, 2), 0);
  
  if (denominator === 0) return { statistic: 1, pValue: 1, conclusion: 'All values are identical' };
  
  const W = Math.min(1, (numerator * numerator) / denominator);
  
  // Approximate p-value using Royston's method
  const pValue = shapiroWilkPValue(W, n);
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: Data appears to be normally distributed (p > 0.05)' 
    : 'Reject H₀: Data does not appear to be normally distributed (p ≤ 0.05)';
  
  return { statistic: Math.round(W * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, conclusion };
}

function shapiroWilkCoefficients(n: number): number[] | null {
  // Compute expected normal order statistics (Blom's approximation)
  const m = Math.floor(n / 2);
  const a: number[] = [];
  
  // Use Blom's formula: m_i = Φ^{-1}((i - 3/8) / (n + 1/4))
  const mValues: number[] = [];
  for (let i = 1; i <= n; i++) {
    mValues.push(normalInvCDF((i - 0.375) / (n + 0.25)));
  }
  
  // Compute the vector a = m^T V^{-1} / (m^T V^{-1} V^{-1} m)^{1/2}
  // Simplification: use the approximation a_i ≈ m_{n-i+1} - m_i normalized
  // with proper sign handling based on Royston (1992)
  for (let i = 1; i <= m; i++) {
    // a_i = c_i where c = (m_{n-i+1} - m_i) normalized
    a.push((mValues[n - i] - mValues[i - 1]));
  }
  
  // Normalize so that sum(a_i^2) = 1
  const sumSq = a.reduce((s, v) => s + v * v, 0);
  if (sumSq === 0) return null;
  const norm = Math.sqrt(sumSq);
  for (let i = 0; i < a.length; i++) {
    a[i] /= norm;
  }
  
  return a;
}

function shapiroWilkPValue(W: number, n: number): number {
  // Royston's approximation (1992) for the Shapiro-Wilk p-value
  // If W is very close to 1, data is clearly normal - fail to reject
  if (W >= 0.999) return 0.999;

  if (n < 4) {
    // For n=3, use exact distribution
    const pi6 = 6 / Math.PI;
    const stqr = -1.0275; // adjusted for Blom's formula
    const w = Math.max(0, Math.min(1, W));
    if (w >= 0.9999) return 0.9999;
    return Math.max(0.0001, 1 - normalCDF((Math.log(1 - w) + 1.077) / 0.378));
  }
  
  const logn = Math.log(n);
  let mu: number, sigma: number;
  
  if (n <= 11) {
    // Royston's polynomial approximation for small n
    mu = -0.0006714 * Math.pow(logn, 3) + 0.025054 * Math.pow(logn, 2) - 0.39978 * logn + 0.5440;
    sigma = Math.exp(-0.0020322 * Math.pow(logn, 3) + 0.062767 * Math.pow(logn, 2) - 0.77857 * logn + 1.3822);
  } else if (n <= 500) {
    // Royston's approximation for medium n
    mu = 0.0038915 * Math.pow(logn, 3) - 0.083751 * Math.pow(logn, 2) - 0.31082 * logn - 1.5861;
    sigma = Math.exp(0.0030302 * Math.pow(logn, 3) - 0.082676 * Math.pow(logn, 2) - 0.4803 * logn);
  } else {
    // Large sample approximation
    mu = -1.2725 + 1.0521 * (Math.log(Math.log(n)) - Math.log(3));
    sigma = -1.0521 * (Math.log(Math.log(n)) - Math.log(3));
  }
  
  if (sigma <= 0) sigma = 0.001; // prevent division by zero
  
  const gamma_val = Math.log(1 - W);
  const z = (gamma_val - mu) / sigma;
  
  // P(W > w) = P(Z < z) under H0 (normality)
  const pValue = normalCDF(z);
  return Math.max(0.0001, Math.min(0.9999, pValue));
}

// Kolmogorov-Smirnov Normality Test
export function ksNormalityTest(data: number[]): { statistic: number; pValue: number; conclusion: string } {
  const n = data.length;
  if (n < 2) return { statistic: NaN, pValue: NaN, conclusion: 'Need at least 2 data points' };
  
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(sorted);
  const sd = standardDeviation(sorted, true);
  
  if (sd === 0) return { statistic: 0, pValue: 1, conclusion: 'All values are identical' };
  
  let dMax = 0;
  for (let i = 0; i < n; i++) {
    const fEmpirical = (i + 1) / n;
    const fExpected = normalCDF(sorted[i], m, sd);
    const d = Math.max(Math.abs(fEmpirical - fExpected), Math.abs(i / n - fExpected));
    dMax = Math.max(dMax, d);
  }
  
  // Approximate p-value for KS test
  const lambda = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * dMax;
  const pValue = ksPValue(lambda);
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: Data appears to be normally distributed (p > 0.05)' 
    : 'Reject H₀: Data does not appear to be normally distributed (p ≤ 0.05)';
  
  return { statistic: Math.round(dMax * 10000) / 10000, pValue: Math.max(0, Math.min(1, Math.round(pValue * 10000) / 10000)), conclusion };
}

function ksPValue(lambda: number): number {
  if (lambda < 0.27) return 1;
  if (lambda > 3.3) return 0;
  
  let sum = 0;
  for (let k = 1; k <= 100; k++) {
    const term = Math.pow(-1, k - 1) * Math.exp(-2 * k * k * lambda * lambda);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  return Math.max(0, Math.min(1, 2 * sum));
}

// Anderson-Darling Normality Test
export function andersonDarlingTest(data: number[]): { statistic: number; pValue: number; conclusion: string; criticalValues: { level: number; value: number }[] } {
  const n = data.length;
  if (n < 2) return { statistic: NaN, pValue: NaN, conclusion: 'Need at least 2 data points', criticalValues: [] };
  
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(sorted);
  const sd = standardDeviation(sorted, true);
  
  if (sd === 0) return { statistic: 0, pValue: 1, conclusion: 'All values are identical', criticalValues: [] };
  
  let s = 0;
  for (let i = 0; i < n; i++) {
    const cdfVal = normalCDF(sorted[i], m, sd);
    const cdfVal2 = normalCDF(sorted[n - 1 - i], m, sd);
    const ln1 = Math.log(Math.max(cdfVal, 1e-15));
    const ln2 = Math.log(Math.max(1 - cdfVal2, 1e-15));
    s += (2 * (i + 1) - 1) * (ln1 + ln2);
  }
  
  let A2 = -n - s / n;
  
  // Adjust for small sample
  A2 = A2 * (1 + 0.75 / n + 2.25 / (n * n));
  
  // Critical values for normality
  const criticalValues = [
    { level: 0.15, value: 0.576 },
    { level: 0.10, value: 0.656 },
    { level: 0.05, value: 0.787 },
    { level: 0.025, value: 0.918 },
    { level: 0.01, value: 1.092 },
  ];
  
  // Approximate p-value
  let pValue: number;
  if (A2 >= 0.6) {
    pValue = Math.exp(1.2937 - 5.709 * A2 + 0.0186 * A2 * A2);
  } else if (A2 >= 0.34) {
    pValue = Math.exp(0.9177 - 4.279 * A2 - 1.38 * A2 * A2);
  } else if (A2 > 0.2) {
    pValue = 1 - Math.exp(-8.318 + 42.796 * A2 - 59.938 * A2 * A2);
  } else {
    pValue = 1 - Math.exp(-13.436 + 101.14 * A2 - 223.73 * A2 * A2);
  }
  
  pValue = Math.max(0, Math.min(1, pValue));
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: Data appears to be normally distributed (p > 0.05)' 
    : 'Reject H₀: Data does not appear to be normally distributed (p ≤ 0.05)';
  
  return { 
    statistic: Math.round(A2 * 10000) / 10000, 
    pValue: Math.round(pValue * 10000) / 10000, 
    conclusion,
    criticalValues
  };
}

// ==================== HYPOTHESIS TESTS ====================

// One-Sample T-Test
export function oneSampleTTest(data: number[], mu0: number): { tStat: number; pValue: number; df: number; conclusion: string } {
  const n = data.length;
  const m = mean(data);
  const se = standardDeviation(data) / Math.sqrt(n);
  const tStat = (m - mu0) / se;
  const df = n - 1;
  
  // Two-tailed p-value
  const pValue = 2 * (1 - tCDF(Math.abs(tStat), df));
  
  const conclusion = pValue > 0.05 
    ? `Fail to reject H₀: No significant difference from μ₀ = ${mu0} (p = ${pValue.toFixed(4)})` 
    : `Reject H₀: Significant difference from μ₀ = ${mu0} (p = ${pValue.toFixed(4)})`;
  
  return { tStat: Math.round(tStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, df, conclusion };
}

// Two-Sample T-Test (independent)
export function twoSampleTTest(data1: number[], data2: number[], equalVariance: boolean = true): { tStat: number; pValue: number; df: number; conclusion: string } {
  const n1 = data1.length;
  const n2 = data2.length;
  const m1 = mean(data1);
  const m2 = mean(data2);
  const v1 = variance(data1);
  const v2 = variance(data2);
  
  let se: number;
  let df: number;
  
  if (equalVariance) {
    const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    se = Math.sqrt(pooledVar * (1 / n1 + 1 / n2));
    df = n1 + n2 - 2;
  } else {
    se = Math.sqrt(v1 / n1 + v2 / n2);
    df = Math.pow(v1 / n1 + v2 / n2, 2) / 
      (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
  }
  
  const tStat = (m1 - m2) / se;
  const pValue = 2 * (1 - tCDF(Math.abs(tStat), df));
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: No significant difference between groups (p > 0.05)' 
    : 'Reject H₀: Significant difference between groups (p ≤ 0.05)';
  
  return { tStat: Math.round(tStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, df: Math.round(df * 100) / 100, conclusion };
}

// Paired T-Test
export function pairedTTest(data1: number[], data2: number[]): { tStat: number; pValue: number; df: number; meanDiff: number; conclusion: string } {
  const diffs = data1.map((v, i) => v - data2[i]);
  const n = diffs.length;
  const meanDiff = mean(diffs);
  const se = standardDeviation(diffs) / Math.sqrt(n);
  const tStat = meanDiff / se;
  const df = n - 1;
  const pValue = 2 * (1 - tCDF(Math.abs(tStat), df));
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: No significant difference (p > 0.05)' 
    : 'Reject H₀: Significant difference (p ≤ 0.05)';
  
  return { tStat: Math.round(tStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, df, meanDiff: Math.round(meanDiff * 10000) / 10000, conclusion };
}

// One-Sample Z-Test
export function oneSampleZTest(data: number[], mu0: number, knownSigma: number): { zStat: number; pValue: number; conclusion: string } {
  const n = data.length;
  const m = mean(data);
  const se = knownSigma / Math.sqrt(n);
  const zStat = (m - mu0) / se;
  const pValue = 2 * (1 - normalCDF(Math.abs(zStat)));
  
  const conclusion = pValue > 0.05 
    ? `Fail to reject H₀: No significant difference from μ₀ = ${mu0} (p > 0.05)` 
    : `Reject H₀: Significant difference from μ₀ = ${mu0} (p ≤ 0.05)`;
  
  return { zStat: Math.round(zStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, conclusion };
}

// Chi-Square Goodness of Fit Test
export function chiSquareGoFTest(observed: number[], expected?: number[]): { chiStat: number; pValue: number; df: number; conclusion: string; table: { category: number; observed: number; expected: number; contribution: number }[] } {
  const n = observed.length;
  const total = observed.reduce((s, v) => s + v, 0);
  const exp = expected || observed.map(() => total / n);
  
  const table = observed.map((o, i) => ({
    category: i + 1,
    observed: o,
    expected: Math.round(exp[i] * 100) / 100,
    contribution: Math.round(Math.pow(o - exp[i], 2) / exp[i] * 10000) / 10000,
  }));
  
  const chiStat = table.reduce((s, row) => s + row.contribution, 0);
  const df = n - 1;
  const pValue = 1 - chiSquareCDF(chiStat, df);
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: Observed frequencies match expected (p > 0.05)' 
    : 'Reject H₀: Observed frequencies differ from expected (p ≤ 0.05)';
  
  return { chiStat: Math.round(chiStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, df, conclusion, table };
}

// One-Way ANOVA
export function oneWayANOVA(groups: number[][]): { 
  fStat: number; pValue: number; dfBetween: number; dfWithin: number; 
  ssBetween: number; ssWithin: number; ssTotal: number;
  msBetween: number; msWithin: number;
  conclusion: string;
  groupMeans: number[];
} {
  const k = groups.length;
  const allData = groups.flat();
  const grandMean = mean(allData);
  const N = allData.length;
  
  const groupMeans = groups.map(g => mean(g));
  
  const ssBetween = groups.reduce((sum, g, i) => sum + g.length * Math.pow(groupMeans[i] - grandMean, 2), 0);
  const ssWithin = groups.reduce((sum, g, i) => sum + g.reduce((s, v) => s + Math.pow(v - groupMeans[i], 2), 0), 0);
  const ssTotal = allData.reduce((sum, v) => sum + Math.pow(v - grandMean, 2), 0);
  
  const dfBetween = k - 1;
  const dfWithin = N - k;
  
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  
  const fStat = msBetween / msWithin;
  const pValue = 1 - fCDF(fStat, dfBetween, dfWithin);
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: No significant difference among group means (p > 0.05)' 
    : 'Reject H₀: At least one group mean differs significantly (p ≤ 0.05)';
  
  return {
    fStat: Math.round(fStat * 10000) / 10000,
    pValue: Math.round(pValue * 10000) / 10000,
    dfBetween, dfWithin,
    ssBetween: Math.round(ssBetween * 100) / 100,
    ssWithin: Math.round(ssWithin * 100) / 100,
    ssTotal: Math.round(ssTotal * 100) / 100,
    msBetween: Math.round(msBetween * 100) / 100,
    msWithin: Math.round(msWithin * 100) / 100,
    conclusion,
    groupMeans: groupMeans.map(m => Math.round(m * 10000) / 10000),
  };
}

// Levene's Test (for equality of variances)
export function leveneTest(groups: number[][]): { fStat: number; pValue: number; df1: number; df2: number; conclusion: string } {
  const k = groups.length;
  const N = groups.reduce((sum, g) => sum + g.length, 0);
  
  // Compute absolute deviations from group medians
  const deviations = groups.map(g => {
    const med = median(g);
    return g.map(v => Math.abs(v - med));
  });
  
  const allDeviations = deviations.flat();
  const grandMeanDev = mean(allDeviations);
  const groupMeanDevs = deviations.map(d => mean(d));
  
  const ssBetween = deviations.reduce((sum, d, i) => 
    sum + d.length * Math.pow(groupMeanDevs[i] - grandMeanDev, 2), 0);
  const ssWithin = deviations.reduce((sum, d, i) => 
    sum + d.reduce((s, v) => s + Math.pow(v - groupMeanDevs[i], 2), 0), 0);
  
  const df1 = k - 1;
  const df2 = N - k;
  
  const fStat = (ssBetween / df1) / (ssWithin / df2);
  const pValue = 1 - fCDF(fStat, df1, df2);
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: Equal variances assumed (p > 0.05)' 
    : 'Reject H₀: Variances are not equal (p ≤ 0.05)';
  
  return { fStat: Math.round(fStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, df1, df2, conclusion };
}

// ==================== NON-PARAMETRIC TESTS ====================

// Mann-Whitney U Test
export function mannWhitneyUTest(group1: number[], group2: number[]): { uStat: number; pValue: number; conclusion: string } {
  const n1 = group1.length;
  const n2 = group2.length;
  
  // Rank all values together
  const all = [...group1.map((v, i) => ({ val: v, group: 1, idx: i })),
               ...group2.map((v, i) => ({ val: v, group: 2, idx: i }))];
  all.sort((a, b) => a.val - b.val);
  
  // Assign ranks (handle ties)
  const ranks: number[] = new Array(all.length);
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length && all[j].val === all[i].val) j++;
    const avgRank = (i + j + 1) / 2; // average rank for tied values
    for (let k = i; k < j; k++) ranks[k] = avgRank;
    i = j;
  }
  
  const r1 = all.filter(a => a.group === 1).reduce((sum, _, idx) => sum + ranks[all.indexOf(_)], 0);
  const rankSum1 = all.reduce((sum, a, idx) => a.group === 1 ? sum + ranks[idx] : sum, 0);
  
  const u1 = rankSum1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const uStat = Math.min(u1, u2);
  
  // Normal approximation for p-value
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (uStat - mu) / sigma;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: No significant difference between groups (p > 0.05)' 
    : 'Reject H₀: Significant difference between groups (p ≤ 0.05)';
  
  return { uStat: Math.round(uStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, conclusion };
}

// Wilcoxon Signed-Rank Test
export function wilcoxonTest(data1: number[], data2: number[]): { wStat: number; pValue: number; conclusion: string } {
  const diffs = data1.map((v, i) => v - data2[i]).filter(d => d !== 0);
  const n = diffs.length;
  
  if (n === 0) return { wStat: 0, pValue: 1, conclusion: 'No differences found' };
  
  const absDiffs = diffs.map(d => ({ d, abs: Math.abs(d) }));
  absDiffs.sort((a, b) => a.abs - b.abs);
  
  // Assign ranks
  const ranks: number[] = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && absDiffs[j].abs === absDiffs[i].abs) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) ranks[k] = avgRank;
    i = j;
  }
  
  const wPlus = absDiffs.reduce((sum, item, idx) => item.d > 0 ? sum + ranks[idx] : sum, 0);
  const wMinus = absDiffs.reduce((sum, item, idx) => item.d < 0 ? sum + ranks[idx] : sum, 0);
  const wStat = Math.min(wPlus, wMinus);
  
  // Normal approximation
  const mu = (n * (n + 1)) / 4;
  const sigma = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
  const z = (wStat - mu) / sigma;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: No significant difference (p > 0.05)' 
    : 'Reject H₀: Significant difference (p ≤ 0.05)';
  
  return { wStat: Math.round(wStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, conclusion };
}

// Kruskal-Wallis Test
export function kruskalWallisTest(groups: number[][]): { hStat: number; pValue: number; df: number; conclusion: string } {
  const k = groups.length;
  const all = groups.flatMap((g, gi) => g.map(v => ({ val: v, group: gi })));
  const N = all.length;
  
  all.sort((a, b) => a.val - b.val);
  
  // Assign ranks
  const ranks: number[] = new Array(N);
  let i = 0;
  while (i < N) {
    let j = i;
    while (j < N && all[j].val === all[i].val) j++;
    const avgRank = (i + j + 1) / 2;
    for (let l = i; l < j; l++) ranks[l] = avgRank;
    i = j;
  }
  
  const groupRankSums = groups.map((g, gi) => {
    let rankSum = 0;
    let count = 0;
    all.forEach((a, idx) => {
      if (a.group === gi) { rankSum += ranks[idx]; count++; }
    });
    return { rankSum, count, meanRank: rankSum / count };
  });
  
  const hStat = (12 / (N * (N + 1))) * groupRankSums.reduce((sum, g) => 
    sum + (g.rankSum * g.rankSum) / g.count, 0) - 3 * (N + 1);
  
  const df = k - 1;
  const pValue = 1 - chiSquareCDF(hStat, df);
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: No significant difference among groups (p > 0.05)' 
    : 'Reject H₀: At least one group differs significantly (p ≤ 0.05)';
  
  return { hStat: Math.round(hStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, df, conclusion };
}

// Friedman Test
export function friedmanTest(groups: number[][]): { chiStat: number; pValue: number; df: number; conclusion: string } {
  const k = groups.length; // number of treatments
  const n = groups[0].length; // number of subjects/blocks
  
  // Rank within each subject/block
  const subjectRanks: number[][] = [];
  for (let i = 0; i < n; i++) {
    const values = groups.map(g => g[i]);
    const ranked = rankValues(values);
    subjectRanks.push(ranked);
  }
  
  // Compute rank sums for each treatment
  const rankSums = groups.map((_, j) => {
    return subjectRanks.reduce((sum, ranks) => sum + ranks[j], 0);
  });
  
  const chiStat = (12 / (n * k * (k + 1))) * rankSums.reduce((sum, r) => sum + r * r, 0) - 3 * n * (k + 1);
  const df = k - 1;
  const pValue = 1 - chiSquareCDF(Math.max(0, chiStat), df);
  
  const conclusion = pValue > 0.05 
    ? 'Fail to reject H₀: No significant difference among treatments (p > 0.05)' 
    : 'Reject H₀: At least one treatment differs significantly (p ≤ 0.05)';
  
  return { chiStat: Math.round(chiStat * 10000) / 10000, pValue: Math.round(pValue * 10000) / 10000, df, conclusion };
}

function rankValues(values: number[]): number[] {
  const n = values.length;
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => a.v - b.v);
  const ranks = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && indexed[j].v === indexed[i].v) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank;
    i = j;
  }
  return ranks;
}

// ==================== Q-Q PLOT DATA ====================

export function qqPlotData(data: number[]): { theoretical: number; sample: number }[] {
  const sorted = [...data].sort((a, b) => a - b);
  const n = sorted.length;
  const m = mean(sorted);
  const sd = standardDeviation(sorted);
  
  return sorted.map((val, i) => {
    const p = (i + 0.5) / n;
    const theoretical = normalInvCDF(p) * sd + m;
    return { theoretical: Math.round(theoretical * 1000) / 1000, sample: Math.round(val * 1000) / 1000 };
  });
}

// ==================== FITTED NORMAL CURVE ====================

export function fittedNormalCurve(data: number[], numPoints: number = 100): { x: number; y: number }[] {
  const m = mean(data);
  const sd = standardDeviation(data);
  const minVal = m - 4 * sd;
  const maxVal = m + 4 * sd;
  const step = (maxVal - minVal) / numPoints;
  
  const result: { x: number; y: number }[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const x = minVal + i * step;
    result.push({ x: Math.round(x * 1000) / 1000, y: normalPDF(x, m, sd) });
  }
  return result;
}
