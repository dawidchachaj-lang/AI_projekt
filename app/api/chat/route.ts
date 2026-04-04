export const runtime = 'edge';
export const maxDuration = 60;

import { google } from '@ai-sdk/google';
import { streamText } from 'ai';
import { createClient } from '@supabase/supabase-js';

type IncomingMessage = {
  role?: string;
  content?: string;
};

type SelectedOffer = {
  route: string;
  cargo: string;
  startingRate: number;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: Request) {
  try {
    const { messages = [], scenarioId, selectedOffer } = (await req.json()) as {
      messages?: IncomingMessage[];
      scenarioId?: string;
      selectedOffer?: SelectedOffer | null;
    };
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

    const promptWithOffer =
      selectedOffer &&
      typeof selectedOffer.route === 'string' &&
      typeof selectedOffer.cargo === 'string' &&
      typeof selectedOffer.startingRate === 'number'
        ? scenario.system_prompt
            .replace(/\{wybrana_trasa\}/g, selectedOffer.route)
            .replace(/\{wybrany_towar\}/g, selectedOffer.cargo)
            .replace(/\{wybrana_stawka\}/g, String(selectedOffer.startingRate))
        : scenario.system_prompt;

    const normalizedMessages = Array.isArray(messages)
      ? messages
          .filter(
            (message): message is { role: 'user' | 'assistant' | 'system'; content: string } =>
              (message.role === 'user' || message.role === 'assistant' || message.role === 'system') &&
              typeof message.content === 'string',
          )
      : [];

    const result = streamText(
      normalizedMessages.length > 0
        ? {
            model: google('gemini-3-flash-preview'),
            system: promptWithOffer,
            messages: normalizedMessages,
          }
        : {
            model: google('gemini-3-flash-preview'),
            system: promptWithOffer,
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
