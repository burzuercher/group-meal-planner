// Note: @testing-library/react-native v12.4+ includes built-in matchers
// No need to import extend-expect separately

// Mock globals required by Expo's winter runtime
global.import = global.import || {};
global.import.meta = global.import.meta || {};
global.__ExpoImportMetaRegistry = global.__ExpoImportMetaRegistry || new Map();

// Add structuredClone polyfill if not available (required by Expo winter runtime)
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Mock React Native's Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
}));

// Mock react-native-paper components
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  const React = require('react');
  return {
    ...RealModule,
    Portal: ({ children }) => children,
  };
});

// Mock Firebase App
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({ name: 'mock-app' })),
  getApp: jest.fn(() => ({ name: 'mock-app' })),
  getApps: jest.fn(() => [{ name: 'mock-app' }]),
}));

// Mock Firestore
jest.mock('firebase/firestore', () => {
  const mockFirestoreData = new Map();

  return {
    getFirestore: jest.fn(() => ({ __isMock: true })),
    initializeFirestore: jest.fn(),
    collection: jest.fn((db, path) => ({ path, _type: 'collection' })),
    doc: jest.fn((ref, ...segments) => {
      let path, id;

      if (ref.path) {
        // ref is a collection, segments contain the doc ID and potentially subcollections
        if (segments.length > 0) {
          path = `${ref.path}/${segments.join('/')}`;
          id = segments[0]; // First segment is the doc ID
        } else {
          // No ID provided, generate one
          id = 'generated-id-' + Math.random().toString(36).substr(2, 9);
          path = `${ref.path}/${id}`;
        }
      } else {
        // ref is db, segments contain full path
        path = segments.join('/');
        id = segments[segments.length - 1];
      }

      return { path, id, _type: 'document' };
    }),
    getDoc: jest.fn(async (docRef) => {
      const data = mockFirestoreData.get(docRef.path);
      return {
        exists: () => !!data,
        data: () => data,
        id: docRef.id,
      };
    }),
    getDocs: jest.fn(async (queryRef) => {
      const docs = [];
      const basePath = queryRef.path || queryRef._query?.path || '';

      // Handle query constraints (where clauses)
      const whereConstraints = queryRef.constraints?.filter(c => c.type === 'where') || [];

      mockFirestoreData.forEach((data, path) => {
        // Check if path matches the collection
        const pathParts = path.split('/');
        const basePathParts = basePath.split('/');

        // Only match direct children of the collection
        if (pathParts.length !== basePathParts.length + 1) return;
        if (!basePathParts.every((part, i) => pathParts[i] === part)) return;

        // Check where constraints
        let matchesWhere = true;
        for (const constraint of whereConstraints) {
          const fieldValue = data[constraint.field];
          const compareValue = constraint.value;

          if (constraint.op === '==') {
            matchesWhere = matchesWhere && (
              typeof fieldValue === 'string' && typeof compareValue === 'string'
                ? fieldValue.toUpperCase() === compareValue.toUpperCase()
                : fieldValue === compareValue
            );
          } else if (constraint.op === '>=') {
            // Handle Timestamp comparisons
            const fieldTime = fieldValue?.seconds || fieldValue?.getTime?.() / 1000 || 0;
            const compareTime = compareValue?.seconds || compareValue?.getTime?.() / 1000 || 0;
            matchesWhere = matchesWhere && (fieldTime >= compareTime);
          } else if (constraint.op === '<=') {
            // Handle Timestamp comparisons
            const fieldTime = fieldValue?.seconds || fieldValue?.getTime?.() / 1000 || 0;
            const compareTime = compareValue?.seconds || compareValue?.getTime?.() / 1000 || 0;
            matchesWhere = matchesWhere && (fieldTime <= compareTime);
          }
        }

        if (matchesWhere) {
          const id = pathParts[pathParts.length - 1];
          docs.push({
            id,
            data: () => data,
            exists: () => true,
          });
        }
      });

      // Handle orderBy constraints
      const orderByConstraints = queryRef.constraints?.filter(c => c.type === 'orderBy') || [];
      if (orderByConstraints.length > 0) {
        for (const orderConstraint of orderByConstraints) {
          docs.sort((a, b) => {
            const aData = a.data();
            const bData = b.data();
            const aValue = aData[orderConstraint.field];
            const bValue = bData[orderConstraint.field];

            // Handle Timestamp comparisons
            const aTime = aValue?.seconds || aValue?.getTime?.() / 1000 || 0;
            const bTime = bValue?.seconds || bValue?.getTime?.() / 1000 || 0;

            if (orderConstraint.direction === 'desc') {
              return bTime - aTime;
            }
            return aTime - bTime;
          });
        }
      }

      return {
        docs,
        empty: docs.length === 0,
        size: docs.length,
        forEach: (callback) => docs.forEach(callback),
      };
    }),
    setDoc: jest.fn(async (docRef, data) => {
      mockFirestoreData.set(docRef.path, data);
    }),
    updateDoc: jest.fn(async (docRef, data) => {
      const existing = mockFirestoreData.get(docRef.path);
      if (!existing) {
        throw new Error(`Document not found at path: ${docRef.path}`);
      }

      // Handle array union operations
      const updatedData = { ...existing };
      for (const [key, value] of Object.entries(data)) {
        if (value && typeof value === 'object' && value._type === 'arrayUnion') {
          // Merge new items into existing array
          const existingArray = existing[key] || [];
          updatedData[key] = [...existingArray, ...value.items];
        } else {
          updatedData[key] = value;
        }
      }

      mockFirestoreData.set(docRef.path, updatedData);
    }),
    deleteDoc: jest.fn(async (docRef) => {
      mockFirestoreData.delete(docRef.path);
    }),
    query: jest.fn((collectionRef, ...constraints) => ({
      path: collectionRef.path,
      _query: collectionRef,
      constraints,
    })),
    where: jest.fn((field, op, value) => ({ type: 'where', field, op, value })),
    orderBy: jest.fn((field, direction) => ({ type: 'orderBy', field, direction })),
    limit: jest.fn((value) => ({ type: 'limit', value })),
    arrayUnion: jest.fn((...items) => ({ _type: 'arrayUnion', items })),
    Timestamp: {
      fromDate: jest.fn((date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: 0,
        toDate: () => date,
      })),
      now: jest.fn(() => ({
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
        toDate: () => new Date(),
      })),
    },
    __mockFirestoreData: mockFirestoreData,
    __resetMockFirestore: () => mockFirestoreData.clear(),
  };
});

// Mock Firebase Storage for image service
jest.mock('firebase/storage', () => ({
  getStorage: jest.fn(),
  ref: jest.fn(),
  uploadBytesResumable: jest.fn(),
  getDownloadURL: jest.fn(),
}));

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ __isMock: true })),
  httpsCallable: jest.fn(() => jest.fn(() => Promise.resolve({ data: {} }))),
  connectFunctionsEmulator: jest.fn(),
}));

// Mock expo-image-manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  EncodingType: {
    Base64: 'base64',
  },
}));

// Mock DateTimePicker
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Setup default Date.now for consistent testing
const mockDate = new Date('2025-10-25T12:00:00.000Z');
global.Date.now = jest.fn(() => mockDate.getTime());
