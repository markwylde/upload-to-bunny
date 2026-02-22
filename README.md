# Upload-to-Bunny

Upload-to-Bunny is a Node.JS library designed to simplify and speed up the process of uploading directories to BunnyCDN storage. With built-in support for parallel uploads and cleaning old files (with two strategies), this library makes it easy to keep your BunnyCDN storage up-to-date.

## Features

- Upload entire directories to BunnyCDN storage
- Parallel uploads for faster transfers
- Option to clean the destination before uploading ("simple" or "avoid-deletes")
- Easily configurable with storage zone and access key
- CLI for quick one-off uploads

## Installation

```bash
npm install --save upload-to-bunny
```

## Usage

To use the Upload-to-Bunny library, simply import it and call the `uploadDirectory` function with the appropriate options:

```javascript
import uploadDirectory from 'upload-to-bunny';

await uploadDirectory(sourceDirectory, destinationDirectory, options);
```

`destinationDirectory` accepts both `''` and `'/'` for the storage root. They are equivalent.

### Example

```javascript
import uploadDirectory from 'upload-to-bunny';

// Upload ./dist to the storage root, pruning removed files safely
await uploadDirectory('./dist', '/', {
  storageZoneName: 'your-storage-zone-name',
  accessKey: 'your-bunny-access-key',
  cleanDestination: 'avoid-deletes',
  maxConcurrentUploads: 10,
  region: 'ny',
});
```

### Options

The `uploadDirectory` function accepts the following options:

- `storageZoneName` (string, required): The name of your BunnyCDN storage zone.
- `accessKey` (string, required): Your BunnyCDN access key.
- `region` (string, optional): Storage region prefix (e.g. `ny`, `la`, `sg`, `uk`, `se`, `br`, `jh`, `syd`). If omitted, the default region is used.
- `cleanDestination` ("simple" | "avoid-deletes", optional): How to clean the destination before uploading. If omitted, no cleaning occurs.
  - `"simple"`: Deletes the target directory first, then uploads everything. Fastest, but Bunny can misbehave if a file is deleted and then immediately re-uploaded to the same path.
  - `"avoid-deletes"`: Recursively prunes only remote files/folders not present locally and keeps files that are about to be replaced. This works around Bunny's delete-then-reupload issue.
- `maxConcurrentUploads` (number, optional): The maximum number of files to upload concurrently. Default is `10`.
- `limit` (LimitFunction, optional): A custom [p-limit](https://github.com/sindresorhus/p-limit) instance. If provided, `maxConcurrentUploads` is ignored.

### Named exports

The package also exports `uploadFile` and `deleteFile` for lower-level operations:

```javascript
import { uploadFile, deleteFile } from 'upload-to-bunny';

const options = {
  storageZoneName: 'your-storage-zone-name',
  accessKey: 'your-bunny-access-key',
};

// Upload a single file
await uploadFile('./local/file.txt', '/remote/file.txt', options);

// Delete a remote file
await deleteFile('/remote/old-file.txt', options);
```

## CLI

A CLI is also available for quick uploads:

```bash
npx upload-to-bunny --source ./dist --zone my-zone --key my-key
```

### CLI Options

| Flag | Description | Default | Env variable |
|------|-------------|---------|--------------|
| `--source <path>` | Local directory to upload | `.` (current directory) | |
| `--target <path>` | Remote directory path | `/` | |
| `--zone <name>` | Storage zone name (required) | | `BUNNY_STORAGE_ZONE_NAME` |
| `--key <key>` | Access key (required) | | `BUNNY_ACCESS_KEY` |
| `--region <region>` | Storage region (e.g. `ny`, `la`, `sg`) | | `BUNNY_STORAGE_REGION` |
| `--clean <mode>` | `simple` or `avoid-deletes` | `avoid-deletes` | |
| `--help` | Show help message | | |

### CLI Examples

```bash
# Upload ./dist using environment variables
export BUNNY_STORAGE_ZONE_NAME=my-zone
export BUNNY_ACCESS_KEY=my-key
npx upload-to-bunny --source ./dist

# Upload to a specific region with simple cleaning
npx upload-to-bunny --source ./dist --zone my-zone --key my-key --region ny --clean simple

# Upload to a subdirectory on the storage zone
npx upload-to-bunny --source ./dist --target /app/assets --zone my-zone --key my-key
```

## Contributing

Contributions are always welcome! If you have any suggestions, bug reports, or feature requests, feel free to open an issue or submit a pull request.
