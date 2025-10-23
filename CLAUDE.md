# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start Expo development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

Note: There are no test or lint scripts configured in this project.

## Firebase Configuration

**CRITICAL**: Before running the app, you must configure Firebase credentials in `src/services/firebase.ts`. The file currently contains development credentials that may not work for all users.

1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Firestore Database (start in test mode for development)
3. Enable Cloud Messaging (for push notifications)
4. Replace the `firebaseConfig` object in `src/services/firebase.ts` with your project credentials

## Architecture Overview

### State Management

This app uses a **hybrid state management approach**:

- **Local State (Zustand)**: User profile and current group selection stored in AsyncStorage
  - Located in `src/store/index.ts`
  - Persists user name, joined groups, and current group ID
  - Loads on app initialization in `App.tsx`

- **Remote State (Firestore)**: All group, menu, and item data
  - Real-time sync not implemented; uses one-time reads
  - Services abstract all Firestore operations

### Firestore Data Structure

```
groups (collection)
  └─ {groupId} (document)
      ├─ name, code, members[], createdAt
      └─ menus (subcollection)
          └─ {menuId} (document)
              ├─ name, date, status, proposedBy, attendees[], createdAt
              └─ items (subcollection)
                  └─ {itemId} (document)
                      └─ name, category, reservedBy, quantity, notes, etc.
```

This nested structure is important:
- Each menu is scoped to a group
- Each item is scoped to a menu
- All service functions require both `groupId` and `menuId` when working with items

### Service Layer Pattern

The app uses a service layer to abstract Firestore operations:

- **`groupService.ts`**: Create groups, join by code, get group data
- **`menuService.ts`**: CRUD for menus and menu items, reservation system, attendance tracking

Key service patterns:
- All date fields are converted between JavaScript `Date` and Firestore `Timestamp`
- Services throw errors with user-friendly messages
- Optional fields are filtered out before Firestore writes to avoid undefined values

### Navigation Flow

1. **Onboarding** (`OnboardingScreen.tsx`): Multi-step flow (welcome → name → create/join group)
   - Only shown when `userProfile` is null
   - Creates local user profile and first group membership

2. **Main Tabs** (`TabNavigator.tsx`): Four bottom tabs
   - Calendar: View all menus in calendar format
   - Week Menu: Current week's menu overview
   - Shopping List: Reserved items for current user
   - Groups: Manage group memberships

3. **Modal Screens** (Stack navigation):
   - ProposeMenu: Create a new menu for a date
   - MenuDetails: View/edit menu, manage items, toggle status
   - AddEditItem: Add or edit a menu item

**Important**: Navigation params use ISO date strings (`dateString: string`) instead of Date objects to avoid React Navigation serialization warnings. Convert with `new Date(dateString)` when using.

### Key Architectural Patterns

#### Automatic Attendance Tracking

When a menu status changes from 'proposed' to 'active' (in `menuService.ts:updateMenuStatus`):
1. Fetches all group members
2. Automatically populates the `attendees` array with all member names
3. Users can then toggle their attendance individually

#### Date Handling

All Firestore date queries use `startOfDay()` and `endOfDay()` from date-fns:
```typescript
where('date', '>=', Timestamp.fromDate(startOfDay(date)))
where('date', '<=', Timestamp.fromDate(endOfDay(date)))
```

This ensures queries match the entire day regardless of time component.

#### Item Reservation System

- Items have a `reservedBy` field (string | null)
- Color coding:
  - Green: Available (reservedBy is null)
  - Blue: Reserved by current user
  - Gray: Reserved by someone else
- Toggle reservation with `toggleItemReservation()` service function

#### TypeScript Strictness

The project uses TypeScript strict mode (`tsconfig.json`). All types are defined in `src/types/index.ts`:
- Firestore types (Group, Menu, MenuItem)
- Local types (UserProfile, GroupMembership)
- Navigation param lists (RootStackParamList, MainTabParamList)

## Important Conventions

### Firestore Timestamp Conversions

When writing to Firestore:
```typescript
createdAt: Timestamp.fromDate(new Date())
```

When reading from Firestore:
```typescript
createdAt: data.createdAt.toDate()
```

### Handling Undefined Values

Firestore does not accept `undefined` values. The `createMenuItem` function demonstrates the pattern:
```typescript
const firestoreData: any = { /* required fields */ };
if (item.quantity) {
  firestoreData.quantity = item.quantity;
}
await setDoc(itemRef, firestoreData);
```

### Group Code Generation

Group codes are 6-character uppercase alphanumeric strings generated by `utils/generateCode.ts`. The `createGroup` function ensures uniqueness by checking existing groups.

### Error Handling

Services catch Firestore errors and throw user-friendly error messages. Screens should wrap service calls in try-catch blocks and display errors using appropriate UI components (Snackbar, Alert, etc.).
