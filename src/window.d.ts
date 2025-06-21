// src/window.d.ts

// These interfaces define the shape of the objects used by the File System Access API.
// We only define the parts we are actually using in our code.
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
  queryPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(options?: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

// This is a simplified interface for the writable stream.
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

// This tells TypeScript that the global Window object has these methods.
interface Window {
  showDirectoryPicker(options?: any): Promise<FileSystemDirectoryHandle>;
  showOpenFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle[]>;
  showSaveFilePicker(options?: FilePickerOptions): Promise<FileSystemFileHandle>;
}