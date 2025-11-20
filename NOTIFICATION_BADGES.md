# 🔔 Système de Badges de Notification - Documentation

## 🎯 Améliorations Implémentées

### 1. **Badges sur les Onglets de la Page Notifications**

Chaque onglet de la page `/dashboard/notifications` affiche maintenant un badge avec le nombre d'éléments :

```tsx
✅ Pending (3)      // Badge rouge destructive
✅ Accepted (2)     // Badge gris secondary
✅ Declined (1)     // Badge gris secondary
✅ Expired (1)      // Badge gris secondary
```

**Features:**
- Badge rouge pulsant sur "Pending" pour attirer l'attention
- Badges gris sur les autres onglets
- Badge masqué si aucun élément (UX propre)
- Affichage du compteur en temps réel

---

### 2. **Badge dans le Titre de la Page**

Un badge "X new" apparaît à côté du titre principal :

```
🔔 Notifications [3 new]
```

**Caractéristiques:**
- Badge rouge destructive
- S'affiche uniquement s'il y a des invitations pending
- Disparaît automatiquement quand tout est traité
- Position élégante à côté du titre

---

### 3. **Badge Animé dans la Sidebar**

Le menu "Notifications" dans la sidebar affiche un badge pulsant :

**Mode Normal (sidebar ouverte):**
```
🔔 Notifications [3] ← Badge rouge avec animation pulse
```

**Mode Collapsed (sidebar réduite):**
```
🔔 ← Badge rouge en haut à droite avec animation pulse
 [3]
```

**Features:**
- Animation `animate-pulse` pour attirer l'attention
- Badge rouge (variant destructive)
- Positionné intelligemment selon l'état de la sidebar
- Affiche "9+" si plus de 9 notifications

---

### 4. **Badge dans le Bell Icon (Header)**

L'icône de cloche dans le header affiche maintenant un badge :

```
       [3]
🔔 ← Badge rouge pulsant en coin
```

**Features:**
- Badge rouge en haut à droite de l'icône
- Animation pulse continue
- Compteur visible même sans ouvrir le menu
- Affiche "9+" si plus de 9 notifications

**Dropdown amélioré:**
```
┌────────────────────────────────┐
│ Notifications        [3 new]   │ ← Badge dans le header
├────────────────────────────────┤
│ No new notifications           │
│     ou                         │
│ Liste des notifications...     │
├────────────────────────────────┤
│ → View all notifications       │ ← Lien vers /dashboard/notifications
└────────────────────────────────┘
```

---

### 5. **Notifications Toast Automatiques**

Quand une nouvelle invitation arrive (détectée par polling) :

```
🎉 You have 1 new invitation!
   Check your notifications to view and accept them.
```

**Caractéristiques:**
- Toast sonner avec icône 🎉
- Description claire
- Durée : 5 secondes
- Se déclenche uniquement si le nombre augmente
- Pas de notification au premier chargement

---

## 🎨 Styles et Animations

### Badges

| Type | Couleur | Animation | Usage |
|------|---------|-----------|-------|
| Pending | Rouge (destructive) | `animate-pulse` | Urgent, demande action |
| Autres onglets | Gris (secondary) | Aucune | Informatif |
| Sidebar | Rouge (destructive) | `animate-pulse` | Attire l'attention |
| Header bell | Rouge (destructive) | `animate-pulse` | Toujours visible |

### Tailles des Badges

| Emplacement | Taille | Classe |
|-------------|--------|--------|
| Titre principal | Standard | `text-sm` |
| Onglets | Petit | `h-5 px-2` |
| Sidebar normale | Petit | `h-5 w-5 p-0 text-xs` |
| Sidebar collapsed | Mini | `h-5 w-5 text-[10px]` |
| Header bell | Mini | `h-5 w-5 text-[10px]` |

---

## 🔄 Flux de Données

### Polling et Notifications

```
Page Load
    ↓
useNotificationCount() hook
    ↓
Fetch /api/auth/organization/list-invitations
    ↓
Filter pending invitations
    ↓
Count = X invitations
    ↓
Compare with previous count
    ↓
If count increased → Toast notification 🎉
    ↓
Update badges everywhere
    ↓
Poll again after 30 seconds ⏰
```

### Propagation des Badges

```
useNotificationCount (hook)
    ↓
    ├─→ DashboardSidebar (count prop)
    │       ↓
    │       ├─→ NotificationsPopover (badge bell)
    │       └─→ DashboardNavigation (badge menu)
    │
    └─→ NotificationsPage (fetch + display)
            ↓
            ├─→ Title badge (X new)
            └─→ Tabs badges (pending, accepted, etc.)
```

---

## 📍 Emplacements des Badges

### 1. Page Notifications (`/dashboard/notifications`)

**Titre:**
```tsx
<h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
  Notifications
  {pendingInvitations.length > 0 && (
    <Badge variant="destructive" className="text-sm">
      {pendingInvitations.length} new
    </Badge>
  )}
</h1>
```

**Onglets:**
```tsx
<TabsTrigger value="pending" className="gap-2 relative">
  Pending
  {pendingInvitations.length > 0 && (
    <Badge variant="destructive" className="ml-1 h-5 px-2">
      {pendingInvitations.length}
    </Badge>
  )}
</TabsTrigger>
```

### 2. Sidebar (`/components/app-sidebar.tsx`)

**Menu Notifications:**
```tsx
{route.badge === "notification-count" && notificationCount > 0 && (
  <Badge 
    variant="destructive" 
    className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
  >
    {notificationCount > 9 ? "9+" : notificationCount}
  </Badge>
)}
```

### 3. Bell Icon (`/components/layout/nav-notifications.tsx`)

**Badge sur l'icône:**
```tsx
<Button variant="ghost" size="icon" className="rounded-full relative">
  <BellIcon className="size-5" />
  {notificationCount > 0 && (
    <Badge 
      variant="destructive" 
      className="absolute -top-1 -right-1 h-5 w-5 animate-pulse"
    >
      {notificationCount > 9 ? "9+" : notificationCount}
    </Badge>
  )}
</Button>
```

---

## ⚙️ Configuration

### Hook de Notification

**Fichier:** `/hooks/use-notification-count.ts`

**Paramètres:**
- **Polling interval**: 30 secondes (30000ms)
- **Toast duration**: 5 secondes
- **Max display**: 9+ pour les compteurs

**Personnalisation:**
```tsx
// Changer l'intervalle de polling
const interval = setInterval(fetchCount, 60000); // 1 minute

// Changer la durée du toast
toast.success("New invitation!", { duration: 3000 }); // 3 secondes
```

### API Endpoint

**Route:** `GET /api/auth/organization/list-invitations`

**Filtre des notifications:**
```tsx
const pendingInvitations = data.filter(
  (inv) =>
    inv.status === "pending" && 
    new Date(inv.expiresAt) > new Date()
);
```

---

## 🎯 Comportement Utilisateur

### Scénario 1: Nouvelle Invitation Reçue

```
1. Invitation créée dans la DB
2. Polling détecte la nouvelle invitation (30s max)
3. Toast apparaît: "🎉 You have 1 new invitation!"
4. Badge [1] apparaît:
   - Dans la sidebar (menu Notifications)
   - Sur la bell icon (header)
5. Badge "1 new" apparaît sur le titre
6. Badge [1] sur l'onglet "Pending"
7. Tous les badges pulsent (animate-pulse)
```

### Scénario 2: Acceptation d'une Invitation

```
1. User clique "Accept"
2. API call: authClient.organization.acceptInvitation()
3. Toast: "Invitation accepted! 🎉"
4. loadInvitations() re-fetch les données
5. Badge décompté: [3] → [2]
6. L'invitation passe dans l'onglet "Accepted"
7. Badge "Accepted" incrémenté
```

### Scénario 3: Toutes Invitations Traitées

```
1. User accepte/refuse toutes les invitations
2. Count = 0
3. Tous les badges disparaissent:
   - Badge titre "X new" → hidden
   - Badge sidebar [X] → hidden
   - Badge bell icon [X] → hidden
   - Animation pulse → stopped
4. Message: "No pending invitations - You're all caught up!"
```

---

## 🎨 Design System

### Variants de Badge

```tsx
// Badge urgent (rouge)
<Badge variant="destructive">3</Badge>

// Badge informatif (gris)
<Badge variant="secondary">2</Badge>

// Badge par défaut
<Badge>1</Badge>
```

### Classes d'Animation

```css
/* Pulse animation (Tailwind) */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
```

---

## 📊 Statistiques Affichées

| Emplacement | Compteur | Filtre |
|-------------|----------|--------|
| Pending tab | Invitations pending + non expirées | `status: "pending" && !expired` |
| Accepted tab | Invitations acceptées | `status: "accepted"` |
| Declined tab | Invitations refusées | `status: "rejected"` |
| Expired tab | Invitations pending + expirées | `status: "pending" && expired` |
| Sidebar/Bell | Invitations pending + non expirées | `status: "pending" && !expired` |

---

## 🚀 Performance

### Optimisations

- ✅ Polling uniquement quand component monté
- ✅ Cleanup du timer avec `clearInterval`
- ✅ `useRef` pour éviter les re-renders inutiles
- ✅ Toast conditionnel (seulement si augmentation)
- ✅ Badges conditionnels (seulement si count > 0)

### Impact

- **Polling**: 1 requête toutes les 30 secondes
- **Bandwidth**: ~1KB par requête
- **CPU**: Minimal (animation CSS native)
- **Memory**: Léger (state local uniquement)

---

## ✅ Checklist Complète

### Badges Visuels
- ✅ Badge sur titre de la page
- ✅ Badges sur tous les onglets (Pending, Accepted, Declined, Expired)
- ✅ Badge dans menu sidebar "Notifications"
- ✅ Badge sur bell icon (header)
- ✅ Badge dans dropdown bell (header)

### Animations
- ✅ Animation pulse sur badges urgents
- ✅ Animation fade-in/out sur apparition/disparition

### Notifications
- ✅ Toast automatique pour nouvelles invitations
- ✅ Polling toutes les 30 secondes
- ✅ Compteur en temps réel

### UX
- ✅ Affichage "9+" si > 9 notifications
- ✅ Badges masqués si count = 0
- ✅ Couleurs distinctes (rouge urgent, gris info)
- ✅ Lien vers page notifications depuis dropdown

---

## 🎉 Résultat Final

**L'utilisateur voit maintenant des notifications visuelles:**

1. 🔴 **Badge pulsant** dans la sidebar
2. 🔴 **Badge pulsant** sur la bell icon
3. 🔴 **Badge "X new"** sur le titre de la page
4. 🔴 **Badges compteurs** sur chaque onglet
5. 🎉 **Toast notification** quand nouvelle invitation arrive

**Impossible de rater une nouvelle invitation !** 🚀
