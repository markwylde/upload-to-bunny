# Upload-to-Bunny

Upload-to-Bunny is a Node.JS library designed to simplify and speed up the process of uploading directories to BunnyCDN storage. With built-in support for parallel uploads and cleaning old files (with two strategies), this library makes it easy to keep your BunnyCDN storage up-to-date.

## Features

- Upload entire directories to BunnyCDN storage
- Parallel uploads for faster transfers
- Option to clean the destination before uploading ("simple" or "avoid-deletes")
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
  // Choose how to clean the destination (see Options below)
  cleanDestination: 'avoid-deletes',
  accessKey: 'your-bunny-access-key',
  maxConcurrentUploads: 10,
  region: 'ny'
});
```

### Options

The `uploadToBunny` function accepts the following options:

- `storageZoneName` (string, required): The name of your BunnyCDN storage zone.
- `cleanDestination` ("simple" | "avoid-deletes", optional): How to clean the destination before uploading. If omitted, no cleaning occurs.
  - `"simple"`: Deletes the target directory first, then uploads everything. Fastest, but Bunny can misbehave if a file is deleted and then immediately re-uploaded to the same path.
  - `"avoid-deletes"`: Recursively prunes only remote files/folders not present locally and keeps files that are about to be replaced. This works around Bunny's delete-then-reupload issue.
- `accessKey` (string, required): Your BunnyCDN access key.
- `maxConcurrentUploads` (number, optional): The maximum number of files to upload concurrently. Default is 10.

### Example

```javascript
import uploadToBunny from 'upload-to-bunny';

// Example using the "simple" strategy
await uploadToBunny('/path/to/local/directory', '', {
  storageZoneName: 'test-storage-12345',
  cleanDestination: 'simple',
  accessKey: 'xxxxxxxxxx-xxxx-xxxx-xxxx',
  maxConcurrentUploads: 10,
  region: 'uk'
});

// Example using the "avoid-deletes" strategy (recommended to avoid Bunny delete/reupload issues)
await uploadToBunny('/path/to/local/directory', '', {
  storageZoneName: 'test-storage-12345',
  cleanDestination: 'avoid-deletes',
  accessKey: 'xxxxxxxxxx-xxxx-xxxx-xxxx',
  maxConcurrentUploads: 10,
  region: 'uk'
});
```

## CLI

A CLI is also available for quick uploads:

```bash
npx upload-to-bunny --source ./dist --zone my-zone --key my-key
```

Run `npx upload-to-bunny --help` for all options. You can also set `BUNNY_STORAGE_ZONE_NAME`, `BUNNY_ACCESS_KEY`, and `BUNNY_STORAGE_REGION` as environment variables.

## Contributing

Contributions are always welcome! If you have any suggestions, bug reports, or feature requests, feel free to open an issue or submit a pull request.
