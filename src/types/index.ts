// Party Size
export interface PartySize {
  adults: number;
  children: number;
}

// Notification Preferences
export interface NotificationPreferences {
  enabled: boolean;

  // Meal reminder timing (hours before meal)
  mealReminder24h: boolean;
  mealReminder3h: boolean;
  mealReminder1h: boolean;

  // Item-specific notifications
  notifyReservedItems: boolean;     // "Don't forget to bring [items]"
  notifyUnassignedItems: boolean;   // "There are items that need bringing" (only if user hasn't reserved)

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;          // "22:00" format (24h)
  quietHoursEnd: string;            // "08:00" format (24h)
}

// User Profile (stored locally)
export interface UserProfile {
  userId: string; // Firebase Auth UID
  name: string;
  profileImageUri?: string; // Firebase Storage download URL
  partySize: PartySize;
  joinedGroups: GroupMembership[];
  notificationPreferences?: NotificationPreferences;
}

export interface GroupMembership {
  groupId: string;
  groupName: string;
  code: string;
  joinedAt: Date;
}

// Group Member
export interface GroupMember {
  userId: string; // Firebase Auth UID
  name: string;
  profileImageUri?: string;
  partySize: PartySize;
  joinedAt: Date;
}

// Group (Firestore)
export interface Group {
  id: string;
  name: string;
  code: string; // Shareable code to join group
  members: GroupMember[]; // Array of member objects (was string[] for backward compatibility)
  memberIds: string[]; // Array of Firebase Auth UIDs for security rules
  createdAt: Date;
}

// Menu Attendee
export interface MenuAttendee {
  name: string;
  adults: number;
  children: number;
  profileImageUri?: string;
}

// Menu (Firestore)
export interface Menu {
  id: string;
  groupId: string;
  name: string; // Name/title of the meal (e.g., "Thanksgiving Dinner")
  date: Date; // The date of the meal
  proposedBy: string; // Name of person who proposed
  status: 'proposed' | 'active'; // proposed = pending, active = confirmed
  attendees: MenuAttendee[]; // Array of attendees with party size (was string[] for backward compatibility)
  imageUrl?: string; // AI-generated menu image URL from Firebase Storage
  imageGenerating?: boolean; // True while image is being generated
  createdAt: Date;
}

// Menu Item Category
export type MenuItemCategory =
  | 'Main Dish'
  | 'Side Dish'
  | 'Appetizer'
  | 'Dessert'
  | 'Beverage'
  | 'Other';

// Menu Item (Firestore)
export interface MenuItem {
  id: string;
  menuId: string;
  name: string;
  category: MenuItemCategory;
  reservedBy: string | null; // Name of person who reserved, null if available
  quantity?: string; // Optional: e.g., "serves 8", "2 bottles"
  notes: string; // Additional notes
  dietaryInfo: string; // Dietary information (vegetarian, gluten-free, etc.)
  recipe?: string; // Optional recipe URL or text
  createdAt: Date;
  updatedAt: Date;
}

// Shopping List Item (derived from MenuItem)
export interface ShoppingListItem {
  menuItemId: string;
  menuDate: Date;
  itemName: string;
  quantity: string;
  notes: string;
  purchased: boolean;
}

// Navigation types
// Note: Using string for dates to avoid serialization warnings
export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  ProposeMenu: { dateString: string }; // ISO date string (YYYY-MM-DD)
  MenuDetails: { menuId: string; dateString: string }; // ISO date string
  AddEditItem: { menuId: string; itemId?: string };
  ItemDetails: { item: MenuItem };
  GroupDetails: { groupId: string };
  EditName: { currentName: string };
  EditPartySize: { currentAdults: number; currentChildren: number };
  LinkAccount: undefined;
  DeleteAccount: undefined;
  CreateJoinGroup: { mode: 'create' | 'join' };
};

export type MainTabParamList = {
  WeekMenu: undefined;
  Calendar: undefined;
  Profile: undefined;
};
