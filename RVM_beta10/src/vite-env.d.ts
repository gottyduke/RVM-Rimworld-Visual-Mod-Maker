/// <reference types="vite/client" />

type SaveZipResult = {
  ok?: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
};

interface Window {
  rimworldModMaker?: {
    saveZip(bytes: Uint8Array, defaultName: string): Promise<SaveZipResult>;
  };
}
