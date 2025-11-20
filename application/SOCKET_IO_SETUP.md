# Socket.IO Real-Time System

## 🚀 Overview

Epitrello utilise Socket.IO pour la communication en temps réel bidirectionnelle entre le serveur et les clients. Cela permet des mises à jour instantanées pour les organisations, les boards, les tâches et les notifications.

## 📦 Architecture

### Serveur (`server.ts`)
- Serveur HTTP personnalisé avec Next.js
- Initialisation de Socket.IO avec le serveur HTTP
- Écoute sur le port 3000 (configurable via `PORT`)

### Socket.IO Server (`lib/socket.ts`)
- Gestion des connexions WebSocket
- Authentification via Better Auth tokens
- Rooms pour organisations et boards
- Helper functions pour émettre des événements

### Socket.IO Client (`hooks/use-socket.ts`)
- Hook React pour la connexion Socket.IO
- Reconnexion automatique avec exponential backoff
- Gestion des rooms (join/leave)
- API simple pour écouter et émettre des événements

## 🔌 Événements Disponibles

### Organizations
- `organization:created` - Nouvelle organisation créée
- `organization:updated` - Organisation mise à jour
- `organization:deleted` - Organisation supprimée
- `organization:member-added` - Nouveau membre ajouté
- `organization:member-removed` - Membre retiré
- `organization:member-role-changed` - Rôle de membre changé
- `organization:invitation-created` - Nouvelle invitation envoyée
- `organization:invitation-accepted` - Invitation acceptée
- `organization:invitation-rejected` - Invitation rejetée
- `organization:invitation-cancelled` - Invitation annulée

### Boards (À venir)
- `board:created` - Nouveau board créé
- `board:updated` - Board mis à jour
- `board:deleted` - Board supprimé
- `board:member-added` - Nouveau membre ajouté au board
- `board:member-removed` - Membre retiré du board

### Tasks (À venir)
- `task:created` - Nouvelle tâche créée
- `task:updated` - Tâche mise à jour
- `task:deleted` - Tâche supprimée
- `task:moved` - Tâche déplacée
- `task:assigned` - Tâche assignée

### Notifications
- `notification:new` - Nouvelle notification

## 💻 Utilisation

### Côté Serveur (API Routes)

```typescript
import { emitToOrganization, broadcast } from "@/lib/socket";

// Émettre à tous les membres d'une organisation
emitToOrganization(organizationId, "organization:updated", {
  id: organizationId,
  name: "New Name",
  userId: session.user.id,
});

// Broadcast à tous les clients connectés
broadcast("organization:created", {
  id: organizationId,
  name: "Acme Inc",
  userId: session.user.id,
});
```

### Côté Client (React Components)

```typescript
import { useSocket } from "@/hooks/use-socket";

function MyComponent() {
  const { isConnected, on, off } = useSocket({
    organizationId: "org_123", // Optionnel
    boardId: "board_456",      // Optionnel
    enabled: true,             // Activer/désactiver la connexion
  });

  useEffect(() => {
    if (!isConnected) return;

    const handleUpdate = (data) => {
      console.log("Received update:", data);
      // Mettre à jour le state, refetch les données, etc.
    };

    on("organization:updated", handleUpdate);

    return () => {
      off("organization:updated", handleUpdate);
    };
  }, [isConnected, on, off]);

  return (
    <div>
      Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
    </div>
  );
}
```

## 🔐 Authentification

Les clients doivent fournir un token Better Auth dans le handshake :

```typescript
const socket = io("http://localhost:3000", {
  auth: { token: "better-auth-session-token" }
});
```

Le hook `useSocket` gère automatiquement l'extraction du token depuis les cookies.

## 🏢 Rooms

Les rooms permettent de cibler des groupes spécifiques de clients :

- `org:${organizationId}` - Tous les membres d'une organisation
- `board:${boardId}` - Tous les membres d'un board

Les clients rejoignent automatiquement les rooms appropriées via le hook `useSocket`.

## 🔄 Reconnexion

Le client Socket.IO gère automatiquement la reconnexion :

- **Tentatives maximales** : 5
- **Délai initial** : 1000ms
- **Délai maximum** : 5000ms
- **Exponential backoff** : Activé

## 🧪 Test

Pour tester la connexion Socket.IO :

1. Démarrer le serveur : `bun dev`
2. Ouvrir plusieurs onglets sur la même page
3. Effectuer une action (créer une org, inviter un membre, etc.)
4. Observer les mises à jour en temps réel dans tous les onglets

## 📊 Monitoring

Les logs Socket.IO sont visibles dans la console :

```
✅ Socket.IO connected
📍 Joined organization room: org_123
🏓 Pong received (latency: 23ms)
❌ Socket.IO disconnected: transport close
```

## 🚧 Prochaines Étapes

- [ ] Implémenter les événements pour les boards
- [ ] Implémenter les événements pour les tasks
- [ ] Ajouter le drag-and-drop en temps réel
- [ ] Implémenter la synchronisation optimiste
- [ ] Ajouter Redis adapter pour le scaling horizontal
- [ ] Implémenter le rate limiting
- [ ] Ajouter des métriques et analytics

## 📝 Notes Techniques

- **Transport** : WebSocket (fallback sur polling)
- **CORS** : Configuré pour NEXTAUTH_URL
- **Heartbeat** : Ping/pong automatique
- **Reconnexion** : Gérée automatiquement par le client

## 🔗 Ressources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
- [Better Auth Documentation](https://www.better-auth.com/)
