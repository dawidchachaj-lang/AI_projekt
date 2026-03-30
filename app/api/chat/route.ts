import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages = [], scenarioId } = await req.json();
    if (!scenarioId) {
      return new Response(JSON.stringify({ error: 'Missing scenarioId' }), { status: 400 });
    }

    const { data: scenario, error } = await supabase
      .from('scenarios')
      .select('system_prompt,title')
      .eq('id', scenarioId)
      .single();

    if (error || !scenario?.system_prompt) {
      return new Response(JSON.stringify({ error: 'Scenario not found' }), { status: 404 });
    }

    const normalizedMessages = Array.isArray(messages)
      ? messages
          .map((message: { role?: string; content?: string }) => ({
            role: message.role,
            content: message.content,
          }))
          .filter((message) => message.role && typeof message.content === 'string')
      : [];

    const result = streamText(
      normalizedMessages.length > 0
        ? {
            model: google('gemini-3-flash-preview'),
            system: scenario.system_prompt,
            messages: normalizedMessages,
          }
        : {
            model: google('gemini-3-flash-preview'),
            system: scenario.system_prompt,
            prompt: 'Start the scenario and speak first.',
          },
    );

    return result.toTextStreamResponse();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Błąd API:', error);
    return new Response(
      JSON.stringify({ error: 'Błąd generowania odpowiedzi', details: errorMessage }),
      { status: 500 },
    );
  }
}
