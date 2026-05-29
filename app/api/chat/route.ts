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

const buildAiErrorResponse = (error: unknown) => {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  const isQuotaError = /quota exceeded|rate limit/i.test(errorMessage);

  return new Response(
    JSON.stringify({
      error: isQuotaError ? 'Przekroczono limit AI' : 'Błąd generowania odpowiedzi',
      details: isQuotaError
        ? 'Limit zapytan Gemini dla tego klucza API zostal wyczerpany. Sprobuj ponownie za chwile albo podmien klucz na taki z wiekszym limitem.'
        : errorMessage,
    }),
    {
      status: isQuotaError ? 429 : 500,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};

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

    const iterator = result.textStream[Symbol.asyncIterator]();
    let firstChunk: Awaited<ReturnType<typeof iterator.next>>;

    try {
      firstChunk = await iterator.next();
    } catch (error) {
      console.error('Błąd AI przed rozpoczeciem streamu:', error);
      return buildAiErrorResponse(error);
    }

    if (firstChunk.done || typeof firstChunk.value !== 'string' || firstChunk.value.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Pusta odpowiedz AI',
          details:
            'Model nie zwrocil zadnej tresci. Najczesciej oznacza to problem po stronie providera albo przekroczony limit zapytan.',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(firstChunk.value));

        try {
          while (true) {
            const chunk = await iterator.next();
            if (chunk.done) break;
            controller.enqueue(encoder.encode(chunk.value));
          }
        } catch (error) {
          console.error('Błąd AI w trakcie streamu:', error);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error) {
    console.error('Błąd API:', error);
    return buildAiErrorResponse(error);
  }
}
