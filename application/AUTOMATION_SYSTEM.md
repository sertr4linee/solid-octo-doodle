# Système d'Automatisation - Documentation

## Vue d'ensemble

Le système d'automatisation permet de créer des règles if-then qui s'exécutent automatiquement lorsque certaines conditions sont remplies sur le tableau kanban. Il offre :

- **Règles if-then** : Déclencheurs, conditions et actions configurables
- **Déplacements automatiques** : Déplacer les cartes entre les listes
- **Assignations automatiques** : Assigner les cartes aux membres
- **Gestion des labels** : Ajouter/supprimer des labels automatiquement
- **Notifications conditionnelles** : Envoyer des notifications basées sur des événements
- **Webhooks** : Intégrations externes via webhooks
- **Templates** : Modèles d'automatisation prédéfinis

## Architecture

### Modèles de données

```prisma
model AutomationRule {
  id            String   @id
  name          String
  description   String?
  boardId       String
  enabled       Boolean  @default(true)
  triggerType   String   // card_created, card_moved, due_date_approaching, etc.
  triggerConfig Json     // Configuration spécifique au déclencheur
  conditions    Json     // Conditions à vérifier avant exécution
  actions       Json     // Actions à exécuter
  priority      Int      @default(0)
  delay         Int      @default(0)  // Délai en secondes
}

model AutomationLog {
  id            String   @id
  ruleId        String
  status        String   // pending, success, error, skipped
  triggerData   Json     // Données du déclencheur
  actionResults Json?    // Résultats des actions
  error         String?
  startedAt     DateTime
  completedAt   DateTime?
}

model AutomationTemplate {
  id          String   @id
  name        String
  description String?
  category    String   // productivity, notifications, workflow, integrations
  triggerType String
  triggerConfig Json
  conditions  Json
  actions     Json
}

model AutomationWebhook {
  id        String   @id
  name      String
  boardId   String
  endpoint  String   @unique
  secret    String
  enabled   Boolean  @default(true)
}
```

### Types de déclencheurs

| Type | Description |
|------|-------------|
| `card_created` | Quand une carte est créée |
| `card_moved` | Quand une carte change de liste |
| `card_updated` | Quand une carte est modifiée |
| `due_date_approaching` | X jours/heures avant l'échéance |
| `due_date_passed` | Quand l'échéance est dépassée |
| `checklist_completed` | Quand tous les items d'une checklist sont cochés |
| `checklist_item_checked` | Quand un item de checklist est coché |
| `comment_added` | Quand un commentaire est ajouté |
| `comment_mention` | Quand quelqu'un est @mentionné |
| `label_added` | Quand un label est ajouté |
| `label_removed` | Quand un label est retiré |
| `member_assigned` | Quand un membre est assigné |
| `member_unassigned` | Quand un membre est désassigné |
| `attachment_added` | Quand une pièce jointe est ajoutée |
| `webhook_received` | Quand un webhook externe est reçu |
| `scheduled` | Selon une expression cron |

### Types d'actions

| Type | Description |
|------|-------------|
| `move_card` | Déplacer la carte vers une liste |
| `assign_member` | Assigner un membre à la carte |
| `unassign_member` | Désassigner un membre |
| `add_label` | Ajouter un label à la carte |
| `remove_label` | Retirer un label |
| `add_comment` | Ajouter un commentaire automatique |
| `send_notification` | Envoyer une notification |
| `send_webhook` | Appeler un webhook externe |
| `set_due_date` | Définir/modifier la date d'échéance |
| `archive_card` | Archiver la carte |
| `copy_card` | Copier la carte dans une autre liste |
| `create_checklist` | Créer une checklist avec des items |
| `mark_checklist_complete` | Marquer tous les items comme complétés |

## API Endpoints

### Règles d'automatisation

```
GET    /api/boards/{boardId}/automations       # Lister les règles
POST   /api/boards/{boardId}/automations       # Créer une règle
GET    /api/boards/{boardId}/automations/{id}  # Détails d'une règle
PUT    /api/boards/{boardId}/automations/{id}  # Modifier une règle
DELETE /api/boards/{boardId}/automations/{id}  # Supprimer une règle
POST   /api/boards/{boardId}/automations/{id}/test  # Tester une règle
GET    /api/boards/{boardId}/automations/{id}/logs  # Logs d'exécution
```

### Webhooks

```
GET  /api/boards/{boardId}/automations/webhooks  # Lister les webhooks
POST /api/boards/{boardId}/automations/webhooks  # Créer un webhook

POST /api/webhooks/automation/{endpoint}  # Recevoir un webhook externe
```

### Templates

```
GET  /api/automations/templates  # Lister les templates
POST /api/automations/templates  # Créer un template
```

## Exemples d'utilisation

### 1. Déplacer vers "Urgent" à l'approche de l'échéance

```json
{
  "name": "Déplacer vers Urgent",
  "triggerType": "due_date_approaching",
  "triggerConfig": {
    "daysBeforeDue": 2
  },
  "conditions": [],
  "actions": [
    {
      "type": "move_card",
      "targetListId": "list_urgent_id"
    }
  ]
}
```

### 2. Ajouter label "Review" quand checklist complétée

```json
{
  "name": "Checklist terminée → Review",
  "triggerType": "checklist_completed",
  "triggerConfig": {},
  "conditions": [],
  "actions": [
    {
      "type": "add_label",
      "labelName": "Review",
      "createIfMissing": true
    }
  ]
}
```

### 3. Assigner automatiquement le créateur

```json
{
  "name": "Auto-assignation",
  "triggerType": "card_created",
  "triggerConfig": {},
  "conditions": [],
  "actions": [
    {
      "type": "assign_member",
      "assignCreator": true
    }
  ]
}
```

### 4. Notifier sur @mention

```json
{
  "name": "Notification mention",
  "triggerType": "comment_mention",
  "triggerConfig": {},
  "conditions": [],
  "actions": [
    {
      "type": "send_notification",
      "notifyType": "assignee",
      "notificationTitle": "Vous avez été mentionné",
      "notificationMessage": "{{user.name}} vous a mentionné dans {{task.title}}"
    }
  ]
}
```

## Variables disponibles

Les variables suivantes peuvent être utilisées dans les messages et payloads :

| Variable | Description |
|----------|-------------|
| `{{task.id}}` | ID de la tâche |
| `{{task.title}}` | Titre de la tâche |
| `{{task.description}}` | Description de la tâche |
| `{{task.dueDate}}` | Date d'échéance |
| `{{user.id}}` | ID de l'utilisateur déclencheur |
| `{{user.name}}` | Nom de l'utilisateur |
| `{{user.email}}` | Email de l'utilisateur |
| `{{board.id}}` | ID du tableau |
| `{{board.name}}` | Nom du tableau |
| `{{list.id}}` | ID de la liste |
| `{{list.name}}` | Nom de la liste |
| `{{label.name}}` | Nom du label (si applicable) |
| `{{comment.content}}` | Contenu du commentaire (si applicable) |

## Conditions

Les conditions permettent de filtrer l'exécution des règles :

### Opérateurs disponibles

| Opérateur | Description |
|-----------|-------------|
| `equals` | Égal à |
| `not_equals` | Différent de |
| `contains` | Contient |
| `not_contains` | Ne contient pas |
| `is_empty` | Est vide |
| `is_not_empty` | N'est pas vide |
| `greater_than` | Supérieur à |
| `less_than` | Inférieur à |

### Champs disponibles

- `task.title`, `task.description`
- `task.priority`
- `task.assigneeId`
- `task.labels` (array)
- `list.name`, `list.id`
- `user.id`, `user.email`

## Webhooks entrants

### Configuration

1. Créez un webhook dans les paramètres du tableau
2. Récupérez l'endpoint et le secret
3. Envoyez des requêtes POST avec signature HMAC-SHA256

### Signature

```javascript
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Ajouter le header: x-webhook-signature: sha256=<signature>
```

### Exemple de payload

```json
{
  "event": "external_trigger",
  "data": {
    "taskId": "task_xxx",
    "action": "update",
    "metadata": {}
  }
}
```

## Interface utilisateur

L'interface d'automatisation est accessible via `/dashboard/boards/{boardId}/automations` et comprend :

1. **Liste des règles** : Vue d'ensemble avec activation/désactivation
2. **Constructeur de règles** : Création visuelle de règles
3. **Galerie de templates** : Templates prédéfinis
4. **Gestionnaire de webhooks** : Configuration des webhooks entrants
5. **Historique d'exécution** : Logs des exécutions passées

## Bonnes pratiques

1. **Éviter les boucles** : Ne créez pas de règles qui peuvent se déclencher mutuellement
2. **Utiliser des délais** : Ajoutez un délai pour éviter les exécutions trop rapides
3. **Tester avant d'activer** : Utilisez la fonction de test
4. **Surveiller les logs** : Vérifiez régulièrement l'historique d'exécution
5. **Limiter les webhooks** : Évitez d'envoyer trop de requêtes externes
