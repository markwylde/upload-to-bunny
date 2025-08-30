import test from 'basictap';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { deleteFile, uploadFile, uploadDirectory } from '../src/index.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STORAGE_ZONE_NAME = process.env.STORAGE_ZONE_NAME;
const ACCESS_KEY = process.env.ACCESS_KEY
const STORAGE_REGION = process.env.STORAGE_REGION;

test('deleteFile should delete a file from Bunny CDN', async (t) => {
  t.plan(1);

  const options = {
    storageZoneName: STORAGE_ZONE_NAME,
    accessKey: ACCESS_KEY,
    region: STORAGE_REGION
  };

  const targetDirectory = 'test-delete-file';

  // First, create a file to delete
  await axios.put(
    `https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}`,
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
    await axios.get(`https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}`, {
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
    region: STORAGE_REGION
  };

  const sourcePath = path.join(__dirname, 'uploadDir', 'test.txt');
  const targetPath = 'test-upload-file/test.txt';

  await uploadFile(sourcePath, targetPath, options);

  const response = await axios.get(`https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetPath}`, {
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
    cleanDestination: 'simple',
    region: STORAGE_REGION
  };

  const sourceDirectory = path.join(__dirname, 'uploadDir');
  const targetDirectory = 'test-upload-directory';

  await uploadDirectory(sourceDirectory, targetDirectory, options);

  const response1 = await axios.get(`https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/test.txt`, {
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

test('uploadDirectory should recursively prune remote without deleting replacements', async (t) => {
  t.plan(7);

  const options = {
    storageZoneName: STORAGE_ZONE_NAME,
    accessKey: ACCESS_KEY,
    cleanDestination: 'avoid-deletes',
    region: STORAGE_REGION
  };

  const sourceDirectory = path.join(__dirname, 'recursiveDir');
  const targetDirectory = 'test-upload-recursive';

  // Seed remote with extra files and folders, including files that will be replaced
  const seed = async (relPath, content) => {
    await axios.put(
      `https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/${relPath}`,
      content,
      {
        headers: {
          'AccessKey': options.accessKey,
          'Content-Type': 'application/octet-stream',
        },
      }
    );
  };

  await seed('delete-root.txt', 'to be deleted');
  await seed('a/keep-a.txt', 'old content that will be replaced');
  await seed('a/delete-a.txt', 'to be deleted');
  await seed('a/sub/delete-sub.txt', 'to be deleted');
  await seed('b/old.txt', 'to be deleted');

  await uploadDirectory(sourceDirectory, targetDirectory, options);

  // Kept files should exist with new content
  const r1 = await axios.get(`https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/root.txt`, {
    headers: { 'AccessKey': options.accessKey },
  });
  t.equal(r1.data, 'Root keep content\n', 'Root file content should match');

  const r2 = await axios.get(`https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/a/keep-a.txt`, {
    headers: { 'AccessKey': options.accessKey },
  });
  t.equal(r2.data, 'Keep A content\n', 'a/keep-a.txt should be replaced');

  const r3 = await axios.get(`https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/a/sub/keep-sub.txt`, {
    headers: { 'AccessKey': options.accessKey },
  });
  t.equal(r3.data, 'Keep Sub content\n', 'a/sub/keep-sub.txt should be uploaded');

  // Deleted files should 404
  const expect404 = async (rel) => {
    try {
      await axios.get(`https://${options.region ? options.region + "." : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/${rel}`, {
        headers: { 'AccessKey': options.accessKey },
      });
      t.fail(`${rel} should be deleted`);
    } catch (err) {
      t.equal(err.response && err.response.status, 404, `${rel} should be deleted`);
    }
  };

  await expect404('delete-root.txt');
  await expect404('a/delete-a.txt');
  await expect404('a/sub/delete-sub.txt');
  await expect404('b/old.txt');
});
