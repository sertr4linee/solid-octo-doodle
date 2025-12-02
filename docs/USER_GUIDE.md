# Quick Start Guide - Board Management & Labels

## Board Management

### Creating a Board

1. Navigate to `/dashboard/boards`
2. Click the **"Create Board"** button
3. Fill in the form:
   - **Board Name** (required): e.g., "Marketing Campaign 2025"
   - **Description** (optional): Brief description of the board's purpose
   - **Organization** (required): Select from your organizations
   - **Visibility**: Choose who can access:
     - 🔒 **Private**: Only board members you explicitly add
     - 👥 **Organization**: All members of the organization (default)
     - 🌐 **Public**: Anyone with the link
   - **Background Color**: Pick from 9 colors
4. Click **"Create Board"**

### Managing Boards

**Star a Board**:
- Click the star icon on any board card
- Starred boards appear in a separate section at the top

**Archive a Board**:
- Click the ⋮ menu on a board card
- Select "Archive"
- View archived boards using the "Archived" filter tab

**Delete a Board** (Owners only):
- Click the ⋮ menu on a board card
- Select "Delete"
- Confirm the deletion (this cannot be undone)

**Change Visibility**:
- Click the ⋮ menu → "Settings"
- Update the visibility setting
- Changes take effect immediately

### Board Filters

Use the tabs to filter boards:
- **All Boards**: Shows all accessible boards (starred + regular)
- **My Boards**: Only boards you created
- **Shared with me**: Boards created by others you have access to
- **Archived**: Boards you've archived

### Search

Type in the search box to filter boards by name in real-time.

---

## Labels System

### Creating Labels

**Method 1: Label Manager**
1. Open a board
2. Click "Labels" in the board menu
3. Click "Create Label"
4. Fill in:
   - Name (required)
   - Description (optional)
   - Color (pick from 24 colors or use custom hex)
5. Click "Create"

**Method 2: Quick Create from Task**
1. Open a task
2. Click the label picker icon
3. Click "Create new label"
4. Fill in the quick form
5. Label is created and immediately assigned

### Assigning Labels to Tasks

1. Open or hover over a task
2. Click the label icon
3. Check/uncheck labels from the list
4. Labels are applied instantly
5. Close the popover (labels are saved automatically)

### Managing Labels

**Edit a Label**:
- In Label Manager, click on a label
- Update name, description, or color
- Changes apply to all tasks using this label

**Delete a Label**:
- Click edit on the label
- Click "Delete Label"
- Confirm deletion
- Label is removed from all tasks

**Reorder Labels**:
- Drag and drop labels in the Label Manager
- Order affects how labels appear in pickers

### Import/Export Labels

**Export Labels**:
```javascript
// From Board A
1. Open Label Manager
2. Click "Export Labels"
3. JSON file is downloaded
```

**Import Labels**:
```javascript
// To Board B
1. Open Label Manager
2. Click "Import Labels"
3. Upload the JSON file
4. Choose mode:
   - Merge: Keep existing labels, add new ones
   - Replace: Delete existing labels, add new ones
5. Click "Import"
```

### Label Colors

**Predefined Colors** (24 total):
- Primary: Blue, Indigo, Purple, Pink
- Secondary: Red, Orange, Yellow, Green
- Tertiary: Teal, Cyan, Sky, Violet
- Neutrals: Gray, Slate, Zinc, Stone
- Accents: Rose, Fuchsia, Lime, Emerald
- Dark: Amber, Gold, Crimson, Forest

**Custom Colors**:
- Click "Custom" in color picker
- Enter hex code (e.g., #FF5733)
- Preview updates in real-time

### Label Best Practices

**Organization Schemes**:

1. **Priority-Based**:
   - 🔴 High Priority
   - 🟡 Medium Priority
   - 🟢 Low Priority

2. **Status-Based**:
   - 🔵 In Review
   - 🟣 Blocked
   - 🟢 Ready
   - 🟡 In Progress

3. **Category-Based**:
   - 💼 Marketing
   - 💻 Development
   - 🎨 Design
   - 📊 Analytics

4. **Type-Based**:
   - 🐛 Bug
   - ✨ Feature
   - 📝 Documentation
   - 🔧 Maintenance

**Tips**:
- Keep label names short (2-3 words max)
- Use consistent colors across boards
- Don't create too many labels (8-12 is optimal)
- Use descriptions to clarify label meaning
- Export labels from your best-organized board as a template

---

## Real-time Collaboration

All actions are synchronized in real-time:
- ✅ Board creation → Appears for all org members instantly
- ✅ Label changes → Updates on all open tasks
- ✅ Label assignment → Visible to all board viewers
- ✅ Board updates → Reflected across all sessions

**Connection Status**:
- Check the indicator in the top-right corner
- Green = Connected, Red = Disconnected
- Automatically reconnects on network recovery

---

## Keyboard Shortcuts (Coming Soon)

- `Ctrl/Cmd + K` - Quick search boards
- `L` - Open label picker (when task is focused)
- `Ctrl/Cmd + Enter` - Save and close dialogs
- `Esc` - Close dialogs and popovers

---

## Troubleshooting

### "Board not found" error
- Check board visibility settings
- Ensure you're a member of the organization
- Ask board owner to add you as explicit member if visibility is private

### Labels not appearing
- Refresh the page
- Check your internet connection
- Ensure you're connected to Socket.io (check indicator)

### Cannot delete/edit board
- Only owners can delete boards
- Only owners and admins can edit board settings
- Check your role badge on the board card

### Import labels failed
- Ensure JSON file is valid (exported from another board)
- Check for duplicate label names
- Try "Merge" mode instead of "Replace"

---

## API Reference

### Boards

```typescript
// List boards
GET /api/boards?organizationId={id}&filter={all|my|shared|archived}

// Get board details
GET /api/boards/{boardId}

// Create board
POST /api/boards
Body: {
  name: string
  description?: string
  organizationId: string
  visibility: "private" | "organization" | "public"
  background?: string
}

// Update board
PATCH /api/boards/{boardId}
Body: { starred?, archived?, name?, description?, visibility?, background? }

// Delete board
DELETE /api/boards/{boardId}
```

### Labels

```typescript
// List labels
GET /api/boards/{boardId}/labels?includeStats=true

// Create label
POST /api/boards/{boardId}/labels
Body: {
  name: string
  description?: string
  color: string
}

// Update label
PATCH /api/boards/{boardId}/labels/{labelId}
Body: { name?, description?, color?, position? }

// Delete label
DELETE /api/boards/{boardId}/labels/{labelId}

// Export labels
GET /api/boards/{boardId}/labels/export

// Import labels
POST /api/boards/{boardId}/labels/import
Body: {
  labels: Array<{ name, description?, color }>
  mode: "merge" | "replace"
}

// Add label to task
POST /api/tasks/{taskId}/labels
Body: { labelId: string }

// Remove label from task
DELETE /api/tasks/{taskId}/labels/{labelId}
```

---

## Support

For issues or questions:
1. Check this documentation first
2. Review the detailed docs in `/docs` folder
3. Check the console for error messages
4. Open an issue on GitHub with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and OS information
   - Screenshots if applicable
