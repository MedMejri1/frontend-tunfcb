import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Eye, EyeOff, Flag, Loader2, ShieldCheck, Trash2, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ConfirmDialog, UserAvatar } from '@/components/common'
import { assetUrl } from '@/lib/api'
import { formatDateTime, timeAgo } from '@/lib/utils'
import {
  useBlockFromWall,
  useDeleteWallComment,
  useDeleteWallPost,
  useModerateComment,
  useModeratePost,
  useWallPost,
} from './api'
import { REACTION_EMOJI, REPORT_REASONS, type WallAuthor, type WallReaction, type WallStatus } from './types'

/** Visibility badge of a post or comment. */
export function WallStatusBadge({ status, hiddenBy }: { status: WallStatus; hiddenBy: 'admin' | 'reports' | null }) {
  if (status === 'published') return <Badge tone="green">Publié</Badge>
  return hiddenBy === 'reports' ? <Badge tone="gold">Masqué (signalements)</Badge> : <Badge tone="slate">Masqué par l’équipe</Badge>
}

function AuthorLine({ author }: { author: WallAuthor | null }) {
  if (!author) return <p className="text-sm font-semibold text-slate-400">Compte supprimé</p>
  return (
    <div className="flex min-w-0 items-center gap-2">
      <UserAvatar name={author.name} seed={author.id} size="sm" />
      <div className="min-w-0">
        <Link to={`/users/${author.id}`} className="block truncate text-sm font-bold text-navy-900 hover:text-blau">
          {author.name}
        </Link>
        <p className="truncate text-xs text-slate-400">{author.email}</p>
      </div>
      {author.wallBlocked && <Badge tone="red">Bloqué du mur</Badge>}
      {author.banned && <Badge tone="red">Compte suspendu</Badge>}
    </div>
  )
}

type Pending = { kind: 'post' | 'comment'; id: string } | null

export function WallPostDialog({ postId, onClose }: { postId: string | null; onClose: () => void }) {
  const detail = useWallPost(postId)
  const moderatePost = useModeratePost()
  const moderateComment = useModerateComment()
  const deletePost = useDeleteWallPost()
  const deleteComment = useDeleteWallComment()
  const block = useBlockFromWall()
  const [toDelete, setToDelete] = useState<Pending>(null)
  const [toBlock, setToBlock] = useState<WallAuthor | null>(null)

  const data = detail.data
  const post = data?.post
  const pendingReports = data?.reports.filter((r) => r.status === 'pending') ?? []
  const reportsOf = (target: string) => pendingReports.filter((r) => r.target === target)

  return (
    <>
      <Dialog open={!!postId} onOpenChange={(open) => !open && onClose()} title="Publication du mur" size="xl">
        {!post ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blau" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <AuthorLine author={post.author} />
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span title={formatDateTime(post.createdAt)}>{timeAgo(post.createdAt)}</span>
                  <WallStatusBadge status={post.status} hiddenBy={post.hiddenBy} />
                </div>
              </div>

              {post.text && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800" dir="auto">{post.text}</p>}

              {post.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {post.images.map((img) => (
                    <a key={img.url} href={assetUrl(img.url)} target="_blank" rel="noreferrer" className="block">
                      <img src={assetUrl(img.url)} alt="" className="aspect-square w-full rounded-lg object-cover hover:opacity-90" />
                    </a>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                {(Object.keys(REACTION_EMOJI) as WallReaction[])
                  .filter((r) => post.reactions[r] > 0)
                  .map((r) => (
                    <span key={r}>
                      {REACTION_EMOJI[r]} {post.reactions[r]}
                    </span>
                  ))}
                <span className="ml-auto">
                  {post.commentsCount} commentaire{post.commentsCount > 1 ? 's' : ''} visible{post.commentsCount > 1 ? 's' : ''}
                </span>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Commentaires ({data.comments.length})</p>
                {!data.comments.length ? (
                  <p className="text-sm text-slate-400">Aucun commentaire.</p>
                ) : (
                  <div className="space-y-2">
                    {data.comments.map((c) => (
                      <div
                        key={c.id}
                        className={`rounded-lg border p-3 ${c.pendingReports > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <AuthorLine author={c.author} />
                          <span className="text-xs text-slate-400">{timeAgo(c.createdAt)}</span>
                          {c.status === 'hidden' && <WallStatusBadge status={c.status} hiddenBy={c.hiddenBy} />}
                          {c.pendingReports > 0 && (
                            <Badge tone="gold">
                              <Flag className="h-3 w-3" />
                              {c.pendingReports}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700" dir="auto">{c.text}</p>
                        {reportsOf(c.id).length > 0 && (
                          <p className="mt-1 text-xs text-amber-700">
                            Signalé pour : {[...new Set(reportsOf(c.id).map((r) => REPORT_REASONS[r.reason]))].join(', ')}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {c.status === 'published' ? (
                            <Button size="sm" variant="outline" onClick={() => moderateComment.mutate({ id: c.id, action: 'hide' })}>
                              <EyeOff className="h-3.5 w-3.5" /> Masquer
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => moderateComment.mutate({ id: c.id, action: 'restore' })}>
                              <Eye className="h-3.5 w-3.5" /> Rétablir
                            </Button>
                          )}
                          {c.pendingReports > 0 && c.status === 'published' && (
                            <Button size="sm" variant="ghost" onClick={() => moderateComment.mutate({ id: c.id, action: 'dismiss' })}>
                              <ShieldCheck className="h-3.5 w-3.5" /> Ignorer les signalements
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-tunisia" onClick={() => setToDelete({ kind: 'comment', id: c.id })}>
                            <Trash2 className="h-3.5 w-3.5" /> Supprimer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Modération</p>
                {post.status === 'published' ? (
                  <Button className="w-full" variant="outline" onClick={() => moderatePost.mutate({ id: post.id, action: 'hide' })}>
                    <EyeOff className="h-4 w-4" /> Masquer la publication
                  </Button>
                ) : (
                  <Button className="w-full" variant="primary" onClick={() => moderatePost.mutate({ id: post.id, action: 'restore' })}>
                    <Eye className="h-4 w-4" /> Rétablir sur le mur
                  </Button>
                )}
                {post.pendingReports > 0 && post.status === 'published' && (
                  <Button className="w-full" variant="ghost" onClick={() => moderatePost.mutate({ id: post.id, action: 'dismiss' })}>
                    <ShieldCheck className="h-4 w-4" /> Ignorer les signalements
                  </Button>
                )}
                <Button className="w-full" variant="danger" onClick={() => setToDelete({ kind: 'post', id: post.id })}>
                  <Trash2 className="h-4 w-4" /> Supprimer définitivement
                </Button>
                {post.author && (
                  <Button
                    className="w-full"
                    variant="ghost"
                    loading={block.isPending}
                    onClick={() =>
                      post.author!.wallBlocked ? block.mutate({ userId: post.author!.id, blocked: false }) : setToBlock(post.author)
                    }
                  >
                    {post.author.wallBlocked ? <UserCheck className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                    {post.author.wallBlocked ? 'Débloquer l’auteur' : 'Bloquer l’auteur du mur'}
                  </Button>
                )}
                <p className="text-xs text-slate-400">
                  Masquer retire la publication de l’app sans l’effacer, et prévient l’auteur. Le blocage l’empêche de publier, commenter
                  et réagir.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Signalements ({data.reports.length})</p>
                {!data.reports.length ? (
                  <p className="text-sm text-slate-400">Aucun signalement.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.reports.map((r) => (
                      <li key={r.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-700">{REPORT_REASONS[r.reason]}</span>
                          {r.status === 'pending' ? <Badge tone="gold">À traiter</Badge> : <Badge>Traité</Badge>}
                        </div>
                        <p className="text-xs text-slate-400">
                          {r.targetType === 'post' ? 'La publication' : 'Un commentaire'} · par {r.reporter} · {timeAgo(r.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete?.kind === 'post' ? 'Supprimer la publication ?' : 'Supprimer le commentaire ?'}
        description={
          toDelete?.kind === 'post'
            ? 'Elle est effacée avec ses photos, réactions et commentaires. Pour la retirer sans l’effacer, utilisez « Masquer ».'
            : 'Le commentaire est effacé définitivement.'
        }
        confirmLabel="Supprimer"
        danger
        onConfirm={async () => {
          if (!toDelete) return
          if (toDelete.kind === 'post') {
            await deletePost.mutateAsync(toDelete.id)
            onClose()
          } else {
            await deleteComment.mutateAsync(toDelete.id)
          }
        }}
      />

      <ConfirmDialog
        open={!!toBlock}
        onOpenChange={(open) => !open && setToBlock(null)}
        title={`Bloquer ${toBlock?.name ?? ''} du mur ?`}
        description="Ce supporter pourra toujours lire le mur mais plus publier, commenter ni réagir. Une notification lui est envoyée. Vous pourrez le débloquer à tout moment."
        confirmLabel="Bloquer"
        danger
        onConfirm={() => toBlock && block.mutateAsync({ userId: toBlock.id, blocked: true })}
      />
    </>
  )
}
