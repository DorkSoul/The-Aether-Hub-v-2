// src/utils/settings.ts
import { saveSettingToDB, getSettingFromDB } from './db';
import type { GameSettings } from '../types';

const DECK_HANDLE_KEY = 'decksDirectoryHandle';
const IMAGE_HANDLE_KEY = 'imagesDirectoryHandle';
const CARD_SIZE_KEY = 'cardSize';
const LAYOUT_KEY = 'gameLayout';
const HAND_HEIGHTS_KEY = 'handHeights';
const FREEFORM_SIZES_KEY = 'freeformCardSizes';
const PREVIEW_WIDTH_KEY = 'previewWidth';

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


/**
 * Saves the user's preferred game layout to LocalStorage.
 * @param layout The layout type to save.
 */
export function saveLayoutPreference(layout: GameSettings['layout']): void {
    localStorage.setItem(LAYOUT_KEY, layout);
}

/**
 * Retrieves the user's preferred game layout from LocalStorage.
 * @param defaultValue The default layout to return if none is saved.
 * @returns The saved layout or the default value.
 */
export function getLayoutPreference(defaultValue: GameSettings['layout']): GameSettings['layout'] {
    const savedValue = localStorage.getItem(LAYOUT_KEY);
    if (savedValue === '1vAll' || savedValue === 'split') {
        return savedValue;
    }
    return defaultValue;
}

/**
 * Saves the hand height preferences to LocalStorage.
 * @param heights An object mapping player index to height.
 */
export function saveHandHeights(heights: { [key: number]: number }): void {
    localStorage.setItem(HAND_HEIGHTS_KEY, JSON.stringify(heights));
}

/**
 * Retrieves the hand height preferences from LocalStorage.
 * @param defaultValue The default object to return if none is saved.
 * @returns The saved heights object or the default value.
 */
export function getHandHeights(defaultValue: { [key: number]: number }): { [key: number]: number } {
    const savedValue = localStorage.getItem(HAND_HEIGHTS_KEY);
    return savedValue ? JSON.parse(savedValue) : defaultValue;
}

/**
 * Saves the freeform card size preferences to LocalStorage.
 * @param sizes An object mapping player index to size.
 */
export function saveFreeformSizes(sizes: { [key: number]: number }): void {
    localStorage.setItem(FREEFORM_SIZES_KEY, JSON.stringify(sizes));
}

/**
 * Retrieves the freeform card size preferences from LocalStorage.
 * @param defaultValue The default object to return if none is saved.
 * @returns The saved sizes object or the default value.
 */
export function getFreeformSizes(defaultValue: { [key: number]: number }): { [key: number]: number } {
    const savedValue = localStorage.getItem(FREEFORM_SIZES_KEY);
    return savedValue ? JSON.parse(savedValue) : defaultValue;
}

/**
 * Saves the card preview panel width to LocalStorage.
 * @param width The width value to save.
 */
export function savePreviewWidth(width: number): void {
    localStorage.setItem(PREVIEW_WIDTH_KEY, width.toString());
}

/**
 * Retrieves the card preview panel width from LocalStorage.
 * @param defaultValue The default width to return if none is saved.
 * @returns The saved width or the default value.
 */
export function getPreviewWidth(defaultValue: number): number {
    const savedValue = localStorage.getItem(PREVIEW_WIDTH_KEY);
    return savedValue ? parseInt(savedValue, 10) : defaultValue;
}