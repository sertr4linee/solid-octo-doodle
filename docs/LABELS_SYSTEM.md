# Labels System API Documentation

The Labels System provides a flexible way to categorize and organize tasks within boards. This document describes the available API endpoints and usage.

## Table of Contents

- [Models](#models)
- [Endpoints](#endpoints)
- [Socket.io Events](#socketio-events)
- [Usage Examples](#usage-examples)

## Models

### Label

```typescript
{
  id: string;
  name: string;
  description: string | null;
  color: string; // Hex color code
  boardId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### TaskLabel

```typescript
{
  id: string;
  taskId: string;
  labelId: string;
  createdAt: Date;
}
```

## Endpoints

### Board Labels

#### List Labels

```
GET /api/boards/:boardId/labels
```

Query Parameters:
- `includeStats` (optional): Include task count statistics

**Response:**
```json
[
  {
    "id": "label_123",
    "name": "High Priority",
    "description": "Important and urgent tasks",
    "color": "#ef4444",
    "boardId": "board_456",
    "position": 0,
    "createdAt": "2025-12-02T10:00:00Z",
    "updatedAt": "2025-12-02T10:00:00Z",
    "_count": {
      "taskLabels": 5
    }
  }
]
```

#### Create Label

```
POST /api/boards/:boardId/labels
```

**Body:**
```json
{
  "name": "High Priority",
  "description": "Important and urgent tasks",
  "color": "#ef4444"
}
```

**Response:** Created label object (201)

#### Get Label

```
GET /api/boards/:boardId/labels/:labelId
```

**Response:** Label object with task count

#### Update Label

```
PATCH /api/boards/:boardId/labels/:labelId
```

**Body:**
```json
{
  "name": "Critical Priority",
  "description": "Updated description",
  "color": "#dc2626",
  "position": 0
}
```

All fields are optional.

**Response:** Updated label object

#### Delete Label

```
DELETE /api/boards/:boardId/labels/:labelId
```

**Response:** `{ "success": true }`

Note: This will remove the label from all tasks.

### Import/Export

#### Export Labels

```
GET /api/boards/:boardId/labels/export
```

**Response:**
```json
{
  "boardId": "board_456",
  "exportedAt": "2025-12-02T10:00:00Z",
  "labels": [
    {
      "name": "High Priority",
      "description": "Important tasks",
      "color": "#ef4444",
      "position": 0
    }
  ]
}
```

#### Import Labels

```
POST /api/boards/:boardId/labels/import
```

**Body:**
```json
{
  "labels": [
    {
      "name": "High Priority",
      "description": "Important tasks",
      "color": "#ef4444"
    }
  ],
  "mode": "merge" // or "replace"
}
```

**Response:**
```json
{
  "success": true,
  "imported": 5,
  "labels": [...]
}
```

### Task Labels

#### List Task Labels

```
GET /api/tasks/:taskId/labels
```

**Response:** Array of TaskLabel objects with label details

#### Add Label to Task

```
POST /api/tasks/:taskId/labels
```

**Body:**
```json
{
  "labelId": "label_123"
}
```

**Response:** Created TaskLabel object (201)

#### Remove Label from Task

```
DELETE /api/tasks/:taskId/labels/:labelId
```

**Response:** `{ "success": true }`

## Socket.io Events

The Labels System emits real-time events for synchronization:

### label:created

Emitted when a new label is created.

```typescript
{
  label: Label,
  userId: string
}
```

### label:updated

Emitted when a label is updated.

```typescript
{
  label: Label,
  userId: string
}
```

### label:deleted

Emitted when a label is deleted.

```typescript
{
  labelId: string,
  userId: string
}
```

### task:label:added

Emitted when a label is added to a task.

```typescript
{
  taskId: string,
  label: Label,
  userId: string
}
```

### task:label:removed

Emitted when a label is removed from a task.

```typescript
{
  taskId: string,
  labelId: string,
  userId: string
}
```

## Usage Examples

### Create a Label

```typescript
const response = await fetch(`/api/boards/${boardId}/labels`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    name: "Bug",
    description: "Something isn't working",
    color: "#dc2626"
  })
});

const label = await response.json();
```

### Add Label to Task

```typescript
const response = await fetch(`/api/tasks/${taskId}/labels`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ labelId: label.id })
});
```

### Export and Import Labels

```typescript
// Export
const exportResponse = await fetch(`/api/boards/${boardId}/labels/export`);
const exportData = await exportResponse.json();

// Save to file or transfer to another board

// Import
const importResponse = await fetch(`/api/boards/${targetBoardId}/labels/import`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    labels: exportData.labels,
    mode: "merge"
  })
});
```

### Listen to Real-time Updates

```typescript
import { useSocket } from "@/hooks/use-socket";

function MyComponent() {
  const socket = useSocket();

  useEffect(() => {
    socket?.on("label:created", (data) => {
      console.log("New label created:", data.label);
      // Update UI
    });

    socket?.on("task:label:added", (data) => {
      console.log("Label added to task:", data);
      // Update UI
    });

    return () => {
      socket?.off("label:created");
      socket?.off("task:label:added");
    };
  }, [socket]);
}
```

## Predefined Label Templates

The system includes predefined label templates:

- **Priority**: Critical, High, Medium, Low
- **Status**: Not Started, In Progress, Review, Done, Blocked
- **Type**: Bug, Feature, Enhancement, Documentation, Refactor
- **Effort**: XS, S, M, L, XL

Import templates via the UI or API.

## Permissions

- **List/View**: All board members
- **Create/Update/Delete**: Board owners and admins only
- **Assign/Remove from Tasks**: All board members

## Error Responses

All endpoints return standard error responses:

```json
{
  "error": "Error message"
}
```

Common status codes:
- `400`: Bad request (validation error)
- `401`: Unauthorized
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Server error
