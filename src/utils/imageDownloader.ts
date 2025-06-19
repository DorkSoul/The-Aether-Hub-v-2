// src/utils/imageDownloader.ts

// A simple queue to process download requests one by one with a delay,
// preventing the app from spamming the Scryfall API for images.
type DownloadTask = {
    url: string;
    resolve: (blob: Blob) => void;
    reject: (reason?: any) => void;
};

const downloadQueue: DownloadTask[] = [];
let isProcessing = false;

// The delay between each image download request.
const DOWNLOAD_DELAY_MS = 1000; // 1 second

async function processQueue() {
    if (downloadQueue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const task = downloadQueue.shift()!; // Get the next task from the front of the queue

    try {
        const response = await fetch(task.url);
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.statusText} for URL: ${task.url}`);
        }
        const blob = await response.blob();
        task.resolve(blob);
    } catch (error) {
        console.error("Image download failed:", error);
        task.reject(error);
    }

    // Wait for the specified delay before processing the next item in the queue.
    setTimeout(processQueue, DOWNLOAD_DELAY_MS);
}

/**
 * Adds an image download URL to the global processing queue.
 * @param url The Scryfall image URL to download.
 * @returns A promise that resolves with the image Blob when the download is complete.
 */
export function queueImageDownload(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        downloadQueue.push({ url, resolve, reject });
        // If the queue is not currently being processed, start it.
        if (!isProcessing) {
            processQueue();
        }
    });
}