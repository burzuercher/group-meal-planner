import {
  createMenu,
  getMenuById,
  getMenuByDate,
  getMenusInRange,
  updateMenu,
  updateMenuStatus,
  deleteMenu,
  updateMyAttendance,
  createMenuItem,
  getMenuItems,
  updateMenuItem,
  toggleItemReservation,
  deleteMenuItem,
} from '../../services/menuService';
import { Menu, MenuItem, GroupMember } from '../../types';
import { startOfDay, addDays } from 'date-fns';

// Mock the image service
jest.mock('../../services/imageService', () => ({
  generateAndCacheMenuImage: jest.fn(() => Promise.resolve('https://example.com/image.jpg')),
}));

// Mock the group service
jest.mock('../../services/groupService', () => ({
  getGroupById: jest.fn(async (groupId: string) => {
    if (groupId === 'group-123') {
      return {
        id: 'group-123',
        name: 'Test Group',
        code: 'ABC123',
        members: [
          {
            name: 'John Doe',
            partySize: { adults: 2, children: 1 },
            profileImageUri: 'https://example.com/john.jpg',
            joinedAt: new Date(),
          },
          {
            name: 'Jane Smith',
            partySize: { adults: 1, children: 0 },
            joinedAt: new Date(),
          },
        ] as GroupMember[],
        createdAt: new Date(),
      };
    }
    return null;
  }),
}));

describe('Feature: Menu Management', () => {
  const groupId = 'group-123';
  let testDate: Date;

  beforeEach(() => {
    // Reset mock firestore data before each test
    const { __resetMockFirestore } = jest.requireMock('firebase/firestore');
    __resetMockFirestore();

    // Use a consistent date for tests
    testDate = new Date('2025-10-30T15:30:00Z');
  });

  describe('Feature: Create menu', () => {
    describe('Given: Valid menu data', () => {
      describe('When: Creating a menu', () => {
        it('Then: Should create menu with normalized date', async () => {
          const menu = await createMenu(groupId, 'Friday Dinner', testDate, 'John Doe');

          expect(menu.name).toBe('Friday Dinner');
          expect(menu.proposedBy).toBe('John Doe');
          expect(menu.groupId).toBe(groupId);
          expect(menu.date).toEqual(startOfDay(testDate));
        });

        it('And: Should initialize with proposed status', async () => {
          const menu = await createMenu(groupId, 'Friday Dinner', testDate, 'John Doe');

          expect(menu.status).toBe('proposed');
        });

        it('And: Should initialize with empty attendees', async () => {
          const menu = await createMenu(groupId, 'Friday Dinner', testDate, 'John Doe');

          expect(menu.attendees).toEqual([]);
        });

        it('And: Should set imageGenerating flag', async () => {
          const menu = await createMenu(groupId, 'Friday Dinner', testDate, 'John Doe');

          expect(menu.imageGenerating).toBe(true);
        });

        it('And: Should have createdAt timestamp', async () => {
          const menu = await createMenu(groupId, 'Friday Dinner', testDate, 'John Doe');

          expect(menu.createdAt).toBeInstanceOf(Date);
        });
      });

      describe('When: Creating menu with different time of day', () => {
        it('Then: Should normalize to start of day', async () => {
          const afternoonDate = new Date('2025-10-30T15:30:00Z');
          const menu = await createMenu(groupId, 'Dinner', afternoonDate, 'John');

          const expectedDate = startOfDay(afternoonDate);
          expect(menu.date.getTime()).toBe(expectedDate.getTime());
        });
      });
    });
  });

  describe('Feature: Get menu by ID', () => {
    let menuId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John Doe');
      menuId = menu.id;
    });

    describe('Given: Menu exists', () => {
      describe('When: Fetching by ID', () => {
        it('Then: Should return menu with correct data', async () => {
          const menu = await getMenuById(groupId, menuId);

          expect(menu).not.toBeNull();
          expect(menu?.id).toBe(menuId);
          expect(menu?.name).toBe('Test Menu');
          expect(menu?.proposedBy).toBe('John Doe');
        });

        it('And: Should convert Firestore timestamps to Dates', async () => {
          const menu = await getMenuById(groupId, menuId);

          expect(menu?.date).toBeInstanceOf(Date);
          expect(menu?.createdAt).toBeInstanceOf(Date);
        });
      });
    });

    describe('Given: Menu does not exist', () => {
      describe('When: Fetching by invalid ID', () => {
        it('Then: Should return null', async () => {
          const menu = await getMenuById(groupId, 'non-existent-id');

          expect(menu).toBeNull();
        });
      });
    });
  });

  describe('Feature: Get menu by date', () => {
    describe('Given: Menu exists on specific date', () => {
      beforeEach(async () => {
        await createMenu(groupId, 'Friday Menu', testDate, 'John Doe');
      });

      describe('When: Querying by date', () => {
        it('Then: Should find menu on that date', async () => {
          const menu = await getMenuByDate(groupId, testDate);

          expect(menu).not.toBeNull();
          expect(menu?.name).toBe('Friday Menu');
        });

        it('And: Should find regardless of time component', async () => {
          const morningQuery = new Date('2025-10-30T08:00:00Z');
          const eveningQuery = new Date('2025-10-30T20:00:00Z');

          const menuMorning = await getMenuByDate(groupId, morningQuery);
          const menuEvening = await getMenuByDate(groupId, eveningQuery);

          expect(menuMorning).not.toBeNull();
          expect(menuEvening).not.toBeNull();
          expect(menuMorning?.id).toBe(menuEvening?.id);
        });
      });
    });

    describe('Given: No menu on date', () => {
      describe('When: Querying empty date', () => {
        it('Then: Should return null', async () => {
          const differentDate = addDays(testDate, 1);
          const menu = await getMenuByDate(groupId, differentDate);

          expect(menu).toBeNull();
        });
      });
    });
  });

  describe('Feature: Get menus in date range', () => {
    beforeEach(async () => {
      // Create menus on different dates
      await createMenu(groupId, 'Menu 1', testDate, 'John');
      await createMenu(groupId, 'Menu 2', addDays(testDate, 2), 'Jane');
      await createMenu(groupId, 'Menu 3', addDays(testDate, 5), 'John');
    });

    describe('When: Querying date range', () => {
      it('Then: Should return menus within range', async () => {
        const startDate = testDate;
        const endDate = addDays(testDate, 3);

        const menus = await getMenusInRange(groupId, startDate, endDate);

        expect(menus).toHaveLength(2);
        expect(menus[0].name).toBe('Menu 1');
        expect(menus[1].name).toBe('Menu 2');
      });

      it('And: Should exclude menus outside range', async () => {
        const startDate = addDays(testDate, 1);
        const endDate = addDays(testDate, 3);

        const menus = await getMenusInRange(groupId, startDate, endDate);

        expect(menus).toHaveLength(1);
        expect(menus[0].name).toBe('Menu 2');
      });

      it('And: Should return empty array when no menus in range', async () => {
        const startDate = addDays(testDate, 10);
        const endDate = addDays(testDate, 15);

        const menus = await getMenusInRange(groupId, startDate, endDate);

        expect(menus).toEqual([]);
      });
    });
  });

  describe('Feature: Update menu details', () => {
    let menuId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Original Name', testDate, 'John');
      menuId = menu.id;
    });

    describe('Given: Valid updates', () => {
      describe('When: Updating menu name', () => {
        it('Then: Should update the name', async () => {
          await updateMenu(groupId, menuId, { name: 'New Name' });

          const menu = await getMenuById(groupId, menuId);
          expect(menu?.name).toBe('New Name');
        });
      });

      describe('When: Updating menu date', () => {
        it('Then: Should update and normalize the date', async () => {
          const newDate = addDays(testDate, 3);
          await updateMenu(groupId, menuId, { date: newDate });

          const menu = await getMenuById(groupId, menuId);
          expect(menu?.date).toEqual(startOfDay(newDate));
        });
      });

      describe('When: Updating both name and date', () => {
        it('Then: Should update both fields', async () => {
          const newDate = addDays(testDate, 2);
          await updateMenu(groupId, menuId, { name: 'Updated', date: newDate });

          const menu = await getMenuById(groupId, menuId);
          expect(menu?.name).toBe('Updated');
          expect(menu?.date).toEqual(startOfDay(newDate));
        });
      });
    });
  });

  describe('Feature: Update menu status', () => {
    let menuId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;
    });

    describe('Given: Menu is proposed', () => {
      describe('When: Changing status to active', () => {
        it('Then: Should update status', async () => {
          await updateMenuStatus(groupId, menuId, 'active');

          const menu = await getMenuById(groupId, menuId);
          expect(menu?.status).toBe('active');
        });

        it('And: Should auto-populate attendees from group members', async () => {
          await updateMenuStatus(groupId, menuId, 'active');

          const menu = await getMenuById(groupId, menuId);
          expect(menu?.attendees).toHaveLength(2);
          expect(menu?.attendees[0].name).toBe('John Doe');
          expect(menu?.attendees[1].name).toBe('Jane Smith');
        });

        it('And: Should include party sizes from group members', async () => {
          await updateMenuStatus(groupId, menuId, 'active');

          const menu = await getMenuById(groupId, menuId);
          const john = menu?.attendees.find((a) => a.name === 'John Doe');
          const jane = menu?.attendees.find((a) => a.name === 'Jane Smith');

          expect(john?.adults).toBe(2);
          expect(john?.children).toBe(1);
          expect(jane?.adults).toBe(1);
          expect(jane?.children).toBe(0);
        });

        it('And: Should include profile images', async () => {
          await updateMenuStatus(groupId, menuId, 'active');

          const menu = await getMenuById(groupId, menuId);
          const john = menu?.attendees.find((a) => a.name === 'John Doe');

          expect(john?.profileImageUri).toBe('https://example.com/john.jpg');
        });
      });
    });

    describe('Given: Menu is active', () => {
      beforeEach(async () => {
        await updateMenuStatus(groupId, menuId, 'active');
      });

      describe('When: Changing status to proposed', () => {
        it('Then: Should update status without changing attendees', async () => {
          const beforeMenu = await getMenuById(groupId, menuId);
          const attendeesBefore = beforeMenu?.attendees || [];

          await updateMenuStatus(groupId, menuId, 'proposed');

          const menu = await getMenuById(groupId, menuId);
          expect(menu?.status).toBe('proposed');
          expect(menu?.attendees).toEqual(attendeesBefore);
        });
      });
    });
  });

  describe('Feature: Update attendance', () => {
    let menuId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;
      await updateMenuStatus(groupId, menuId, 'active'); // Start with attendees populated
    });

    describe('Given: User not yet in attendees', () => {
      describe('When: Adding attendance', () => {
        it('Then: Should add user with party size', async () => {
          await updateMyAttendance(groupId, menuId, 'New User', 3, 2);

          const menu = await getMenuById(groupId, menuId);
          const newUser = menu?.attendees.find((a) => a.name === 'New User');

          expect(newUser).toBeDefined();
          expect(newUser?.adults).toBe(3);
          expect(newUser?.children).toBe(2);
        });
      });
    });

    describe('Given: User already in attendees', () => {
      describe('When: Updating party size', () => {
        it('Then: Should update existing attendance', async () => {
          await updateMyAttendance(groupId, menuId, 'John Doe', 4, 3);

          const menu = await getMenuById(groupId, menuId);
          const john = menu?.attendees.find((a) => a.name === 'John Doe');

          expect(john?.adults).toBe(4);
          expect(john?.children).toBe(3);
        });

        it('And: Should not duplicate attendee', async () => {
          await updateMyAttendance(groupId, menuId, 'John Doe', 4, 3);

          const menu = await getMenuById(groupId, menuId);
          const johnEntries = menu?.attendees.filter((a) => a.name === 'John Doe');

          expect(johnEntries).toHaveLength(1);
        });
      });

      describe('When: Setting both adults and children to 0', () => {
        it('Then: Should remove user from attendees', async () => {
          await updateMyAttendance(groupId, menuId, 'John Doe', 0, 0);

          const menu = await getMenuById(groupId, menuId);
          const john = menu?.attendees.find((a) => a.name === 'John Doe');

          expect(john).toBeUndefined();
          expect(menu?.attendees).toHaveLength(1); // Only Jane left
        });
      });
    });
  });

  describe('Feature: Delete menu', () => {
    let menuId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;

      // Add some items
      await createMenuItem(groupId, menuId, {
        name: 'Salad',
        category: 'Side Dish',
        reservedBy: null,
        notes: '',
        dietaryInfo: '',
      });
      await createMenuItem(groupId, menuId, {
        name: 'Dessert',
        category: 'Dessert',
        reservedBy: null,
        notes: '',
        dietaryInfo: '',
      });
    });

    describe('When: Deleting menu', () => {
      it('Then: Should delete menu', async () => {
        await deleteMenu(groupId, menuId);

        const menu = await getMenuById(groupId, menuId);
        expect(menu).toBeNull();
      });

      it('And: Should delete all items', async () => {
        const beforeItems = await getMenuItems(groupId, menuId);
        expect(beforeItems).toHaveLength(2);

        await deleteMenu(groupId, menuId);

        // After deletion, items should be gone
        const afterItems = await getMenuItems(groupId, menuId);
        expect(afterItems).toHaveLength(0);
      });
    });
  });

  describe('Feature: Create menu item', () => {
    let menuId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;
    });

    describe('Given: Valid item data', () => {
      describe('When: Creating item', () => {
        it('Then: Should create item with all fields', async () => {
          const item = await createMenuItem(groupId, menuId, {
            name: 'Caesar Salad',
            category: 'Side Dish',
            reservedBy: null,
            quantity: 'Serves 8',
            notes: 'No anchovies',
            dietaryInfo: 'Vegetarian',
            recipe: 'https://example.com/recipe',
          });

          expect(item.name).toBe('Caesar Salad');
          expect(item.category).toBe('Side Dish');
          expect(item.quantity).toBe('Serves 8');
          expect(item.notes).toBe('No anchovies');
          expect(item.dietaryInfo).toBe('Vegetarian');
          expect(item.recipe).toBe('https://example.com/recipe');
        });

        it('And: Should initialize as unreserved', async () => {
          const item = await createMenuItem(groupId, menuId, {
            name: 'Salad',
            category: 'Side Dish',
            reservedBy: null,
            notes: '',
            dietaryInfo: '',
          });

          expect(item.reservedBy).toBeNull();
        });

        it('And: Should set timestamps', async () => {
          const item = await createMenuItem(groupId, menuId, {
            name: 'Salad',
            category: 'Side Dish',
            reservedBy: null,
            notes: '',
            dietaryInfo: '',
          });

          expect(item.createdAt).toBeInstanceOf(Date);
          expect(item.updatedAt).toBeInstanceOf(Date);
        });

        it('And: Should handle optional fields', async () => {
          const item = await createMenuItem(groupId, menuId, {
            name: 'Simple Salad',
            category: 'Side Dish',
            reservedBy: null,
            notes: '',
            dietaryInfo: '',
          });

          expect(item.quantity).toBeUndefined();
          expect(item.recipe).toBeUndefined();
        });
      });
    });
  });

  describe('Feature: Get menu items', () => {
    let menuId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;

      // Create multiple items
      await createMenuItem(groupId, menuId, {
        name: 'Salad',
        category: 'Side Dish',
        reservedBy: null,
        notes: '',
        dietaryInfo: '',
      });
      await createMenuItem(groupId, menuId, {
        name: 'Cake',
        category: 'Dessert',
        reservedBy: 'John',
        notes: '',
        dietaryInfo: '',
      });
    });

    describe('When: Fetching all items', () => {
      it('Then: Should return all items for menu', async () => {
        const items = await getMenuItems(groupId, menuId);

        expect(items).toHaveLength(2);
        expect(items.some((i) => i.name === 'Salad')).toBe(true);
        expect(items.some((i) => i.name === 'Cake')).toBe(true);
      });

      it('And: Should include reservation status', async () => {
        const items = await getMenuItems(groupId, menuId);

        const salad = items.find((i) => i.name === 'Salad');
        const cake = items.find((i) => i.name === 'Cake');

        expect(salad?.reservedBy).toBeNull();
        expect(cake?.reservedBy).toBe('John');
      });
    });
  });

  describe('Feature: Update menu item', () => {
    let menuId: string;
    let itemId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;

      const item = await createMenuItem(groupId, menuId, {
        name: 'Original',
        category: 'Main Dish',
        reservedBy: null,
        notes: '',
        dietaryInfo: '',
      });
      itemId = item.id;
    });

    describe('When: Updating item fields', () => {
      it('Then: Should update specified fields', async () => {
        await updateMenuItem(groupId, menuId, itemId, {
          name: 'Updated Name',
          quantity: 'Serves 10',
        });

        const items = await getMenuItems(groupId, menuId);
        const item = items.find((i) => i.id === itemId);

        expect(item?.name).toBe('Updated Name');
        expect(item?.quantity).toBe('Serves 10');
      });

      it('And: Should update updatedAt timestamp', async () => {
        const beforeUpdate = await getMenuItems(groupId, menuId);
        const originalTime = beforeUpdate[0].updatedAt;

        // Wait a tiny bit to ensure different timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        await updateMenuItem(groupId, menuId, itemId, { name: 'Updated' });

        const items = await getMenuItems(groupId, menuId);
        expect(items[0].updatedAt.getTime()).toBeGreaterThan(originalTime.getTime());
      });
    });
  });

  describe('Feature: Toggle item reservation', () => {
    let menuId: string;
    let itemId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;

      const item = await createMenuItem(groupId, menuId, {
        name: 'Salad',
        category: 'Side Dish',
        reservedBy: null,
        notes: '',
        dietaryInfo: '',
      });
      itemId = item.id;
    });

    describe('Given: Item is unreserved', () => {
      describe('When: Reserving item', () => {
        it('Then: Should set reservedBy', async () => {
          await toggleItemReservation(groupId, menuId, itemId, 'John Doe');

          const items = await getMenuItems(groupId, menuId);
          const item = items.find((i) => i.id === itemId);

          expect(item?.reservedBy).toBe('John Doe');
        });
      });
    });

    describe('Given: Item is reserved', () => {
      beforeEach(async () => {
        await toggleItemReservation(groupId, menuId, itemId, 'John Doe');
      });

      describe('When: Unreserving item', () => {
        it('Then: Should clear reservedBy', async () => {
          await toggleItemReservation(groupId, menuId, itemId, null);

          const items = await getMenuItems(groupId, menuId);
          const item = items.find((i) => i.id === itemId);

          expect(item?.reservedBy).toBeNull();
        });
      });

      describe('When: Changing reservation to different user', () => {
        it('Then: Should update reservedBy', async () => {
          await toggleItemReservation(groupId, menuId, itemId, 'Jane Smith');

          const items = await getMenuItems(groupId, menuId);
          const item = items.find((i) => i.id === itemId);

          expect(item?.reservedBy).toBe('Jane Smith');
        });
      });
    });
  });

  describe('Feature: Delete menu item', () => {
    let menuId: string;
    let itemId: string;

    beforeEach(async () => {
      const menu = await createMenu(groupId, 'Test Menu', testDate, 'John');
      menuId = menu.id;

      const item = await createMenuItem(groupId, menuId, {
        name: 'Salad',
        category: 'Side Dish',
        reservedBy: null,
        notes: '',
        dietaryInfo: '',
      });
      itemId = item.id;
    });

    describe('When: Deleting item', () => {
      it('Then: Should remove item from menu', async () => {
        await deleteMenuItem(groupId, menuId, itemId);

        const items = await getMenuItems(groupId, menuId);
        expect(items.find((i) => i.id === itemId)).toBeUndefined();
      });
    });
  });
});
