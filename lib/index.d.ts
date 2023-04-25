import { AxiosRequestConfig } from 'axios';

export interface BunnyUploaderOptions {
  storageZoneName: string;
  accessKey: string;
  cleanDestination?: boolean;
  maxConcurrentUploads?: number;
  limit?: (fn: () => Promise<void>) => Promise<void>;
}

export function deleteFile(
  targetDirectory: string,
  options: BunnyUploaderOptions
): Promise<void>;

export function uploadFile(
  sourcePath: string,
  targetPath: string,
  options: BunnyUploaderOptions
): Promise<void>;

export function processPath(
  sourcePath: string,
  targetPath: string,
  options: BunnyUploaderOptions
): Promise<void>;

export function uploadDirectory(
  sourceDirectory: string,
  targetDirectory: string,
  options?: Partial<BunnyUploaderOptions>
): Promise<void>;

export default uploadDirectory;
