import type { SegmentInputEntry, SegmentTrack } from './types';

type ParsedSourceInput = {
    entries: SegmentInputEntry[];
    durationSeconds: number | null;
    title: string | null;
    fromYtDlpJson: boolean;
};

type CompactSourceItem = {
    url: string;
    track?: SegmentTrack;
    headers?: Record<string, string>;
};

function extractRequestHeaders(raw: unknown): Record<string, string> | undefined {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
        return undefined;
    }

    const entries = Object.entries(raw).filter((entry): entry is [string, string] => {
        const [key, value] = entry;
        return typeof key === 'string' && key.length > 0 && typeof value === 'string' && value.length > 0;
    });

    if (!entries.length) {
        return undefined;
    }

    return Object.fromEntries(entries);
}

function isHttpUrl(value: string): boolean {
    return /^https?:\/\//i.test(value.trim());
}

function inferTrackFromUrl(url: string): SegmentTrack {
    const lower = url.toLowerCase();

    try {
        const parsed = new URL(url);
        const mime = parsed.searchParams.get('mime')?.toLowerCase();

        if (mime?.startsWith('audio/')) {
            return 'audio';
        }

        if (mime?.startsWith('video/')) {
            return 'video';
        }
    } catch {
        // ignore invalid URL parse and fallback to regex heuristics
    }

    if (/[\/_.-](audio|aac|opus|mp4a)[\/_.-]/.test(lower) || /[?&](type|stream)=audio(?:&|$)/.test(lower)) {
        return 'audio';
    }

    if (/[\/_.-](video|avc|hev|h264|h265|vp9|av01)[\/_.-]/.test(lower) || /[?&](type|stream)=video(?:&|$)/.test(lower)) {
        return 'video';
    }

    return 'auto';
}

export function isM3u8Source(url: string): boolean {
    return /\.m3u8($|\?)/i.test(url);
}

export function isMpdSource(url: string): boolean {
    return /\.mpd($|\?)/i.test(url);
}

export function isM4sSource(url: string): boolean {
    return /\.m4s($|\?)/i.test(url);
}

function parseSegmentInputEntries(input: string): SegmentInputEntry[] {
    const entries = input
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line): SegmentInputEntry | null => {
            const prefixed = /^(video|v|audio|a)\s*[:|]\s*(.+)$/i.exec(line);
            if (!prefixed) {
                if (!isHttpUrl(line)) {
                    return null;
                }

                return {
                    url: line,
                    track: inferTrackFromUrl(line),
                };
            }

            const rawUrl = prefixed[2].trim();
            if (!isHttpUrl(rawUrl)) {
                return null;
            }

            const marker = prefixed[1].toLowerCase();
            return {
                url: rawUrl,
                track: marker === 'audio' || marker === 'a' ? 'audio' : 'video',
            };
        })
        .filter((entry): entry is SegmentInputEntry => Boolean(entry));

    const autoEntries = entries.filter((entry) => entry.track === 'auto');
    if (entries.length === 2 && autoEntries.length === 2) {
        return [
            { ...entries[0], track: 'video' },
            { ...entries[1], track: 'audio' },
        ];
    }

    return entries;
}

function normalizeTrackFromFormat(format: Record<string, unknown>, fallbackUrl: string): SegmentTrack {
    const vcodec = typeof format.vcodec === 'string' ? format.vcodec.toLowerCase() : '';
    const acodec = typeof format.acodec === 'string' ? format.acodec.toLowerCase() : '';

    const hasVideo = vcodec.length > 0 && vcodec !== 'none';
    const hasAudio = acodec.length > 0 && acodec !== 'none';

    if (hasVideo && !hasAudio) {
        return 'video';
    }

    if (!hasVideo && hasAudio) {
        return 'audio';
    }

    return inferTrackFromUrl(fallbackUrl);
}

function toSegmentInputEntry(params: {
    url: string;
    track: SegmentTrack;
    requestHeaders?: Record<string, string>;
}): SegmentInputEntry {
    const { url, track, requestHeaders } = params;
    if (requestHeaders && Object.keys(requestHeaders).length > 0) {
        return { url, track, requestHeaders };
    }

    return { url, track };
}

function parseEntriesFromYtDlpJson(payload: Record<string, unknown>): SegmentInputEntry[] {
    const rootHeaders = extractRequestHeaders(payload.http_headers);
    const manifestUrl = typeof payload.manifest_url === 'string' ? payload.manifest_url.trim() : '';
    if (manifestUrl && isHttpUrl(manifestUrl)) {
        return [{ url: manifestUrl, track: 'auto', requestHeaders: rootHeaders }];
    }

    const requestedFormats = Array.isArray(payload.requested_formats)
        ? payload.requested_formats.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        : [];

    if (requestedFormats.length > 0) {
        const entries = requestedFormats
            .map((format): SegmentInputEntry | null => {
                const url = typeof format.url === 'string' ? format.url.trim() : '';
                if (!isHttpUrl(url)) {
                    return null;
                }

                return toSegmentInputEntry({
                    url,
                    track: normalizeTrackFromFormat(format, url),
                    requestHeaders: extractRequestHeaders(format.http_headers) ?? rootHeaders,
                });
            })
            .filter((entry): entry is SegmentInputEntry => Boolean(entry));

        if (entries.length > 0) {
            return entries;
        }
    }

    const requestedDownloads = Array.isArray(payload.requested_downloads)
        ? payload.requested_downloads.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
        : [];

    if (requestedDownloads.length > 0) {
        const entries = requestedDownloads
            .map((download): SegmentInputEntry | null => {
                const url = typeof download.url === 'string' ? download.url.trim() : '';
                if (!isHttpUrl(url)) {
                    return null;
                }

                const nestedFormat = typeof download.requested_formats === 'object' && download.requested_formats !== null
                    ? download.requested_formats as Record<string, unknown>
                    : download;

                return toSegmentInputEntry({
                    url,
                    track: normalizeTrackFromFormat(nestedFormat, url),
                    requestHeaders: extractRequestHeaders(download.http_headers) ?? extractRequestHeaders(nestedFormat.http_headers) ?? rootHeaders,
                });
            })
            .filter((entry): entry is SegmentInputEntry => Boolean(entry));

        if (entries.length > 0) {
            return entries;
        }
    }

    const directUrl = typeof payload.url === 'string' ? payload.url.trim() : '';
    if (isHttpUrl(directUrl)) {
        return [{ url: directUrl, track: inferTrackFromUrl(directUrl), requestHeaders: rootHeaders }];
    }

    return [];
}

function parseYtDlpJsonInput(input: string): ParsedSourceInput | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }

        const payload = parsed as Record<string, unknown>;
        const entries = parseEntriesFromYtDlpJson(payload);
        const durationRaw = payload.duration;
        const durationSeconds = typeof durationRaw === 'number' && Number.isFinite(durationRaw) && durationRaw > 0
            ? durationRaw
            : null;
        const title = typeof payload.title === 'string' && payload.title.trim().length > 0 ? payload.title.trim() : null;

        return {
            entries,
            durationSeconds,
            title,
            fromYtDlpJson: true,
        };
    } catch {
        return null;
    }
}

function parseCompactJsonInput(input: string): ParsedSourceInput | null {
    const trimmed = input.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
        return null;
    }

    try {
        const parsed = JSON.parse(trimmed) as unknown;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }

        const payload = parsed as Record<string, unknown>;
        const rawSources = Array.isArray(payload.sources) ? payload.sources : [];
        if (!rawSources.length) {
            return null;
        }

        const entries = rawSources
            .map((source): CompactSourceItem | null => {
                if (typeof source !== 'object' || source === null || Array.isArray(source)) {
                    return null;
                }

                const sourceRecord = source as Record<string, unknown>;
                const url = typeof sourceRecord.url === 'string' ? sourceRecord.url.trim() : '';
                if (!isHttpUrl(url)) {
                    return null;
                }

                const track = sourceRecord.track === 'video' || sourceRecord.track === 'audio' || sourceRecord.track === 'auto'
                    ? sourceRecord.track
                    : undefined;

                const headers = extractRequestHeaders(sourceRecord.headers);
                return {
                    url,
                    track,
                    headers,
                };
            })
            .filter((item): item is CompactSourceItem => Boolean(item))
            .map((item): SegmentInputEntry => ({
                url: item.url,
                track: item.track ?? inferTrackFromUrl(item.url),
                requestHeaders: item.headers,
            }));

        if (!entries.length) {
            return null;
        }

        const durationRaw = payload.duration ?? payload.durationSeconds;
        const durationSeconds = typeof durationRaw === 'number' && Number.isFinite(durationRaw) && durationRaw > 0
            ? durationRaw
            : null;
        const titleRaw = payload.title;
        const title = typeof titleRaw === 'string' && titleRaw.trim().length > 0 ? titleRaw.trim() : null;

        return {
            entries,
            durationSeconds,
            title,
            fromYtDlpJson: false,
        };
    } catch {
        return null;
    }
}

export function parseSourceInput(input: string): ParsedSourceInput {
    const parsedCompactJson = parseCompactJsonInput(input);
    if (parsedCompactJson) {
        return parsedCompactJson;
    }

    const parsedJson = parseYtDlpJsonInput(input);
    if (parsedJson) {
        return parsedJson;
    }

    return {
        entries: parseSegmentInputEntries(input),
        durationSeconds: null,
        title: null,
        fromYtDlpJson: false,
    };
}
