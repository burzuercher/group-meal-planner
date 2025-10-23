// User Profile (stored locally)
export interface UserProfile {
  name: string;
  joinedGroups: GroupMembership[];
}

export interface GroupMembership {
  groupId: string;
  groupName: string;
  code: string;
  joinedAt: Date;
}

// Group (Firestore)
export interface Group {
  id: string;
  name: string;
  code: string; // Shareable code to join group
  members: string[]; // Array of member names
  createdAt: Date;
}

// Menu (Firestore)
export interface Menu {
  id: string;
  groupId: string;
  name: string; // Name/title of the meal (e.g., "Thanksgiving Dinner")
  date: Date; // The date of the meal
  proposedBy: string; // Name of person who proposed
  status: 'proposed' | 'active'; // proposed = pending, active = confirmed
  attendees: string[]; // Array of member names who are attending (populated when status becomes active)
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
};

export type MainTabParamList = {
  Calendar: undefined;
  WeekMenu: undefined;
  ShoppingList: undefined;
  Groups: undefined;
};
