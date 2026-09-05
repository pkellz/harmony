import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export type BlobContainer = "scores";

function containerName(): BlobContainer {
  return (process.env.BLOB_CONTAINER as BlobContainer) || "scores";
}

function localRoot(): string {
  return process.env.BLOB_LOCAL_DIR || path.join(process.cwd(), ".data/blobs");
}

function azureEnabled(): boolean {
  return Boolean(
    process.env.AZURE_STORAGE_CONNECTION_STRING ||
      (process.env.AZURE_STORAGE_ACCOUNT && process.env.AZURE_STORAGE_KEY),
  );
}

function blobService(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }
  const account = process.env.AZURE_STORAGE_ACCOUNT || "";
  const accountKey = process.env.AZURE_STORAGE_KEY || "";
  const credential = new StorageSharedKeyCredential(account, accountKey);
  return new BlobServiceClient(
    `https://${account}.blob.core.windows.net`,
    credential,
  );
}

export async function uploadBuffer(
  blobKey: string,
  buffer: Buffer,
  contentType: string,
): Promise<void> {
  if (!azureEnabled()) {
    const dest = path.join(localRoot(), containerName(), blobKey);
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, buffer);
    return;
  }
  const container = blobService().getContainerClient(containerName());
  await container.createIfNotExists();
  const blob = container.getBlockBlobClient(blobKey);
  await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });
}

export async function downloadBuffer(blobKey: string): Promise<Buffer> {
  if (!azureEnabled()) {
    const dest = path.join(localRoot(), containerName(), blobKey);
    return readFile(dest);
  }
  const container = blobService().getContainerClient(containerName());
  return container.getBlockBlobClient(blobKey).downloadToBuffer();
}

export async function deleteBlob(blobKey: string): Promise<void> {
  if (!azureEnabled()) {
    const dest = path.join(localRoot(), containerName(), blobKey);
    await unlink(dest).catch(() => undefined);
    return;
  }
  const container = blobService().getContainerClient(containerName());
  await container.getBlockBlobClient(blobKey).deleteIfExists();
}

export async function ensureContainerExists(): Promise<void> {
  if (!azureEnabled()) {
    await mkdir(path.join(localRoot(), containerName()), { recursive: true });
    return;
  }
  await blobService().getContainerClient(containerName()).createIfNotExists();
}
