"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type Scenario = {
  id: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard" | string
  system_prompt: string | null
}

const difficultyStyles: Record<string, { border: string; text: string; badge: string }> = {
  easy: {
    border: "border-green-500/40",
    text: "text-green-400",
    badge: "bg-green-500/15 text-green-300",
  },
  medium: {
    border: "border-yellow-500/40",
    text: "text-yellow-400",
    badge: "bg-yellow-500/15 text-yellow-300",
  },
  hard: {
    border: "border-red-500/40",
    text: "text-red-400",
    badge: "bg-red-500/15 text-red-300",
  },
  default: {
    border: "border-zinc-700",
    text: "text-zinc-300",
    badge: "bg-zinc-800 text-zinc-300",
  },
}

export function ScenarioSelector() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchScenarios = async () => {
      setIsLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from("scenarios")
        .select("id,title,description,difficulty,system_prompt")
        .order("created_at", { ascending: true })
      if (error) {
        setError("Nie udało się pobrać scenariuszy.")
        setIsLoading(false)
        return
      }
      setScenarios((data ?? []) as Scenario[])
      setIsLoading(false)
    }
    fetchScenarios()
  }, [])

  if (isLoading) {
    return <div className="text-sm text-zinc-400">Ładowanie scenariuszy...</div>
  }

  if (error) {
    return <div className="text-sm text-red-400">{error}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {scenarios.map((scenario) => {
        const styles = difficultyStyles[scenario.difficulty] ?? difficultyStyles.default
        return (
          <button
            key={scenario.id}
            type="button"
            onClick={() => router.push(`/simulation/${scenario.id}`)}
            className={cn(
              "group text-left rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:border-zinc-500/60",
              styles.border,
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className={cn("text-lg font-semibold", styles.text)}>{scenario.title}</h3>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", styles.badge)}>
                {scenario.difficulty}
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-400">{scenario.description}</p>
          </button>
        )
      })}
    </div>
  )
}
