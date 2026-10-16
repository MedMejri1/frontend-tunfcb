import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, FileSpreadsheet, Loader2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { api, apiErrorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import { downloadQuizTemplate, isArabic, parseQuizFile, type ParsedRow } from './quizImport'

interface ImportResult {
  created: number
  valid: number
  rows: Array<{ index: number; status: 'ok' | 'duplicate' | 'invalid'; error?: string; language?: 'fr' | 'ar' }>
}

type Status = 'ok' | 'duplicate' | 'invalid'
interface PreviewRow extends ParsedRow {
  status: Status
  language?: 'fr' | 'ar'
}

const STATUS: Record<Status, { label: string; tone: 'green' | 'gold' | 'red' }> = {
  ok: { label: 'À importer', tone: 'green' },
  duplicate: { label: 'Doublon', tone: 'gold' },
  invalid: { label: 'Erreur', tone: 'red' },
}

/** Excel import: download the template, fill it in, check the preview, import. */
export function QuizImportDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<PreviewRow[] | null>(null)
  const [reading, setReading] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const valid = rows?.filter((r) => r.status === 'ok') ?? []
  const counts = {
    ok: valid.length,
    duplicate: rows?.filter((r) => r.status === 'duplicate').length ?? 0,
    invalid: rows?.filter((r) => r.status === 'invalid').length ?? 0,
  }

  const check = async (file: File) => {
    setReading(true)
    setFileName(file.name)
    setRows(null)
    try {
      const parsed = await parseQuizFile(file)
      if (!parsed.length) throw new Error('Aucune question trouvée dans la feuille « Questions ».')
      const candidates = parsed.filter((r) => r.input)
      // The server checks again and spots questions already in the database.
      const { data } = candidates.length
        ? await api.post<ImportResult>('/admin/quiz/questions/import', {
            questions: candidates.map((r) => r.input),
            dryRun: true,
          })
        : { data: { rows: [] } as Pick<ImportResult, 'rows'> }
      setRows(
        parsed.map((row) => {
          if (!row.input) return { ...row, status: 'invalid' as const }
          const server = data.rows[candidates.indexOf(row)]
          return { ...row, status: server.status, error: server.error, language: server.language }
        }),
      )
    } catch (err) {
      setFileName(null)
      toast.error(err instanceof Error && !('isAxiosError' in err) ? err.message : apiErrorMessage(err))
    } finally {
      setReading(false)
      if (input.current) input.current.value = ''
    }
  }

  const importValid = useMutation({
    mutationFn: async () =>
      (await api.post<ImportResult>('/admin/quiz/questions/import', { questions: valid.map((r) => r.input) })).data,
    onSuccess: (data) => {
      toast.success(`${data.created} question(s) importée(s) · disponibles dans le quiz de l’app`)
      qc.invalidateQueries({ queryKey: ['quiz'] })
      onClose()
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  })

  const download = async () => {
    setDownloading(true)
    try {
      await downloadQuizTemplate()
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => !open && onClose()}
      size="xl"
      title="Importer des questions"
      description="Remplis le modèle Excel (questions en français ou en arabe), puis importe-le. Seules les lignes valides et nouvelles sont ajoutées."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" disabled={!counts.ok} loading={importValid.isPending} onClick={() => importValid.mutate()}>
            <Upload className="h-4 w-4" /> Importer {counts.ok || ''} question{counts.ok > 1 ? 's' : ''}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-bold text-navy-900">1. Télécharge le modèle</p>
            <p className="mt-1 text-xs text-slate-500">Feuilles « Questions » à remplir, « Exemples » (français et arabe) et « Mode d’emploi ».</p>
            <Button variant="outline" size="sm" className="mt-3" loading={downloading} onClick={download}>
              <Download className="h-4 w-4" /> Modèle Excel (.xlsx)
            </Button>
          </div>
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) void check(file)
            }}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-left transition-colors hover:border-blau hover:bg-blue-50/40"
          >
            <p className="text-sm font-bold text-navy-900">2. Importe le fichier rempli</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
              {reading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {reading ? 'Vérification…' : (fileName ?? 'Clique ou dépose ton fichier .xlsx ici')}
            </p>
          </button>
          <input
            ref={input}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void check(file)
            }}
          />
        </div>

        {rows && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge tone="green">{counts.ok} à importer</Badge>
              {counts.duplicate > 0 && <Badge tone="gold">{counts.duplicate} doublon(s) ignoré(s)</Badge>}
              {counts.invalid > 0 && <Badge tone="red">{counts.invalid} ligne(s) en erreur</Badge>}
            </div>
            <div className="max-h-[45vh] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Ligne</th>
                    <th className="px-3 py-2">Question</th>
                    <th className="px-3 py-2">Bonne réponse</th>
                    <th className="px-3 py-2">Langue</th>
                    <th className="px-3 py-2">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => {
                    const arabic = r.language === 'ar' || isArabic(r.question)
                    return (
                      <tr key={r.line} className={cn(r.status === 'invalid' && 'bg-red-50/50')}>
                        <td className="px-3 py-2 text-slate-400">{r.line}</td>
                        <td className="max-w-md px-3 py-2">
                          <p dir="auto" className="truncate font-medium text-slate-800">
                            {r.question || '—'}
                          </p>
                          {r.error && <p className="text-xs text-tunisia">{r.error}</p>}
                        </td>
                        <td dir="auto" className="max-w-40 truncate px-3 py-2 text-emerald-700">
                          {r.answer || '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={arabic ? 'violet' : 'blue'}>{arabic ? 'Arabe' : 'Français'}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  )
}
