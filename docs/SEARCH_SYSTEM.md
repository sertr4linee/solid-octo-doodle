# Système de Recherche Puissant

## Vue d'ensemble

Le système de recherche Epitrello offre une recherche full-text avancée avec filtres, recherches sauvegardées, historique et raccourcis clavier.

## 🎯 Fonctionnalités

### ✅ Implémenté

1. **Recherche Full-Text**
   - Recherche dans les boards (nom, description)
   - Recherche dans les tasks (titre, description)
   - Recherche dans les comments (contenu)
   - Case-insensitive avec `mode: "insensitive"`
   - Debouncing (300ms) pour optimiser les performances

2. **Filtres Avancés**
   - Labels (multi-sélection)
   - Membres/Assignees (multi-sélection)
   - Date d'échéance (plage de dates)
   - Status/Listes (multi-sélection)
   - Archivés (toggle)
   - Compteur de filtres actifs
   - Bouton "Effacer tous les filtres"

3. **Recherches Sauvegardées**
   - Sauvegarder une recherche avec nom
   - Épingler les recherches favorites
   - Compteur d'utilisation
   - Charger une recherche sauvegardée
   - Supprimer une recherche
   - Tri : épinglées → plus utilisées → dernières modifiées

4. **Historique de Recherche**
   - Enregistrement automatique de chaque recherche
   - Affichage des 20 dernières recherches
   - Compteur de résultats par recherche
   - Click pour relancer une recherche
   - Bouton "Effacer l'historique"

5. **Interface Utilisateur**
   - Command Palette (Dialog modal)
   - Raccourci clavier : **Cmd+K** (⌘K) / **Ctrl+K**
   - Bouton dans la sidebar avec badge ⌘K
   - Résultats groupés par type (Boards, Tasks, Comments)
   - Navigation au clavier (ESC pour fermer)
   - Navigation vers board/task au clic
   - État de chargement avec spinner
   - Empty states informatifs

6. **APIs REST**
   - `POST /api/search` - Recherche principale
   - `GET /api/search/saved` - Liste des recherches sauvegardées
   - `POST /api/search/saved` - Créer une recherche sauvegardée
   - `GET /api/search/saved/[id]` - Récupérer une recherche (incrémente usage)
   - `PATCH /api/search/saved/[id]` - Mettre à jour (nom, épingler)
   - `DELETE /api/search/saved/[id]` - Supprimer une recherche
   - `GET /api/search/history` - Historique (20 dernières)
   - `DELETE /api/search/history` - Effacer l'historique

### 🔄 Améliorations Futures

1. **Opérateurs de Recherche**
   - AND, OR, NOT
   - Guillemets pour phrases exactes
   - Wildcards (* et ?)
   - Recherche par champ (title:, description:, etc.)

2. **Export**
   - Export résultats en CSV
   - Export résultats en JSON
   - Export résultats en PDF

3. **Recherche Avancée**
   - Voice search avec Web Speech API
   - Suggestions/autocomplétion en temps réel
   - Recherche par image/cover
   - Recherche par date de création/modification

4. **Performance**
   - Intégration Elasticsearch ou Algolia
   - Indexation full-text avancée
   - Caching des résultats fréquents
   - Pagination des résultats

## 📊 Modèles de Base de Données

### SavedSearch

```prisma
model SavedSearch {
  id          String   @id
  userId      String
  name        String
  query       String
  filters     String?  // JSON avec filtres
  isGlobal    Boolean  @default(false)
  isPinned    Boolean  @default(false)
  usageCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### SearchHistory

```prisma
model SearchHistory {
  id          String   @id
  userId      String
  query       String
  filters     String?  // JSON
  resultCount Int      @default(0)
  clickedResult String?
  createdAt   DateTime @default(now())

  @@index([userId, createdAt])
}
```

## 🔧 Structure des Composants

```
components/
├── search-command.tsx       # Command Palette principal (⌘K)
│   ├── SearchResult         # Interface résultats
│   ├── SavedSearch          # Interface recherches sauvegardées
│   ├── SearchHistory        # Interface historique
│   ├── Cmd+K shortcut       # Raccourci clavier
│   ├── Debounced search     # Recherche optimisée
│   └── Navigation handlers  # Navigation vers résultats
│
└── search-filters.tsx       # Panneau de filtres (Sheet)
    ├── Labels filter        # Multi-sélection labels
    ├── Members filter       # Multi-sélection membres
    ├── Status filter        # Multi-sélection status/listes
    ├── Date range           # Plage de dates
    ├── Archived toggle      # Inclure archivés
    └── Clear all filters    # Réinitialisation
```

## 🚀 Utilisation

### Ouvrir la Recherche

**Raccourci clavier** :
- Mac : `Cmd + K` (⌘K)
- Windows/Linux : `Ctrl + K`

**Bouton** :
- Cliquer sur le bouton "Rechercher..." dans la sidebar

### Rechercher

1. Tapez votre requête dans le champ de recherche
2. Les résultats s'affichent automatiquement (debounce 300ms)
3. Résultats groupés par type : Boards, Tasks, Comments
4. Cliquez sur un résultat pour y naviguer

### Utiliser les Filtres

1. Cliquez sur "Filtres" (badge avec nombre de filtres actifs)
2. Sélectionnez les filtres souhaités :
   - Labels : sélectionnez un ou plusieurs labels
   - Membres : sélectionnez un ou plusieurs membres
   - Status : sélectionnez une ou plusieurs listes
   - Date : définissez une plage de dates
   - Archivés : inclure les éléments archivés
3. Les filtres s'appliquent automatiquement
4. Cliquez sur "Effacer tous les filtres" pour réinitialiser

### Sauvegarder une Recherche

1. Effectuez une recherche
2. Cliquez sur "Sauvegarder"
3. Entrez un nom pour la recherche
4. La recherche est sauvegardée avec ses filtres

### Gérer les Recherches Sauvegardées

1. Cliquez sur "Sauvegardées" dans le header
2. Cliquez sur une recherche pour la charger
3. Cliquez sur ⭐ pour épingler/désépingler
4. Cliquez sur 🗑️ pour supprimer

### Consulter l'Historique

1. Cliquez sur "Historique" dans le header
2. Cliquez sur une recherche pour la relancer
3. Cliquez sur "Effacer" pour vider l'historique

## 🎨 Design System

### Composants UI Utilisés

- `Dialog` - Modal principal
- `Sheet` - Panneau latéral de filtres
- `Input` - Champ de recherche
- `Button` - Actions et navigation
- `Badge` - Compteurs et métadonnées
- `Checkbox` - Filtres multi-sélection
- `Separator` - Séparateurs visuels

### Icônes Lucide

- `Search` - Recherche
- `Filter` - Filtres
- `Star` - Sauvegarder/Épingler
- `Clock` - Historique
- `Trash2` - Supprimer
- `FileText` - Boards
- `CheckSquare` - Tasks
- `MessageSquare` - Comments
- `Loader2` - Chargement

## 📝 API Request/Response

### POST /api/search

**Request Body** :
```json
{
  "query": "bug urgent",
  "filters": {
    "labels": ["bug", "urgent"],
    "members": ["user_id_1", "user_id_2"],
    "dateFrom": "2024-01-01",
    "dateTo": "2024-12-31",
    "status": ["list_id_1", "list_id_2"],
    "archived": false
  },
  "scope": "all",
  "boardId": "board_id_optional"
}
```

**Response** :
```json
{
  "boards": [
    {
      "id": "board_1",
      "name": "Bug Tracking",
      "description": "Track all bugs"
    }
  ],
  "tasks": [
    {
      "id": "task_1",
      "title": "Fix urgent bug",
      "description": "Critical bug in production",
      "list": {
        "id": "list_1",
        "name": "In Progress",
        "boardId": "board_1"
      }
    }
  ],
  "comments": [
    {
      "id": "comment_1",
      "content": "This bug is urgent",
      "task": {
        "id": "task_1",
        "title": "Fix urgent bug",
        "list": {
          "boardId": "board_1"
        }
      }
    }
  ],
  "totalResults": 3
}
```

## 🔐 Sécurité

- Authentification requise pour toutes les APIs
- Vérification `session.user.id` sur chaque requête
- Isolation des données par utilisateur
- Pas d'accès aux recherches d'autres utilisateurs
- Validation des entrées
- Protection contre les injections SQL (Prisma)

## 🎯 Performance

### Optimisations Actuelles

- Debouncing (300ms) sur le champ de recherche
- Index sur `SearchHistory` : `[userId, createdAt]`
- Limite de 20 résultats pour l'historique
- Case-insensitive avec Prisma `mode: "insensitive"`
- Relations Prisma optimisées avec `include`

### Optimisations Futures

- Indexation full-text PostgreSQL
- Caching Redis pour recherches fréquentes
- Pagination des résultats (actuellement tous)
- Query optimization avec `select` partiel
- Elasticsearch/Algolia pour grandes bases

## 📚 Références

- [Prisma Full-Text Search](https://www.prisma.io/docs/concepts/components/prisma-client/full-text-search)
- [GitHub Issues Search Syntax](https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog)
- [Lucide Icons](https://lucide.dev/)

## 🐛 Bugs Connus

Aucun bug connu actuellement.

## 🚀 Migration

```bash
# Migration déjà appliquée
npx prisma migrate dev --name add_search_system

# Régénérer le client Prisma
npx prisma generate
```

## 📖 Changelog

### v1.0.0 - 2024-12-04

**Added** :
- ✅ Recherche full-text (boards, tasks, comments)
- ✅ Filtres avancés (labels, membres, dates, status, archivés)
- ✅ Recherches sauvegardées (CRUD complet)
- ✅ Historique de recherche (20 dernières)
- ✅ Command Palette avec Cmd+K / Ctrl+K
- ✅ Interface utilisateur complète
- ✅ 8 APIs REST pour la recherche
- ✅ Modèles de base de données (SavedSearch, SearchHistory)
- ✅ Migration Prisma
- ✅ Documentation complète

**Database** :
- `SavedSearch` model avec userId, name, query, filters, isPinned, usageCount
- `SearchHistory` model avec userId, query, filters, resultCount, createdAt
- Index sur `SearchHistory [userId, createdAt]`

**Components** :
- `components/search-command.tsx` (500+ lignes)
- `components/search-filters.tsx` (300+ lignes)
- Intégration dans `components/app-sidebar.tsx`

**APIs** :
- `POST /api/search` - Recherche principale
- `GET/POST /api/search/saved` - Gestion recherches sauvegardées
- `GET/PATCH/DELETE /api/search/saved/[id]` - CRUD recherche individuelle
- `GET/DELETE /api/search/history` - Gestion historique
