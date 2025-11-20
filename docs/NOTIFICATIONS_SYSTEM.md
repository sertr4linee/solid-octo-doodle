# 🔔 Système de Notifications Epitrello

## Vue d'ensemble

Le système de notifications d'Epitrello permet aux utilisateurs de recevoir et gérer les invitations aux organisations.

## Fonctionnalités

### 📬 Page Notifications (`/dashboard/notifications`)

La page des notifications affiche toutes les invitations avec les fonctionnalités suivantes :

- **Onglets de filtrage** :
  - **Pending** : Invitations en attente (avec compteur)
  - **Accepted** : Invitations acceptées
  - **Declined** : Invitations refusées
  - **Expired** : Invitations expirées

- **Informations affichées** :
  - Nom de l'organisation
  - Rôle proposé (owner, admin, member)
  - Email de l'inviteur
  - Temps restant avant expiration
  - Statut de l'invitation

- **Actions disponibles** :
  - ✅ **Accept** : Accepter l'invitation et rejoindre l'organisation
  - ❌ **Decline** : Refuser l'invitation
  - 🗑️ **Remove** : Supprimer une invitation expirée

### 🔴 Badge de notification

Un badge rouge apparaît sur l'item "Notifications" dans la sidebar :
- Affiche le nombre d'invitations en attente (non expirées)
- Se met à jour automatiquement toutes les 30 secondes
- Affiche "9+" si plus de 9 notifications
- Visible aussi quand la sidebar est réduite

### 🔄 Rafraîchissement automatique

Le système vérifie automatiquement les nouvelles invitations :
- Polling toutes les 30 secondes
- Compteur en temps réel dans la sidebar
- Pas besoin de rafraîchir la page

## API Endpoints

### `GET /api/auth/organization/list-invitations`

Récupère toutes les invitations de l'utilisateur connecté.

**Response :**
```json
[
  {
    "id": "inv_123",
    "organizationId": "org_456",
    "organizationName": "My Company",
    "organizationSlug": "my-company",
    "inviterEmail": "boss@company.com",
    "inviterName": "Boss Name",
    "email": "user@example.com",
    "role": "admin",
    "status": "pending",
    "expiresAt": "2025-11-27T12:00:00Z"
  }
]
```

## Architecture Technique

### Composants

1. **`/app/dashboard/notifications/page.tsx`**
   - Page principale des notifications
   - Gestion des onglets et filtres
   - Actions accept/reject/cancel

2. **`/hooks/use-notification-count.ts`**
   - Hook React pour récupérer le nombre de notifications
   - Polling automatique toutes les 30 secondes
   - Fonction `refetch()` pour mise à jour manuelle

3. **`/components/app-sidebar.tsx`**
   - Intégration du hook `useNotificationCount`
   - Passage du compteur à la navigation

4. **`/components/layout/nav-main.tsx`**
   - Affichage du badge sur l'item de menu
   - Support des badges dynamiques via prop `badge`

5. **`/app/api/auth/organization/list-invitations/route.ts`**
   - Endpoint API pour récupérer les invitations
   - Filtre par email de l'utilisateur
   - Inclut les détails de l'organisation et de l'inviteur

### Flow de données

```
User Login
    ↓
useNotificationCount hook
    ↓
Fetch /api/auth/organization/list-invitations
    ↓
Filter pending & non-expired
    ↓
Update badge count in sidebar
    ↓
Poll every 30 seconds
```

### Better Auth Integration

Le système utilise les fonctions natives de Better Auth :
- `authClient.organization.acceptInvitation({ invitationId })`
- `authClient.organization.rejectInvitation({ invitationId })`
- `authClient.organization.cancelInvitation({ invitationId })`

## États des invitations

| État | Description | Actions disponibles |
|------|-------------|-------------------|
| `pending` | En attente de réponse | Accept, Decline |
| `accepted` | Acceptée par l'utilisateur | Aucune |
| `rejected` | Refusée par l'utilisateur | Aucune |
| `expired` | Expirée (7 jours par défaut) | Remove |

## Configuration

La durée d'expiration des invitations est configurée dans `/lib/auth.ts` :

```typescript
organization: {
  invitationExpiresIn: 604800, // 7 jours en secondes
  // ...
}
```

## Notifications Toast

Le système affiche des notifications toast pour chaque action :
- ✅ "Invitation accepted! 🎉" → Succès acceptation
- ❌ "Invitation rejected" → Invitation refusée
- ⚠️ "Failed to load invitations" → Erreur de chargement

## Interface utilisateur

### Design des cartes d'invitation

Chaque invitation est affichée dans une card avec :
- 🏢 **Icône organisation** (Building2)
- 📧 **Badge de rôle** (couleur selon le rôle)
- ⏰ **Temps restant** avant expiration
- 🔴 **Badge "Expired"** pour les invitations expirées

### Couleurs des rôles

- **Owner** : Purple (`bg-purple-500/10`)
- **Admin** : Blue (`bg-blue-500/10`)
- **Member** : Green (`bg-green-500/10`)

## États vides

Chaque onglet affiche un message et une icône appropriés quand vide :
- 📬 Pending : "No pending invitations - You're all caught up!"
- ✅ Accepted : "No accepted invitations"
- ❌ Declined : "No declined invitations"
- ⏰ Expired : "No expired invitations"

## TODO / Améliorations futures

- [ ] Notifications push en temps réel (WebSocket/Server-Sent Events)
- [ ] Notifications pour d'autres événements (mentions, commentaires, etc.)
- [ ] Préférences de notifications par utilisateur
- [ ] Email de notification pour nouvelles invitations
- [ ] Filtres avancés (par organisation, par date, etc.)
- [ ] Marquage "lu/non lu" pour les invitations
- [ ] Statistiques des invitations (taux d'acceptation, etc.)
