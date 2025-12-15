# Integrations & API Documentation

## Overview

TekTres provides a comprehensive integration system that allows connecting with third-party services and building custom automations using our public API.

## Third-Party Integrations

### Available Integrations

| Service | Type | Features |
|---------|------|----------|
| **Slack** | Communication | Notifications, slash commands, card creation from Slack |
| **GitHub** | Development | Link issues/PRs, auto-update tasks from commits |
| **Google Drive** | Storage | Attach files, preview docs, sync folders |
| **Zapier** | Automation | Connect with 3000+ apps via webhooks |
| **Email** | Communication | Create cards from emails, email notifications |
| **Webhooks** | Custom | Real-time events to your endpoints |

### Setting Up Integrations

1. Navigate to **Dashboard → Connections**
2. Select the integration you want to set up
3. Follow the OAuth flow for third-party services
4. Configure integration settings

## Public API

### Authentication

All API requests must include an API key in the Authorization header:

```bash
curl -H "Authorization: Bearer tk_your_api_key_here" \
     https://yourapp.com/api/v1/boards
```

### Creating an API Key

1. Go to **Dashboard → Connections → API Keys**
2. Click "Create API Key"
3. Select required scopes
4. Copy the key immediately (it won't be shown again)

### Rate Limiting

- Default: 1000 requests per hour
- Headers included in responses:
  - `X-RateLimit-Limit`: Maximum requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

### API Scopes

| Scope | Description |
|-------|-------------|
| `read:boards` | Read board data |
| `write:boards` | Create/update boards |
| `delete:boards` | Delete boards |
| `read:tasks` | Read task data |
| `write:tasks` | Create/update tasks |
| `delete:tasks` | Delete tasks |
| `read:members` | Read member information |
| `write:members` | Manage members |
| `*` | Full access (admin only) |

### Endpoints

#### Boards

**List Boards**
```http
GET /api/v1/boards
```

**Get Board**
```http
GET /api/v1/boards/:boardId
```

**Create Board**
```http
POST /api/v1/boards
Content-Type: application/json

{
  "name": "My Board",
  "description": "Board description",
  "visibility": "private"
}
```

**Update Board**
```http
PATCH /api/v1/boards/:boardId
Content-Type: application/json

{
  "name": "Updated Name"
}
```

**Delete Board**
```http
DELETE /api/v1/boards/:boardId
```

#### Tasks

**List Tasks in Board**
```http
GET /api/v1/boards/:boardId/tasks
GET /api/v1/boards/:boardId/tasks?listId=list_123
GET /api/v1/boards/:boardId/tasks?archived=false
```

**Create Task**
```http
POST /api/v1/boards/:boardId/tasks
Content-Type: application/json

{
  "title": "New Task",
  "description": "Task description",
  "listId": "list_123",
  "dueDate": "2024-12-31T00:00:00Z"
}
```

## Webhooks

### Overview

Webhooks allow your application to receive real-time notifications when events occur in TekTres.

### Setting Up Webhooks

1. Go to **Dashboard → Connections → Webhooks**
2. Create a webhook integration first
3. Add webhook endpoint URL
4. Select events to subscribe to
5. Save and note the webhook secret

### Webhook Payload

```json
{
  "event": "task.created",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "data": {
    "task": {
      "id": "task_123",
      "title": "New Task",
      "listId": "list_456"
    },
    "boardId": "board_789"
  },
  "organizationId": "org_abc",
  "boardId": "board_789"
}
```

### Verifying Webhook Signatures

All webhooks are signed with HMAC-SHA256. Verify the signature to ensure authenticity:

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}
```

### Available Events

| Event | Description |
|-------|-------------|
| `board.created` | Board was created |
| `board.updated` | Board was updated |
| `board.deleted` | Board was deleted |
| `list.created` | List was created |
| `list.updated` | List was updated |
| `list.deleted` | List was deleted |
| `task.created` | Task was created |
| `task.updated` | Task was updated |
| `task.deleted` | Task was deleted |
| `task.moved` | Task was moved between lists |
| `task.assigned` | Task was assigned to user |
| `checklist.created` | Checklist was created |
| `checklist.completed` | All checklist items completed |
| `comment.created` | Comment was added |
| `member.added` | Member was added to board |
| `member.removed` | Member was removed from board |

### Retry Policy

Failed webhook deliveries are automatically retried:
- Maximum retries: 3
- Retry delays: 1s, 2s, 4s (exponential backoff)
- Success: HTTP 2xx status code

## Error Responses

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## SDK Examples

### JavaScript/Node.js

```javascript
const API_KEY = 'tk_your_api_key';
const BASE_URL = 'https://yourapp.com/api/v1';

async function listBoards() {
  const response = await fetch(`${BASE_URL}/boards`, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });
  return response.json();
}

async function createTask(boardId, task) {
  const response = await fetch(`${BASE_URL}/boards/${boardId}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task),
  });
  return response.json();
}
```

### Python

```python
import requests

API_KEY = 'tk_your_api_key'
BASE_URL = 'https://yourapp.com/api/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json',
}

def list_boards():
    response = requests.get(f'{BASE_URL}/boards', headers=headers)
    return response.json()

def create_task(board_id, task):
    response = requests.post(
        f'{BASE_URL}/boards/{board_id}/tasks',
        headers=headers,
        json=task
    )
    return response.json()
```

### cURL

```bash
# List boards
curl -H "Authorization: Bearer tk_your_api_key" \
     https://yourapp.com/api/v1/boards

# Create task
curl -X POST \
     -H "Authorization: Bearer tk_your_api_key" \
     -H "Content-Type: application/json" \
     -d '{"title":"New Task","listId":"list_123"}' \
     https://yourapp.com/api/v1/boards/board_123/tasks
```
