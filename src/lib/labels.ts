import type {
  MatchStatus,
  MissionEvent,
  NotificationCategory,
  OrderStatus,
  ProductCategory,
  SupportCategory,
  SupportStatus,
  ProductStatus,
  TransactionType,
} from './types'

type Tone = 'slate' | 'blue' | 'green' | 'red' | 'gold' | 'grana' | 'violet'

export const TRANSACTION_TYPES: Record<TransactionType, { label: string; tone: Tone; color: string }> = {
  quiz: { label: 'Quiz', tone: 'gold', color: '#edbb00' },
  wheel: { label: 'Roue', tone: 'grana', color: '#a50044' },
  prediction: { label: 'Pronostic', tone: 'blue', color: '#004d98' },
  ad: { label: 'Publicité', tone: 'green', color: '#10b981' },
  streak: { label: 'Bonus quotidien', tone: 'violet', color: '#7c3aed' },
  mission: { label: 'Mission', tone: 'slate', color: '#0e1a3b' },
  referral: { label: 'Parrainage', tone: 'blue', color: '#0ea5e9' },
  admin: { label: 'Admin', tone: 'red', color: '#e70013' },
  spent: { label: 'Dépense', tone: 'slate', color: '#94a3b8' },
}

export const MATCH_STATUS: Record<MatchStatus, { label: string; tone: Tone }> = {
  open: { label: 'Ouvert', tone: 'green' },
  closed: { label: 'Fermé', tone: 'gold' },
  settled: { label: 'Réglé', tone: 'blue' },
  cancelled: { label: 'Annulé', tone: 'slate' },
}

export const MISSION_EVENTS: Record<MissionEvent, string> = {
  news_read: 'Article lu',
  quiz_completed: 'Quiz terminé',
  quiz_perfect: 'Quiz parfait (100%)',
  ad_watched: 'Publicité regardée',
  prediction_made: 'Pronostic fait',
  wheel_spun: 'Roue tournée',
  streak_claimed: 'Bonus quotidien récupéré',
  referral_completed: 'Ami parrainé',
}

export const NOTIFICATION_CATEGORIES: Record<NotificationCategory, { label: string; tone: Tone }> = {
  match: { label: 'Match', tone: 'blue' },
  reward: { label: 'Récompense', tone: 'gold' },
  quiz: { label: 'Quiz', tone: 'violet' },
  news: { label: 'Actualité', tone: 'grana' },
  system: { label: 'Système', tone: 'slate' },
  referral: { label: 'Parrainage', tone: 'green' },
  order: { label: 'Commande', tone: 'violet' },
  support: { label: 'Support', tone: 'blue' },
}

export const SUPPORT_CATEGORIES: Record<SupportCategory, string> = {
  question: 'Question',
  compte: 'Compte',
  jeux: 'Jeux & points',
  boutique: 'Boutique',
  bug: 'Bug',
  suggestion: 'Suggestion',
  autre: 'Autre',
}

export const SUPPORT_STATUS: Record<SupportStatus, { label: string; tone: Tone }> = {
  open: { label: 'À traiter', tone: 'gold' },
  answered: { label: 'Répondue', tone: 'green' },
  closed: { label: 'Fermée', tone: 'slate' },
}

export const PRODUCT_CATEGORIES: Record<ProductCategory, string> = {
  maillots: 'Maillots',
  accessoires: 'Accessoires',
  autres: 'Autres',
}

export const PRODUCT_STATUS: Record<ProductStatus, { label: string; tone: Tone }> = {
  draft: { label: 'Brouillon', tone: 'slate' },
  published: { label: 'Publié', tone: 'green' },
  archived: { label: 'Archivé', tone: 'gold' },
}

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: Tone; action: string }> = {
  pending: { label: 'En attente', tone: 'gold', action: 'Remettre en attente' },
  confirmed: { label: 'Confirmée', tone: 'blue', action: 'Confirmer' },
  preparing: { label: 'En préparation', tone: 'violet', action: 'Passer en préparation' },
  shipped: { label: 'Expédiée', tone: 'grana', action: 'Marquer expédiée' },
  delivered: { label: 'Livrée', tone: 'green', action: 'Marquer livrée' },
  cancelled: { label: 'Annulée', tone: 'red', action: 'Annuler la commande' },
}

export const COUNTRIES: Record<string, string> = {
  TN: 'Tunisie',
  DZ: 'Algérie',
  MA: 'Maroc',
  LY: 'Libye',
  EG: 'Égypte',
  FR: 'France',
  ES: 'Espagne',
  IT: 'Italie',
  DE: 'Allemagne',
  BE: 'Belgique',
  CA: 'Canada',
}
