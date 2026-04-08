'use client';

import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Scenario = {
  id: string;
  title: string;
  system_prompt: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hidden?: boolean;
};

type EvaluationResult = {
  simulation_status: 'success' | 'failure' | 'aborted';
  financial_metrics: {
    margin_defense_score: number;
    initial_anchor_value: number;
    concession_speed: number;
  };
  cognitive_metrics: {
    stress_resistance_score: number;
    emotional_control_score: number;
    time_efficiency_score: number;
  };
  procedural_metrics: {
    information_extraction_score: number;
    critical_errors: string[];
  };
  negotiation_profile: {
    argument_types_used: string[];
  };
};

type DisruptionEvent = {
  title: string;
  body: string;
};

type FreightOffer = {
  id: string;
  route: string;
  cargo: string;
  startingRate: number;
  estimatedCost: number;
  estimatedProfit: number;
};

type FreightRoute = {
  origin: string;
  destination: string;
  distance: number;
};

const cleanContent = (text: string) => {
  if (!text) return '';
  return text.replace(/<coach_eval>[\s\S]*?<\/coach_eval>/g, '').trim();
};

const normalizeScore = (value: number) => Math.max(0, Math.min(10, value));

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isEvaluationResult = (parsed: unknown): parsed is EvaluationResult => {
  if (!parsed || typeof parsed !== 'object') return false;
  const data = parsed as Record<string, unknown>;
  const status = data.simulation_status;
  if (status !== 'success' && status !== 'failure' && status !== 'aborted') return false;

  const financial = data.financial_metrics as Record<string, unknown> | undefined;
  const cognitive = data.cognitive_metrics as Record<string, unknown> | undefined;
  const procedural = data.procedural_metrics as Record<string, unknown> | undefined;
  const profile = data.negotiation_profile as Record<string, unknown> | undefined;

  if (!financial || !cognitive || !procedural || !profile) return false;

  const isFinancialValid =
    typeof financial.margin_defense_score === 'number' &&
    typeof financial.initial_anchor_value === 'number' &&
    typeof financial.concession_speed === 'number';

  const isCognitiveValid =
    typeof cognitive.stress_resistance_score === 'number' &&
    typeof cognitive.emotional_control_score === 'number' &&
    typeof cognitive.time_efficiency_score === 'number';

  const isProceduralValid =
    typeof procedural.information_extraction_score === 'number' &&
    isStringArray(procedural.critical_errors);

  const isProfileValid = isStringArray(profile.argument_types_used);

  return isFinancialValid && isCognitiveValid && isProceduralValid && isProfileValid;
};

const extractEvaluation = (text: string) => {
  if (!text || !text.includes('simulation_status')) return null;
  let depth = 0;
  let start = -1;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === '}') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start !== -1) {
        const candidate = text.slice(start, i + 1);
        try {
          const parsed = JSON.parse(candidate);
          if (isEvaluationResult(parsed)) {
            return parsed;
          }
        } catch {
          continue;
        }
      }
    }
  }
  return null;
};

const INACTIVITY_TIMEOUT_MS = 180_000;
const INACTIVITY_SYSTEM_MESSAGE =
  '[SYSTEM: BRAK ODPOWIEDZI SPEDYTIORA. Minął czas. Wyślij krótkie ponaglenie.]';
const FREIGHT_EXCHANGE_SCENARIO_TITLE = 'Giełda transportowa - walka o 100 EUR';

const generateRandomOffers = (count = 10): FreightOffer[] => {
  const routes: FreightRoute[] = [
    { origin: 'Warszawa', destination: 'Berlin', distance: 570 },
    { origin: 'Poznań', destination: 'Paryż', distance: 1300 },
    { origin: 'Rotterdam', destination: 'Madryt', distance: 1700 },
    { origin: 'Gdańsk', destination: 'Rotterdam', distance: 1200 },
    { origin: 'Wrocław', destination: 'Katowice', distance: 200 },
    { origin: 'Mediolan', destination: 'Katowice', distance: 1100 },
    { origin: 'Londyn', destination: 'Wrocław', distance: 1400 },
    { origin: 'Poznań', destination: 'Warszawa', distance: 300 },
    { origin: 'Praga', destination: 'Wiedeń', distance: 330 },
    { origin: 'Szczecin', destination: 'Hamburg', distance: 370 },
    { origin: 'Łódź', destination: 'Monachium', distance: 980 },
    { origin: 'Kraków', destination: 'Bruksela', distance: 1350 },
    { origin: 'Berlin', destination: 'Mediolan', distance: 1030 },
    { origin: 'Wiedeń', destination: 'Paryż', distance: 1240 },
    { origin: 'Katowice', destination: 'Amsterdam', distance: 1140 },
    { origin: 'Lublin', destination: 'Praga', distance: 760 },
    { origin: 'Rzeszów', destination: 'Budapeszt', distance: 460 },
    { origin: 'Gdynia', destination: 'Hamburg', distance: 700 },
    { origin: 'Białystok', destination: 'Berlin', distance: 690 },
    { origin: 'Wrocław', destination: 'Rotterdam', distance: 1080 },
  ];
  const economicsByCargo: Record<string, { revenuePerKm: number; costPerKm: number }> = {
    '24t, chłodnia': { revenuePerKm: 1.35, costPerKm: 1.1 },
    '24t, firanka': { revenuePerKm: 1.15, costPerKm: 0.95 },
    '21t, chłodnia': { revenuePerKm: 1.3, costPerKm: 1.05 },
    '12t, solówka': { revenuePerKm: 0.9, costPerKm: 0.7 },
    '3.5t, bus': { revenuePerKm: 0.55, costPerKm: 0.4 },
  };
  const cargoTypes = Object.keys(economicsByCargo);

  return Array.from({ length: count }, (_, index) => {
    const route = routes[Math.floor(Math.random() * routes.length)] ?? routes[0];
    const cargo = cargoTypes[Math.floor(Math.random() * cargoTypes.length)] ?? '24t, firanka';
    const economics = economicsByCargo[cargo] ?? { revenuePerKm: 1.15, costPerKm: 0.95 };
    const baseRate = route.distance * economics.revenuePerKm;
    const marketVariance = 0.85 + Math.random() * 0.35;
    const roundedRate = Math.round((baseRate * marketVariance) / 10) * 10;
    const estimatedCost = route.distance * economics.costPerKm;
    const estimatedProfit = roundedRate - estimatedCost;
    return {
      id: `offer-${index + 1}`,
      route: `${route.origin} -> ${route.destination}`,
      cargo,
      startingRate: roundedRate,
      estimatedCost,
      estimatedProfit,
    };
  });
};

const disruptionEvents: DisruptionEvent[] = [
  {
    title: '🚨 BRAK DOKUMENTÓW',
    body: 'Ochrona w Paryżu nie wpuszcza auta. Brak numeru referencyjnego. Działaj natychmiast!',
  },
  {
    title: '🚨 KONTROLA BAG',
    body: 'Inspekcja ściągnęła auto na wagę w Niemczech. Kierowca prosi o kontakt z szefem.',
  },
  {
    title: '🚨 PROBLEM Z TEMPERATURĄ',
    body: 'Agregat na naczepie wywalił błąd E-44. Towar o wartości 100k EUR jest zagrożony.',
  },
  {
    title: '🚨 WŚCIEKŁY KLIENT',
    body: "Telefon od klienta: 'Gdzie jest to auto?! Mieliście być na załadunku godzinę temu!'",
  },
  {
    title: '🚨 AWARIA OPONY',
    body: 'Wystrzał na A2. Kierowca stoi na awaryjnym i blokuje pas. Musimy wzywać serwis.',
  },
];

export default function Page() {
  const params = useParams();
  const scenarioId =
    typeof params.id === 'string'
      ? params.id
      : Array.isArray(params.id)
        ? params.id[0]
        : '';

  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isDisruptedSession, setIsDisruptedSession] = useState(false);
  const [hadDisruption, setHadDisruption] = useState(false);
  const [disruptionType, setDisruptionType] = useState<string | null>(null);
  const [activeDisruption, setActiveDisruption] = useState<DisruptionEvent | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<FreightOffer | null>(null);
  const [analyticalSelectionScore, setAnalyticalSelectionScore] = useState<number | null>(null);
  const [offers, setOffers] = useState<FreightOffer[]>([]);
  const hasInitializedRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disruptionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasDisruptionScheduledRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const isLoadingRef = useRef(false);
  const isCompletedRef = useRef(false);

  const clearInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  }, []);

  const clearDisruptionTimer = useCallback(() => {
    if (disruptionTimeoutRef.current) {
      clearTimeout(disruptionTimeoutRef.current);
      disruptionTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const fetchScenario = async () => {
      if (!scenarioId) return;
      setIsBooting(true);
      const { data, error } = await supabase
        .from('scenarios')
        .select('id,title,system_prompt')
        .eq('id', scenarioId)
        .single();
      if (error || !data) {
        setError('Nie udało się pobrać scenariusza.');
        setIsBooting(false);
        return;
      }
      setScenario(data as Scenario);
      setIsBooting(false);
    };
    fetchScenario();
  }, [scenarioId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    isCompletedRef.current = isCompleted;
  }, [isCompleted]);

  useEffect(() => {
    const isDisruptedSession = Math.random() < 0.3;
    setIsDisruptedSession(isDisruptedSession);
  }, []);

  useEffect(() => {
    setOffers(generateRandomOffers(10));
  }, []);

  const isFreightExchangeScenario = scenario?.title === FREIGHT_EXCHANGE_SCENARIO_TITLE;
  const showFreightExchangeStep = !!isFreightExchangeScenario && !selectedOffer;

  const saveSimulationResults = useCallback(
    async (scores: EvaluationResult, chatHistory: ChatMessage[]) => {
      if (!scenarioId) return;
      setSaveStatus('saving');
      const { error } = await supabase.from('simulation_results').insert({
        scenario_id: scenarioId,
        simulation_status: scores.simulation_status,
        margin_defense_score: scores.financial_metrics.margin_defense_score,
        time_efficiency_score: scores.cognitive_metrics.time_efficiency_score,
        stress_resistance_score: scores.cognitive_metrics.stress_resistance_score,
        procedural_errors: scores.procedural_metrics.critical_errors,
        had_disruption: hadDisruption,
        disruption_type: disruptionType,
        chat_history: chatHistory,
      });
      if (error) {
        setSaveStatus('error');
        return;
      }
      setSaveStatus('saved');
    },
    [scenarioId, hadDisruption, disruptionType],
  );

  const streamAssistantMessage = useCallback(async (nextMessages: ChatMessage[]) => {
    if (isCompleted) return;
    clearInactivityTimer();
    setIsLoading(true);
    setError(null);
    let evaluationFound = false;
    let shouldScheduleTimeout = false;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          scenarioId,
          selectedOffer: selectedOffer
            ? {
                route: selectedOffer.route,
                cargo: selectedOffer.cargo,
                startingRate: selectedOffer.startingRate,
              }
            : null,
          analyticalSelectionScore,
        }),
      });

      if (!response.ok || !response.body) {
        setError('Błąd odpowiedzi z serwera.');
        setIsLoading(false);
        return;
      }

      const assistantId = `assistant-${Date.now()}`;
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantId ? { ...message, content: accumulated } : message,
          ),
        );
        if (!evaluationFound) {
          const detected = extractEvaluation(accumulated);
          if (detected) {
            evaluationFound = true;
            setEvaluation(detected);
            setIsCompleted(true);
            clearInactivityTimer();
            clearDisruptionTimer();
            saveSimulationResults(detected, [
              ...nextMessages,
              { id: assistantId, role: 'assistant', content: accumulated },
            ]);
            break;
          }
        }
      }
      shouldScheduleTimeout = !evaluationFound;
    } catch {
      setError('Nie udało się wygenerować odpowiedzi.');
    } finally {
      setIsLoading(false);
      if (shouldScheduleTimeout && !isCompletedRef.current) {
        inactivityTimeoutRef.current = setTimeout(() => {
          if (isLoadingRef.current || isCompletedRef.current) return;
          const hiddenSystemMessage: ChatMessage = {
            id: `timeout-system-${Date.now()}`,
            role: 'user',
            content: INACTIVITY_SYSTEM_MESSAGE,
            hidden: true,
          };
          const withSystemMessage = [...messagesRef.current, hiddenSystemMessage];
          setMessages(withSystemMessage);
          void streamAssistantMessage(withSystemMessage);
        }, INACTIVITY_TIMEOUT_MS);
      }
    }
  }, [
    scenarioId,
    selectedOffer,
    analyticalSelectionScore,
    isCompleted,
    clearInactivityTimer,
    clearDisruptionTimer,
    saveSimulationResults,
  ]);

  useEffect(() => {
    if (!scenario || hasInitializedRef.current) return;
    if (isFreightExchangeScenario && !selectedOffer) return;
    if (isFreightExchangeScenario && selectedOffer) return;
    hasInitializedRef.current = true;
    streamAssistantMessage([]);
  }, [scenario, selectedOffer, isFreightExchangeScenario, streamAssistantMessage]);

  useEffect(() => {
    if (
      !scenario ||
      !isDisruptedSession ||
      isCompleted ||
      hasDisruptionScheduledRef.current ||
      (isFreightExchangeScenario && !selectedOffer)
    ) {
      return;
    }
    hasDisruptionScheduledRef.current = true;
    const delayMs = (30 + Math.random() * 30) * 1000;
    disruptionTimeoutRef.current = setTimeout(() => {
      if (isCompletedRef.current) return;
      const randomEvent =
        disruptionEvents[Math.floor(Math.random() * disruptionEvents.length)] ?? disruptionEvents[0];
      setHadDisruption(true);
      setDisruptionType(randomEvent.title);
      setActiveDisruption(randomEvent);
    }, delayMs);
  }, [scenario, isDisruptedSession, isCompleted, isFreightExchangeScenario, selectedOffer]);

  useEffect(() => {
    return () => {
      clearInactivityTimer();
      clearDisruptionTimer();
    };
  }, [clearInactivityTimer, clearDisruptionTimer]);

  useEffect(() => {
    if (evaluation || messages.length === 0) return;
    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant');
    if (!lastAssistant) return;
    const detected = extractEvaluation(lastAssistant.content);
    if (detected) {
      setEvaluation(detected);
      setIsCompleted(true);
      clearDisruptionTimer();
      saveSimulationResults(detected, messages);
    }
  }, [messages, evaluation, clearDisruptionTimer, saveSimulationResults]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || isCompleted || !!activeDisruption) return;
    clearInactivityTimer();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    await streamAssistantMessage(nextMessages);
  };

  if (isBooting) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-200">
        Ładowanie scenariusza...
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-red-400">
        {error ?? 'Brak scenariusza.'}
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <h1 className="text-lg font-semibold text-white">{scenario.title}</h1>
        <p className="text-sm text-zinc-400">Negotiation & crisis training</p>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {showFreightExchangeStep ? (
          <div className="mx-auto w-full max-w-5xl rounded-2xl border border-zinc-800 bg-zinc-900 p-4 md:p-6">
            <h2 className="text-xl font-semibold text-white">Giełda Transportowa</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Wybierz ofertę i rozpocznij negocjacje z klientem.
            </p>
            <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-800">
              <table className="min-w-full text-left">
                <thead className="bg-zinc-950/80 text-xs uppercase tracking-wide text-zinc-400">
                  <tr>
                    <th className="px-4 py-3">Trasa</th>
                    <th className="px-4 py-3">Towar</th>
                    <th className="px-4 py-3">Stawka Startowa</th>
                    <th className="px-4 py-3 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-sm">
                  {offers.map((offer) => (
                    <tr key={offer.id} className="bg-zinc-900/70 text-zinc-200">
                      <td className="px-4 py-3 font-medium">{offer.route}</td>
                      <td className="px-4 py-3">{offer.cargo}</td>
                      <td className="px-4 py-3">{offer.startingRate} EUR</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            const maxProfit = offers.reduce(
                              (max, current) =>
                                current.estimatedProfit > max ? current.estimatedProfit : max,
                              Number.NEGATIVE_INFINITY,
                            );
                            const score =
                              offer.estimatedProfit <= 0 || !Number.isFinite(maxProfit) || maxProfit <= 0
                                ? 0
                                : Math.max(0, Math.min(1, offer.estimatedProfit / maxProfit));
                            setAnalyticalSelectionScore(score);
                            setSelectedOffer(offer);
                          }}
                          className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-green-500"
                        >
                          Negocjuj
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-4xl flex-col gap-4">
            {messages.filter((message) => !message.hidden).map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'user'
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-900 text-zinc-100 border border-zinc-800'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{cleanContent(message.content)}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="text-xs text-zinc-500">AI is typing...</div>
            )}
            {error && <div className="text-xs text-red-400">{error}</div>}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {showFreightExchangeStep ? null : evaluation ? (
        <div className="border-t border-zinc-800 bg-zinc-900 px-6 py-6">
          <div className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">Simulation Complete</h2>
                <p className="text-sm text-zinc-400">Status: {evaluation.simulation_status}</p>
              </div>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              {saveStatus === 'saving' && 'Saving results to database...'}
              {saveStatus === 'saved' && 'Results successfully saved to database.'}
              {saveStatus === 'error' && 'Failed to save results to database.'}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Financial</p>
                <div className="mt-3 space-y-3">
                  {[
                    {
                      label: 'Margin Defense',
                      value: evaluation.financial_metrics.margin_defense_score,
                    },
                    {
                      label: 'Initial Anchor Value',
                      value: evaluation.financial_metrics.initial_anchor_value,
                    },
                    {
                      label: 'Concession Speed',
                      value: evaluation.financial_metrics.concession_speed,
                    },
                  ].map((score) => {
                    const normalized = normalizeScore(score.value);
                    return (
                      <div key={score.label}>
                        <div className="flex items-center justify-between text-sm text-zinc-300">
                          <span>{score.label}</span>
                          <span className="text-zinc-100">{normalized}/10</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${normalized * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Cognitive</p>
                <div className="mt-3 space-y-3">
                  {[
                    {
                      label: 'Stress Resistance',
                      value: evaluation.cognitive_metrics.stress_resistance_score,
                    },
                    {
                      label: 'Emotional Control',
                      value: evaluation.cognitive_metrics.emotional_control_score,
                    },
                    {
                      label: 'Time Efficiency',
                      value: evaluation.cognitive_metrics.time_efficiency_score,
                    },
                  ].map((score) => {
                    const normalized = normalizeScore(score.value);
                    return (
                      <div key={score.label}>
                        <div className="flex items-center justify-between text-sm text-zinc-300">
                          <span>{score.label}</span>
                          <span className="text-zinc-100">{normalized}/10</span>
                        </div>
                        <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
                          <div
                            className="h-2 rounded-full bg-green-500 transition-all"
                            style={{ width: `${normalized * 10}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Procedural</p>
                <div className="mt-3 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm text-zinc-300">
                      <span>Information Extraction</span>
                      <span className="text-zinc-100">
                        {normalizeScore(evaluation.procedural_metrics.information_extraction_score)}
                        /10
                      </span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-green-500 transition-all"
                        style={{
                          width: `${
                            normalizeScore(evaluation.procedural_metrics.information_extraction_score) *
                            10
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-zinc-500">Critical Errors</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {evaluation.procedural_metrics.critical_errors.length > 0 ? (
                        evaluation.procedural_metrics.critical_errors.map((errorItem) => (
                          <span
                            key={errorItem}
                            className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-xs text-red-200"
                          >
                            {errorItem}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-400">None</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Profile</p>
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-wide text-zinc-500">Argument Types Used</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {evaluation.negotiation_profile.argument_types_used.length > 0 ? (
                      evaluation.negotiation_profile.argument_types_used.map((argumentType) => (
                        <span
                          key={argumentType}
                          className="rounded-full border border-blue-500/40 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200"
                        >
                          {argumentType}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-zinc-400">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="border-t border-zinc-800 bg-zinc-900 px-6 py-4"
        >
          <div className="mx-auto flex max-w-4xl gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-green-500 focus:outline-none"
              placeholder="Type your response..."
              disabled={isCompleted || !!activeDisruption}
            />
            <button
              type="submit"
              disabled={isLoading || isCompleted || !input.trim() || !!activeDisruption}
              className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      )}
      {activeDisruption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-orange-400/70 bg-zinc-900 p-6 shadow-2xl shadow-orange-500/20">
            <h3 className="text-2xl font-bold text-orange-300">{activeDisruption.title}</h3>
            <p className="mt-4 text-base leading-relaxed text-zinc-100">{activeDisruption.body}</p>
            <button
              type="button"
              onClick={() => setActiveDisruption(null)}
              className="mt-6 w-full rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-400"
            >
              Przyjąłem do wiadomości (Wróć do negocjacji)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
