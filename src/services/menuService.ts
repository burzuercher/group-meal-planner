import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { Menu, MenuItem } from '../types';
import { startOfDay, endOfDay } from 'date-fns';
import { getGroupById } from './groupService';

/**
 * Creates a new menu for a specific date
 */
export async function createMenu(
  groupId: string,
  name: string,
  date: Date,
  proposedBy: string
): Promise<Menu> {
  try {
    const menuRef = doc(collection(db, `groups/${groupId}/menus`));
    const menuData: Omit<Menu, 'id'> = {
      groupId,
      name,
      date: startOfDay(date),
      proposedBy,
      status: 'proposed',
      attendees: [],
      createdAt: new Date(),
    };

    await setDoc(menuRef, {
      ...menuData,
      date: Timestamp.fromDate(menuData.date),
      createdAt: Timestamp.fromDate(menuData.createdAt),
    });

    return {
      id: menuRef.id,
      ...menuData,
    };
  } catch (error) {
    console.error('Error creating menu:', error);
    throw new Error('Failed to create menu');
  }
}

/**
 * Gets a menu by ID
 */
export async function getMenuById(
  groupId: string,
  menuId: string
): Promise<Menu | null> {
  try {
    const menuRef = doc(db, `groups/${groupId}/menus`, menuId);
    const menuDoc = await getDoc(menuRef);

    if (!menuDoc.exists()) {
      return null;
    }

    const data = menuDoc.data();
    return {
      id: menuDoc.id,
      groupId: data.groupId,
      name: data.name || 'Untitled Menu',
      date: data.date.toDate(),
      proposedBy: data.proposedBy,
      status: data.status,
      attendees: data.attendees || [],
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error('Error getting menu:', error);
    throw new Error('Failed to get menu');
  }
}

/**
 * Gets all menus for a group in a date range
 */
export async function getMenusInRange(
  groupId: string,
  startDate: Date,
  endDate: Date
): Promise<Menu[]> {
  try {
    const menusRef = collection(db, `groups/${groupId}/menus`);
    const q = query(
      menusRef,
      where('date', '>=', Timestamp.fromDate(startOfDay(startDate))),
      where('date', '<=', Timestamp.fromDate(endOfDay(endDate))),
      orderBy('date', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        groupId: data.groupId,
        name: data.name || 'Untitled Menu',
        date: data.date.toDate(),
        proposedBy: data.proposedBy,
        status: data.status,
        attendees: data.attendees || [],
        createdAt: data.createdAt.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting menus in range:', error);
    throw new Error('Failed to get menus');
  }
}

/**
 * Gets menu for a specific date
 */
export async function getMenuByDate(
  groupId: string,
  date: Date
): Promise<Menu | null> {
  try {
    const menusRef = collection(db, `groups/${groupId}/menus`);
    const startOfDayTimestamp = Timestamp.fromDate(startOfDay(date));
    const endOfDayTimestamp = Timestamp.fromDate(endOfDay(date));

    const q = query(
      menusRef,
      where('date', '>=', startOfDayTimestamp),
      where('date', '<=', endOfDayTimestamp)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      id: doc.id,
      groupId: data.groupId,
      name: data.name || 'Untitled Menu',
      date: data.date.toDate(),
      proposedBy: data.proposedBy,
      status: data.status,
      attendees: data.attendees || [],
      createdAt: data.createdAt.toDate(),
    };
  } catch (error) {
    console.error('Error getting menu by date:', error);
    throw new Error('Failed to get menu');
  }
}

/**
 * Updates menu status
 * When changing to 'active', automatically marks all group members as attending
 */
export async function updateMenuStatus(
  groupId: string,
  menuId: string,
  status: 'proposed' | 'active'
): Promise<void> {
  try {
    const menuRef = doc(db, `groups/${groupId}/menus`, menuId);
    const updateData: any = { status };

    // When activating a menu, auto-populate attendees with all group members
    if (status === 'active') {
      const group = await getGroupById(groupId);
      if (group) {
        updateData.attendees = group.members;
      }
    }

    await updateDoc(menuRef, updateData);
  } catch (error) {
    console.error('Error updating menu status:', error);
    throw new Error('Failed to update menu status');
  }
}

/**
 * Deletes a menu and all its items
 */
export async function deleteMenu(groupId: string, menuId: string): Promise<void> {
  try {
    // Delete all items first
    const items = await getMenuItems(groupId, menuId);
    await Promise.all(
      items.map((item) => deleteMenuItem(groupId, menuId, item.id))
    );

    // Delete menu
    const menuRef = doc(db, `groups/${groupId}/menus`, menuId);
    await deleteDoc(menuRef);
  } catch (error) {
    console.error('Error deleting menu:', error);
    throw new Error('Failed to delete menu');
  }
}

/**
 * Toggles attendance for a user
 * Adds user to attendees if not present, removes if present
 */
export async function toggleAttendance(
  groupId: string,
  menuId: string,
  userName: string,
  isAttending: boolean
): Promise<void> {
  try {
    const menuRef = doc(db, `groups/${groupId}/menus`, menuId);
    const menuDoc = await getDoc(menuRef);

    if (!menuDoc.exists()) {
      throw new Error('Menu not found');
    }

    const currentAttendees = menuDoc.data().attendees || [];

    let newAttendees: string[];
    if (isAttending) {
      // Add to attendees if not already present
      if (!currentAttendees.includes(userName)) {
        newAttendees = [...currentAttendees, userName];
      } else {
        newAttendees = currentAttendees;
      }
    } else {
      // Remove from attendees
      newAttendees = currentAttendees.filter((name: string) => name !== userName);
    }

    await updateDoc(menuRef, { attendees: newAttendees });
  } catch (error) {
    console.error('Error toggling attendance:', error);
    throw new Error('Failed to update attendance');
  }
}

// ============================================================================
// MENU ITEMS
// ============================================================================

/**
 * Creates a new menu item
 */
export async function createMenuItem(
  groupId: string,
  menuId: string,
  itemData: Omit<MenuItem, 'id' | 'menuId' | 'createdAt' | 'updatedAt'>
): Promise<MenuItem> {
  try {
    const itemRef = doc(
      collection(db, `groups/${groupId}/menus/${menuId}/items`)
    );

    const now = new Date();
    const item: Omit<MenuItem, 'id'> = {
      ...itemData,
      menuId,
      createdAt: now,
      updatedAt: now,
    };

    // Filter out undefined values for Firestore
    const firestoreData: any = {
      menuId: item.menuId,
      name: item.name,
      category: item.category,
      reservedBy: item.reservedBy,
      notes: item.notes,
      dietaryInfo: item.dietaryInfo,
      createdAt: Timestamp.fromDate(item.createdAt),
      updatedAt: Timestamp.fromDate(item.updatedAt),
    };

    // Only add optional fields if they're defined
    if (item.quantity) {
      firestoreData.quantity = item.quantity;
    }
    if (item.recipe) {
      firestoreData.recipe = item.recipe;
    }

    await setDoc(itemRef, firestoreData);

    return {
      id: itemRef.id,
      ...item,
    };
  } catch (error) {
    console.error('Error creating menu item:', error);
    throw new Error('Failed to create menu item');
  }
}

/**
 * Gets all items for a menu
 */
export async function getMenuItems(
  groupId: string,
  menuId: string
): Promise<MenuItem[]> {
  try {
    const itemsRef = collection(db, `groups/${groupId}/menus/${menuId}/items`);
    const querySnapshot = await getDocs(itemsRef);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        menuId: data.menuId,
        name: data.name,
        category: data.category,
        reservedBy: data.reservedBy,
        quantity: data.quantity,
        notes: data.notes,
        dietaryInfo: data.dietaryInfo,
        recipe: data.recipe,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  } catch (error) {
    console.error('Error getting menu items:', error);
    throw new Error('Failed to get menu items');
  }
}

/**
 * Updates a menu item
 */
export async function updateMenuItem(
  groupId: string,
  menuId: string,
  itemId: string,
  updates: Partial<Omit<MenuItem, 'id' | 'menuId' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  try {
    const itemRef = doc(db, `groups/${groupId}/menus/${menuId}/items`, itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    throw new Error('Failed to update menu item');
  }
}

/**
 * Reserves or unreserves a menu item
 */
export async function toggleItemReservation(
  groupId: string,
  menuId: string,
  itemId: string,
  userName: string | null
): Promise<void> {
  try {
    const itemRef = doc(db, `groups/${groupId}/menus/${menuId}/items`, itemId);
    await updateDoc(itemRef, {
      reservedBy: userName,
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error) {
    console.error('Error toggling item reservation:', error);
    throw new Error('Failed to update reservation');
  }
}

/**
 * Deletes a menu item
 */
export async function deleteMenuItem(
  groupId: string,
  menuId: string,
  itemId: string
): Promise<void> {
  try {
    const itemRef = doc(db, `groups/${groupId}/menus/${menuId}/items`, itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error('Error deleting menu item:', error);
    throw new Error('Failed to delete menu item');
  }
}
