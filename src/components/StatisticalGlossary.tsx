'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Bell,
  FlaskConical,
  Lightbulb,
  Sigma,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

// ─── Glossary Data ───────────────────────────────────────────────────────────

interface GlossaryTerm {
  term: string;
  shortDef: string;
  formula?: string;
  example?: string;
  category: string;
}

const CATEGORIES = [
  {
    id: 'descriptive',
    label: 'Descriptive Statistics',
    icon: BarChart3,
    color: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-300',
  },
  {
    id: 'probability',
    label: 'Probability & Distributions',
    icon: Bell,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300',
  },
  {
    id: 'hypothesis',
    label: 'Hypothesis Testing',
    icon: FlaskConical,
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300',
  },
  {
    id: 'general',
    label: 'General Terms',
    icon: Lightbulb,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
    border: 'border-violet-200 dark:border-violet-800',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:text-violet-300',
  },
] as const;

const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ── Descriptive Statistics ──
  {
    term: 'Mean',
    shortDef: 'The arithmetic average of a dataset, calculated by summing all values and dividing by the count.',
    formula: 'x̄ = (Σxᵢ) / n',
    example: 'For data [2, 4, 6, 8], the mean is (2+4+6+8)/4 = 5.',
    category: 'descriptive',
  },
  {
    term: 'Median',
    shortDef: 'The middle value of a sorted dataset. For even n, it is the average of the two central values.',
    formula: 'M = x₍₍ₙ₊₁₎/₂₎',
    example: 'For [1, 3, 5, 7, 9], median = 5. For [1, 3, 5, 7], median = (3+5)/2 = 4.',
    category: 'descriptive',
  },
  {
    term: 'Mode',
    shortDef: 'The most frequently occurring value in a dataset. A dataset can be unimodal, bimodal, or multimodal.',
    example: 'For [2, 3, 3, 5, 7], mode = 3.',
    category: 'descriptive',
  },
  {
    term: 'Standard Deviation',
    shortDef: 'A measure of dispersion that indicates how much individual values deviate from the mean.',
    formula: 'σ = √[ Σ(xᵢ − μ)² / n ]  (population)  |  s = √[ Σ(xᵢ − x̄)² / (n−1) ]  (sample)',
    example: 'For [2, 4, 4, 4, 5, 5, 7, 9], sample SD ≈ 2.14.',
    category: 'descriptive',
  },
  {
    term: 'Variance',
    shortDef: 'The average of the squared deviations from the mean; the square of the standard deviation.',
    formula: 'σ² = Σ(xᵢ − μ)² / n  |  s² = Σ(xᵢ − x̄)² / (n−1)',
    example: 'For [2, 4, 6, 8], variance = [(2−5)²+(4−5)²+(6−5)²+(8−5)²]/3 ≈ 6.67.',
    category: 'descriptive',
  },
  {
    term: 'Skewness',
    shortDef: 'A measure of the asymmetry of a distribution. Positive = right tail, Negative = left tail.',
    formula: 'Skew = [n/((n−1)(n−2))] × Σ[(xᵢ − x̄)/s]³',
    example: 'Income data often has positive skewness (a long right tail of high earners).',
    category: 'descriptive',
  },
  {
    term: 'Kurtosis',
    shortDef: 'A measure of the "tailedness" of a distribution. High kurtosis = heavy tails; low = light tails.',
    formula: 'Kurt = [n(n+1)/((n−1)(n−2)(n−3))] × Σ[(xᵢ − x̄)/s]⁴ − 3(n−1)²/((n−2)(n−3))',
    example: 'Normal distribution has excess kurtosis = 0 (mesokurtic). A t-distribution has positive excess kurtosis (leptokurtic).',
    category: 'descriptive',
  },
  {
    term: 'IQR (Interquartile Range)',
    shortDef: 'The range between the first quartile (Q1) and third quartile (Q3); measures the spread of the middle 50% of data.',
    formula: 'IQR = Q3 − Q1',
    example: 'If Q1 = 25 and Q3 = 75, then IQR = 50.',
    category: 'descriptive',
  },
  {
    term: 'Range',
    shortDef: 'The difference between the maximum and minimum values in a dataset.',
    formula: 'Range = Max − Min',
    example: 'For [3, 7, 12, 18], range = 18 − 3 = 15.',
    category: 'descriptive',
  },
  {
    term: 'Outlier',
    shortDef: 'A data point that differs significantly from other observations. Commonly identified using the 1.5×IQR rule.',
    formula: 'Outlier if: x < Q1 − 1.5×IQR  or  x > Q3 + 1.5×IQR',
    example: 'If Q1=10, Q3=30, IQR=20, then outliers are < −20 or > 60.',
    category: 'descriptive',
  },

  // ── Probability & Distributions ──
  {
    term: 'Normal Distribution',
    shortDef: 'A continuous probability distribution that is symmetric about the mean, forming a bell-shaped curve.',
    formula: 'f(x) = (1/σ√2π) × e^[−(x−μ)²/(2σ²)]',
    example: 'Heights of adults, measurement errors, and IQ scores are approximately normally distributed.',
    category: 'probability',
  },
  {
    term: 'P-value',
    shortDef: 'The probability of observing a test statistic at least as extreme as the one observed, assuming H₀ is true.',
    example: 'If p = 0.03, there is a 3% chance of seeing the observed result (or more extreme) under H₀.',
    category: 'probability',
  },
  {
    term: 'Confidence Interval',
    shortDef: 'A range of values that is likely to contain the true population parameter with a specified level of confidence.',
    formula: 'CI = x̄ ± z* × (σ/√n)',
    example: 'A 95% CI of [42.1, 47.9] means we are 95% confident the true mean lies in this range.',
    category: 'probability',
  },
  {
    term: 'PDF / CDF',
    shortDef: 'PDF (Probability Density Function) gives the likelihood of a continuous random variable at a point. CDF (Cumulative Distribution Function) gives P(X ≤ x).',
    formula: 'CDF(x) = ∫₋∞ˣ f(t) dt',
    example: 'For a standard normal, PDF(0) ≈ 0.399, CDF(0) = 0.5.',
    category: 'probability',
  },
  {
    term: 'Binomial Distribution',
    shortDef: 'A discrete distribution describing the number of successes in n independent Bernoulli trials, each with probability p.',
    formula: 'P(X = k) = C(n,k) × pᵏ × (1−p)ⁿ⁻ᵏ',
    example: 'Flipping a fair coin 10 times: P(X = 5 heads) = C(10,5) × 0.5⁵ × 0.5⁵ ≈ 0.246.',
    category: 'probability',
  },
  {
    term: 'Poisson Distribution',
    shortDef: 'A discrete distribution expressing the probability of a given number of events occurring in a fixed interval at a known average rate λ.',
    formula: 'P(X = k) = (λᵏ × e⁻λ) / k!',
    example: 'If emails arrive at 5/hour on average, P(3 emails in an hour) = (5³ × e⁻⁵)/3! ≈ 0.140.',
    category: 'probability',
  },

  // ── Hypothesis Testing ──
  {
    term: 'Null Hypothesis (H₀)',
    shortDef: 'The default assumption that there is no effect or no difference. The hypothesis we attempt to reject.',
    example: 'H₀: μ = 100 (the population mean equals 100).',
    category: 'hypothesis',
  },
  {
    term: 'Alternative Hypothesis (H₁)',
    shortDef: 'The hypothesis that contradicts H₀, stating there is an effect or difference.',
    example: 'H₁: μ ≠ 100 (the population mean differs from 100).',
    category: 'hypothesis',
  },
  {
    term: 'Type I Error (α)',
    shortDef: 'Rejecting H₀ when it is actually true (false positive). The significance level α is the probability of this error.',
    example: 'Concluding a drug works when it actually does not, at α = 0.05.',
    category: 'hypothesis',
  },
  {
    term: 'Type II Error (β)',
    shortDef: 'Failing to reject H₀ when it is actually false (false negative).',
    example: 'Concluding a drug does not work when it actually does.',
    category: 'hypothesis',
  },
  {
    term: 'Statistical Power',
    shortDef: 'The probability of correctly rejecting H₀ when it is false. Power = 1 − β.',
    formula: 'Power = 1 − β',
    example: 'If β = 0.20, then power = 0.80 (80% chance of detecting a real effect).',
    category: 'hypothesis',
  },
  {
    term: 'Effect Size',
    shortDef: 'A quantitative measure of the magnitude of a phenomenon, independent of sample size.',
    formula: "Cohen's d = (μ₁ − μ₂) / s_pooled",
    example: "d = 0.8 is considered a large effect (e.g., a meaningful difference in test scores between groups).",
    category: 'hypothesis',
  },
  {
    term: 't-test',
    shortDef: 'A parametric test used to determine if there is a significant difference between the means of two groups.',
    formula: 't = (x̄₁ − x̄₂) / √(s₁²/n₁ + s₂²/n₂)',
    example: 'Comparing average exam scores between two classes using a two-sample t-test.',
    category: 'hypothesis',
  },
  {
    term: 'Chi-square test',
    shortDef: 'A non-parametric test that compares observed frequencies to expected frequencies under H₀.',
    formula: 'χ² = Σ [(Oᵢ − Eᵢ)² / Eᵢ]',
    example: 'Testing whether dice rolls are fair by comparing observed counts to expected 1/6 proportions.',
    category: 'hypothesis',
  },

  // ── General Terms ──
  {
    term: 'Sample vs Population',
    shortDef: 'A population is the entire group of interest; a sample is a subset drawn from the population for analysis.',
    example: 'Population: all university students. Sample: 200 randomly selected students.',
    category: 'general',
  },
  {
    term: 'Degrees of Freedom',
    shortDef: 'The number of independent values that can vary in an analysis without breaking constraints.',
    formula: 'df = n − 1 (for a single sample)',
    example: 'With a sample of 25 observations, df = 24 for a one-sample t-test.',
    category: 'general',
  },
  {
    term: 'Central Limit Theorem',
    shortDef: 'States that the sampling distribution of the sample mean approaches a normal distribution as sample size n increases, regardless of the population shape.',
    formula: 'x̄ ~ N(μ, σ²/n) as n → ∞',
    example: 'Even if individual data is skewed, averages of samples (n ≥ 30) will be approximately normal.',
    category: 'general',
  },
  {
    term: 'Z-score',
    shortDef: 'The number of standard deviations a data point is from the mean. Used for standardization and comparison.',
    formula: 'z = (x − μ) / σ',
    example: 'If μ = 70, σ = 10, then a score of 90 has z = (90−70)/10 = 2.',
    category: 'general',
  },
];

// ─── Highlight Matching Text ─────────────────────────────────────────────────

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;

  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-800/60 rounded px-0.5">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function StatisticalGlossary() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(
    new Set(CATEGORIES.map(c => c.id))
  );

  // Filter terms by search query
  const filteredTerms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter(
      t =>
        t.term.toLowerCase().includes(q) ||
        t.shortDef.toLowerCase().includes(q) ||
        (t.formula && t.formula.toLowerCase().includes(q)) ||
        (t.example && t.example.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
    );
  }, [search]);

  // Group filtered terms by category
  const groupedTerms = useMemo(() => {
    const map = new Map<string, GlossaryTerm[]>();
    for (const cat of CATEGORIES) {
      const terms = filteredTerms.filter(t => t.category === cat.id);
      if (terms.length > 0) {
        map.set(cat.id, terms);
      }
    }
    return map;
  }, [filteredTerms]);

  const toggleCategory = (catId: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const totalMatchCount = filteredTerms.length;

  return (
    <>
      {/* Floating Glossary Button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open Statistical Glossary"
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/30 flex items-center justify-center transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/40 hover:scale-110 active:scale-95 group"
      >
        <BookOpen className="w-5 h-5 transition-transform group-hover:rotate-6" />
      </button>

      {/* Glossary Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                <BookOpen className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Statistical Glossary
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                  {totalMatchCount} term{totalMatchCount !== 1 ? 's' : ''} across {groupedTerms.size} categor{groupedTerms.size !== 1 ? 'ies' : 'y'}
                </DialogDescription>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Search terms, definitions, formulas..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 focus-visible:border-violet-400 dark:focus-visible:border-violet-600"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
            {groupedTerms.size === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                <Search className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No terms found</p>
                <p className="text-xs mt-1">Try a different search query</p>
              </div>
            ) : (
              <div className="space-y-3">
                {CATEGORIES.map(cat => {
                  const terms = groupedTerms.get(cat.id);
                  if (!terms) return null;

                  const CatIcon = cat.icon;
                  const isExpanded = expandedCats.has(cat.id);

                  return (
                    <div key={cat.id} className={`rounded-lg border ${cat.border} overflow-hidden`}>
                      {/* Category Header - clickable to expand/collapse */}
                      <button
                        onClick={() => toggleCategory(cat.id)}
                        className={`w-full flex items-center gap-2.5 px-4 py-3 ${cat.bg} transition-colors hover:opacity-80`}
                      >
                        <CatIcon className={`w-4 h-4 ${cat.color} shrink-0`} />
                        <span className={`text-sm font-semibold ${cat.color} flex-1 text-left`}>
                          {cat.label}
                        </span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${cat.badge} border-0`}>
                          {terms.length}
                        </Badge>
                        {isExpanded ? (
                          <ChevronDown className={`w-4 h-4 ${cat.color} shrink-0`} />
                        ) : (
                          <ChevronRight className={`w-4 h-4 ${cat.color} shrink-0`} />
                        )}
                      </button>

                      {/* Terms List */}
                      {isExpanded && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {terms.map((t, idx) => (
                            <div
                              key={idx}
                              className="px-4 py-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {/* Term Name */}
                              <div className="flex items-center gap-2 mb-1">
                                <Sigma className={`w-3.5 h-3.5 ${cat.color} shrink-0 opacity-60`} />
                                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                  <HighlightText text={t.term} query={search} />
                                </span>
                              </div>

                              {/* Definition */}
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed ml-5.5">
                                <HighlightText text={t.shortDef} query={search} />
                              </p>

                              {/* Formula */}
                              {t.formula && (
                                <div className="mt-2 ml-5.5 flex items-start gap-2">
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 pt-0.5">Formula</span>
                                  <code className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded break-all">
                                    <HighlightText text={t.formula} query={search} />
                                  </code>
                                </div>
                              )}

                              {/* Example */}
                              {t.example && (
                                <div className="mt-1.5 ml-5.5 flex items-start gap-2">
                                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 pt-0.5">Example</span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed">
                                    <HighlightText text={t.example} query={search} />
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
