import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pLimit, { type LimitFunction } from 'p-limit';
import { globby } from 'globby';

/**
 * Entry describing an item from Bunny Storage list API.
 * The API is not strongly consistent across docs, so we support common shapes.
 */
export interface BunnyListEntry {
  ObjectName?: string;
  Name?: string;
  Key?: string;
  IsDirectory?: boolean;
  isDirectory?: boolean;
  Type?: number; // 1 = directory in some responses
}

/**
 * Options for Bunny Storage operations.
 */
export interface UploadOptions {
  /** Storage zone name to target. */
  storageZoneName: string;
  /** Access key for the storage zone. */
  accessKey: string;
  /** Optional region prefix, e.g. `la`, `ny`, `sg`, etc. */
  region?: string;
  /**
   * When set to `simple`, remove the destination path before uploading.
   * When set to `avoid-deletes`, recursively prune remote files/folders that
   * are not present locally while preserving replacements.
   */
  cleanDestination?: 'simple' | 'avoid-deletes';
  /** Max concurrent uploads when sending files. Default: 10. */
  maxConcurrentUploads?: number;
  /**
   * Optional custom p-limit instance. If not provided, a limiter is created
   * from `maxConcurrentUploads`.
   */
  limit?: LimitFunction;
}

/** Build a Bunny Storage API URL for a given path. */
const buildUrl = (targetPath: string, options: UploadOptions): string => {
  const regionPrefix = options.region ? `${options.region}.` : '';
  const trimmed = targetPath.replace(/^\/+/, '');
  return `https://${regionPrefix}storage.bunnycdn.com/${options.storageZoneName}/${trimmed}`;
};

/**
 * Delete a file or empty directory on Bunny Storage.
 *
 * @param targetPath - Remote path relative to the storage root.
 * @param options - Authentication and behavior options.
 */
export const deleteFile = async (
  targetPath: string,
  options: UploadOptions,
): Promise<void> => {
  const url = buildUrl(targetPath, options);
  await axios.delete(url, {
    headers: {
      AccessKey: options.accessKey,
    },
  });
};

/**
 * List a remote directory. Returns an array of entries with at least
 * `ObjectName` and a flag that indicates whether the entry is a directory.
 */
const listDirectory = async (
  targetDirectory: string | undefined,
  options: UploadOptions,
): Promise<BunnyListEntry[]> => {
  const base = targetDirectory ? `${targetDirectory.replace(/\/+$/, '')}/` : '';
  const url = buildUrl(base, options);
  try {
    const res = await axios.get(url, {
      headers: {
        AccessKey: options.accessKey,
      },
    });
    return Array.isArray(res.data) ? (res.data as BunnyListEntry[]) : [];
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

/** Determine whether a given list entry represents a directory. */
const isDirectoryEntry = (entry: BunnyListEntry): boolean =>
  entry.IsDirectory === true || entry.isDirectory === true || entry.Type === 1;

/**
 * Recursively delete a remote directory's contents, then the directory itself.
 */
const deleteRecursively = async (
  remoteDir: string,
  options: UploadOptions,
): Promise<void> => {
  const entries = await listDirectory(remoteDir, options);
  for (const entry of entries) {
    const name = entry.ObjectName || entry.Name || entry.Key || '';
    const childRemotePath = remoteDir ? `${remoteDir.replace(/\/+$/, '')}/${name}` : name;
    if (isDirectoryEntry(entry)) {
      await deleteRecursively(childRemotePath, options);
      await deleteFile(childRemotePath, options).catch(() => {});
    } else {
      await deleteFile(childRemotePath, options).catch(() => {});
    }
  }
  if (remoteDir) {
    await deleteFile(remoteDir, options).catch(() => {});
  }
};

/**
 * Recursively delete remote files/folders not present locally.
 *
 * @param rootTargetDir - Destination directory at the remote root.
 * @param currentRelDir - Current relative subdirectory from the root target.
 * @param localFilesSet - Set of relative file paths that should exist remotely.
 * @param localDirsSet - Set of relative directory paths that should exist remotely.
 */
const pruneRemote = async (
  rootTargetDir: string,
  currentRelDir: string,
  localFilesSet: Set<string>,
  localDirsSet: Set<string>,
  options: UploadOptions,
): Promise<void> => {
  const remoteDir = currentRelDir
    ? `${rootTargetDir ? rootTargetDir.replace(/\/+$/, '') + '/' : ''}${currentRelDir}`
    : rootTargetDir;
  const entries = await listDirectory(remoteDir, options);

  for (const entry of entries) {
    const name = entry.ObjectName || entry.Name || entry.Key || '';
    const childRel = currentRelDir ? `${currentRelDir}/${name}` : name;
    const childRemotePath = remoteDir ? `${remoteDir.replace(/\/+$/, '')}/${name}` : name;

    if (isDirectoryEntry(entry)) {
      if (!localDirsSet.has(childRel)) {
        await deleteRecursively(childRemotePath, options);
      } else {
        await pruneRemote(rootTargetDir, childRel, localFilesSet, localDirsSet, options);
      }
    } else if (!localFilesSet.has(childRel)) {
      await deleteFile(childRemotePath, options).catch(() => {});
    }
  }
};

/**
 * Upload a single file to Bunny Storage.
 *
 * @param sourcePath - Local filesystem path to read from.
 * @param targetPath - Remote path relative to the storage root.
 * @param options - Authentication and behavior options.
 */
export const uploadFile = async (
  sourcePath: string,
  targetPath: string,
  options: UploadOptions,
): Promise<void> => {
  const url = buildUrl(targetPath, options);
  const fileContent = fs.createReadStream(sourcePath);
  await axios.put(url, fileContent, {
    headers: {
      AccessKey: options.accessKey,
      'Content-Type': 'application/octet-stream',
    },
  });
};

/**
 * Upload a directory to Bunny Storage.
 *
 * - When `cleanDestination` is `simple`, the destination path is deleted first.
 * - When `cleanDestination` is `avoid-deletes`, the remote is pruned to match the local content
 *   without deleting files that are being replaced.
 *
 * @param sourceDirectory - Local directory to upload from.
 * @param targetDirectory - Remote directory at the storage root to upload into.
 * @param options - Optional upload settings and authentication.
 */
export const uploadDirectory = async (
  sourceDirectory: string,
  targetDirectory: string,
  options: UploadOptions,
): Promise<void> => {
  const effective: UploadOptions = {
    maxConcurrentUploads: 10,
    ...options,
  };

  effective.limit = effective.limit || pLimit(effective.maxConcurrentUploads ?? 10);

  const filePaths = await globby(`${sourceDirectory}/**/*`, { onlyFiles: true, absolute: true });
  const localFiles = filePaths.map((p) => path.relative(sourceDirectory, p).split(path.sep).join('/'));

  const localFilesSet = new Set(localFiles);
  const localDirsSet = new Set<string>();

  for (const relFile of localFiles) {
    let dir = path.posix.dirname(relFile);
    while (dir && dir !== '.' && !localDirsSet.has(dir)) {
      localDirsSet.add(dir);
      const next = path.posix.dirname(dir);
      if (next === dir) break;
      dir = next;
    }
  }

  if (effective.cleanDestination === 'simple') {
    await deleteFile(targetDirectory, effective).catch(() => {});
  } else if (effective.cleanDestination === 'avoid-deletes') {
    await pruneRemote(targetDirectory, '', localFilesSet, localDirsSet, effective);
  }

  await Promise.all(
    filePaths.map(async (sourcePath) => {
      const targetPath = path.join(targetDirectory, path.relative(sourceDirectory, sourcePath));
      return effective.limit!(
        () => uploadFile(sourcePath, targetPath, effective),
      );
    }),
  );
};

export default uploadDirectory;
