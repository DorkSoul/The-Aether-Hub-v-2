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
 */
export async function saveGameState(gameState: GameState): Promise<void> {
    const gameFile: GameFile = {
        aetherHubSaveVersion: SAVE_FILE_VERSION,
        savedAt: new Date().toISOString(),
        gameState: gameState,
    };

    // Use the File System Access API to show a "save file" dialog.
    const fileHandle = await window.showSaveFilePicker({
        suggestedName: `aether-hub-game-${new Date().toISOString().split('T')[0]}.json`,
        types: [{
            description: 'Aether Hub Game Saves',
            accept: { 'application/json': ['.json'] },
        }],
    });

    // Write the serialized game state to the selected file.
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(gameFile, null, 2));
    await writable.close();
}

/**
 * Prompts the user to open a game save file and returns its content.
 * @returns The parsed GameState if the file is valid, otherwise null.
 */
export async function loadGameState(): Promise<GameState | null> {
    try {
        // Use the File System Access API to show an "open file" dialog.
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{
                description: 'Aether Hub Game Saves',
                accept: { 'application/json': ['.json'] },
            }],
            multiple: false,
        });

        // Read and parse the selected file.
        const file = await fileHandle.getFile();
        const text = await file.text();
        const gameFile: GameFile = JSON.parse(text);

        // Validate the file structure before returning the game state.
        if (gameFile.aetherHubSaveVersion && gameFile.gameState) {
            return gameFile.gameState;
        } else {
            alert('Invalid game save file. The file is missing expected data.');
            return null;
        }
    } catch (err) {
        // Handle cases where the user cancels the dialog or an error occurs.
        if (err instanceof DOMException && err.name === 'AbortError') {
            console.info("User cancelled the file open dialog.");
        } else {
            console.error("Error loading game state:", err);
            alert(`Failed to load game file. Error: ${err instanceof Error ? err.message : 'Unknown'}`);
        }
        return null;
    }
}