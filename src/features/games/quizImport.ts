import writeExcelFile from 'write-excel-file/browser'
import readExcelFile from 'read-excel-file/browser'
import type { QuizQuestion } from '@/lib/types'

export type QuestionInput = Pick<QuizQuestion, 'question' | 'options' | 'correctIndex' | 'category' | 'difficulty' | 'active'>

export interface ParsedRow {
  /** Line number in the Excel sheet (as shown by Excel). */
  line: number
  question: string
  answer: string
  input: QuestionInput | null
  error?: string
}

const HEADERS = [
  'Question *',
  'Réponse A *',
  'Réponse B *',
  'Réponse C',
  'Réponse D',
  'Bonne réponse * (A, B, C ou D)',
  'Catégorie',
  'Difficulté (facile, moyen, difficile)',
  'Active (oui / non)',
]
const WIDTHS = [60, 24, 24, 24, 24, 16, 16, 18, 12]

const EXAMPLES: Array<Array<string>> = [
  ['En quelle année le Barça a-t-il été fondé ?', '1899', '1902', '1910', '1889', 'A', 'histoire', 'facile', 'oui'],
  ['Quel joueur portait le numéro 10 lors du sextuplé de 2009 ?', 'Xavi', 'Messi', 'Ronaldinho', 'Iniesta', 'B', 'joueurs', 'moyen', 'oui'],
  ['من هو الهداف التاريخي للبارسا؟', 'لويس سواريز', 'ليونيل ميسي', 'سيزار رودريغيز', 'لازلو كوبالا', 'ب', 'joueurs', 'سهل', 'نعم'],
]

const header = HEADERS.map((value) => ({
  value,
  fontWeight: 'bold' as const,
  backgroundColor: '#0E1A3B',
  textColor: '#FFFFFF',
  wrap: true,
  alignVertical: 'center' as const,
}))

/** Downloads the Excel template: an empty "Questions" sheet, examples and instructions. */
export async function downloadQuizTemplate() {
  const columns = WIDTHS.map((width) => ({ width }))
  const guide = [
    ['Comment remplir le modèle'],
    ['1. Écris une question par ligne dans la feuille « Questions » (pas dans « Exemples »).'],
    ['2. Colonnes obligatoires : Question, Réponse A, Réponse B et Bonne réponse. Les réponses C et D sont optionnelles.'],
    ['3. Bonne réponse : la lettre de la bonne réponse (A, B, C ou D). En arabe, أ ب ج د fonctionnent aussi.'],
    ['4. Les questions peuvent être en français ou en arabe : la langue est détectée automatiquement et l’app affiche l’arabe de droite à gauche.'],
    ['5. Difficulté : facile, moyen ou difficile (vide = moyen). Active : oui ou non (vide = oui).'],
    ['6. Catégories utilisées : histoire, joueurs, trophées, entraîneurs, matchs, stade, actualité (tu peux en créer d’autres).'],
    ['7. Limites : question de 5 à 300 caractères, réponses de 120 caractères maximum, 500 questions par import.'],
    ['8. Les doublons (questions déjà présentes) sont ignorés automatiquement.'],
    ['9. Enregistre le fichier en .xlsx puis importe-le depuis le dashboard : Quiz › Importer.'],
  ]
  await writeExcelFile([
    { data: [header], sheet: 'Questions', columns, stickyRowsCount: 1 },
    { data: [header, ...EXAMPLES], sheet: 'Exemples', columns, stickyRowsCount: 1 },
    {
      data: guide.map((row, i) => [{ value: row[0], fontWeight: i === 0 ? ('bold' as const) : undefined }]),
      sheet: "Mode d'emploi",
      columns: [{ width: 120 }],
    },
  ]).toFile('modele-questions-quiz-tunfcb.xlsx')
}

// ------------------------------------------------------------------ Reading

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    // Latin accents and Arabic marks (harakat, hamza): "أ" → "ا".
    .replace(/[\u0300-\u036f\u064B-\u065F]/g, '')
    .toLowerCase()
    .trim()

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value).trim())

type Column = 'question' | 'a' | 'b' | 'c' | 'd' | 'correct' | 'category' | 'difficulty' | 'active'

function columnOf(headerCell: unknown): Column | null {
  const h = normalize(headerCell)
  if (!h) return null
  if (h.startsWith('bonne')) return 'correct'
  if (h.startsWith('question')) return 'question'
  const answer = h.match(/^reponse\s*([abcd])\b/)
  if (answer) return answer[1] as Column
  if (h.startsWith('categ')) return 'category'
  if (h.startsWith('difficult')) return 'difficulty'
  if (h.startsWith('activ') || h.startsWith('actif')) return 'active'
  return null
}

const LETTERS: Record<string, number> = {
  a: 0, b: 1, c: 2, d: 3, '1': 0, '2': 1, '3': 2, '4': 3,
  'أ': 0, 'ا': 0, 'ب': 1, 'ج': 2, 'د': 3,
}

const DIFFICULTIES: Record<string, QuestionInput['difficulty']> = {
  facile: 'easy', easy: 'easy', 'سهل': 'easy',
  moyen: 'medium', moyenne: 'medium', medium: 'medium', 'متوسط': 'medium',
  difficile: 'hard', hard: 'hard', 'صعب': 'hard',
}

const YES = ['oui', 'yes', 'o', 'y', '1', 'true', 'vrai', 'نعم']
const NO = ['non', 'no', 'n', '0', 'false', 'faux', 'لا']

/** Reads the "Questions" sheet (or the first one) and checks every row. */
export async function parseQuizFile(file: File): Promise<ParsedRow[]> {
  const sheets = await readExcelFile(file)
  const sheet = sheets.find((s) => normalize(s.sheet) === 'questions') ?? sheets[0]
  const data = sheet?.data ?? []

  const headerIndex = data.findIndex((row) => row.some((cell) => columnOf(cell) === 'question'))
  if (headerIndex < 0) throw new Error('Colonne « Question » introuvable : utilise le modèle à télécharger.')

  const columns = new Map<Column, number>()
  data[headerIndex].forEach((cell, i) => {
    const col = columnOf(cell)
    if (col && !columns.has(col)) columns.set(col, i)
  })
  for (const required of ['a', 'b', 'correct'] as const) {
    if (!columns.has(required)) throw new Error('Colonnes manquantes : utilise le modèle à télécharger (Réponse A, Réponse B, Bonne réponse).')
  }

  const rows: ParsedRow[] = []
  data.slice(headerIndex + 1).forEach((row, i) => {
    const get = (col: Column) => (columns.has(col) ? text(row[columns.get(col)!]) : '')
    if (row.every((cell) => text(cell) === '')) return

    const line = headerIndex + 2 + i
    const question = get('question')
    const answers = (['a', 'b', 'c', 'd'] as const).map(get)
    const correctRaw = get('correct')
    const fail = (error: string): ParsedRow => ({ line, question, answer: correctRaw, input: null, error })

    if (!question) return rows.push(fail('Question vide'))
    const filled = answers.map((answer, index) => ({ answer, index })).filter((a) => a.answer)
    if (filled.length < 2) return rows.push(fail('Au moins 2 réponses (A et B)'))

    // The right answer can be a letter, a number or the answer text itself.
    let column = LETTERS[normalize(correctRaw)]
    if (column === undefined) column = answers.findIndex((a) => a && normalize(a) === normalize(correctRaw))
    if (column === undefined || column < 0) return rows.push(fail('Bonne réponse : indique A, B, C ou D'))
    if (!answers[column]) return rows.push(fail(`La bonne réponse (${'ABCD'[column]}) est vide`))

    const difficultyRaw = normalize(get('difficulty'))
    const difficulty = difficultyRaw ? DIFFICULTIES[difficultyRaw] : 'medium'
    if (!difficulty) return rows.push(fail('Difficulté : facile, moyen ou difficile'))

    const activeRaw = normalize(get('active'))
    if (activeRaw && !YES.includes(activeRaw) && !NO.includes(activeRaw)) return rows.push(fail('Active : oui ou non'))

    rows.push({
      line,
      question,
      answer: answers[column],
      input: {
        question,
        options: filled.map((a) => a.answer),
        correctIndex: filled.findIndex((a) => a.index === column),
        category: get('category').toLowerCase() || 'histoire',
        difficulty,
        active: !NO.includes(activeRaw),
      },
    })
  })
  return rows
}

export const isArabic = (value: string) => /[\u0600-\u06FF]/.test(value)
