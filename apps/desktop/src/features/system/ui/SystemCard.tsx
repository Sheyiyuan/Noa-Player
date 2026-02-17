import { useState } from 'react';
import { noaDesktopClient } from '../../../ipc';
import { useAssetStore } from '../../../shared/state/asset-store';
import { useEditorStore } from '../../../shared/state/editor-store';
import { usePlaybackStore } from '../../../shared/state/playback-store';

export function SystemCard() {
    const [output, setOutput] = useState('IPC 结果会显示在这里');

    const sourceUrl = usePlaybackStore((state) => state.sourceUrl);
    const isPlaying = usePlaybackStore((state) => state.isPlaying);
    const currentTimeMs = usePlaybackStore((state) => state.currentTimeMs);

    const currentNoteId = useEditorStore((state) => state.currentNoteId);
    const editorContent = useEditorStore((state) => state.content);

    const assetCount = useAssetStore((state) => state.items.length);
    const selectedAssetId = useAssetStore((state) => state.selectedAssetId);

    const playbackSnapshot = {
        sourceUrl,
        isPlaying,
        currentTimeMs,
    };

    const editorSnapshot = {
        currentNoteId,
        contentLength: editorContent.length,
    };

    const assetSnapshot = {
        count: assetCount,
        selectedAssetId,
    };

    const callPing = async () => {
        const result = await noaDesktopClient.ping();
        setOutput(JSON.stringify(result, null, 2));
    };

    const callVersions = async () => {
        const result = await noaDesktopClient.getVersions();
        setOutput(JSON.stringify(result, null, 2));
    };

    const callExportSession = async () => {
        const result = await noaDesktopClient.exportSession({
            content: '# Noa Studio IPC\n\n这是一段导出占位内容。',
            suggestedName: 'noa-session.md',
        });
        setOutput(JSON.stringify(result, null, 2));
    };

    return (
        <section className="card">
            <h1>Noa Studio</h1>
            <p>Phase 0 基建已接入：renderer 分层、AppError、store、IPC 统一响应。</p>
            <div className="actions">
                <button type="button" onClick={callPing}>ping</button>
                <button type="button" onClick={callVersions}>getVersions</button>
                <button type="button" onClick={callExportSession}>exportSession</button>
            </div>
            <pre className="output">{output}</pre>
            <pre className="output">{JSON.stringify({ playbackSnapshot, editorSnapshot, assetSnapshot }, null, 2)}</pre>
        </section>
    );
}
