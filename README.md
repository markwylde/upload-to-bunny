# Upload-to-Bunny

Upload-to-Bunny is a Node.JS library designed to simplify and speed up the process of uploading directories to BunnyCDN storage. With built-in support for parallel uploads and deleting old files, this library makes it easy to keep your BunnyCDN storage up-to-date.

## Features

- Upload entire directories to BunnyCDN storage
- Parallel uploads for faster transfers
- Option to clean the destination before uploading
- Easily configurable with storage zone and access key

## Installation

```bash
npm install --save upload-to-bunny
```

## Usage

To use the Upload-to-Bunny library, simply import it and call the `uploadToBunny` function with the appropriate options:

```javascript
uploadToBunny(sourceDirectory, destinationDirectory, options);
```

### Example

```javascript
import uploadToBunny from 'upload-to-bunny';

await uploadToBunny('/path/to/local/directory', '', {
  storageZoneName: 'your-storage-zone-name',
  cleanDestination: true,
  accessKey: 'your-bunny-access-key',
  maxConcurrentUploads: 10,
  region: 'ny'  
});
```

### Options

The `uploadToBunny` function accepts the following options:

- `storageZoneName` (string, required): The name of your BunnyCDN storage zone.
- `cleanDestination` (boolean, optional): If set to `true`, the target directory will be cleaned before uploading. Default is `false`.
- `accessKey` (string, required): Your BunnyCDN access key.
- `maxConcurrentUploads` (number, optional): The maximum number of files to upload concurrently. Default is 10.

### Example

```javascript
import uploadToBunny from 'upload-to-bunny';

await uploadToBunny('/path/to/local/directory', '', {
  storageZoneName: 'test-storage-12345',
  cleanDestination: true,
  accessKey: 'xxxxxxxxxx-xxxx-xxxx-xxxx',
  maxConcurrentUploads: 10,
  region: 'uk'  
});
```

## Contributing

Contributions are always welcome! If you have any suggestions, bug reports, or feature requests, feel free to open an issue or submit a pull request.
