# 📋 Boards System - Epitrello

## 🎯 Overview

Le système de Boards d'Epitrello est une implémentation complète d'un système de gestion de projets style Kanban avec collaboration en temps réel via Socket.IO.

## 🏗️ Architecture

### Base de données (Prisma)

```prisma
Board
├── id: string
├── name: string
├── description: string?
├── organizationId: string (FK)
├── createdById: string (FK)
├── visibility: "private" | "organization" | "public"
├── background: string (couleur ou image)
├── starred: boolean
├── archived: boolean
└── Relations:
    ├── organization: Organization
    ├── createdBy: User
    ├── members: BoardMember[]
    ├── lists: List[]
    └── activities: Activity[]

BoardMember
├── id: string
├── boardId: string (FK)
├── userId: string (FK)
├── role: "owner" | "admin" | "member"
└── Relations:
    ├── board: Board
    └── user: User

List
├── id: string
├── name: string
├── boardId: string (FK)
├── position: int
├── archived: boolean
└── Relations:
    ├── board: Board
    └── tasks: Task[]

Task
├── id: string
├── title: string
├── description: string?
├── listId: string (FK)
├── position: int
├── assigneeId: string? (FK)
├── dueDate: DateTime?
├── labels: string (JSON)
├── archived: boolean
└── Relations:
    ├── list: List
    ├── assignee: User
    ├── comments: Comment[]
    └── activities: Activity[]
```

## 🔌 API Endpoints

### Boards

#### `GET /api/boards`
Liste tous les boards accessibles par l'utilisateur.

**Query Parameters:**
- `organizationId` (optional) - Filtrer par organisation
- `filter` (optional) - `all`, `my`, `shared`, `archived`

**Response:**
```json
[
  {
    "id": "board_123",
    "name": "Project Alpha",
    "description": "Main project board",
    "organizationId": "org_456",
    "visibility": "private",
    "starred": true,
    "archived": false,
    "background": "#0079BF",
    "organization": {
      "id": "org_456",
      "name": "Acme Inc",
      "slug": "acme-inc"
    },
    "createdBy": {
      "id": "user_789",
      "name": "John Doe",
      "image": "..."
    },
    "members": [...],
    "_count": {
      "lists": 3,
      "members": 5
    },
    "userRole": "owner"
  }
]
```

#### `POST /api/boards`
Crée un nouveau board.

**Body:**
```json
{
  "name": "New Project",
  "description": "Project description",
  "organizationId": "org_456",
  "visibility": "private",
  "background": "#0079BF"
}
```

**Features:**
- ✅ Création automatique de 3 listes par défaut (To Do, In Progress, Done)
- ✅ Ajout du créateur comme owner
- ✅ Création d'une activité
- ✅ Émission d'événement Socket.IO `board:created`

#### `GET /api/boards/[id]`
Récupère les détails d'un board avec listes, tâches et activités.

**Response:**
```json
{
  "id": "board_123",
  "name": "Project Alpha",
  "lists": [
    {
      "id": "list_1",
      "name": "To Do",
      "position": 0,
      "tasks": [
        {
          "id": "task_1",
          "title": "Setup project",
          "description": "...",
          "position": 0,
          "assignee": {...},
          "_count": {
            "comments": 3
          }
        }
      ]
    }
  ],
  "activities": [...],
  "userRole": "owner"
}
```

#### `PATCH /api/boards/[id]`
Met à jour un board (admin/owner seulement).

**Body:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "starred": true,
  "background": "#D29034"
}
```

#### `DELETE /api/boards/[id]`
Supprime un board (owner seulement).

### Board Members

#### `GET /api/boards/[id]/members`
Liste les membres d'un board.

#### `POST /api/boards/[id]/members`
Ajoute un membre au board (admin/owner seulement).

**Body:**
```json
{
  "userId": "user_789",
  "role": "member"
}
```

#### `DELETE /api/boards/[id]/members?userId=user_789`
Retire un membre du board (admin/owner seulement, ne peut pas retirer l'owner).

## 🎨 Interface Utilisateur

### Page Principale (`/dashboard/boards`)

**Features:**
- 📊 Vue en grille avec cartes de boards
- ⭐ Boards favoris en haut
- 🏷️ Filtres: All, My Boards, Shared, Archived
- ➕ Dialog de création de board
- 🎨 Sélecteur de couleur de fond (9 couleurs)
- 👥 Avatars des membres
- 🔔 Connexion Socket.IO temps réel

**Composants:**
- `BoardCard` - Carte individuelle avec preview
- Tabs pour filtres
- Dialog de création avec tous les champs
- Badges pour organisation et rôle

### Page Board (`/dashboard/boards/[id]`)
À implémenter - Vue Kanban avec drag & drop

## ⚡ Socket.IO Events

### Émis par le serveur

#### `board:created`
```typescript
{
  type: "board:created",
  data: {
    id: "board_123",
    name: "New Board",
    organizationId: "org_456",
    userId: "user_789"
  },
  timestamp: Date
}
```

#### `board:updated`
```typescript
{
  type: "board:updated",
  data: {
    id: "board_123",
    name: "Updated Name",
    starred: true,
    userId: "user_789"
  },
  timestamp: Date
}
```

#### `board:deleted`
```typescript
{
  type: "board:deleted",
  data: {
    id: "board_123",
    userId: "user_789"
  },
  timestamp: Date
}
```

#### `board:member-added`
```typescript
{
  type: "board:member-added",
  data: {
    boardId: "board_123",
    member: {
      id: "...",
      userId: "user_789",
      role: "member",
      user: {...}
    },
    userId: "user_admin"
  },
  timestamp: Date
}
```

#### `board:member-removed`
```typescript
{
  type: "board:member-removed",
  data: {
    boardId: "board_123",
    userId: "user_789",
    removedBy: "user_admin"
  },
  timestamp: Date
}
```

## 🔐 Permissions

### Visibilité
- **Private**: Seulement les membres du board
- **Organization**: Tous les membres de l'organisation
- **Public**: Visible par tous (lecture seule si non membre)

### Rôles
- **Owner**: Tous les droits + suppression du board
- **Admin**: Gestion des membres + modification du board
- **Member**: Création/modification de tâches
- **Viewer**: Lecture seule (pour boards publics)

### Restrictions
- ❌ Cannot remove board owner
- ❌ Cannot delete board if not owner
- ❌ Cannot add members if not admin/owner
- ✅ Can star/unstar own boards
- ✅ Can leave board if not owner

## 🎯 Features Implémentées

- ✅ CRUD complet pour boards
- ✅ Gestion des membres
- ✅ Système de permissions (owner/admin/member)
- ✅ Visibilité (private/organization/public)
- ✅ Boards favoris (starred)
- ✅ Archivage de boards
- ✅ Filtres (all/my/shared/archived)
- ✅ Couleurs de fond personnalisables
- ✅ Listes par défaut à la création
- ✅ Socket.IO temps réel
- ✅ Système d'activités
- ✅ UI responsive avec cartes
- ✅ Avatars des membres
- ✅ Badges organisation et rôle

## 🚧 À Implémenter

### Priorité Haute
- [ ] Page board détail avec vue Kanban
- [ ] Drag & drop de tâches entre listes
- [ ] CRUD pour listes
- [ ] CRUD pour tâches
- [ ] Système de commentaires
- [ ] Assignation de tâches

### Priorité Moyenne
- [ ] Labels et catégories
- [ ] Dates d'échéance
- [ ] Pièces jointes
- [ ] Recherche dans les boards
- [ ] Templates de boards
- [ ] Duplication de boards

### Priorité Basse
- [ ] Images de fond personnalisées
- [ ] Statistiques et analytics
- [ ] Export de board (PDF, Excel)
- [ ] Webhooks
- [ ] Intégrations (GitHub, Slack, etc.)
- [ ] Automatisations (Butler)

## 📊 Modèle de Données Complet

```
Organization
    └── Board
        ├── BoardMember (rôles: owner, admin, member)
        ├── List (position: 0, 1, 2...)
        │   └── Task (position: 0, 1, 2...)
        │       ├── Assignee (User)
        │       ├── Comment[]
        │       └── Activity[]
        └── Activity[]
```

## 🧪 Tests

### Scénarios à tester

1. **Création de board**
   - ✅ Avec tous les champs
   - ✅ Listes par défaut créées
   - ✅ Créateur ajouté comme owner
   - ✅ Événement Socket.IO émis

2. **Permissions**
   - ✅ Owner peut tout faire
   - ✅ Admin peut gérer membres
   - ✅ Member peut voir le board
   - ✅ Non-membre ne peut pas accéder (private)

3. **Socket.IO**
   - ✅ Événements reçus en temps réel
   - ✅ Mise à jour automatique de la liste
   - ✅ Toasts de notification

4. **Filtres**
   - ✅ All boards
   - ✅ My boards (créés par moi)
   - ✅ Shared (partagés avec moi)
   - ✅ Archived

## 📝 Notes Techniques

### IDs
- Board: `board_${timestamp}_${random}`
- List: `list_${boardId}_${position}_${timestamp}`
- Task: `task_${listId}_${position}_${timestamp}`
- Activity: `activity_${timestamp}_${random}`

### Timestamps
- `createdAt` - Date de création
- `updatedAt` - Date de dernière modification (auto-update)

### Position
Les listes et tâches utilisent un système de position (int) pour l'ordre.
Pour insérer entre deux éléments, utiliser des positions intermédiaires.

### Background
Les couleurs de fond sont stockées en hexadécimal (#0079BF).
Support futur pour images (URLs).

## 🔗 Relations avec Autres Systèmes

- **Organizations**: Chaque board appartient à une organisation
- **Users**: Via BoardMember pour les permissions
- **Notifications**: Invitations aux boards (à implémenter)
- **Activities**: Historique complet des actions

## 🎉 Prochaines Étapes

1. **Implémenter la vue Kanban**
   - Page `/dashboard/boards/[id]`
   - Composants List et Task
   - Drag & drop avec @dnd-kit

2. **Socket.IO pour tasks**
   - `task:created`, `task:updated`, `task:deleted`
   - `task:moved` pour drag & drop
   - Synchronisation temps réel

3. **Système de commentaires**
   - UI pour ajouter/modifier/supprimer
   - Notifications en temps réel
   - @mentions

4. **Labels et filtres avancés**
   - Couleurs de labels
   - Filtrage par label, assignee, date
   - Vue calendrier
