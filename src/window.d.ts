// src/window.d.ts

// These interfaces define the shape of the objects used by the File System Access API
// We only define the parts we are actually using in our code.
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  kind: 'file';
  getFile(): Promise<File>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  kind: 'directory';
  values(): AsyncIterable<FileSystemFileHandle | FileSystemDirectoryHandle>;
}

// This is the crucial part: we are telling TypeScript that the global Window
// object has a method called showDirectoryPicker.
interface Window {
  showDirectoryPicker(options?: any): Promise<FileSystemDirectoryHandle>;
}