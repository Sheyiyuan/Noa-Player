const HEADER_TTL_MS = 15 * 60 * 1000;

const overrideMap = new Map();

function normalizeHeaders(headers) {
    if (!headers || typeof headers !== 'object' || Array.isArray(headers)) {
        return {};
    }

    const entries = Object.entries(headers).filter(([key, value]) => {
        return typeof key === 'string' && key.length > 0 && typeof value === 'string' && value.length > 0;
    });

    return Object.fromEntries(entries);
}

export function registerMediaHeaderOverrides(items) {
    const now = Date.now();
    let registeredCount = 0;

    for (const item of items) {
        if (!item || typeof item !== 'object') {
            continue;
        }

        const url = typeof item.url === 'string' ? item.url.trim() : '';
        if (!url) {
            continue;
        }

        const headers = normalizeHeaders(item.headers);
        if (Object.keys(headers).length === 0) {
            continue;
        }

        overrideMap.set(url, {
            headers,
            expireAt: now + HEADER_TTL_MS,
        });
        registeredCount += 1;
    }

    return registeredCount;
}

export function getMediaHeaderOverride(url) {
    const record = overrideMap.get(url);
    if (!record) {
        return null;
    }

    if (record.expireAt <= Date.now()) {
        overrideMap.delete(url);
        return null;
    }

    return record.headers;
}
