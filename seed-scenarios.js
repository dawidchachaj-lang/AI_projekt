import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Brakuje kluczy Supabase w pliku .env.local!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const newScenarios = [
  {
    title: 'Awaria chłodni z lekami (Rynek DACH)',
    description:
      'Kierowca dzwoni z trasy w Niemczech, że agregat padł. Temperatura rośnie. Spedytor musi szybko zorganizować przeładunek lub renegocjować warunki z klientem, broniąc marży.',
    difficulty: 'hard',
    system_prompt:
      'Jesteś nerwowym kierowcą ciężarówki (Mirek). Jedziesz na trasie Monachium-Berlin. Agregat chłodniczy przestał działać, temperatura rośnie o 1 stopień co 10 minut. Oczekujesz natychmiastowej decyzji spedytora. Jeśli spedytor zrzuci na Ciebie winę, grozisz porzuceniem ładunku.',
    created_at: new Date().toISOString(),
  },
  {
    title: 'Anulowanie zlecenia na godzinę przed załadunkiem',
    description:
      'Klient B2B w ostatniej chwili anuluje duże zlecenie spotowe. Przewoźnik już podstawił auto. Cel spedytora: wynegocjować postojowe i nie stracić relacji z klientem.',
    difficulty: 'medium',
    system_prompt:
      'Jesteś kluczowym klientem (duży zakład produkcyjny). Musisz anulować transport, bo produkcja nie zeszła z taśmy. Jesteś nieugięty i nie chcesz płacić kary za anulację. Używaj twardych argumentów biznesowych. Zgodzisz się na zapłatę 30% postojowego tylko wtedy, gdy spedytor zaoferuje zniżkę na kolejny transport.',
    created_at: new Date().toISOString(),
  },
  {
    title: 'Twarde negocjacje o 50 EUR (Spot)',
    description:
      'Klasyczna przepychanka na giełdzie. Mamy ładunek za 1000 EUR, przewoźnik chce 1100 EUR. Cel: obronić marżę i zbić stawkę do max 1050 EUR.',
    difficulty: 'easy',
    system_prompt:
      'Jesteś dyspozytorem w małej firmie transportowej. Masz wolne auto blisko miejsca załadunku, ale wiesz, że na rynku brakuje aut. Twoja cena wyjściowa to 1100 EUR. Schodzisz z ceny bardzo niechętnie, maksymalnie po 10-20 EUR w dół za każdym argumentem spedytora.',
    created_at: new Date().toISOString(),
  },
]

async function seedScenarios() {
  console.log('Rozpoczynam wgrywanie scenariuszy logistycznych do Supabase...')

  const { error } = await supabase
    .from('scenarios')
    .upsert(newScenarios, { onConflict: 'title' })

  if (error) {
    console.error('Wystąpił błąd podczas dodawania rekordów:', error)
  } else {
    console.log('Sukces! Scenariusze zostały dodane/zaktualizowane w bazie danych.')
  }
}

seedScenarios()
