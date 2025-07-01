// src/utils/imageCaching.ts
import type { Card } from '../types';
import { queueImageDownload } from './imageDownloader'; 

/**
 * Generates a sanitized, consistent filename for a card or a specific face.
 * @param card The card object to generate a name for.
 * @param faceIndex The face of the card (0 for front, 1 for back).
 * @returns A string representing the unique filename.
 */
function generateImageFilename(card: Card, faceIndex: number = 0): string {
    let name: string;
    const DFC_LAYOUTS = ['transform', 'modal_dfc', 'double_faced_token', 'art_series', 'reversible_card'];

    if ((DFC_LAYOUTS.includes(card.layout || '') || card.layout === 'meld') && card.card_faces && card.card_faces[faceIndex]) {
        name = card.card_faces[faceIndex].name;
    } else {
        name = card.name;
    }

    const set = card.set;
    const collectorNumber = card.collector_number;

    const sanitizedName = name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/\s*\/\/\s*/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return `${set}-${collectorNumber}-${faceIndex}-${sanitizedName}.png`;
}

/**
 * Gets a URL for a card image. It tries the cache first, otherwise it queues a download from Scryfall.
 * @param card The card object for the desired image.
 * @param directoryHandle A handle to the user-selected cache directory.
 * @param faceIndex The index of the card face to get.
 * @returns A promise that resolves to a URL string.
 */
export async function getAndCacheCardImageUrl(
    card: Card,
    directoryHandle: FileSystemDirectoryHandle | null,
    faceIndex: number = 0
): Promise<string> {
    
    let scryfallUrl = '';
    const DFC_LAYOUTS = ['transform', 'modal_dfc', 'double_faced_token', 'art_series', 'reversible_card'];
    
    if (DFC_LAYOUTS.includes(card.layout || '') && card.card_faces && card.card_faces[faceIndex]) {
        const face = card.card_faces[faceIndex];
        scryfallUrl = face.image_uris?.png || face.image_uris?.large || '';
    } 
    else if (card.layout === 'meld' && faceIndex === 1 && card.meld_result_card) {
        scryfallUrl = card.meld_result_card.image_uris?.png || card.meld_result_card.image_uris?.large || '';
    }
    else {
        scryfallUrl = card.image_uris?.png || card.image_uris?.large || '';
    }

    if (!scryfallUrl) {
        throw new Error("Image URI not found.");
    }
    if (!directoryHandle) {
        return scryfallUrl;
    }

    const filename = generateImageFilename(card, faceIndex);

    try {
        // Re-verify permissions before trying to use the handle.
        const permission = await directoryHandle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
            // If we don't have permission, just return the online URL.
            // You could also re-prompt for permission here if desired.
            return scryfallUrl;
        }

        const fileHandle = await directoryHandle.getFileHandle(filename);
        const file = await fileHandle.getFile();
        return URL.createObjectURL(file);
    } catch (e) {
        if (e instanceof DOMException && e.name === 'NotFoundError') {
            try {
                const imageBlob = await queueImageDownload(scryfallUrl);

                const newFileHandle = await directoryHandle.getFileHandle(filename, { create: true });
                const writable = await newFileHandle.createWritable();
                await writable.write(imageBlob);
                await writable.close();
                
                return URL.createObjectURL(imageBlob);
            } catch (cacheError) {
                console.error(`Failed to cache image for ${card.name}.`);
                throw cacheError;
            }
        }
        
        console.error("Error accessing the file system:", e);
        // If there's any other error, fall back to the online URL.
        return scryfallUrl;
    }
}