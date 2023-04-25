import test from 'basictap';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { deleteFile, uploadFile, uploadDirectory } from '../lib/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STORAGE_ZONE_NAME = process.env.STORAGE_ZONE_NAME;
const ACCESS_KEY = process.env.ACCESS_KEY;

test('deleteFile should delete a file from Bunny CDN', async (t) => {
  t.plan(1);

  const options = {
    storageZoneName: STORAGE_ZONE_NAME,
    accessKey: ACCESS_KEY,
  };

  const targetDirectory = 'test-delete-file';

  // First, create a file to delete
  await axios.put(
    `https://storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}`,
    'test content',
    {
      headers: {
        'AccessKey': options.accessKey,
        'Content-Type': 'application/octet-stream',
      },
    }
  );

  // Delete the file
  await deleteFile(targetDirectory, options);

  // Try to fetch the deleted file
  try {
    await axios.get(`https://storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}`, {
      headers: {
        'AccessKey': options.accessKey,
      },
    });
  } catch (error) {
    t.equal(error.response.status, 404, 'File should be deleted');
  }
});

test('uploadFile should upload a file to Bunny CDN', async (t) => {
  t.plan(1);

  const options = {
    storageZoneName: STORAGE_ZONE_NAME,
    accessKey: ACCESS_KEY,
  };

  const sourcePath = path.join(__dirname, 'uploadDir', 'test.txt');
  const targetPath = 'test-upload-file/test.txt';

  await uploadFile(sourcePath, targetPath, options);

  const response = await axios.get(`https://storage.bunnycdn.com/${options.storageZoneName}/${targetPath}`, {
    headers: {
      'AccessKey': options.accessKey,
    },
  });

  t.equal(response.data, 'Test file content\n', 'File content should match');
});

test('uploadDirectory should upload a directory to Bunny CDN', async (t) => {
  t.plan(2);

  const options = {
    storageZoneName: STORAGE_ZONE_NAME,
    accessKey: ACCESS_KEY,
    cleanDestination: true,
  };

  const sourceDirectory = path.join(__dirname, 'uploadDir');
  const targetDirectory = 'test-upload-directory';

  await uploadDirectory(sourceDirectory, targetDirectory, options);

  const response1 = await axios.get(`https://storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/test.txt`, {
    headers: {
      'AccessKey': options.accessKey,
    },
  });

  t.equal(response1.data, 'Test file content\n', 'File 1 content should match');

  const response2 = await axios.get(`https://storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/subdir/test2.txt`, {
    headers: {
      'AccessKey': options.accessKey,
    },
  });

  t.equal(response2.data, 'Test file 2 content\n', 'File 2 content should match');
});
