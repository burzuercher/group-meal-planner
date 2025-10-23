# LifeGroup Food - Group Meal Planning App

A React Native Expo app for groups to plan and coordinate weekly shared meals.

## Features

- 📅 Calendar view for planning meals ahead
- 🍽️ Menu proposals anyone can create
- ✅ Item reservation system with visual status indicators
- 🛒 Auto-generated shopping lists
- 👥 Multiple group support with shareable codes
- 🔔 Push notifications for new menus and reminders
- 📝 Detailed item tracking (category, quantity, dietary info, notes)

## Tech Stack

- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Backend**: Firebase (Firestore + Cloud Messaging)
- **Navigation**: React Navigation 6.x
- **UI**: React Native Paper (Material Design)
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Date Handling**: date-fns

## Setup Instructions

### 1. Install Dependencies

Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### 2. Set Up Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Add a web app to your project
4. Copy the Firebase configuration
5. Update `src/services/firebase.ts` with your config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

6. In Firebase Console, enable:
   - **Firestore Database** (Start in test mode for development)
   - **Cloud Messaging** (for push notifications)

### 3. Firestore Security Rules

Set up basic security rules in Firestore Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /groups/{groupId} {
      allow read, write: if true; // For development only
      match /menus/{menuId} {
        allow read, write: if true;
        match /items/{itemId} {
          allow read, write: if true;
        }
      }
    }
  }
}
```

**Note**: These rules are for development only. You'll want to add proper security rules for production.

### 4. Run the App

```bash
# Start the development server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web
```

## Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── Loading.tsx
│   ├── EmptyState.tsx
│   ├── MenuItemCard.tsx
│   └── Screen.tsx
├── navigation/      # Navigation configuration
│   ├── AppNavigator.tsx
│   └── TabNavigator.tsx
├── screens/         # Screen components
│   ├── Calendar/
│   │   └── CalendarScreen.tsx
│   ├── Groups/
│   │   └── GroupsScreen.tsx
│   ├── Menu/
│   │   └── WeekMenuScreen.tsx
│   ├── Onboarding/
│   │   └── OnboardingScreen.tsx
│   └── ShoppingList/
│       └── ShoppingListScreen.tsx
├── services/        # External services (Firebase, API)
│   ├── firebase.ts
│   └── groupService.ts
├── store/           # Zustand state management
│   └── index.ts
├── theme/           # Theme configuration
│   └── index.ts
├── types/           # TypeScript type definitions
│   └── index.ts
└── utils/           # Utility functions
    └── generateCode.ts
```

## Development Status

### ✅ Phase 1: Project Setup & Foundation (COMPLETED)
- [x] Initialize Expo project
- [x] Install dependencies
- [x] Set up Firebase configuration
- [x] Create folder structure
- [x] Set up navigation
- [x] Create theme and basic UI components

### ✅ Phase 2: User & Group Management (COMPLETED)
- [x] Onboarding flow (Welcome → Name → Create/Join Group)
- [x] Firebase group service with Firestore operations
- [x] Groups screen with group switching
- [x] Create group functionality with unique code generation
- [x] Join group via 6-character code
- [x] Share group codes via device sharing
- [x] Local user profile storage with AsyncStorage
- [x] Multiple group support
- [x] Leave group functionality

### ✅ Phase 3: Calendar & Menu Planning (COMPLETED)
- [x] Interactive calendar with meal date indicators
- [x] Visual status indicators (proposed = orange, active = purple)
- [x] Date selection and menu navigation
- [x] Menu proposal screen with date confirmation
- [x] Full menu service with Firestore CRUD operations
- [x] Menu details screen with item management
- [x] Add/edit menu items with full details
- [x] Item reservation system (tap to reserve/unreserve)
- [x] Color-coded items (green = available, blue = yours, gray = others)
- [x] Filter items by status (All, Available, Mine)
- [x] Week menu overview with stats
- [x] Menu status toggling (proposed ↔ active)
- [x] Delete menus and items

### 🚧 Next Steps: Phase 4 - Shopping List

The following features need to be implemented:

1. **Shopping List Generation**
   - Auto-generate from user's reserved items
   - Group items by menu/date
   - Mark items as purchased
   - Export/share shopping list

2. **Additional Enhancements**
   - Pull-to-refresh on all screens
   - Offline support with Firestore persistence
   - Better error handling and user feedback

## Data Models

### Group
```typescript
{
  id: string;
  name: string;
  code: string;
  members: string[];
  createdAt: Date;
}
```

### Menu
```typescript
{
  id: string;
  groupId: string;
  date: Date;
  proposedBy: string;
  status: 'proposed' | 'active';
  createdAt: Date;
}
```

### MenuItem
```typescript
{
  id: string;
  menuId: string;
  name: string;
  category: 'Main Dish' | 'Side Dish' | 'Appetizer' | 'Dessert' | 'Beverage' | 'Other';
  reservedBy: string | null;
  quantity: string;
  notes: string;
  dietaryInfo: string;
  recipe?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## Color Scheme

- **Primary**: Purple (#6200ee)
- **Available Items**: Green (#4caf50)
- **Your Reserved Items**: Blue (#2196f3)
- **Others' Reserved Items**: Gray (#9e9e9e)

## Contributing

This is a group project. Feel free to propose new features or improvements!

## License

MIT
