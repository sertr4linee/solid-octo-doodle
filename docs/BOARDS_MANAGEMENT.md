# Board Management System

## Overview

Complete UI and API system for managing boards with visibility controls, organization-based access, and real-time updates.

## Features Implemented

### 1. Board Visibility System

Three visibility levels:
- **Private**: Only explicit board members can access
- **Organization**: All organization members can access
- **Public**: Anyone with the link can access

### 2. UI Components

#### CreateBoardDialog
Dialog component for creating new boards with:
- Board name and description
- Organization selection
- Visibility selector (Private/Organization/Public)
- Background color picker
- Form validation

**Location**: `components/boards/create-board-dialog.tsx`

#### BoardCard
Card component displaying board information:
- Visual background preview
- Star/unstar functionality
- Visibility indicator
- Member count
- Action menu (Settings, Members, Archive, Delete)
- Role badge

**Location**: `components/boards/board-card.tsx`

#### BoardsGrid
Grid layout with filtering and search:
- Search boards by name
- Filter by: All, My Boards, Shared, Archived
- Separate sections for starred and regular boards
- Empty states with CTAs
- Real-time board updates

**Location**: `components/boards/boards-grid.tsx`

### 3. API Endpoints

#### GET /api/boards
List all accessible boards for the current user.

**Query Parameters**:
- `organizationId` (optional): Filter by organization
- `filter` (optional): "all" | "my" | "shared" | "archived"

**Access Logic**:
- Returns boards where user is explicit member
- Returns boards from user's organizations with "organization" visibility
- Respects archived filter

#### GET /api/boards/[id]
Get detailed board information including lists, tasks, and members.

#### PATCH /api/boards/[id]
Update board properties (name, description, visibility, background, starred, archived).

**Permissions**: Requires admin or owner role.

#### DELETE /api/boards/[id]
Delete a board permanently.

**Permissions**: Requires owner role.

### 4. Access Control

**Board Access Resolution**:
```typescript
// User can access board if:
1. User is explicit board member (BoardMember table)
   OR
2. Board has visibility="organization" AND user is organization member
   OR
3. Board has visibility="public"
```

**Board Creation**:
- Default visibility is now "organization" (changed from "private")
- Only creator is added as explicit board member with "owner" role
- Other organization members access via organization visibility

### 5. Real-time Updates

Socket.io events emitted for:
- `board:created` - When new board is created
- `board:updated` - When board properties change
- `board:deleted` - When board is deleted

## Usage Examples

### Creating a Board

```tsx
import { CreateBoardDialog } from "@/components/boards";

<CreateBoardDialog organizationId="org_123" />
```

### Displaying Boards Grid

```tsx
import { BoardsGrid } from "@/components/boards";

<BoardsGrid organizationId="org_123" />
```

### Displaying Single Board Card

```tsx
import { BoardCard } from "@/components/boards";

<BoardCard 
  board={boardData} 
  onUpdate={() => refreshBoards()} 
/>
```

## Migration Notes

### From Private to Organization Visibility

If you have existing boards with `visibility="private"` that should be accessible to all organization members, run:

```sql
UPDATE board 
SET visibility = 'organization' 
WHERE visibility = 'private';
```

### Data Model

**Board Table**:
```prisma
model Board {
  id             String   @id
  name           String
  description    String?
  organizationId String
  createdById    String
  visibility     String   @default("organization")  // Changed default
  background     String?
  starred        Boolean  @default(false)
  archived       Boolean  @default(false)
  // ... relations
}
```

**BoardMember Table**:
```prisma
model BoardMember {
  id        String   @id
  boardId   String
  userId    String
  role      String   @default("member")  // owner, admin, member
  // ... relations
}
```

## Key Changes Made

1. **Modified GET /api/boards** to support organization-level visibility
2. **Changed default visibility** from "private" to "organization"
3. **Created comprehensive UI** for board management
4. **Added visibility indicators** throughout the UI
5. **Implemented access control** that respects both explicit membership and organization visibility

## Testing Checklist

- [ ] Member A creates board in Org X
- [ ] Member B (in same Org X) can see the board
- [ ] Board visibility can be changed to private
- [ ] When visibility is private, only explicit members can access
- [ ] Star/unstar functionality works
- [ ] Archive/restore functionality works
- [ ] Delete requires owner role
- [ ] Search and filters work correctly
- [ ] Real-time updates propagate to all users

## Security Considerations

1. **Visibility Enforcement**: Always check both `BoardMember` and organization membership
2. **Role-based Actions**: Update/delete restricted to appropriate roles
3. **Organization Membership**: Verify user belongs to organization before granting access
4. **Public Boards**: Consider implementing rate limiting and abuse prevention

## Future Enhancements

1. Board templates
2. Bulk operations (archive multiple, transfer ownership)
3. Board duplication
4. Advanced permissions (read-only members, custom roles)
5. Board activity feed
6. Export/import boards
7. Board favorites (beyond starring)
8. Board categories/tags
