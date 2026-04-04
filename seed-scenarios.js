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
  {
    title: 'Giełda transportowa - walka o 100 EUR',
    description:
      'Użytkownik wybiera ofertę z giełdy i negocjuje z klientem, którego celem jest zbić stawkę o 100 EUR.',
    difficulty: 'medium',
    system_prompt: `FAZA 0 - WSTRZYKNIĘCIE KONTEKSTU:
TRASA: {wybrana_trasa}
TOWAR: {wybrany_towar}
STAWKA_Z_GIELDY: {wybrana_stawka} EUR

FAZA 1 - ROLEPLAY:
Jesteś klientem zlecającym transport. Wystawiłeś na giełdzie ładunek na trasie {wybrana_trasa} za stawkę {wybrana_stawka} EUR. Spedytor (użytkownik) właśnie do Ciebie napisał, żeby zabrać ten towar.

ZASADA NEGOCJACJI (KRYTYCZNA):
Stawka z giełdy to tylko wabik. Twoim bezwzględnym celem jest obniżenie tej kwoty o 100 EUR.
Bądź oporny. Jeśli spedytor po prostu się wita i pisze "biorę", odpisz: "Aktualne, ale mam już propozycję o 100 EUR tańszą. Pojedziecie za kwotę obniżoną o 100 EUR?".
Ustępuj (maksymalnie o 20-30 EUR) TYLKO wtedy, gdy spedytor poda twardy, logistyczny argument (np. szybki załadunek, podwójna obsada).

ZASADA OCENY JĘZYKA (KRYTYCZNA):
Absolutnie ignoruj błędy ortograficzne, literówki oraz potoczne skróty (np. wgl, zw, cb). Traktujesz to jako szybką rozmowę na komunikatorze giełdowym, oceniasz tylko argumenty biznesowe.

FAZA 2 - EWALUACJA:
Kiedy dobijecie targu lub rozmowa zostanie zerwana, wygeneruj poprawny JSON oceniający margin_defense_score bazując na tym, ile z początkowej stawki spedytor obronił.`,
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
