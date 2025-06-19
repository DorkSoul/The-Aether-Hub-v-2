// src/utils/db.ts
import { openDB, type IDBPDatabase } from 'idb';
import type { Card } from '../types';

const DB_NAME = 'AetherHubDB';
// --- MODIFIED --- Added a new store name for settings.
const CARD_STORE_NAME = 'cards';
const SETTINGS_STORE_NAME = 'settings';

let dbPromise: Promise<IDBPDatabase> | null = null;

function initDB() {
  if (!dbPromise) {
    // --- MODIFIED --- Incremented DB version and added the new object store.
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(CARD_STORE_NAME, { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore(SETTINGS_STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveCardsToDB(cards: Card[]) {
  const db = await initDB();
  const tx = db.transaction(CARD_STORE_NAME, 'readwrite');
  await Promise.all(cards.map(card => tx.store.put(card)));
  await tx.done;
}

export async function getCardsFromDB(cardIds: string[]): Promise<Card[]> {
  const db = await initDB();
  const tx = db.transaction(CARD_STORE_NAME, 'readonly');
  const cards = await Promise.all(
    cardIds.map(id => tx.store.get(id))
  );
  await tx.done;
  return cards.filter((card): card is Card => card !== undefined);
}

// --- NEW --- Functions to save and retrieve settings from IndexedDB.
export async function saveSettingToDB(key: string, value: any) {
    const db = await initDB();
    const tx = db.transaction(SETTINGS_STORE_NAME, 'readwrite');
    await tx.store.put(value, key);
    await tx.done;
}

export async function getSettingFromDB<T>(key: string): Promise<T | undefined> {
    const db = await initDB();
    const tx = db.transaction(SETTINGS_STORE_NAME, 'readonly');
    const value = await tx.store.get(key);
    await tx.done;
    return value as T | undefined;
}