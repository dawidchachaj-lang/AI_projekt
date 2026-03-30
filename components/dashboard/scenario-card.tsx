"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { type LucideIcon, Play } from "lucide-react"

export type Difficulty = "beginner" | "intermediate" | "advanced"

interface ScenarioCardProps {
  title: string
  description: string
  icon: LucideIcon
  difficulty: Difficulty
  duration: string
  completions?: number
  onStart: () => void
}

const difficultyConfig: Record<Difficulty, { label: string; badgeClass: string; iconClass: string }> = {
  beginner: {
    label: "Początkujący",
    badgeClass: "bg-difficulty-beginner text-black hover:bg-difficulty-beginner/90",
    iconClass: "text-difficulty-beginner"
  },
  intermediate: {
    label: "Średniozaawansowany",
    badgeClass: "bg-difficulty-intermediate text-black hover:bg-difficulty-intermediate/90",
    iconClass: "text-difficulty-intermediate"
  },
  advanced: {
    label: "Zaawansowany",
    badgeClass: "bg-difficulty-advanced text-white hover:bg-difficulty-advanced/90",
    iconClass: "text-difficulty-advanced"
  }
}

export function ScenarioCard({ 
  title, 
  description, 
  icon: Icon, 
  difficulty, 
  duration,
  completions = 0,
  onStart 
}: ScenarioCardProps) {
  const config = difficultyConfig[difficulty] ?? difficultyConfig.beginner

  return (
    <Card className="group bg-card border-border hover:border-muted-foreground/30 transition-all duration-300">
      <CardHeader className="pb-4 relative">
        <div className="flex justify-between items-start">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-secondary/50 group-hover:bg-secondary transition-colors">
            <Icon className={cn("w-6 h-6", config.iconClass)} />
          </div>
          <Badge className={cn("px-2.5 py-0.5 text-xs font-semibold border-0", config.badgeClass)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-4">
        <h3 className="text-xl font-bold text-card-foreground mb-2">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {description}
        </p>
      </CardContent>
      
      <CardFooter className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-3 text-xs text-muted-foreground font-medium">
          <span>{duration}</span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span>{completions} ukończono</span>
        </div>
        <Button 
          size="sm" 
          onClick={onStart}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-4"
        >
          <Play className="w-3.5 h-3.5 mr-2 fill-current" />
          Rozpocznij
        </Button>
      </CardFooter>
    </Card>
  )
}
