# 🏢 API REST - Gestion des Organisations

## Vue d'ensemble

API complète pour la gestion des organisations, des membres et des invitations avec contrôle d'accès basé sur les rôles.

---

## 🔐 Authentification

Toutes les routes nécessitent une session utilisateur active. L'authentification est vérifiée via `auth.api.getSession()`.

---

## 📋 Endpoints

### Organizations

#### `GET /api/organizations`
Liste toutes les organisations dont l'utilisateur est membre.

**Response:**
```json
[
  {
    "id": "org_123",
    "name": "My Company",
    "slug": "my-company",
    "logo": null,
    "createdAt": "2025-11-20T10:00:00Z",
    "role": "owner",
    "memberCount": 5,
    "teamCount": 3,
    "members": [...],
    "_count": {
      "members": 5,
      "team": 3
    }
  }
]
```

#### `POST /api/organizations`
Crée une nouvelle organisation (l'utilisateur devient automatiquement owner).

**Request:**
```json
{
  "name": "My Company",
  "slug": "my-company",
  "logo": "https://...",
  "metadata": { "key": "value" }
}
```

**Response:** `201 Created`
```json
{
  "id": "org_123",
  "name": "My Company",
  "slug": "my-company",
  "logo": "https://...",
  "createdAt": "2025-11-20T10:00:00Z"
}
```

**Errors:**
- `400` - Nom ou slug manquant
- `409` - Slug déjà utilisé

#### `DELETE /api/organizations?organizationId=org_123`
Supprime une organisation (réservé aux owners).

**Response:** `200 OK`
```json
{ "success": true }
```

**Errors:**
- `400` - ID manquant
- `403` - Seuls les owners peuvent supprimer
- `404` - Organisation introuvable

---

### Organization Details

#### `GET /api/organizations/[id]`
Récupère les détails complets d'une organisation.

**Response:**
```json
{
  "id": "org_123",
  "name": "My Company",
  "slug": "my-company",
  "logo": null,
  "createdAt": "2025-11-20T10:00:00Z",
  "currentUserRole": "admin",
  "members": [
    {
      "id": "mem_456",
      "role": "owner",
      "createdAt": "2025-11-20T10:00:00Z",
      "user": {
        "id": "user_789",
        "name": "John Doe",
        "email": "john@example.com",
        "image": "https://..."
      }
    }
  ],
  "invitations": [
    {
      "id": "inv_012",
      "email": "new@example.com",
      "role": "member",
      "status": "pending",
      "expiresAt": "2025-11-27T10:00:00Z"
    }
  ],
  "team": [...],
  "_count": {
    "members": 5,
    "team": 3
  }
}
```

**Errors:**
- `403` - Utilisateur n'est pas membre
- `404` - Organisation introuvable

#### `PATCH /api/organizations/[id]`
Met à jour une organisation (réservé aux owners et admins).

**Request:**
```json
{
  "name": "New Name",
  "logo": "https://...",
  "metadata": { "key": "value" }
}
```

**Response:** `200 OK`
```json
{
  "id": "org_123",
  "name": "New Name",
  ...
}
```

**Errors:**
- `403` - Seuls owners/admins peuvent modifier

---

### Members

#### `GET /api/organizations/[id]/members`
Liste tous les membres d'une organisation.

**Response:**
```json
[
  {
    "id": "mem_456",
    "role": "owner",
    "createdAt": "2025-11-20T10:00:00Z",
    "organizationId": "org_123",
    "userId": "user_789",
    "user": {
      "id": "user_789",
      "name": "John Doe",
      "email": "john@example.com",
      "image": "https://...",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  }
]
```

**Errors:**
- `403` - Utilisateur n'est pas membre

#### `PATCH /api/organizations/[id]/members`
Modifie le rôle d'un membre.

**Request:**
```json
{
  "userId": "user_789",
  "role": "admin"
}
```

**Response:** `200 OK`
```json
{
  "id": "mem_456",
  "role": "admin",
  "user": { ... }
}
```

**Règles:**
- Owners et admins peuvent modifier les rôles
- Admins ne peuvent pas gérer les owners
- Admins ne peuvent pas promouvoir au rôle owner
- Impossible de rétrograder le dernier owner

**Errors:**
- `400` - Données invalides ou dernier owner
- `403` - Permissions insuffisantes
- `404` - Membre introuvable

#### `DELETE /api/organizations/[id]/members?userId=user_789`
Retire un membre de l'organisation.

**Response:** `200 OK`
```json
{ "success": true }
```

**Règles:**
- Owners et admins peuvent retirer des membres
- Les utilisateurs peuvent se retirer eux-mêmes
- Admins ne peuvent pas retirer les owners
- Impossible de retirer le dernier owner

**Errors:**
- `400` - User ID manquant ou dernier owner
- `403` - Permissions insuffisantes
- `404` - Membre introuvable

---

### Invitations

#### `POST /api/organizations/[id]/invitations`
Invite un nouveau membre.

**Request:**
```json
{
  "email": "new@example.com",
  "role": "member"
}
```

**Response:** `201 Created`
```json
{
  "id": "inv_012",
  "organizationId": "org_123",
  "email": "new@example.com",
  "role": "member",
  "status": "pending",
  "inviterId": "user_789",
  "expiresAt": "2025-11-27T10:00:00Z"
}
```

**Règles:**
- Owners et admins peuvent inviter
- Admins ne peuvent pas inviter des owners
- Expiration par défaut : 7 jours

**Errors:**
- `400` - Email ou rôle invalide
- `403` - Permissions insuffisantes
- `409` - Utilisateur déjà membre ou invitation existante

#### `DELETE /api/organizations/[id]/invitations?invitationId=inv_012`
Annule une invitation en attente.

**Response:** `200 OK`
```json
{ "success": true }
```

**Règles:**
- Owners et admins peuvent annuler

**Errors:**
- `400` - Invitation ID manquant
- `403` - Permissions insuffisantes
- `404` - Invitation introuvable

---

## 👥 Système de Rôles

### Owner (Propriétaire)
**Permissions:**
- ✅ Toutes les permissions admin
- ✅ Supprimer l'organisation
- ✅ Promouvoir/rétrograder n'importe quel membre
- ✅ Inviter des owners

**Restrictions:**
- ❌ Impossible de se retirer si dernier owner
- ❌ Impossible d'être rétrogradé si dernier owner

### Admin (Administrateur)
**Permissions:**
- ✅ Modifier les détails de l'organisation
- ✅ Inviter des membres et admins
- ✅ Modifier les rôles des membres (sauf owners)
- ✅ Retirer des membres (sauf owners)
- ✅ Annuler les invitations

**Restrictions:**
- ❌ Ne peut pas supprimer l'organisation
- ❌ Ne peut pas gérer les owners
- ❌ Ne peut pas inviter d'owners

### Member (Membre)
**Permissions:**
- ✅ Voir les détails de l'organisation
- ✅ Voir la liste des membres
- ✅ Se retirer de l'organisation

**Restrictions:**
- ❌ Ne peut pas inviter de nouveaux membres
- ❌ Ne peut pas modifier les rôles
- ❌ Ne peut pas modifier l'organisation

---

## 🔒 Sécurité

### Validation des permissions
Toutes les routes vérifient :
1. ✅ Session utilisateur active
2. ✅ Appartenance à l'organisation
3. ✅ Rôle suffisant pour l'action demandée

### Protection contre les abus
- ❌ Impossible de supprimer le dernier owner
- ❌ Impossible de créer plusieurs organisations avec le même slug
- ❌ Impossible d'inviter un membre existant
- ⏰ Les invitations expirent après 7 jours

### Cascade de suppression
Lors de la suppression d'une organisation :
- 🗑️ Tous les membres sont supprimés
- 🗑️ Toutes les invitations sont supprimées
- 🗑️ Toutes les équipes sont supprimées
- 🗑️ Tous les membres d'équipes sont supprimés

---

## 📊 Interface Utilisateur

### Page Liste (`/dashboard/organizations`)
- 📋 Liste toutes les organisations de l'utilisateur
- ➕ Bouton "Create Organization"
- 👤 Badge de rôle sur chaque carte
- 📧 Bouton "Invite" (raccourci)
- 👉 Clic sur carte → page détails
- 📈 Affichage du nombre de membres

### Page Détails (`/dashboard/organizations/[id]`)

**Statistiques:**
- 👥 Total Members
- 📧 Pending Invitations
- 👤 Your Role

**Onglet Members:**
- 📋 Table de tous les membres
- 🎭 Avatar, nom, email, rôle, date d'adhésion
- 📝 Menu actions (changer rôle, retirer)
- 🎨 Badges colorés par rôle

**Onglet Invitations:**
- 📧 Liste des invitations en attente
- ⏰ Date d'expiration
- ❌ Bouton "Cancel"

**Onglet Danger Zone (owners uniquement):**
- 🗑️ Suppression de l'organisation
- ⚠️ Confirmation obligatoire

**Actions disponibles:**
- ⚙️ Settings (modifier le nom)
- ➕ Invite Member (avec sélection de rôle)
- 📝 Changer le rôle d'un membre
- 🗑️ Retirer un membre
- ❌ Annuler une invitation

---

## 🎨 Design UX

### Badges de rôle
- **Owner**: 👑 Purple (`bg-purple-500/10`)
- **Admin**: 🛡️ Blue (`bg-blue-500/10`)
- **Member**: 👤 Green (`bg-green-500/10`)

### Feedback utilisateur
- ✅ Toast de succès pour chaque action
- ❌ Toast d'erreur avec message explicite
- ⏳ États de chargement (spinners)
- 🔄 Actualisation automatique après actions

### Navigation
- ⬅️ Bouton retour sur page détails
- 👉 Hover effect sur les cartes
- 🎯 Clic direct sur organisation → détails

---

## 🧪 Exemples de flux

### Créer une organisation
1. Utilisateur clique "Create Organization"
2. Remplit nom et slug (auto-généré)
3. `POST /api/organizations`
4. Utilisateur devient automatiquement owner
5. Redirection vers liste actualisée

### Inviter un membre
1. Owner/Admin ouvre page organisation
2. Clique "Invite Member"
3. Entre email et sélectionne rôle
4. `POST /api/organizations/[id]/invitations`
5. Invitation créée avec expiration 7 jours
6. Invité reçoit notification (dans `/dashboard/notifications`)

### Promouvoir un membre
1. Owner/Admin va dans onglet "Members"
2. Clique sur menu actions du membre
3. Sélectionne "Make Admin"
4. `PATCH /api/organizations/[id]/members`
5. Rôle mis à jour instantanément
6. Badge et permissions changent

### Supprimer une organisation
1. Owner va dans "Danger Zone"
2. Clique "Delete"
3. Confirme dans dialog
4. `DELETE /api/organizations?organizationId=...`
5. Cascade : membres, invitations, équipes supprimés
6. Redirection vers `/dashboard/organizations`

---

## 🚀 Prochaines étapes

- [ ] Logs d'audit des actions
- [ ] Webhooks pour événements organisation
- [ ] API pour statistiques d'utilisation
- [ ] Export des données d'organisation
- [ ] Transfert de propriété entre owners
- [ ] Limite configurable de membres par plan
- [ ] Notifications email pour invitations
- [ ] Recherche et filtres dans liste membres
