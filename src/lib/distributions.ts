// Probability Distributions Library
// Discrete: Binomial, Bernoulli, Poisson - PMF + CDF
// Continuous: Normal, Exponential, Uniform - PDF + CDF

import { gamma, normalCDF, normalPDF, normalInvCDF } from './statistics';

// ==================== DISCRETE DISTRIBUTIONS ====================

// Binomial Coefficient
function binomCoeff(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < Math.min(k, n - k); i++) {
    result *= (n - i) / (i + 1);
  }
  return Math.round(result);
}

// Bernoulli Distribution
export function bernoulliPMF(k: number, p: number): number {
  if (k === 1) return p;
  if (k === 0) return 1 - p;
  return 0;
}

export function bernoulliCDF(k: number, p: number): number {
  if (k < 0) return 0;
  if (k < 1) return 1 - p;
  return 1;
}

export function bernoulliStats(p: number): { mean: number; variance: number; stdDev: number } {
  return { mean: p, variance: p * (1 - p), stdDev: Math.sqrt(p * (1 - p)) };
}

export function bernoulliPlotData(p: number): { k: number; pmf: number; cdf: number }[] {
  return [
    { k: 0, pmf: bernoulliPMF(0, p), cdf: bernoulliCDF(0, p) },
    { k: 1, pmf: bernoulliPMF(1, p), cdf: bernoulliCDF(1, p) },
  ];
}

// Binomial Distribution
export function binomialPMF(k: number, n: number, p: number): number {
  if (k < 0 || k > n) return 0;
  return binomCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

export function binomialCDF(k: number, n: number, p: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += binomialPMF(i, n, p);
  }
  return sum;
}

export function binomialStats(n: number, p: number): { mean: number; variance: number; stdDev: number } {
  return { mean: n * p, variance: n * p * (1 - p), stdDev: Math.sqrt(n * p * (1 - p)) };
}

export function binomialPlotData(n: number, p: number): { k: number; pmf: number; cdf: number }[] {
  const data: { k: number; pmf: number; cdf: number }[] = [];
  let cumulative = 0;
  for (let k = 0; k <= n; k++) {
    const pmf = binomialPMF(k, n, p);
    cumulative += pmf;
    data.push({ k, pmf: Math.round(pmf * 10000) / 10000, cdf: Math.round(Math.min(cumulative, 1) * 10000) / 10000 });
  }
  return data;
}

// Poisson Distribution
export function poissonPMF(k: number, lambda: number): number {
  if (k < 0) return 0;
  let logPmf = -lambda + k * Math.log(lambda) - lnFactorial(k);
  return Math.exp(logPmf);
}

export function poissonCDF(k: number, lambda: number): number {
  let sum = 0;
  for (let i = 0; i <= k; i++) {
    sum += poissonPMF(i, lambda);
    if (sum > 1) sum = 1;
  }
  return sum;
}

export function poissonStats(lambda: number): { mean: number; variance: number; stdDev: number } {
  return { mean: lambda, variance: lambda, stdDev: Math.sqrt(lambda) };
}

export function poissonPlotData(lambda: number): { k: number; pmf: number; cdf: number }[] {
  const data: { k: number; pmf: number; cdf: number }[] = [];
  const maxK = Math.max(20, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
  let cumulative = 0;
  for (let k = 0; k <= maxK; k++) {
    const pmf = poissonPMF(k, lambda);
    cumulative += pmf;
    data.push({ k, pmf: Math.round(pmf * 10000) / 10000, cdf: Math.round(Math.min(cumulative, 1) * 10000) / 10000 });
    if (cumulative > 0.9999 && k > lambda) break;
  }
  return data;
}

function lnFactorial(n: number): number {
  if (n <= 1) return 0;
  let result = 0;
  for (let i = 2; i <= n; i++) {
    result += Math.log(i);
  }
  return result;
}

// ==================== CONTINUOUS DISTRIBUTIONS ====================

// Normal Distribution (already in statistics.ts, re-export with plot data)
export { normalPDF, normalCDF } from './statistics';

export function normalStats(mu: number, sigma: number): { mean: number; variance: number; stdDev: number; median: number; mode: number } {
  return { mean: mu, variance: sigma * sigma, stdDev: sigma, median: mu, mode: mu };
}

export function normalPlotData(mu: number, sigma: number, numPoints: number = 100): { x: number; pdf: number; cdf: number }[] {
  const data: { x: number; pdf: number; cdf: number }[] = [];
  const minVal = mu - 4 * sigma;
  const maxVal = mu + 4 * sigma;
  const step = (maxVal - minVal) / numPoints;
  
  for (let i = 0; i <= numPoints; i++) {
    const x = minVal + i * step;
    data.push({
      x: Math.round(x * 1000) / 1000,
      pdf: Math.round(normalPDF(x, mu, sigma) * 10000) / 10000,
      cdf: Math.round(normalCDF(x, mu, sigma) * 10000) / 10000,
    });
  }
  return data;
}

// Exponential Distribution
export function exponentialPDF(x: number, lambda: number): number {
  if (x < 0) return 0;
  return lambda * Math.exp(-lambda * x);
}

export function exponentialCDF(x: number, lambda: number): number {
  if (x < 0) return 0;
  return 1 - Math.exp(-lambda * x);
}

export function exponentialStats(lambda: number): { mean: number; variance: number; stdDev: number; median: number } {
  return { 
    mean: 1 / lambda, 
    variance: 1 / (lambda * lambda), 
    stdDev: 1 / lambda,
    median: Math.log(2) / lambda 
  };
}

export function exponentialPlotData(lambda: number, numPoints: number = 100): { x: number; pdf: number; cdf: number }[] {
  const data: { x: number; pdf: number; cdf: number }[] = [];
  const maxVal = 5 / lambda;
  const step = maxVal / numPoints;
  
  for (let i = 0; i <= numPoints; i++) {
    const x = i * step;
    data.push({
      x: Math.round(x * 1000) / 1000,
      pdf: Math.round(exponentialPDF(x, lambda) * 10000) / 10000,
      cdf: Math.round(exponentialCDF(x, lambda) * 10000) / 10000,
    });
  }
  return data;
}

// Uniform Distribution
export function uniformPDF(x: number, a: number, b: number): number {
  if (x < a || x > b) return 0;
  return 1 / (b - a);
}

export function uniformCDF(x: number, a: number, b: number): number {
  if (x < a) return 0;
  if (x > b) return 1;
  return (x - a) / (b - a);
}

export function uniformStats(a: number, b: number): { mean: number; variance: number; stdDev: number; median: number } {
  return { 
    mean: (a + b) / 2, 
    variance: Math.pow(b - a, 2) / 12, 
    stdDev: (b - a) / Math.sqrt(12),
    median: (a + b) / 2 
  };
}

export function uniformPlotData(a: number, b: number, numPoints: number = 100): { x: number; pdf: number; cdf: number }[] {
  const data: { x: number; pdf: number; cdf: number }[] = [];
  const range = b - a;
  const padding = range * 0.2;
  const minVal = a - padding;
  const maxVal = b + padding;
  const step = (maxVal - minVal) / numPoints;
  
  for (let i = 0; i <= numPoints; i++) {
    const x = minVal + i * step;
    data.push({
      x: Math.round(x * 1000) / 1000,
      pdf: Math.round(uniformPDF(x, a, b) * 10000) / 10000,
      cdf: Math.round(uniformCDF(x, a, b) * 10000) / 10000,
    });
  }
  return data;
}

// ==================== EMPIRICAL RULE ====================

export function empiricalRuleData(mu: number, sigma: number): { range: string; lower: number; upper: number; percent: number }[] {
  return [
    { range: 'Within 1σ (68%)', lower: mu - sigma, upper: mu + sigma, percent: 68.27 },
    { range: 'Within 2σ (95%)', lower: mu - 2 * sigma, upper: mu + 2 * sigma, percent: 95.45 },
    { range: 'Within 3σ (99.7%)', lower: mu - 3 * sigma, upper: mu + 3 * sigma, percent: 99.73 },
  ];
}
