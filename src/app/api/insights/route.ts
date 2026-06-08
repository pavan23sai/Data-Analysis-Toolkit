import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export async function POST(request: NextRequest) {
  try {
    const { summary } = await request.json();

    if (!summary) {
      return NextResponse.json({ error: 'No summary provided' }, { status: 400 });
    }

    const zai = await ZAI.create();

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'assistant',
          content: `You are an expert data analyst and statistician. Analyze the provided dataset summary and generate clear, actionable insights. Focus on:
1. Key patterns and trends in the data
2. Notable statistical observations (outliers, skewness, unusual distributions)
3. Relationships between variables (correlations)
4. Data quality observations (missing values, potential issues)
5. Recommendations for further analysis

Format your response in markdown with clear headers and bullet points. Be specific with numbers. Keep it concise but insightful. Write in a friendly, educational tone suitable for students learning statistics.`,
        },
        {
          role: 'user',
          content: `Analyze this dataset summary and provide insights:\n\n${summary}`,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const insights = completion.choices[0]?.message?.content;

    if (!insights) {
      return NextResponse.json({ error: 'No insights generated' }, { status: 500 });
    }

    return NextResponse.json({ insights });
  } catch (error) {
    console.error('AI Insights error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate insights' },
      { status: 500 }
    );
  }
}
