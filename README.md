# Tunfcb — Administration

Tableau de bord React (Vite + TypeScript + Tailwind + React Query) de l'application Tunfcb.

## Démarrer

L'API (`../barca-backend`) doit tourner sur le port 4000.

```bash
npm install
npm run dev     # http://localhost:5173
```

En développement, `/api` est redirigé vers `http://localhost:4000` (voir `vite.config.ts`).
En production, définir `VITE_API_URL` (ex. `https://api.tunfcb.tn/api`).

Le logo officiel est lu depuis `public/logo.png`.

## Pages

| Page | Contenu |
| --- | --- |
| Tableau de bord | KPI, inscriptions, joueurs actifs, points distribués, top de la semaine |
| Utilisateurs | Recherche, filtres, fiche détaillée, ajustement de points, suspension, mot de passe |
| Classement | Jour / semaine / mois / année / général, filtre par pays |
| Transactions | Grand livre des points avec filtres |
| Quiz | Banque de questions, questions du jour, statistiques de réussite |
| Pronostics | Matchs ESPN, matchs manuels, règlement, pronostics par match |
| Missions | Missions quotidiennes et hebdomadaires |
| Règles & récompenses | Bonus quotidien, quiz, roue, pubs, parrainage, niveaux (super admin) |
| Notifications | Envoi à tous ou à un supporter, historique |
| Administrateurs | Équipe d'administration (super admin) |
