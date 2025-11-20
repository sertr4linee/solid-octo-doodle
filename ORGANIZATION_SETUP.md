# 📋 Configuration des Organisations pour Epitrello

## 🎯 Architecture recommandée

### Hiérarchie

```
User (Utilisateur)
  └── Organization (Workspace - ex: "Mon Entreprise")
       ├── Members (Membres avec rôles)
       │    ├── owner (Propriétaire)
       │    ├── admin (Administrateur)
       │    └── member (Membre)
       └── Teams (Boards/Tableaux Trello-like)
            ├── Team "Marketing" → Board Marketing
            ├── Team "Développement" → Board Dev
            └── Team Members (Membres spécifiques au board)
```

### Mapping Trello → Epitrello

| Trello | Epitrello | Better Auth |
|--------|-----------|-------------|
| Workspace | Organization | `organization` |
| Board | Team | `team` |
| Workspace Members | Organization Members | `member` |
| Board Members | Team Members | `teamMember` |

---

## ✅ Configuration actuelle

### Paramètres de base

```ts
organization({
  allowUserToCreateOrganization: true,    // ✅ Tout le monde peut créer un workspace
  organizationLimit: 10,                  // ✅ Max 10 workspaces par user
  creatorRole: "owner",                   // ✅ Créateur = owner
  membershipLimit: 50,                    // ✅ Max 50 membres/workspace
  invitationExpiresIn: 604800,           // ✅ 7 jours (au lieu de 48h)
  invitationLimit: 100,                   // ✅ Max 100 invitations
  requireEmailVerificationOnInvitation: false, // ✅ Pas de vérif email obligatoire
  cancelPendingInvitationsOnReInvite: true,   // ✅ Annule les anciennes invitations
})
```

### Teams (Boards)

```ts
teams: {
  enabled: true,                    // ✅ Activé
  maximumTeams: 20,                 // ✅ Max 20 boards par workspace
  allowRemovingAllTeams: false,     // ✅ Garde toujours 1 board minimum
}
```

---

## 🔐 Système de permissions

### Rôles par défaut

#### `owner` (Propriétaire)
- ✅ Contrôle total du workspace
- ✅ Peut supprimer le workspace
- ✅ Peut gérer tous les membres
- ✅ Peut créer/modifier/supprimer des boards
- ✅ Peut inviter des membres

#### `admin` (Administrateur)
- ✅ Peut gérer les membres (sauf owner)
- ✅ Peut créer/modifier/supprimer des boards
- ✅ Peut inviter des membres
- ❌ Ne peut pas supprimer le workspace
- ❌ Ne peut pas changer le owner

#### `member` (Membre)
- ✅ Peut voir les boards auxquels il appartient
- ✅ Peut créer des cartes/tâches
- ❌ Ne peut pas inviter de membres
- ❌ Ne peut pas gérer les boards
- ❌ Permissions limitées

---

## 🚀 Fonctionnalités à implémenter

### Phase 1 : Base (✅ Déjà fait)
- [x] Créer une organisation (workspace)
- [x] Inviter des membres
- [x] Gérer les rôles
- [x] Teams (boards) activés
- [x] Structure de base en place

### Phase 2 : Boards/Teams (🔄 En cours)
- [ ] Créer un board automatique "General" à la création du workspace
- [ ] Page de gestion des boards (`/dashboard/boards`)
- [ ] Ajouter/retirer des membres d'un board spécifique
- [ ] Active board (board actuel)
- [ ] Navigation entre boards

### Phase 3 : Cartes & Tâches
- [ ] Créer des listes dans un board
- [ ] Créer des cartes dans une liste
- [ ] Drag & drop des cartes
- [ ] Assignation de membres aux cartes
- [ ] Labels, dates, checklists

### Phase 4 : Avancé
- [ ] Notifications en temps réel
- [ ] Activité/historique
- [ ] Recherche globale
- [ ] Templates de boards
- [ ] Export de données

---

## 📊 Structure de données recommandée

### Extensions à ajouter aux tables

#### Organization (Workspace)
```ts
schema: {
  organization: {
    additionalFields: {
      // Couleur du workspace
      color: {
        type: "string",
        defaultValue: "#0079BF",
      },
      // Description
      description: {
        type: "string",
        required: false,
      },
      // Nombre de boards
      boardCount: {
        type: "number",
        defaultValue: 0,
      }
    }
  }
}
```

#### Team (Board)
```ts
schema: {
  team: {
    additionalFields: {
      // Couleur du board
      backgroundColor: {
        type: "string",
        defaultValue: "#0079BF",
      },
      // Description du board
      description: {
        type: "string",
        required: false,
      },
      // Visibilité
      visibility: {
        type: "string", // "private" | "workspace" | "public"
        defaultValue: "workspace",
      },
      // Favoris
      isFavorite: {
        type: "boolean",
        defaultValue: false,
      },
      // Ordre d'affichage
      position: {
        type: "number",
        defaultValue: 0,
      }
    }
  }
}
```

---

## 🎨 Pages à créer

### 1. `/dashboard/organizations`
**Déjà créé** ✅
- Créer un workspace
- Inviter des membres
- Gérer les membres

### 2. `/dashboard/boards` (À créer)
```tsx
// Liste tous les boards du workspace actif
// - Créer nouveau board
// - Grille de boards avec couleurs
// - Boards favoris en haut
// - Accès rapide aux boards
```

### 3. `/dashboard/boards/[boardId]` (À créer)
```tsx
// Vue Kanban du board
// - Listes (colonnes)
// - Cartes dans les listes
// - Drag & drop
// - Membres du board
// - Paramètres du board
```

### 4. `/dashboard/settings` (À créer)
```tsx
// Paramètres du workspace
// - Infos générales
// - Membres
// - Rôles et permissions
// - Paramètres de sécurité
```

---

## 💡 Recommandations spécifiques

### 1. Utiliser les Teams comme Boards
✅ **Fait** : Teams activés

**Pourquoi ?**
- Better Auth gère déjà les teams avec membres
- Structure parfaite pour les boards Trello
- Permissions granulaires par board
- Pas besoin de créer une table `Board` séparée

### 2. Ne PAS utiliser Dynamic Access Control
❌ **Pas recommandé pour Epitrello**

**Raisons :**
- Les 3 rôles de base (owner/admin/member) suffisent
- Plus simple à gérer
- Meilleure performance
- Moins de complexité pour les utilisateurs

### 3. Workflow de création

**Nouveau utilisateur :**
1. S'inscrit sur Epitrello
2. Est redirigé vers une page de création de workspace
3. Crée son premier workspace (devient owner)
4. Un board "General" est créé automatiquement
5. Peut inviter des membres

**Membre invité :**
1. Reçoit un email d'invitation
2. Clique sur le lien (s'inscrit si nouveau)
3. Rejoint le workspace avec le rôle assigné
4. Voit les boards auxquels il a accès

### 4. Gestion des boards (teams)

```tsx
// Créer un board
await authClient.organization.createTeam({
  name: "Marketing Board",
  organizationId: activeOrganization.id
});

// Ajouter un membre au board
await authClient.organization.addTeamMember({
  teamId: boardId,
  userId: memberId
});

// Définir le board actif
await authClient.organization.setActiveTeam({
  teamId: boardId
});
```

---

## 🔧 Prochaines étapes

### 1. Fixer OAuth (Urgent) ✅
Les boutons Google/GitHub ne redirigent pas.
**Solution :** Vérifier les variables d'environnement et la config Better Auth.

### 2. Créer board par défaut
Hook `afterCreateOrganization` → créer un board "General"

### 3. Page Boards
Créer `/dashboard/boards` pour lister et gérer les boards

### 4. Navigation
Améliorer la sidebar pour afficher :
- Workspace actif
- Liste des boards
- Switch rapide entre workspaces

### 5. Board Kanban View
Créer la vue Kanban avec listes et cartes

---

## 📝 Exemple de code

### Créer workspace + board par défaut

```ts
// auth.ts
organizationHooks: {
  afterCreateOrganization: async ({ organization, member, user }) => {
    // Créer un board "General" par défaut
    await prisma.team.create({
      data: {
        id: generateId(),
        name: "General",
        organizationId: organization.id,
        createdAt: new Date(),
      }
    });
    
    console.log(`✅ Workspace "${organization.name}" created with default board`);
  }
}
```

### Component de sélection de board

```tsx
// components/board-switcher.tsx
export function BoardSwitcher() {
  const { data: boards } = authClient.useListUserTeams();
  const { data: activeBoard } = authClient.organization.useActiveTeam();
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button variant="ghost">
          {activeBoard?.name || "Select Board"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {boards?.map(board => (
          <DropdownMenuItem
            key={board.id}
            onClick={() => authClient.organization.setActiveTeam({ teamId: board.id })}
          >
            {board.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 🎯 Conclusion

**Pour Epitrello, utilise :**
- ✅ Organizations = Workspaces
- ✅ Teams = Boards
- ✅ 3 rôles simples (owner/admin/member)
- ✅ Invitations par email (7 jours)
- ✅ Max 10 workspaces par user
- ✅ Max 20 boards par workspace
- ✅ Max 50 membres par workspace
- ❌ Pas de Dynamic Access Control
- ❌ Pas de rôles personnalisés

Cette configuration est **simple, scalable et parfaite** pour un clone de Trello ! 🚀
