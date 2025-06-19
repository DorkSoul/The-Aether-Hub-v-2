// src/utils/db.ts
import { openDB, type IDBPDatabase } from 'idb';
import type { Card } from '../types';

const DB_NAME = 'AetherHubDB';
const STORE_NAME = 'cards';
let dbPromise: Promise<IDBPDatabase> | null = null;

function initDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export async function saveCardsToDB(cards: Card[]) {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await Promise.all(cards.map(card => tx.store.put(card)));
  await tx.done;
}

export async function getCardsFromDB(cardIds: string[]): Promise<Card[]> {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const cards = await Promise.all(
    cardIds.map(id => tx.store.get(id))
  );
  await tx.done;
  // Filter out any undefined results for cards not found in the DB
  return cards.filter((card): card is Card => card !== undefined);
}