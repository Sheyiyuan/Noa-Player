import fs from 'node:fs/promises';
import { clipboard } from 'electron';
import { createWorker } from 'tesseract.js';

const workerMap = new Map();

async function getWorker(language) {
    const cached = workerMap.get(language);
    if (cached) {
        return cached;
    }

    const worker = await createWorker(language);
    workerMap.set(language, worker);
    return worker;
}

function normalizeText(text) {
    return typeof text === 'string' ? text.trim() : '';
}

async function recognizeByLanguage(imagePath, language) {
    const worker = await getWorker(language);
    const result = await worker.recognize(imagePath);
    return normalizeText(result?.data?.text);
}

export async function recognizeImageWithFallback({ imagePath, preferredLanguage = 'eng+chi_sim' }) {
    await fs.access(imagePath);

    if (preferredLanguage === 'eng') {
        const text = await recognizeByLanguage(imagePath, 'eng');
        return {
            text,
            usedLanguage: 'eng',
        };
    }

    try {
        const text = await recognizeByLanguage(imagePath, 'eng+chi_sim');
        return {
            text,
            usedLanguage: 'eng+chi_sim',
        };
    } catch {
        const text = await recognizeByLanguage(imagePath, 'eng');
        return {
            text,
            usedLanguage: 'eng',
        };
    }
}

export async function recognizeAssetText({ imagePath, preferredLanguage, copyToClipboard }) {
    const { text, usedLanguage } = await recognizeImageWithFallback({
        imagePath,
        preferredLanguage,
    });

    const copied = Boolean(copyToClipboard && text);
    if (copied) {
        clipboard.writeText(text);
    }

    return {
        text,
        usedLanguage,
        copied,
    };
}
