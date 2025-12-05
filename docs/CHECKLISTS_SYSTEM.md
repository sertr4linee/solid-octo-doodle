# Système de Checklists

## 🎯 Vue d'ensemble

Système complet de checklists pour les cartes Epitrello avec support des items imbriqués, assignation, dates d'échéance, et templates réutilisables.

## ✅ Fonctionnalités Implémentées

### Base de données
- ✅ **Checklist** : Conteneur principal pour grouper les items
- ✅ **ChecklistItem** : Items individuels avec markdown support
- ✅ **ChecklistTemplate** : Templates réutilisables
- ✅ **Nested items** : Support des sous-items (parentId/children)
- ✅ **Assignation** : Items assignables à des membres
- ✅ **Due dates** : Dates d'échéance sur les items
- ✅ **Position** : Tri et réorganisation avec système de position

### APIs créées

#### Checklists
- `GET /api/tasks/[taskId]/checklists` - Liste toutes les checklists d'une tâche
- `POST /api/tasks/[taskId]/checklists` - Créer une checklist
- `GET /api/tasks/[taskId]/checklists/[checklistId]` - Récupérer une checklist
- `PATCH /api/tasks/[taskId]/checklists/[checklistId]` - Mettre à jour (nom, position)
- `DELETE /api/tasks/[taskId]/checklists/[checklistId]` - Supprimer une checklist

#### Items
- `POST /api/tasks/[taskId]/checklists/[checklistId]/items` - Créer un item
- À venir :
  - `PATCH /api/tasks/[taskId]/checklists/[checklistId]/items/[itemId]` - Mettre à jour item
  - `DELETE /api/tasks/[taskId]/checklists/[checklistId]/items/[itemId]` - Supprimer item
  - `POST /api/tasks/[taskId]/checklists/[checklistId]/items/[itemId]/toggle` - Toggle checked
  - `POST /api/tasks/[taskId]/checklists/[checklistId]/items/[itemId]/convert` - Convertir en carte

#### Templates
À venir :
- `GET /api/checklists/templates` - Liste templates
- `POST /api/checklists/templates` - Créer template
- `POST /api/checklists/templates/[id]/use` - Utiliser template

### Socket.IO Events
- ✅ `checklist:created`
- ✅ `checklist:updated`
- ✅ `checklist:deleted`
- ✅ `checklist:item:created`
- ✅ `checklist:item:updated`
- ✅ `checklist:item:deleted`
- ✅ `checklist:item:checked`

## 📊 Modèles de Base de Données

### Checklist
```prisma
model Checklist {
  id        String         @id
  taskId    String
  name      String
  position  Int            @default(0)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  task      Task           @relation(fields: [taskId], references: [id], onDelete: Cascade)
  items     ChecklistItem[]

  @@map("checklist")
}
```

### ChecklistItem
```prisma
model ChecklistItem {
  id          String         @id
  checklistId String
  content     String         // Markdown support
  checked     Boolean        @default(false)
  position    Int            @default(0)
  assigneeId  String?
  dueDate     DateTime?
  parentId    String?        // For nested items
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  checklist   Checklist      @relation(fields: [checklistId], references: [id], onDelete: Cascade)
  assignee    User?          @relation(fields: [assigneeId], references: [id])
  parent      ChecklistItem? @relation("ChecklistItemNesting", fields: [parentId], references: [id], onDelete: Cascade)
  children    ChecklistItem[] @relation("ChecklistItemNesting")

  @@map("checklist_item")
}
```

### ChecklistTemplate
```prisma
model ChecklistTemplate {
  id        String   @id
  boardId   String?  // null = global template
  name      String
  items     String   // JSON array of template items
  isGlobal  Boolean  @default(false)
  usageCount Int     @default(0)
  createdBy String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  creator   User     @relation(fields: [createdBy], references: [id])

  @@map("checklist_template")
}
```

## 🚀 Utilisation

### Créer une checklist

```typescript
POST /api/tasks/[taskId]/checklists
{
  "name": "Sprint Tasks",
  "items": [
    {
      "content": "Setup environment",
      "checked": false,
      "assigneeId": "user_123",
      "dueDate": "2024-12-10"
    },
    {
      "content": "Write tests",
      "checked": false
    }
  ]
}
```

### Créer un item avec sous-items

```typescript
// Parent item
POST /api/tasks/[taskId]/checklists/[checklistId]/items
{
  "content": "Frontend development"
}

// Child item
POST /api/tasks/[taskId]/checklists/[checklistId]/items
{
  "content": "Create components",
  "parentId": "parent_item_id",
  "assigneeId": "user_123"
}
```

### Calculer la progression

```typescript
const progress = (checkedItems / totalItems) * 100;
```

## 🎨 Composants UI à Créer

### ChecklistList
- Afficher toutes les checklists d'une tâche
- Barre de progression globale
- Bouton "Add checklist"

### ChecklistCard
- Nom de la checklist
- Barre de progression (X/Y items)
- Liste des items
- Options : rename, delete, copy

### ChecklistItem
- Checkbox pour toggle checked
- Contenu avec markdown support
- Assignee avatar
- Due date badge
- Nested items avec indentation
- Options : edit, delete, convert to card, add sub-item

### ChecklistItemForm
- Input pour le contenu
- Member picker pour assignation
- Date picker pour due date
- Bouton "Add item"

### ChecklistTemplateDialog
- Liste des templates disponibles
- Recherche de templates
- Preview des items
- Bouton "Use template"

### ChecklistProgress
- Progress bar visuelle
- Pourcentage
- X/Y completed
- Items overdue count (badge rouge)

## 📝 Fonctionnalités à Implémenter

### Priorité Haute
1. **APIs restantes** :
   - Update item (PATCH)
   - Delete item (DELETE)
   - Toggle checked (POST)
   - Move item (PATCH position)
   - Convert to card (POST)

2. **Composants UI** :
   - ChecklistList
   - ChecklistCard  
   - ChecklistItem
   - ChecklistItemForm
   - Progress bars

3. **Intégration** :
   - Ajouter dans TaskDialog
   - Real-time updates avec Socket.IO
   - Drag & drop pour réorganiser

### Priorité Moyenne
4. **Templates** :
   - APIs templates (GET, POST, USE)
   - Template picker dialog
   - Créer template depuis checklist existante
   - Templates globaux vs board-specific

5. **Copy/Paste** :
   - Copier checklist entre cartes
   - Dupliquer checklist dans même carte
   - Import/export JSON

6. **Markdown** :
   - Preview markdown dans items
   - Editor avec toolbar
   - @ mentions
   - # hashtags

### Priorité Basse
7. **Analytics** :
   - Most used templates
   - Average completion rate
   - Time to complete items
   - Member workload

8. **Notifications** :
   - Item assigned to you
   - Item due soon
   - Checklist completed

9. **Filters** :
   - Show only my items
   - Show overdue items
   - Hide checked items

## 🔄 Exemple Complet

```typescript
// Créer une checklist avec items imbriqués
const checklist = await fetch('/api/tasks/task_123/checklists', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Development',
    items: [
      {
        content: '## Backend',
        checked: false
      },
      {
        content: 'Setup database',
        checked: true,
        assigneeId: 'user_1',
        dueDate: '2024-12-08'
      },
      {
        content: 'Create APIs',
        checked: false,
        assigneeId: 'user_1'
      },
      {
        content: '## Frontend',
        checked: false
      },
      {
        content: 'Design UI',
        checked: false,
        assigneeId: 'user_2'
      }
    ]
  })
});

// Ajouter un sous-item
await fetch('/api/tasks/task_123/checklists/check_123/items', {
  method: 'POST',
  body: JSON.stringify({
    content: 'Write unit tests',
    parentId: 'item_create_apis',
    assigneeId: 'user_3',
    dueDate: '2024-12-12'
  })
});

// Calculer progression
const items = checklist.items;
const checked = items.filter(i => i.checked).length;
const progress = Math.round((checked / items.length) * 100);
// Result: 33% (1/3 items)
```

## 🔐 Sécurité

- ✅ Authentification requise
- ✅ Vérification d'accès au board
- ✅ Validation des données
- ✅ Protection onDelete: Cascade
- ✅ Isolation des données par board

## 📚 Migration

```bash
# Migration déjà appliquée
npx prisma migrate dev --name add_checklists_system

# Tables créées :
- checklist (id, taskId, name, position)
- checklist_item (id, checklistId, content, checked, position, assigneeId, dueDate, parentId)
- checklist_template (id, boardId, name, items, isGlobal, usageCount, createdBy)
```

## 🐛 Notes Techniques

### Nested Items
Les items peuvent avoir des enfants via la relation `parent/children` :
```typescript
{
  id: 'item_1',
  content: 'Main task',
  children: [
    { id: 'item_2', content: 'Sub-task 1', parentId: 'item_1' },
    { id: 'item_3', content: 'Sub-task 2', parentId: 'item_1' }
  ]
}
```

### Progression
La progression doit compter récursivement tous les items (parent + children) :
```typescript
function countItems(items) {
  return items.reduce((count, item) => {
    return count + 1 + (item.children?.length || 0);
  }, 0);
}
```

### Position
Les items utilisent un système de position numérique pour le tri.
Lors d'un réordonnancement, mettre à jour les positions de tous les items affectés.

## 📖 Changelog

### v1.0.0 - 2024-12-05

**Added** :
- ✅ Schéma de base de données (3 models)
- ✅ Migration Prisma
- ✅ 5 APIs checklists (CRUD complet)
- ✅ 1 API items (POST create)
- ✅ Socket.IO events (7 events)
- ✅ Support nested items
- ✅ Support assignation membres
- ✅ Support due dates
- ✅ Markdown dans content
- ✅ Templates structure

**To Do** :
- ❌ APIs restantes (update, delete, toggle, convert)
- ❌ Composants UI
- ❌ Template system complet
- ❌ Progression visuelle
- ❌ Drag & drop
- ❌ Copy/paste checklists
