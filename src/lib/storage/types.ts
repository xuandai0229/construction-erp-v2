export type StorageProviderName = "LOCAL" | "S3" | "MINIO";

export type StoredFileResult = {
  provider: StorageProviderName;
  objectKey: string;
  storagePath: string; // Mandatory for now since we don't migrate DB schema
  size: number;
};

export type SaveFileInput = {
  buffer: Buffer;
  projectId: string;
  projectCode: string; // Needed for path generation
  folderId: string;
  originalName: string;
};

export interface DocumentStorageProvider {
  /**
   * Saves a file to the storage provider.
   * @param input Data required to save the file
   * @returns StoredFileResult containing the path/key to save in DB
   */
  saveFile(input: SaveFileInput): Promise<StoredFileResult>;

  /**
   * Reads a file into a Buffer.
   * @param objectKeyOrPath The physical storagePath (local) or objectKey
   */
  readFile(objectKeyOrPath: string): Promise<Buffer>;

  /**
   * Deletes a file.
   * @param objectKeyOrPath The physical storagePath (local) or objectKey
   */
  deleteFile(objectKeyOrPath: string): Promise<void>;

  /**
   * Checks if a file exists.
   * @param objectKeyOrPath The physical storagePath (local) or objectKey
   */
  exists(objectKeyOrPath: string): Promise<boolean>;
}
