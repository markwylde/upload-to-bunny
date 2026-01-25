#!/usr/bin/env node
import { parseArgs } from "node:util";
import path from "node:path";
import { uploadDirectory } from "./index.js";

const helpText = `
Usage: upload-to-bunny [options]

Options:
  --source <path>       Local directory to upload (default: current directory)
  --target <path>       Remote directory path (default: /)
  --zone <name>         Storage zone name (required, or via BUNNY_STORAGE_ZONE_NAME env)
  --key <key>           Access key (required, or via BUNNY_ACCESS_KEY env)
  --region <region>     Storage region (optional, e.g., 'ny', 'la', 'sg', or via BUNNY_STORAGE_REGION env)
  --clean <mode>        Clean destination before uploading (default: avoid-deletes)
                        Modes: simple (delete all), avoid-deletes (only upload changes)
  --help                Show this help message
`;

const { values } = parseArgs({
	options: {
		source: { type: "string", default: "." },
		target: { type: "string", default: "/" },
		zone: { type: "string" },
		key: { type: "string" },
		region: { type: "string" },
		clean: { type: "string", default: "avoid-deletes" },
		help: { type: "boolean" },
	},
});

if (values.help) {
	console.log(helpText);
	process.exit(0);
}

const source = path.resolve(values.source);
const target = values.target;
const storageZoneName = values.zone || process.env.BUNNY_STORAGE_ZONE_NAME;
const accessKey = values.key || process.env.BUNNY_ACCESS_KEY;
const region = values.region || process.env.BUNNY_STORAGE_REGION;
const cleanDestination = values.clean;

if (!storageZoneName) {
	console.error("Storage zone name is required (use --zone or BUNNY_STORAGE_ZONE_NAME env)");
	process.exit(1);
}

if (!accessKey) {
	console.error("Access key is required (use --key or BUNNY_ACCESS_KEY env)");
	process.exit(1);
}

if (cleanDestination !== "simple" && cleanDestination !== "avoid-deletes") {
	console.error(`Invalid clean mode "${cleanDestination}". Use "simple" or "avoid-deletes".`);
	process.exit(1);
}

console.log(`Uploading ${source} to ${storageZoneName}${target}...`);

await uploadDirectory(source, target, {
	storageZoneName,
	accessKey,
	region,
	cleanDestination,
});

console.log("Upload complete.");

