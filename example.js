import uploadDirectory from './lib/index.js';

await uploadDirectory('./dist', '/', {
  storageZoneName: 'your-storage-zone-name',
  accessKey: 'xxxxxxxx-xxxx-xxxx-xxxx',
  cleanDestination: 'avoid-deletes',
  maxConcurrentUploads: 10,
});
