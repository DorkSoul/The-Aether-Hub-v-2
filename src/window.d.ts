// src/window.d.ts
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  queryPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    close(): Promise<void>;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  values(): AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

interface FilePickerOptions {
    types?: {
        description: string;
        accept: Record<string, string[]>;
    }[];
    multiple?: boolean;
    suggestedName?: string;
}

interface IElectronFS {
    getDecks: () => Promise<any[]>;
    getDeckContent: (fileName: string) => Promise<string>;
    saveDeck: (fileName: string, content: string) => Promise<void>;
    getSaves: () => Promise<string[]>;
    saveGame: (fileName: string, content: string) => Promise<void>;
    loadGame: (fileName: string) => Promise<string>;
}

interface Window {
  showDirectoryPicker(options?: any): Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle>;
  electron: {
    fs: IElectronFS;
  };
}