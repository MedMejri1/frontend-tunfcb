import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { EyeOff, Flag, MessageCircle, MessagesSquare, Search, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/form'
import { Pagination } from '@/components/ui/table'
import { Tabs } from '@/components/ui/tabs'
import { EmptyState, PageHeader, StatCard, UserAvatar } from '@/components/common'
import { api, assetUrl } from '@/lib/api'
import { useDebounced, useUrlFilters } from '@/lib/hooks'
import type { Paginated } from '@/lib/types'
import { cn, timeAgo } from '@/lib/utils'
import { useWallSummary, WALL_KEY } from './api'
import { WallPostDialog, WallStatusBadge } from './WallPostDialog'
import { WallSettingsCard } from './WallSettingsCard'
import { REACTION_EMOJI, type WallPostAdmin, type WallReaction, type WallView } from './types'

const TABS: Array<{ value: WallView; label: string }> = [
  { value: 'reported', label: 'Signalées' },
  { value: 'hidden', label: 'Masquées' },
  { value: 'all', label: 'Toutes' },
]

export function WallPage() {
  const [filters, setFilters] = useUrlFilters({ view: 'reported', search: '', page: '1', post: '' })
  const search = useDebounced(filters.search)
  const page = Number(filters.page) || 1
  const summary = useWallSummary()

  const posts = useQuery({
    queryKey: [...WALL_KEY, 'list', { view: filters.view, search, page }],
    queryFn: async () =>
      (
        await api.get<Paginated<WallPostAdmin> & { counts: Record<WallView, number> }>('/admin/wall/posts', {
          params: { view: filters.view, search: search || undefined, page, limit: 18 },
        })
      ).data,
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  })
  const counts = posts.data?.counts

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mur des fans"
        description="Statuts et photos des supporters, publiés sans validation. Vous traitez ici les signalements : au-delà du seuil, une publication est masquée automatiquement en attendant votre décision."
      />

      {summary.data && <WallSettingsCard wall={summary.data.wall} />}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Publications aujourd’hui" value={summary.data?.postsToday ?? '—'} icon={Sparkles} tone="blau" />
        <StatCard label="À traiter" value={summary.data?.reported ?? '—'} hint="Publications ou commentaires signalés" icon={Flag} tone="gold" />
        <StatCard label="Masquées" value={summary.data?.hidden ?? '—'} icon={EyeOff} tone="grana" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <Tabs
            value={filters.view as WallView}
            onChange={(view) => setFilters({ view })}
            options={TABS.map((t) => ({ ...t, count: counts?.[t.value] }))}
          />
          <div className="relative ml-auto w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="pl-9"
              placeholder="Texte, nom ou email de l’auteur…"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
        </div>

        {posts.isLoading ? (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : !posts.data?.items.length ? (
          <EmptyState
            icon={MessagesSquare}
            title={filters.view === 'reported' ? 'Rien à traiter' : 'Aucune publication'}
            message={filters.view === 'reported' ? 'Aucun signalement en attente : le mur est calme.' : undefined}
          />
        ) : (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {posts.data.items.map((p) => (
              <PostTile key={p.id} post={p} onOpen={() => setFilters({ post: p.id, page: String(page) })} />
            ))}
          </div>
        )}

        {posts.data && posts.data.pages > 1 && (
          <Pagination page={page} pages={posts.data.pages} total={posts.data.total} onPage={(p) => setFilters({ page: String(p) })} />
        )}
      </Card>

      <WallPostDialog postId={filters.post || null} onClose={() => setFilters({ post: '', page: String(page) })} />
    </div>
  )
}

function PostTile({ post, onOpen }: { post: WallPostAdmin; onOpen: () => void }) {
  const reported = post.pendingReports + post.pendingCommentReports
  const top = (Object.keys(REACTION_EMOJI) as WallReaction[])
    .filter((r) => post.reactions[r] > 0)
    .sort((a, b) => post.reactions[b] - post.reactions[a])
    .slice(0, 3)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'flex cursor-pointer flex-col gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-blau/40 hover:shadow-md',
        reported > 0 ? 'border-amber-300' : 'border-slate-200',
        post.status === 'hidden' && 'bg-slate-50',
      )}
    >
      <div className="flex items-center gap-2">
        <UserAvatar name={post.author?.name ?? '?'} seed={post.author?.id} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-navy-900">{post.author?.name ?? 'Compte supprimé'}</p>
          <p className="text-xs text-slate-400">{timeAgo(post.createdAt)}</p>
        </div>
        <WallStatusBadge status={post.status} hiddenBy={post.hiddenBy} />
      </div>

      {post.text && (
        <p className="line-clamp-4 whitespace-pre-wrap text-sm text-slate-700" dir="auto">
          {post.text}
        </p>
      )}

      {post.images.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5">
          {post.images.map((img) => (
            <img key={img.url} src={assetUrl(img.url)} alt="" loading="lazy" className="aspect-square w-full rounded-md object-cover" />
          ))}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {post.reactionsCount > 0 && (
          <span>
            {top.map((r) => REACTION_EMOJI[r]).join('')} {post.reactionsCount}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          {post.commentsCount}
        </span>
        {post.pendingReports > 0 && (
          <Badge tone="gold" className="ml-auto">
            <Flag className="h-3 w-3" />
            {post.pendingReports} signalement{post.pendingReports > 1 ? 's' : ''}
          </Badge>
        )}
        {post.pendingCommentReports > 0 && (
          <Badge tone="gold" className={post.pendingReports > 0 ? '' : 'ml-auto'}>
            <MessageCircle className="h-3 w-3" />
            {post.pendingCommentReports} sur les commentaires
          </Badge>
        )}
      </div>
    </button>
  )
}
