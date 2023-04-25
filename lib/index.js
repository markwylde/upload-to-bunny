import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pLimit from 'p-limit';
import { globby } from 'globby';

export const deleteFile = async (targetDirectory, options) => {
  console.log(`DELETE: ${options.storageZoneName}/${targetDirectory}`);
  const url = `https://storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}`;
  await axios.delete(url, {
    headers: {
      'AccessKey': options.accessKey,
    },
  });
};

export const uploadFile = async (sourcePath, targetPath, options) => {
  const url = `https://storage.bunnycdn.com/${options.storageZoneName}/${targetPath}`;
  console.log(`UPLOAD: /${options.storageZoneName}/${targetPath}`);
  const fileContent = fs.readFileSync(sourcePath);
  await axios.put(url, fileContent, {
    headers: {
      'AccessKey': options.accessKey,
      'Content-Type': 'application/octet-stream',
    },
  });
};

export const uploadDirectory = async (sourceDirectory, targetDirectory, options = {}) => {
  options = {
    maxConcurrentUploads: 10,
    ...options,
  };

  if (options.cleanDestination) {
    await deleteFile(targetDirectory, options).catch(() => {});
  }

  options.limit = options.limit || pLimit(options.maxConcurrentUploads);

  const filePaths = await globby(`${sourceDirectory}/**/*`, { onlyFiles: true, absolute: true });
  await Promise.all(
    filePaths.map(async (sourcePath) => {
      const targetPath = path.join(targetDirectory, path.relative(sourceDirectory, sourcePath));
      return options.limit(() => uploadFile(sourcePath, targetPath, options));
    }),
  );
};

export default uploadDirectory;
