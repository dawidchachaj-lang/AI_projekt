"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, 
  MessageSquare, 
  Trophy, 
  Clock,
  Flame,
  Zap,
  Shield,
  Target,
  Handshake,
  UserPlus,
  Hammer
} from "lucide-react"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ScenarioCard, type Difficulty } from "@/components/dashboard/scenario-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { icons } from "lucide-react"

interface Scenario {
  id: string
  title: string
  description: string
  icon: any
  difficulty: Difficulty
  duration: string
  completions: number
}

const durationByDifficulty: Record<Difficulty, string> = {
  beginner: "5-10 min",
  intermediate: "7-12 min",
  advanced: "10-20 min"
}

export default function DashboardPage() {
  const router = useRouter()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [filter, setFilter] = useState<"all" | Difficulty>("all")
  const getIconByName = (name: string) => {
    const IconComp = (icons as any)[name]
    return IconComp ?? Users
  }
  useEffect(() => {
    const fetchScenarios = async () => {
      const { data, error } = await supabase.from("scenarios").select("*")
      if (error || !data) return
      const mapped: Scenario[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        icon: getIconByName(row.icon),
        difficulty: (row.difficulty as Difficulty),
        duration: durationByDifficulty[(row.difficulty as Difficulty)] ?? "5-10 min",
        completions: 0
      }))
      setScenarios(mapped)
    }
    fetchScenarios()
  }, [])

  const handleStartScenario = (scenario: Scenario) => {
    router.push(`/simulation/${scenario.id}`)
  }

  const filteredScenarios = filter === "all" 
    ? scenarios 
    : scenarios.filter(s => s.difficulty === filter)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Panel Szkoleniowy</h1>
          <p className="text-muted-foreground mt-1">
            Wybierz scenariusz, aby rozpocząć trening roleplay
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="bg-difficulty-beginner/20 text-difficulty-beginner hover:bg-difficulty-beginner/30 px-3 py-1">
            <Zap className="w-3 h-3 mr-1" />
            Plan Pro
          </Badge>
          <Button variant="outline" className="border-border hover:bg-secondary">
            Wszystkie Scenariusze
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Liczba sesji"
          value={321}
          subtitle="Ukończone symulacje"
          icon={Target}
          trend={{ value: 12, isPositive: true }}
        />
        <StatsCard
          title="Czas szkolenia"
          value="24.5h"
          subtitle="W tym miesiącu"
          icon={Clock}
          trend={{ value: 8, isPositive: true }}
        />
        <StatsCard
          title="Śr. wynik"
          value="87%"
          subtitle="Ocena wyników"
          icon={Trophy}
          trend={{ value: 3, isPositive: true }}
        />
        <StatsCard
          title="Seria"
          value="7 dni"
          subtitle="Tak trzymaj!"
          icon={Zap}
        />
      </div>

      {/* Scenarios Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Dostępne Scenariusze</h2>
            <p className="text-sm text-muted-foreground">Wybieraj spośród {scenarios.length} scenariuszy szkoleniowych</p>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <button 
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-md transition-colors ${filter === "all" ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              Wszystkie
            </button>
            <button 
              onClick={() => setFilter("beginner")}
              className={`px-3 py-1.5 rounded-md transition-colors ${filter === "beginner" ? "bg-difficulty-beginner/10 text-difficulty-beginner font-medium" : "text-muted-foreground hover:text-difficulty-beginner"}`}
            >
              Początkujący
            </button>
            <button 
              onClick={() => setFilter("intermediate")}
              className={`px-3 py-1.5 rounded-md transition-colors ${filter === "intermediate" ? "bg-difficulty-intermediate/10 text-difficulty-intermediate font-medium" : "text-muted-foreground hover:text-difficulty-intermediate"}`}
            >
              Średniozaawansowany
            </button>
            <button 
              onClick={() => setFilter("advanced")}
              className={`px-3 py-1.5 rounded-md transition-colors ${filter === "advanced" ? "bg-difficulty-advanced/10 text-difficulty-advanced font-medium" : "text-muted-foreground hover:text-difficulty-advanced"}`}
            >
              Zaawansowany
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredScenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              {...scenario}
              onStart={() => handleStartScenario(scenario)}
            />
          ))}
        </div>
      </div>

    </div>
  )
}
