// src/utils/gameUtils.ts
import type { GameState } from '../types';

const SAVE_FILE_VERSION = '1.0';

/**
 * Interface for the structure of the save file.
 */
interface GameFile {
    aetherHubSaveVersion: string;
    savedAt: string;
    gameState: GameState;
}

/**
 * Prompts the user to save the current game state to a .json file.
 * @param gameState The complete state of the current game.
 * @param savesDirectoryHandle A handle to the user-selected saves directory.
 */
export async function saveGameState(gameState: GameState, savesDirectoryHandle: FileSystemDirectoryHandle | null): Promise<void> {
    const gameFile: GameFile = {
        aetherHubSaveVersion: SAVE_FILE_VERSION,
        savedAt: new Date().toISOString(),
        gameState: gameState,
    };

    const options = {
        suggestedName: `aether-hub-game-${new Date().toISOString().split('T')[0]}.json`,
        types: [{
            description: 'Aether Hub Game Saves',
            accept: { 'application/json': ['.json'] },
        }],
        startIn: savesDirectoryHandle ?? undefined,
    };

    const fileHandle = await window.showSaveFilePicker(options);

    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(gameFile, null, 2));
    await writable.close();
}

/**
 * Prompts the user to open a game save file and returns its content.
 * @param savesDirectoryHandle A handle to the user-selected saves directory.
 * @returns The parsed GameState if the file is valid, otherwise null.
 */
export async function loadGameState(savesDirectoryHandle: FileSystemDirectoryHandle | null): Promise<GameState | null> {
    try {
        const options = {
            types: [{
                description: 'Aether Hub Game Saves',
                accept: { 'application/json': ['.json'] },
            }],
            multiple: false,
            startIn: savesDirectoryHandle ?? undefined,
        };

        const [fileHandle] = await window.showOpenFilePicker(options);


        const file = await fileHandle.getFile();
        const text = await file.text();
        const gameFile: GameFile = JSON.parse(text);


        if (gameFile.aetherHubSaveVersion && gameFile.gameState) {
            return gameFile.gameState;
        } else {
            alert('Invalid game save file. The file is missing expected data.');
            return null;
        }
    } catch (err) {

        if (err instanceof DOMException && err.name === 'AbortError') {
            console.info("User cancelled the file open dialog.");
        } else {
            console.error("Error loading game state:", err);
            alert(`Failed to load game file. Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
        return null;
    }
}