import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Using Node's built-in fetch
import { deleteFile, uploadFile, uploadDirectory } from "../src/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STORAGE_ZONE_NAME = process.env.STORAGE_ZONE_NAME;
const ACCESS_KEY = process.env.ACCESS_KEY;
const STORAGE_REGION = process.env.STORAGE_REGION;

test("deleteFile should delete a file from Bunny CDN", async (_t) => {
	const options = {
		storageZoneName: STORAGE_ZONE_NAME,
		accessKey: ACCESS_KEY,
		region: STORAGE_REGION,
	};

	const targetDirectory = "test-delete-file";

	// First, create a file to delete
	{
		const res = await fetch(
			`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}`,
			{
				method: "PUT",
				body: "test content",
				headers: {
					AccessKey: options.accessKey,
					"Content-Type": "application/octet-stream",
				},
			},
		);
		assert.equal(res.ok, true, "Seed PUT should succeed");
	}

	// Delete the file
	await deleteFile(targetDirectory, options);

	// Try to fetch the deleted file
	try {
		const res = await fetch(
			`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}`,
			{
				headers: {
					AccessKey: options.accessKey,
				},
			},
		);
		if (res.status !== 404) {
			if (!res.ok)
				throw Object.assign(new Error("not ok"), { status: res.status });
			assert.fail("Request should have failed with 404");
		}
		assert.equal(res.status, 404, "File should be deleted");
	} catch (error) {
		const status = error.status ?? error.response?.status;
		assert.equal(status, 404, "File should be deleted");
	}
});

test("uploadFile should upload a file to Bunny CDN", async (_t) => {
	const options = {
		storageZoneName: STORAGE_ZONE_NAME,
		accessKey: ACCESS_KEY,
		region: STORAGE_REGION,
	};

	const sourcePath = path.join(__dirname, "uploadDir", "test.txt");
	const targetPath = "test-upload-file/test.txt";

	await uploadFile(sourcePath, targetPath, options);

	const response = await fetch(
		`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetPath}`,
		{
			headers: {
				AccessKey: options.accessKey,
			},
		},
	);
	assert.equal(response.ok, true, "GET should succeed");
	const text = await response.text();
	assert.equal(text, "Test file content\n", "File content should match");
});

test("uploadDirectory should upload a directory to Bunny CDN", async (_t) => {
	const options = {
		storageZoneName: STORAGE_ZONE_NAME,
		accessKey: ACCESS_KEY,
		cleanDestination: "simple",
		region: STORAGE_REGION,
	};

	const sourceDirectory = path.join(__dirname, "uploadDir");
	const targetDirectory = "test-upload-directory";

	await uploadDirectory(sourceDirectory, targetDirectory, options);

	const response1 = await fetch(
		`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/test.txt`,
		{
			headers: {
				AccessKey: options.accessKey,
			},
		},
	);
	assert.equal(response1.ok, true, "GET should succeed");
	const text1 = await response1.text();
	assert.equal(text1, "Test file content\n", "File 1 content should match");

	const response2 = await fetch(
		`https://storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/subdir/test2.txt`,
		{
			headers: {
				AccessKey: options.accessKey,
			},
		},
	);
	assert.equal(response2.ok, true, "GET should succeed");
	const text2 = await response2.text();
	assert.equal(text2, "Test file 2 content\n", "File 2 content should match");
});

test("uploadDirectory simple mode uploads successfully", async (_t) => {
	const options = {
		storageZoneName: STORAGE_ZONE_NAME,
		accessKey: ACCESS_KEY,
		cleanDestination: "simple",
		region: STORAGE_REGION,
	};

	const sourceDirectory = path.join(__dirname, "uploadDir");
	const targetDirectory = "test-upload-simple-clean";

	await uploadDirectory(sourceDirectory, targetDirectory, options);

	// Uploaded files should exist
	const r1 = await fetch(
		`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/test.txt`,
		{
			headers: { AccessKey: options.accessKey },
		},
	);
	assert.equal(r1.ok, true, "GET should succeed");
	const r1text = await r1.text();
	assert.equal(r1text, "Test file content\n", "test.txt uploaded after wipe");

	const r2 = await fetch(
		`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/subdir/test2.txt`,
		{
			headers: { AccessKey: options.accessKey },
		},
	);
	assert.equal(r2.ok, true, "GET should succeed");
	const r2text = await r2.text();
	assert.equal(
		r2text,
		"Test file 2 content\n",
		"subdir/test2.txt uploaded after wipe",
	);

	// We only assert successful uploads for simple mode here.
});

test("uploadDirectory should recursively prune remote without deleting replacements", async (_t) => {
	const options = {
		storageZoneName: STORAGE_ZONE_NAME,
		accessKey: ACCESS_KEY,
		cleanDestination: "avoid-deletes",
		region: STORAGE_REGION,
	};

	const sourceDirectory = path.join(__dirname, "recursiveDir");
	const targetDirectory = "test-upload-recursive";

	// Seed remote with extra files and folders, including files that will be replaced
	const seed = async (relPath, content) => {
		const res = await fetch(
			`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/${relPath}`,
			{
				method: "PUT",
				body: content,
				headers: {
					AccessKey: options.accessKey,
					"Content-Type": "application/octet-stream",
				},
			},
		);
		assert.equal(res.ok, true, `Seed PUT ${relPath} should succeed`);
	};

	await seed("delete-root.txt", "to be deleted");
	await seed("a/keep-a.txt", "old content that will be replaced");
	await seed("a/delete-a.txt", "to be deleted");
	await seed("a/sub/delete-sub.txt", "to be deleted");
	await seed("b/old.txt", "to be deleted");

	await uploadDirectory(sourceDirectory, targetDirectory, options);

	// Kept files should exist with new content
	const r1b = await fetch(
		`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/root.txt`,
		{
			headers: { AccessKey: options.accessKey },
		},
	);
	assert.equal(r1b.ok, true, "GET should succeed");
	const r1data = await r1b.text();
	assert.equal(r1data, "Root keep content\n", "Root file content should match");

	const r2b = await fetch(
		`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/a/keep-a.txt`,
		{
			headers: { AccessKey: options.accessKey },
		},
	);
	assert.equal(r2b.ok, true, "GET should succeed");
	const r2data = await r2b.text();
	assert.equal(r2data, "Keep A content\n", "a/keep-a.txt should be replaced");

	const r3b = await fetch(
		`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/a/sub/keep-sub.txt`,
		{
			headers: { AccessKey: options.accessKey },
		},
	);
	assert.equal(r3b.ok, true, "GET should succeed");
	const r3data = await r3b.text();
	assert.equal(
		r3data,
		"Keep Sub content\n",
		"a/sub/keep-sub.txt should be uploaded",
	);

	// Deleted files should 404
	const expect404 = async (rel) => {
		try {
			const res = await fetch(
				`https://${options.region ? `${options.region}.` : ""}storage.bunnycdn.com/${options.storageZoneName}/${targetDirectory}/${rel}`,
				{
					headers: { AccessKey: options.accessKey },
				},
			);
			if (res.status === 404) {
				assert.equal(res.status, 404, `${rel} should be deleted`);
				return;
			}
			if (!res.ok)
				throw Object.assign(new Error("not ok"), { status: res.status });
			assert.fail(`${rel} should be deleted`);
		} catch (err) {
			const status = err.status ?? err.response?.status;
			assert.equal(status, 404, `${rel} should be deleted`);
		}
	};

	await expect404("delete-root.txt");
	await expect404("a/delete-a.txt");
	await expect404("a/sub/delete-sub.txt");
	await expect404("b/old.txt");
});
