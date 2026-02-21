import { clipboard, nativeImage } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getCurrentProjectDir, updateProjectMeta } from './note-project.mjs';

const ASSET_IMAGE_DIR = 'assets';
const PROJECT_META_FILE = 'project.json';

async function getAssetPaths() {
    const rootDir = await getCurrentProjectDir();
    const imageDir = path.join(rootDir, ASSET_IMAGE_DIR);
    const projectMetaPath = path.join(rootDir, PROJECT_META_FILE);
    return { rootDir, imageDir, projectMetaPath };
}

async function ensureAssetDirs() {
    const { rootDir, imageDir } = await getAssetPaths();
    await fs.mkdir(rootDir, { recursive: true });
    await fs.mkdir(imageDir, { recursive: true });
}

async function readIndex() {
    const { projectMetaPath } = await getAssetPaths();
    try {
        const text = await fs.readFile(projectMetaPath, 'utf8');
        const parsed = JSON.parse(text);
        return Array.isArray(parsed?.resources) ? parsed.resources : [];
    } catch {
        return [];
    }
}

async function writeIndex(items) {
    await updateProjectMeta((meta) => ({
        ...meta,
        resources: items.map((entry) => ({
            id: entry.id,
            imagePath: entry.imagePath,
            sourceUrl: entry.sourceUrl,
            timestampMs: entry.timestampMs,
            width: entry.width,
            height: entry.height,
            createdAt: entry.createdAt,
        })),
    }));
}

async function removeIfExists(filePath) {
    try {
        await fs.unlink(filePath);
    } catch {
        return;
    }
}

function parseDataUrl(dataUrl) {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
    if (!match) {
        return null;
    }

    const mimeType = match[1];
    const base64Data = match[2];
    const extension = mimeType.includes('png') ? 'png' : mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : null;

    if (!extension) {
        return null;
    }

    return {
        mimeType,
        extension,
        buffer: Buffer.from(base64Data, 'base64'),
    };
}

function mapAssetRecord(record) {
    const extension = path.extname(record.imagePath).toLowerCase();
    const mimeType = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';

    return {
        ...record,
        fileUrl: pathToFileURL(record.imagePath).toString(),
        mimeType,
    };
}

async function mapAssetRecordWithPreview(record, previewDataUrl) {
    const mapped = mapAssetRecord(record);

    if (previewDataUrl) {
        return {
            ...mapped,
            previewDataUrl,
        };
    }

    const buffer = await fs.readFile(record.imagePath);
    return {
        ...mapped,
        previewDataUrl: `data:${mapped.mimeType};base64,${buffer.toString('base64')}`,
    };
}

function isAssetRecordShape(value) {
    return (
        value
        && typeof value === 'object'
        && typeof value.id === 'string'
        && typeof value.imagePath === 'string'
        && (typeof value.sourceUrl === 'string' || value.sourceUrl === null || typeof value.sourceUrl === 'undefined')
        && typeof value.timestampMs === 'number'
        && typeof value.width === 'number'
        && typeof value.height === 'number'
        && typeof value.createdAt === 'string'
    );
}

async function sanitizeAssetIndex() {
    const rawItems = await readIndex();
    const candidateItems = rawItems.filter(isAssetRecordShape);

    const validItems = [];
    let hasChanged = candidateItems.length !== rawItems.length;

    for (const item of candidateItems) {
        try {
            const buffer = await fs.readFile(item.imagePath);
            const image = nativeImage.createFromBuffer(buffer);

            if (image.isEmpty()) {
                hasChanged = true;
                await removeIfExists(item.imagePath);
                continue;
            }

            const extension = path.extname(item.imagePath).toLowerCase();
            const mimeType = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
            validItems.push({
                item,
                previewDataUrl: `data:${mimeType};base64,${buffer.toString('base64')}`,
            });
        } catch {
            hasChanged = true;
            await removeIfExists(item.imagePath);
        }
    }

    if (hasChanged) {
        await writeIndex(validItems.map((entry) => entry.item));
    }

    return validItems;
}

export async function saveCaptureAsset(payload) {
    await ensureAssetDirs();

    const parsedImage = parseDataUrl(payload.dataUrl);
    if (!parsedImage) {
        throw new Error('invalid_data_url');
    }

    const id = randomUUID();
    const nowIso = new Date().toISOString();
    const fileName = `${nowIso.replace(/[:.]/g, '-')}-${id}.${parsedImage.extension}`;

    const { imageDir } = await getAssetPaths();
    const imagePath = path.join(imageDir, fileName);

    await fs.writeFile(imagePath, parsedImage.buffer);

    const items = await readIndex();
    const item = {
        id,
        imagePath,
        sourceUrl: payload.sourceUrl,
        timestampMs: payload.timestampMs,
        width: payload.region?.width ?? 0,
        height: payload.region?.height ?? 0,
        createdAt: nowIso,
    };

    const nextItems = [item, ...items];
    await writeIndex(nextItems);

    if (payload.copyToClipboard !== false) {
        clipboard.writeImage(nativeImage.createFromBuffer(parsedImage.buffer));
    }

    return {
        asset: await mapAssetRecordWithPreview(item, payload.dataUrl),
    };
}

export async function listCaptureAssets() {
    await ensureAssetDirs();
    const validItems = await sanitizeAssetIndex();

    return {
        items: await Promise.all(validItems.map((entry) => mapAssetRecordWithPreview(entry.item, entry.previewDataUrl))),
    };
}

export async function getCaptureAssetById(assetId) {
    const items = await readIndex();
    return items.find((item) => item.id === assetId) ?? null;
}

export async function openCaptureAssetInFolder(assetId) {
    const item = await getCaptureAssetById(assetId);
    if (!item) {
        return { success: false, imagePath: null };
    }

    return {
        success: true,
        imagePath: item.imagePath,
    };
}

export async function deleteCaptureAsset(assetId) {
    const items = await readIndex();
    const target = items.find((item) => item.id === assetId);
    if (!target) {
        return { success: false, assetId };
    }

    await removeIfExists(target.imagePath);
    const nextItems = items.filter((item) => item.id !== assetId);
    await writeIndex(nextItems);

    return {
        success: true,
        assetId,
    };
}
