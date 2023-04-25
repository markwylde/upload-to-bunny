import bunnyUploader from './lib/index.js';

await bunnyUploader('example', '', {
  storageZoneName: 'test-storage',
  cleanDestination: true,
  accessKey: 'xxxxxxxx-xxxx-xxxx-xxxx',
  maxConcurrentUploads: 10
});
