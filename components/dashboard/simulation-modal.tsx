"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  X, 
  Mic, 
  MicOff, 
  Send,
  Bot,
  User,
  Loader2,
  Volume2
} from "lucide-react"
import type { Difficulty } from "./scenario-card"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface SimulationModalProps {
  isOpen: boolean
  onClose: () => void
  scenario: {
    title: string
    difficulty: Difficulty
    description: string
  } | null
}

const difficultyColors: Record<Difficulty, string> = {
  beginner: "text-difficulty-beginner",
  intermediate: "text-difficulty-intermediate", 
  advanced: "text-difficulty-advanced"
}

const difficultyLabels: Record<Difficulty, string> = {
  beginner: "Początkujący",
  intermediate: "Średniozaawansowany",
  advanced: "Zaawansowany"
}

const initialMessages: Record<string, string> = {
  "Ekipa zniszczyła mi dach!": "Panie! Co tam się dzieje?! Pańscy ludzie właśnie zrzucili dachówkę na moje grządki! I spóźnili się trzy godziny! To jest jakiś żart! Żądam natychmiastowego przerwania prac!",
  "Obiekcja: \"To się pali!\"": "Wie pan co, czytałem w internecie, że te panele często powodują pożary. Boję się, że spalę sobie dom. Czy to jest w ogóle bezpieczne? Sąsiadowi się stodoła spaliła od zwarcia.",
  "Premium vs \"Tania oferta z OLX\"": "No wie pan, oferta wygląda fajnie, ale mam tu wycenę od Pana Mietka z OLX. Też 10kW, ale za 28 tysięcy, a nie 35. Dlaczego mam przepłacać 7 tysięcy za to samo?",
  "Reklamacja rachunków": "Dzień dobry. Dostałem właśnie rachunek za prąd. Miało być za darmo, a muszę płacić 300 złotych! Ta instalacja chyba nie działa, obiecywał pan zerowe rachunki!",
  "Decyzyjny Klincz": "Mąż uparł się na te panele, ale ja się absolutnie nie zgadzam. Zeszpecą nam cały dach, a dopiero co go robiliśmy. Wolałabym wydać te pieniądze na wakacje.",
  "Sąsiad mi odradził": "Dzień dobry, chciałbym odstąpić od umowy. Sąsiad Janusz mi powiedział, że teraz zmieniają się przepisy i fotowoltaika się już w ogóle nie opłaca. Nie chcę wtopić pieniędzy."
}

// Kontekst branżowy dla AI (instrukcja systemowa)
const branzaContext = 
    "KONTEKST BRANŻOWY: Sprzedaż instalacji fotowoltaicznych (PV) i pomp ciepła w Polsce. "  + 
    "Jako klient znasz podstawowe pojęcia (panele, falownik, dotacja Mój Prąd), "  + 
    "ale boisz się oszustów, pożaru i tego, że inwestycja się nie zwróci. "  + 
    "Często powołujesz się na opinie sąsiadów lub fora internetowe.";

export function SimulationModal({ isOpen, onClose, scenario }: SimulationModalProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && scenario) {
      const initialMessage = initialMessages[scenario.title] || "Cześć! W czym mogę Ci dzisiaj pomóc?"
      setMessages([
        {
          id: "1",
          role: "assistant",
          content: initialMessage,
          timestamp: new Date()
        }
      ])
    } else {
      setMessages([])
    }
  }, [isOpen, scenario])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue("")
    setIsLoading(true)

    // Simulate AI response
    await new Promise(resolve => setTimeout(resolve, 1500))

    const responses = [
      "Rozumiem Twoją frustrację. Pozwól, że zobaczę, co mogę zrobić, aby rozwiązać tę sytuację.",
      "To świetny punkt widzenia. Możesz powiedzieć o tym coś więcej?",
      "Doceniam, że się tym ze mną dzielisz. Rozpracujmy to razem.",
      "Słyszę, co mówisz. Oto co sugeruję zrobić dalej...",
      "Dziękuję za cierpliwość. Chcę się upewnić, że rozwiejemy wszystkie Twoje wątpliwości."
    ]

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: responses[Math.floor(Math.random() * responses.length)],
      timestamp: new Date()
    }

    setMessages(prev => [...prev, assistantMessage])
    setIsLoading(false)
  }

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    if (!isRecording) {
      // Simulate voice recording
      setTimeout(() => {
        setInputValue("To jest symulowana wiadomość głosowa.")
        setIsRecording(false)
      }, 2000)
    }
  }

  if (!isOpen || !scenario) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-3xl h-[85vh] mx-4 bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-secondary">
              <Bot className={cn("w-5 h-5", difficultyColors[scenario.difficulty])} />
            </div>
            <div>
              <h2 className="font-semibold text-card-foreground">{scenario.title}</h2>
              <p className="text-xs text-muted-foreground capitalize">Poziom: {difficultyLabels[scenario.difficulty]}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-muted-foreground hover:text-card-foreground"
          >
            <X className="w-5 h-5" />
            <span className="sr-only">Zamknij symulację</span>
          </Button>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div className={cn(
                "flex items-center justify-center w-9 h-9 rounded-full flex-shrink-0",
                message.role === "user" 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-secondary"
              )}>
                {message.role === "user" ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className={cn("w-4 h-4", difficultyColors[scenario.difficulty])} />
                )}
              </div>
              <div className={cn(
                "max-w-[75%] px-4 py-3 rounded-2xl",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-secondary-foreground rounded-bl-md"
              )}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                <span className={cn(
                  "text-xs mt-1.5 block",
                  message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                )}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {message.role === "assistant" && (
                <button 
                  className="self-end p-2 text-muted-foreground hover:text-card-foreground transition-colors"
                  aria-label="Odtwórz dźwięk"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary flex-shrink-0">
                <Bot className={cn("w-4 h-4", difficultyColors[scenario.difficulty])} />
              </div>
              <div className="bg-secondary px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Myślę...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <footer className="px-6 py-4 border-t border-border bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Wpisz swoją odpowiedź..."
                className="w-full px-4 py-3 bg-input border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                disabled={isRecording}
              />
            </div>
            
            {/* Microphone Button */}
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "secondary"}
              className={cn(
                "w-12 h-12 rounded-xl transition-all",
                isRecording && "animate-pulse"
              )}
              onClick={toggleRecording}
            >
              {isRecording ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
              <span className="sr-only">{isRecording ? "Zatrzymaj nagrywanie" : "Rozpocznij nagrywanie"}</span>
            </Button>

            {/* Send Button */}
            <Button
              size="icon"
              className="w-12 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
            >
              <Send className="w-5 h-5" />
              <span className="sr-only">Wyślij wiadomość</span>
            </Button>
          </div>
          
          <p className="text-xs text-center text-muted-foreground mt-3">
            Naciśnij Enter, aby wysłać lub użyj mikrofonu do nagrywania
          </p>
        </footer>
      </div>
    </div>
  )
}
