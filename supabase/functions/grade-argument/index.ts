import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const difficultyContext: Record<string, string> = {
  beginner: 'Grade generously. The user is learning debate basics.',
  intermediate: 'Grade at a moderate standard. Expect basic structure and some evidence.',
  hard: 'Grade rigorously. Expect strong logic, specific evidence, and clear structure.',
  hell: 'Grade at the highest standard. Hold arguments to world-class debate expectations. Be strict.',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, topic, persona, difficulty } = await req.json();
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No text provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gradingPrompt = `You are an expert debate judge evaluating a live debate argument.

DEBATE CONTEXT:
- Topic: "${topic}"
- AI Opponent: ${persona}
- Difficulty: ${difficulty} — ${difficultyContext[difficulty] || difficultyContext.intermediate}

ARGUMENT TO GRADE:
"${text}"

Grade this argument on three dimensions (0-100 each):

CLARITY (0-100): Coherence, readability, sentence structure.
- 90-100: Crystal clear, flows naturally
- 70-89: Mostly clear, minor awkwardness
- 50-69: Hard to follow at times
- Below 50: Confusing or incoherent

LOGIC (0-100): Quality of reasoning and evidence.
- 90-100: Strong causal reasoning, specific evidence, no fallacies
- 70-89: Good reasoning, some evidence
- 50-69: Weak evidence or minor fallacies
- Below 50: Unsupported claims or clear logical errors

STRUCTURE (0-100): Organization, transitions, argument shape.
- 90-100: Clear claim → support → conclusion, uses transitions
- 70-89: Mostly organized
- 50-69: Inconsistent organization
- Below 50: No discernible structure

EXPLANATION: One sentence naming the single strongest thing the user did, and one sentence naming the single most important thing to improve. Be specific. Start with "Your argument..."`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: gradingPrompt }],
        temperature: 0.3,
        max_tokens: 250,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'argument_grade',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                clarity:     { type: 'number' },
                logic:       { type: 'number' },
                structure:   { type: 'number' },
                explanation: { type: 'string' },
              },
              required: ['clarity', 'logic', 'structure', 'explanation'],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI grading error:', response.status, errorText);
      throw new Error('Failed to grade argument');
    }

    const data = await response.json();
    const grade = JSON.parse(data.choices[0]?.message?.content || '{}');

    return new Response(JSON.stringify({
      clarity:     Math.min(100, Math.max(0, Math.round(grade.clarity))),
      logic:       Math.min(100, Math.max(0, Math.round(grade.logic))),
      structure:   Math.min(100, Math.max(0, Math.round(grade.structure))),
      explanation: grade.explanation || '',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in grade-argument:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
