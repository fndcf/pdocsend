/**
 * Mock do Firestore para testes
 */

export function createMockFirestore() {
  const docs: Record<string, Record<string, unknown>> = {};

  const mockDoc = (path: string) => ({
    id: path.split("/").pop() || "",
    get: jest.fn(async () => ({
      exists: !!docs[path],
      data: () => docs[path] || null,
      id: path.split("/").pop() || "",
    })),
    set: jest.fn(async (data: Record<string, unknown>) => {
      docs[path] = data;
    }),
    update: jest.fn(async (data: Record<string, unknown>) => {
      docs[path] = { ...docs[path], ...data };
    }),
  });

  const mockCollection = (collectionPath: string) => ({
    doc: jest.fn((docId?: string) => {
      const id = docId || `auto-${Date.now()}`;
      return mockDoc(`${collectionPath}/${id}`);
    }),
    where: jest.fn(() => ({
      get: jest.fn(async () => ({
        empty: true,
        docs: [] as Array<{ id: string; data: () => unknown }>,
      })),
    })),
    orderBy: jest.fn(() => ({
      limit: jest.fn(() => ({
        get: jest.fn(async () => ({
          docs: [] as Array<{ id: string; data: () => unknown }>,
        })),
      })),
      get: jest.fn(async () => ({
        docs: [] as Array<{ id: string; data: () => unknown }>,
      })),
    })),
    get: jest.fn(async () => ({
      docs: Object.entries(docs)
        .filter(([key]) => key.startsWith(collectionPath + "/"))
        .map(([key, val]) => ({
          id: key.split("/").pop() || "",
          ref: mockDoc(key),
          data: () => val,
        })),
    })),
  });

  return {
    collection: jest.fn((path: string) => mockCollection(path)),
    doc: jest.fn((path: string) => mockDoc(path)),
    batch: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      commit: jest.fn(async () => {}),
    })),
    runTransaction: jest.fn(async (fn: (transaction: unknown) => Promise<unknown>) => {
      const transaction = {
        get: jest.fn(async () => ({
          empty: true,
          docs: [] as Array<{ id: string; data: () => unknown }>,
        })),
        set: jest.fn(),
        update: jest.fn(),
      };
      return fn(transaction);
    }),
    _docs: docs,
    _setDoc: (path: string, data: Record<string, unknown>) => {
      docs[path] = data;
    },
  };
}
