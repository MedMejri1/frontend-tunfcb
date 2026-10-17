export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export type AdminRole = 'super_admin' | 'admin'

export interface Admin {
  id: string
  name: string
  email: string
  role: AdminRole
  active: boolean
  lastLoginAt?: string
  createdAt: string
}

export type TransactionType =
  | 'quiz'
  | 'wheel'
  | 'prediction'
  | 'ad'
  | 'streak'
  | 'mission'
  | 'referral'
  | 'admin'
  | 'spent'

export interface AppUser {
  id: string
  firstName: string
  lastName: string
  name: string
  username: string
  email: string
  city: string
  country: string
  status: 'active' | 'banned'
  banReason?: string
  bannedAt?: string
  balance: number
  xp: number
  level: number
  levelName: string
  currentXp: number
  nextLevelXp: number | null
  streak: number
  bestStreak: number
  referralCode: string
  referralsCount: number
  lastActiveAt?: string
  lastLoginAt?: string
  createdAt: string
  isDemo?: boolean
}

export interface Transaction {
  id: string
  type: TransactionType
  title: string
  detail?: string
  points: number
  balanceAfter: number
  createdAt: string
  createdBy?: string
  user?: { id: string; name: string; username: string } | null
}

export interface TypeTotal {
  type: TransactionType
  points: number
  count: number
}

export interface UserDetail {
  user: AppUser
  ranks: { all: number | null; week: number | null; weekPoints: number }
  pointsByType: TypeTotal[]
  games: {
    quiz: { played: number; perfect: number; accuracy: number }
    predictions: { total: number; exact: number; correct: number; wrong: number; pending: number }
    wheelSpins: number
    adsWatchedToday: number
  }
  referrer: { id: string; name: string; username: string } | null
  referrals: Array<{ id: string; name: string; username: string; createdAt: string }>
  recentTransactions: Transaction[]
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'year' | 'all'

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  username: string
  initials: string
  country: string
  city?: string
  level: number
  points: number
}

export interface Overview {
  users: { total: number; banned: number; newToday: number; new7d: number; new30d: number; activeToday: number; active7d: number }
  points: { circulating: number; distributedToday: number; distributed7d: number; distributed30d: number }
  games: { quizToday: number; wheelToday: number; adsToday: number; predictionsToday: number; openMatches: number }
  /** Work waiting for the team. */
  todo: { cafesPending: number; ordersPending: number; supportOpen: number; wallReported: number }
  wall: { postsToday: number; posts7d: number; comments7d: number; reactions7d: number; posters7d: number; hidden: number }
  cafes: { approved: number; byGovernorate: Array<{ name: string; count: number }> }
  shop: { open: boolean; monthOrders: number; deliveredRevenue: number }
  audience: {
    pushMembers: number
    guests: number
    guestsActive7d: number
    lastReminder: { kind: string; sent: number; at: string } | null
    injured: number
  }
  timeseries: Array<{ day: string; signups: number; points: number; players: number; posts: number }>
  pointsByType: TypeTotal[]
  topWeek: LeaderboardEntry[]
  recentUsers: Array<{ id: string; name: string; username: string; country: string; createdAt: string }>
}

export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  language: 'fr' | 'ar'
  active: boolean
  timesAsked: number
  successRate: number | null
  createdAt: string
}

export interface QuizStats {
  activeQuestions: number
  totalQuestions: number
  today: { dayKey: string; questions: Array<{ id: string; question: string }>; players: number }
  history: Array<{ dayKey: string; players: number; accuracy: number; perfect: number }>
}

export type MissionEvent =
  | 'news_read'
  | 'quiz_completed'
  | 'quiz_perfect'
  | 'ad_watched'
  | 'prediction_made'
  | 'wheel_spun'
  | 'streak_claimed'
  | 'referral_completed'

export interface Mission {
  id: string
  scope: 'daily' | 'weekly'
  event: MissionEvent
  title: string
  description: string
  icon: string
  color: string
  target: number
  reward: number
  active: boolean
  order: number
}

export interface MatchTeam {
  id?: string
  name: string
  short: string
  logo?: string
}

export type MatchStatus = 'open' | 'closed' | 'settled' | 'cancelled'

export interface PredictionMatch {
  id: string
  espnEventId?: string
  competition: string
  home: MatchTeam
  away: MatchTeam
  kickoff: string
  venue?: string
  status: MatchStatus
  result?: { home: number; away: number }
  settledAt?: string
  predictionsCount: number
}

export interface MatchPrediction {
  id: string
  home: number
  away: number
  outcome: 'pending' | 'exact' | 'correct' | 'wrong' | 'void'
  pointsAwarded: number
  createdAt: string
  user: { id: string; name: string; username: string } | null
}

export type NotificationCategory = 'match' | 'reward' | 'quiz' | 'news' | 'system' | 'referral' | 'order' | 'support' | 'wall'

export interface AdminNotification {
  id: string
  title: string
  message: string
  category: NotificationCategory
  createdAt: string
  createdBy: string | null
  user: { name: string; username: string } | null
}

export interface WheelSegment {
  label: string
  points: number
  weight: number
  color: string
}

export interface Settings {
  levels: Array<{ level: number; name: string; minXp: number }>
  streakRewards: number[]
  quiz: { questionsPerQuiz: number; pointsPerCorrect: number; perfectBonus: number; secondsPerQuestion: number }
  wheel: { cooldownHours: number; segments: WheelSegment[] }
  ads: {
    rewardPerAd: number
    maxPerDay: number
    cooldownSeconds: number
    doubleRewards: boolean
    interstitial: { enabled: boolean; everyArticles: number; minIntervalMinutes: number }
    nativeFeed: { enabled: boolean; firstPosition: number; interval: number }
  }
  predictions: { exactScorePoints: number; correctOutcomePoints: number; closeMinutesBeforeKickoff: number }
  referral: { referrerPoints: number; refereePoints: number }
  shop: ShopSettings
  push: PushSettings
}

/** Automatic push notifications; times are HH:MM (Tunis). */
export interface PushSettings {
  matchReminder: { enabled: boolean; minutesBefore: number }
  matchEnd: { enabled: boolean }
  morning: { enabled: boolean; time: string }
  evening: { enabled: boolean; time: string }
}

export interface PushStatus {
  devices: number
  matchesOptIn: number
  gamesOptIn: number
  recentDaily: Array<{ key: string; sent: number; at: string }>
  recentMatches: Array<{ espnEventId: string; reminderSentAt?: string; endSentAt?: string }>
}

// ------------------------------------------------------------ Shop (amounts in millimes)

export interface ShopSettings {
  enabled: boolean
  shippingFee: number
  freeShippingFrom: number
  maxQuantityPerItem: number
}

export type ProductCategory = 'maillots' | 'accessoires' | 'autres'
export type ProductStatus = 'draft' | 'published' | 'archived'

export interface Product {
  id: string
  name: string
  description: string
  category: ProductCategory
  price: number
  images: string[]
  sizes: string[]
  stock: number | null
  sold: number
  featured: boolean
  status: ProductStatus
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'delivered' | 'cancelled'

export interface OrderListItem {
  id: string
  number: string
  status: OrderStatus
  createdAt: string
  total: number
  itemsCount: number
  customer: { name: string; phone: string; governorate: string }
  user: { id: string; name: string; email: string } | null
}

export interface OrderTracking {
  carrier?: string
  trackingNumber?: string
  trackingUrl?: string
}

export interface OrderDetail {
  id: string
  number: string
  status: OrderStatus
  createdAt: string
  updatedAt: string
  items: Array<{ productId: string; name: string; image?: string; size?: string; unitPrice: number; quantity: number; lineTotal: number }>
  subtotal: number
  shippingFee: number
  total: number
  paymentMethod: 'cash_on_delivery'
  shipping: { fullName: string; phone: string; governorate: string; city: string; address: string; note?: string }
  history: Array<{ status: OrderStatus; at: string; note?: string; by: 'user' | 'admin'; adminName?: string }>
  tracking: OrderTracking
  cancelReason?: string
  adminNote: string
  nextStatuses: OrderStatus[]
  user: { id: string; name: string; email: string; username: string } | null
}

export interface ShopSummary {
  shop: ShopSettings
  ordersByStatus: Record<OrderStatus, number>
  deliveredRevenue: number
  monthOrders: number
  publishedProducts: number
  lowStock: Array<{ id: string; name: string; stock: number }>
}

// ------------------------------------------------------------ Support (contact requests)

export type SupportCategory = 'question' | 'compte' | 'jeux' | 'boutique' | 'bug' | 'suggestion' | 'autre'
export type SupportStatus = 'open' | 'answered' | 'closed'

export interface SupportTicketSummary {
  id: string
  number: string
  category: SupportCategory
  subject: string
  status: SupportStatus
  createdAt: string
  lastMessageAt: string
  lastMessage: { from: 'user' | 'admin'; body: string } | null
  messagesCount: number
  unread: boolean
  user: { id: string; name: string; email: string } | null
}

export interface SupportTicketDetail extends Omit<SupportTicketSummary, 'user'> {
  messages: Array<{ from: 'user' | 'admin'; body: string; at: string; adminName?: string }>
  order: { id: string; number: string; status: OrderStatus; total: number } | null
  user: { id: string; name: string; email: string; username: string; memberSince: string; ticketsCount: number } | null
}

// ------------------------------------------------------------ Team (infirmary)

export type InjurySeverity = 'minor' | 'moderate' | 'severe'

export interface InjuryEntry {
  id: string
  playerId: string
  playerName: string
  position: string
  injuryType: string
  expectedReturn: string | null
  returnNote: string
  severity: InjurySeverity
  active: boolean
  healedAt: string | null
  updatedAt: string
}

export interface RosterPlayer {
  id: string
  name: string
  number: number | null
  position: string
}

// ------------------------------------------------------------ Cafés (where to watch the match)

export type CafeStatus = 'pending' | 'approved' | 'rejected'
export type CafeAmenity = 'big_screen' | 'terrace' | 'air_conditioning' | 'wifi' | 'family' | 'parking' | 'booking'

export interface Cafe {
  id: string
  name: string
  governorate: string
  governorateName: string
  delegation: string
  delegationName: string
  address: string
  mapsUrl: string
  screens: number | null
  amenities: CafeAmenity[]
  description: string
  /** Front of the café (/api/cafes/photos/…): pass it through assetUrl. */
  photoUrl: string | null
  managerName: string
  phone: string
  showPhone: boolean
  status: CafeStatus
  rejectionReason: string
  createdAt: string
  reviewedAt: string | null
  /** Supporter who sent it from the app (null: guest mode or added by the team). */
  submittedBy: { id: string; name: string; email: string } | null
}

export interface TnGovernorate {
  value: string
  name: string
  delegations: Array<{ value: string; name: string }>
}
