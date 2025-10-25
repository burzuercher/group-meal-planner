// Mock Firestore data store
let mockFirestoreData: Record<string, any> = {};

// Helper to reset mock data between tests
export const resetMockFirestore = () => {
  mockFirestoreData = {};
};

// Helper to set mock data for tests
export const setMockFirestoreData = (path: string, data: any) => {
  mockFirestoreData[path] = data;
};

// Helper to get mock data
export const getMockFirestoreData = (path: string) => {
  return mockFirestoreData[path];
};

// Mock Timestamp
export class MockTimestamp {
  seconds: number;
  nanoseconds: number;

  constructor(seconds: number, nanoseconds: number) {
    this.seconds = seconds;
    this.nanoseconds = nanoseconds;
  }

  toDate(): Date {
    return new Date(this.seconds * 1000);
  }

  static fromDate(date: Date): MockTimestamp {
    return new MockTimestamp(Math.floor(date.getTime() / 1000), 0);
  }

  static now(): MockTimestamp {
    return MockTimestamp.fromDate(new Date());
  }
}

// Mock Firestore functions
export const collection = jest.fn((db: any, ...pathSegments: string[]) => {
  return { path: pathSegments.join('/'), type: 'collection' };
});

export const doc = jest.fn((collectionOrDb: any, ...pathSegments: string[]) => {
  const path = typeof collectionOrDb === 'object' && collectionOrDb.path
    ? `${collectionOrDb.path}/${pathSegments.join('/')}`
    : pathSegments.join('/');
  return { path, type: 'document', id: pathSegments[pathSegments.length - 1] };
});

export const getDoc = jest.fn(async (docRef: any) => {
  const data = mockFirestoreData[docRef.path];
  return {
    exists: () => !!data,
    data: () => data,
    id: docRef.id,
  };
});

export const getDocs = jest.fn(async (queryRef: any) => {
  const collectionPath = queryRef.path || queryRef._query?.path || '';
  const docs: any[] = [];

  // Find all documents matching the collection path
  Object.keys(mockFirestoreData).forEach((path) => {
    if (path.startsWith(collectionPath)) {
      const id = path.split('/').pop();
      docs.push({
        id,
        data: () => mockFirestoreData[path],
        exists: () => true,
      });
    }
  });

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: any) => docs.forEach(callback),
  };
});

export const setDoc = jest.fn(async (docRef: any, data: any) => {
  mockFirestoreData[docRef.path] = data;
  return Promise.resolve();
});

export const updateDoc = jest.fn(async (docRef: any, data: any) => {
  if (mockFirestoreData[docRef.path]) {
    mockFirestoreData[docRef.path] = { ...mockFirestoreData[docRef.path], ...data };
  }
  return Promise.resolve();
});

export const deleteDoc = jest.fn(async (docRef: any) => {
  delete mockFirestoreData[docRef.path];
  return Promise.resolve();
});

export const query = jest.fn((collectionRef: any, ...constraints: any[]) => {
  return {
    path: collectionRef.path,
    _query: collectionRef,
    constraints,
  };
});

export const where = jest.fn((field: string, operator: string, value: any) => {
  return { type: 'where', field, operator, value };
});

export const orderBy = jest.fn((field: string, direction: 'asc' | 'desc' = 'asc') => {
  return { type: 'orderBy', field, direction };
});

export const limit = jest.fn((limitValue: number) => {
  return { type: 'limit', value: limitValue };
});

// Export Timestamp as named export
export const Timestamp = MockTimestamp;

// Mock Firestore instance
export const db = {
  type: 'firestore',
  name: 'mock-firestore',
};

// Mock initializeApp
export const initializeApp = jest.fn();

// Mock getFirestore
export const getFirestore = jest.fn(() => db);
