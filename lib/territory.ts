import { openDB, IDBPDatabase, deleteDB } from 'idb';

const DB_NAME = 'ministry-tracker';
const STORE_NAME = 'territories';
// Use a high version number to avoid conflicts with existing databases
const DB_VERSION = 1000;

interface Territory {
  id?: number;
  city: string;
  state: string;
  bounds?: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  createdAt?: Date;
  updatedAt?: Date;
}

type DBSchema = {
  [STORE_NAME]: {
    key: number;
    value: Territory;
    indexes: { 'by_city_state': [string, string] };
  };
};

// Keep track of the active database connection
let dbPromise: Promise<IDBPDatabase<DBSchema>> | null = null;

// Function to get or initialize the database
async function getDatabase(): Promise<IDBPDatabase<DBSchema>> {
  if (!dbPromise) {
    dbPromise = initDB();
  }
  return dbPromise;
}

async function initDB(): Promise<IDBPDatabase<DBSchema>> {
  try {
    console.log('Initializing database...');
    
    // First, try to open the database without specifying a version to check the current version
    const db = await openDB<DBSchema>(DB_NAME);
    const currentVersion = db.version;
    db.close();
    
    console.log(`Current database version: ${currentVersion}`);
    
    // Now open with the correct version and upgrade if needed
    const upgradedDb = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
        console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
        
        // Create the object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          console.log('Creating object store:', STORE_NAME);
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
          
          // Create an index for querying by city and state
          store.createIndex('by_city_state', ['city', 'state'], { unique: true });
          console.log('Created index: by_city_state');
        } else {
          console.log('Object store already exists:', STORE_NAME);
          
          // Ensure the index exists
          const store = transaction.objectStore(STORE_NAME);
          if (!store.indexNames.contains('by_city_state')) {
            console.log('Creating missing index: by_city_state');
            store.createIndex('by_city_state', ['city', 'state'], { unique: true });
          }
        }
      },
    });
    
    console.log('Database initialized successfully');
    return upgradedDb;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Helper function to safely execute database operations
async function withDB<T>(operation: (db: IDBPDatabase<DBSchema>) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  try {
    return await operation(db);
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

export async function addTerritory(territory: Omit<Territory, 'id' | 'createdAt' | 'updatedAt'>): Promise<Territory> {
  console.log('Adding territory to database:', territory);
  
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      const db = await getDatabase();
      
      // Check if the object store exists
      const storeNames = Array.from(db.objectStoreNames);
      if (!storeNames.includes(STORE_NAME)) {
        console.log('Territories store does not exist, recreating database...');
        // Reset the connection
        db.close();
        dbPromise = null;
        
        // Recreate the database
        const newDb = await openDB<DBSchema>(DB_NAME, DB_VERSION, {
          upgrade(db, oldVersion, newVersion) {
            console.log('Creating new object store during addTerritory');
            const store = db.createObjectStore(STORE_NAME, {
              keyPath: 'id',
              autoIncrement: true,
            });
            store.createIndex('by_city_state', ['city', 'state'], { unique: true });
          },
        });
        
        // Update the database reference
        dbPromise = Promise.resolve(newDb);
        continue; // Retry the operation with the new connection
      }
      
      // Now proceed with adding the territory
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const now = new Date();
      
      // Normalize the city and state (trim and proper case)
      const normalizedTerritory: Territory = {
        ...territory,
        city: territory.city.trim(),
        state: territory.state.trim().toUpperCase(),
        createdAt: now,
        updatedAt: now,
      };
      
      console.log('Normalized territory data:', normalizedTerritory);
      
      // Check if territory already exists
      const existing = await store.index('by_city_state').get([normalizedTerritory.city, normalizedTerritory.state]);
      if (existing) {
        throw new Error(`A territory with city "${normalizedTerritory.city}" and state "${normalizedTerritory.state}" already exists`);
      }
      
      const id = await store.add(normalizedTerritory);
      await tx.done;
      console.log('Transaction completed successfully');
      return { ...normalizedTerritory, id };
      
    } catch (error) {
      retryCount++;
      console.error(`Attempt ${retryCount} failed:`, error);
      
      // If it's a validation error, don't retry
      if (error instanceof Error && 
          (error.message.includes('already exists') || 
           error.message.includes('unique'))) {
        throw error;
      }
      
      // If we've reached max retries, rethrow the error
      if (retryCount >= maxRetries) {
        throw new Error(`Failed to add territory after ${maxRetries} attempts: ${error}`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 300 * retryCount));
    }
  }
  
  // This should never be reached due to the throw in the loop, but TypeScript needs it
  throw new Error('Failed to add territory after multiple attempts');
}

export async function getTerritories(): Promise<Territory[]> {
  return withDB(async (db) => {
    // Check if the object store exists
    const storeNames = Array.from(db.objectStoreNames);
    if (!storeNames.includes(STORE_NAME)) {
      console.log('Territories store does not exist, returning empty array');
      return [];
    }
    
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    try {
      const territories = await store.getAll();
      console.log('Retrieved territories:', territories);
      return territories;
    } catch (error) {
      console.error('Error in getTerritories:', {
        error,
        storeName: STORE_NAME,
        dbName: DB_NAME
      });
      return [];
    }
  });
}

export async function deleteTerritory(id: number): Promise<void> {
  return withDB(async (db) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.delete(id);
    await tx.done;
  });
}

export async function territoryExists(city: string, state: string): Promise<boolean> {
  // Basic input validation
  if (!city || !state) {
    console.error('Invalid arguments to territoryExists:', { city, state });
    return false;
  }

  const normalizedCity = city.trim();
  const normalizedState = state.trim().toUpperCase();
  
  try {
    // Try to get the database
    const db = await getDatabase().catch(dbError => {
      console.error('Failed to get database:', dbError);
      throw new Error('Database connection failed');
    });

    // Check if the store exists
    const storeNames = Array.from(db.objectStoreNames);
    if (!storeNames.includes(STORE_NAME)) {
      console.log('Territories store does not exist');
      return false;
    }

    // Start a read-only transaction
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    // Simple implementation: get all territories and check manually
    const allTerritories = await store.getAll();
    
    // Check if any territory matches the city/state (case-insensitive)
    const exists = allTerritories.some(territory => {
      return territory && 
             territory.city && 
             territory.state &&
             territory.city.trim().toLowerCase() === normalizedCity.toLowerCase() &&
             territory.state.trim().toUpperCase() === normalizedState;
    });
    
    return exists;
    
  } catch (error: unknown) {
    // Create a more detailed error object with proper type checking
    const errorObj = error as Error;
    const errorInfo = {
      name: errorObj?.name || 'UnknownError',
      message: errorObj?.message || 'No error message',
      stack: errorObj?.stack,
      error: error ? String(error) : 'No error object',
      input: { city, state, normalizedCity, normalizedState },
      storeName: STORE_NAME,
      dbName: DB_NAME,
      timestamp: new Date().toISOString()
    };
    
    // Log the full error details
    console.error('Error in territoryExists:', JSON.stringify(errorInfo, null, 2));
    
    // Return false to allow the operation to continue
    return false;
  }
}


