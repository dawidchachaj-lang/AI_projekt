"use client"

import { Sidebar } from "@/components/dashboard/sidebar"
import { StatsCard } from "@/components/dashboard/stats-card"
import { ScenarioSelector } from "@/components/ScenarioSelector"
import { 
  Target,
  Clock,
  Award,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Training Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Select a scenario to begin your roleplay training</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-difficulty-beginner border-difficulty-beginner/30 bg-difficulty-beginner/10">
                <Zap className="w-3 h-3 mr-1" />
                Pro Plan
              </Badge>
              <Button variant="secondary" size="sm">
                View All Scenarios
              </Button>
            </div>
          </div>
        </header>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatsCard 
              title="Total Sessions"
              value={321}
              subtitle="Completed simulations"
              icon={Target}
              trend={{ value: 12, isPositive: true }}
            />
            <StatsCard 
              title="Training Time"
              value="24.5h"
              subtitle="This month"
              icon={Clock}
              trend={{ value: 8, isPositive: true }}
            />
            <StatsCard 
              title="Avg. Score"
              value="87%"
              subtitle="Performance rating"
              icon={Award}
              trend={{ value: 3, isPositive: true }}
            />
            <StatsCard 
              title="Streak"
              value="7 days"
              subtitle="Keep it up!"
              icon={Zap}
            />
          </div>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Available Scenarios</h2>
              <p className="text-sm text-muted-foreground">Choose a training scenario</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                All
              </Button>
              <Button variant="ghost" size="sm" className="text-difficulty-beginner">
                Beginner
              </Button>
              <Button variant="ghost" size="sm" className="text-difficulty-intermediate">
                Intermediate
              </Button>
              <Button variant="ghost" size="sm" className="text-difficulty-advanced">
                Advanced
              </Button>
            </div>
          </div>

          <ScenarioSelector />
        </div>
      </main>
    </div>
  )
}
