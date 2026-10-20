export type WallReaction = 'love' | 'haha' | 'fire' | 'clap' | 'wow' | 'sad'
export type WallReportReason = 'spam' | 'harassment' | 'inappropriate' | 'other'
export type WallStatus = 'published' | 'hidden'
export type WallView = 'reported' | 'hidden' | 'all'
export type ModerationAction = 'hide' | 'restore' | 'dismiss'

export interface WallSettings {
  enabled: boolean
  maxPostsPerDay: number
  /** Distinct reports that hide a post or comment until reviewed (0 = never). */
  autoHideReports: number
}

export interface WallSummary {
  wall: WallSettings
  reported: number
  hidden: number
  postsToday: number
}

export interface WallAuthor {
  id: string
  name: string
  email: string | null
  phone: string | null
  username: string
  banned: boolean
  wallBlocked: boolean
}

export interface WallPostAdmin {
  id: string
  text: string
  images: Array<{ url: string; width: number; height: number }>
  reactions: Record<WallReaction, number>
  reactionsCount: number
  commentsCount: number
  createdAt: string
  status: WallStatus
  hiddenBy: 'admin' | 'reports' | null
  hiddenAt: string | null
  pendingReports: number
  pendingCommentReports: number
  author: WallAuthor | null
}

export interface WallCommentAdmin {
  id: string
  text: string
  createdAt: string
  status: WallStatus
  hiddenBy: 'admin' | 'reports' | null
  pendingReports: number
  author: WallAuthor | null
}

export interface WallReport {
  id: string
  targetType: 'post' | 'comment'
  target: string
  reason: WallReportReason
  status: 'pending' | 'reviewed'
  createdAt: string
  reporter: string
}

export interface WallPostDetail {
  post: WallPostAdmin
  comments: WallCommentAdmin[]
  reports: WallReport[]
}

export const REACTION_EMOJI: Record<WallReaction, string> = {
  love: '❤️',
  haha: '😂',
  fire: '🔥',
  clap: '👏',
  wow: '😮',
  sad: '😢',
}

export const REPORT_REASONS: Record<WallReportReason, string> = {
  harassment: 'Insultes ou harcèlement',
  inappropriate: 'Contenu choquant',
  spam: 'Spam ou publicité',
  other: 'Autre',
}
