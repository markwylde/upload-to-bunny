import fs from 'fs';
import path from 'path';
import axios from 'axios';
import pLimit from 'p-limit';

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

export const processPath = async (sourcePath, targetPath, options) => {
  const stat = fs.statSync(sourcePath);

  if (stat.isDirectory()) {
    const files = fs.readdirSync(sourcePath);
    const targetDir = path.join(targetPath, path.basename(sourcePath));
    await Promise.all(files.map(async (file) => {
      const subSourcePath = path.join(sourcePath, file);
      const subTargetPath = path.join(targetDir, file);
      return options.limit(() => processPath(subSourcePath, subTargetPath, options));
    }));
  } else {
    await uploadFile(sourcePath, targetPath, options);
  }
};

export const uploadDirectory = async (sourceDirectory, targetDirectory, options = {}) => {
  options = {
    maxConcurrentUploads: 10,
    ...options
  }

  if (options.cleanDestination) {
    await deleteFile(options.storageZoneName, targetDirectory).catch(() => {});
  }

  options.limit = options.limit || pLimit(options.maxConcurrentUploads);

  const files = fs.readdirSync(sourceDirectory);
  await Promise.all(files.map(async (file) => {
    const sourcePath = path.join(sourceDirectory, file);
    const targetPath = path.join(targetDirectory, file);
    return options.limit(() => processPath(sourcePath, targetPath, options));
  }));
};

export default uploadDirectory;
