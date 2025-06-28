// src/utils/imageDownloader.ts

type DownloadTask = {
    url: string;
    resolve: (blob: Blob) => void;
    reject: (reason?: any) => void;
};

const downloadQueue: DownloadTask[] = [];

const pendingDownloads = new Map<string, Promise<Blob>>();
let isProcessing = false;

// The delay between each image download request.
const DOWNLOAD_DELAY_MS = 1000; // 1 second

async function processQueue() {
    if (downloadQueue.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const task = downloadQueue.shift()!; 

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
    } finally {

        pendingDownloads.delete(task.url);
    }


    setTimeout(processQueue, DOWNLOAD_DELAY_MS);
}

/**
 * Adds an image download URL to the global processing queue.
 * @param url The Scryfall image URL to download.
 * @returns A promise that resolves with the image Blob when the download is complete.
 */
export function queueImageDownload(url: string): Promise<Blob> {
    if (pendingDownloads.has(url)) {
        return pendingDownloads.get(url)!;
    }

    const promise = new Promise<Blob>((resolve, reject) => {
        downloadQueue.push({ url, resolve, reject });
        if (!isProcessing) {
            processQueue();
        }
    });


    pendingDownloads.set(url, promise);

    return promise;
}