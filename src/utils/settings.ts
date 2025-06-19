// src/utils/settings.ts
import { saveSettingToDB, getSettingFromDB } from './db';

const DECK_HANDLE_KEY = 'decksDirectoryHandle';
const IMAGE_HANDLE_KEY = 'imagesDirectoryHandle';
const CARD_SIZE_KEY = 'cardSize';

/**
 * Saves a FileSystemDirectoryHandle to IndexedDB.
 * @param key The key to identify the handle (e.g., 'decks' or 'images').
 * @param handle The directory handle to save.
 */
export async function saveDirectoryHandle(key: 'decks' | 'images', handle: FileSystemDirectoryHandle): Promise<void> {
    const dbKey = key === 'decks' ? DECK_HANDLE_KEY : IMAGE_HANDLE_KEY;
    await saveSettingToDB(dbKey, handle);
}

/**
 * Retrieves a FileSystemDirectoryHandle from IndexedDB.
 * @param key The key to identify the handle.
 * @returns A promise that resolves to the handle or null if not found.
 */
export async function getDirectoryHandle(key: 'decks' | 'images'): Promise<FileSystemDirectoryHandle | null> {
    const dbKey = key === 'decks' ? DECK_HANDLE_KEY : IMAGE_HANDLE_KEY;
    try {
        const handle = await getSettingFromDB<FileSystemDirectoryHandle>(dbKey);
        // It's good practice to verify permission, as it may have been revoked.
        if (handle && (await handle.queryPermission({ mode: 'readwrite' })) === 'granted') {
            return handle;
        }
        return null;
    } catch (error) {
        console.error(`Error getting ${key} handle from DB:`, error);
        return null;
    }
}

/**
 * Saves the card size preference to LocalStorage.
 * @param size The card size value to save.
 */
export function saveCardSize(size: number): void {
    localStorage.setItem(CARD_SIZE_KEY, size.toString());
}

/**
 * Retrieves the card size preference from LocalStorage.
 * @param defaultValue The default size to return if none is saved.
 * @returns The saved card size or the default value.
 */
export function getCardSize(defaultValue: number): number {
    const savedValue = localStorage.getItem(CARD_SIZE_KEY);
    return savedValue ? parseInt(savedValue, 10) : defaultValue;
}