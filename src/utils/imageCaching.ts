// src/utils/imageCaching.ts
import type { Card, CardFace } from '../types';

/**
 * Generates a sanitized, consistent filename for a card or card face.
 * Example: "m21-215-ugin-the-spirit-dragon.png"
 * @param card The main card object.
 * @param face Optional card face for multi-faced cards.
 * @returns A string representing the filename.
 */
function generateImageFilename(card: Card, face?: CardFace): string {
    const name = face ? face.name : card.name;
    // Use the face's collector number if it exists (for certain DFCs), else the main card's.
    const collectorNumber = card.card_faces ? (card.collector_number) : card.collector_number;
    const set = card.set;

    // Sanitize the name for file systems
    const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return `${set}-${collectorNumber}-${sanitizedName}.png`;
}

/**
 * Gets a URL for a card image. It first tries the local file system cache.
 * If not found, it fetches from Scryfall, saves the image to the cache,
 * and then returns a local URL.
 * @param card The card object.
 * @param directoryHandle A handle to the user-selected cache directory.
 * @param faceIndex The index of the card face to get (for multi-face cards).
 * @returns A promise that resolves to a URL string (local blob or remote Scryfall).
 */
export async function getAndCacheCardImageUrl(
    card: Card,
    directoryHandle: FileSystemDirectoryHandle | null,
    faceIndex?: number
): Promise<string> {
    const face = card.card_faces && faceIndex !== undefined ? card.card_faces[faceIndex] : undefined;
    
    // Prioritize the high-quality PNG from Scryfall for caching.
    const scryfallUrl = (face ? face.image_uris?.png : card.image_uris?.png) || (face ? face.image_uris?.large : card.image_uris?.large) || '';

    // If no directory is selected for caching, we can only use the remote URL.
    if (!directoryHandle) {
        return scryfallUrl;
    }

    const filename = generateImageFilename(card, face);

    try {
        // 1. Try to get the file from the local cache.
        const fileHandle = await directoryHandle.getFileHandle(filename);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch (e) {
        // 2. If not found, download from Scryfall and cache it.
        if (e instanceof DOMException && e.name === 'NotFoundError') {
            try {
                if (!scryfallUrl) return ''; // No source URL to fetch from.

                const response = await fetch(scryfallUrl);
                if (!response.ok) throw new Error('Failed to fetch image from Scryfall');
                const imageBlob = await response.blob();

                // Save the fetched blob to the local cache directory.
                const newFileHandle = await directoryHandle.getFileHandle(filename, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(imageBlob);
                await writable.close();
                
                // Return a blob URL for the newly cached image.
                return URL.createObjectURL(imageBlob);
            } catch (cacheError) {
                console.error(`Failed to cache image for ${card.name}. Falling back to remote URL.`, cacheError);
                return scryfallUrl; // Fallback to Scryfall URL on cache failure.
            }
        }

        // For other errors (e.g., security errors), log and fall back to remote URL.
        console.error("Error accessing the file system:", e);
        return scryfallUrl;
    }
}