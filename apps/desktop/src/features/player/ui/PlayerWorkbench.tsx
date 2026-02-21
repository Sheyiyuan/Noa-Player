import { AssetContextMenu } from './AssetContextMenu';
import { AssetListPanel } from './AssetListPanel';
import { MarkdownEditorPanel } from './MarkdownEditorPanel';
import { PlaybackControls } from './PlaybackControls';
import { PlaybackStatusPanel } from './PlaybackStatusPanel';
import { SourceBar } from './SourceBar';
import { ToastStack } from './ToastStack';
import { usePlayerWorkbenchController } from '../hooks';

export function PlayerWorkbench() {
    const { refs, state, actions } = usePlayerWorkbenchController();

    const syncDurationFromVideo = (video: HTMLVideoElement) => {
        const finiteDuration = Number.isFinite(video.duration) ? video.duration : 0;
        if (finiteDuration > 0) {
            actions.setDurationMs(finiteDuration * 1000);
            return;
        }

        const seekableEnd = video.seekable.length > 0 ? video.seekable.end(video.seekable.length - 1) : 0;
        if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
            actions.setDurationMs(seekableEnd * 1000);
            return;
        }

        const bufferedEnd = video.buffered.length > 0 ? video.buffered.end(video.buffered.length - 1) : 0;
        const isReasonableBufferedEnd = Number.isFinite(bufferedEnd) && bufferedEnd > 0 && bufferedEnd < 24 * 60 * 60;
        actions.setDurationMs(isReasonableBufferedEnd ? bufferedEnd * 1000 : 0);
    };

    return (
        <section className="player-workbench">
            <div className="workbench-content">
                <section className="player-panel">
                    <div
                        className={`video-shell ${state.isRegionMode ? 'region-mode' : ''}`}
                        onPointerDown={actions.onPointerDown}
                        onPointerMove={actions.onPointerMove}
                        onPointerUp={actions.onPointerUp}
                    >
                        <video
                            ref={refs.videoRef}
                            className="player-video"
                            controls={false}
                            onTimeUpdate={(event) => actions.setCurrentTimeMs(event.currentTarget.currentTime * 1000)}
                            onLoadedMetadata={(event) => syncDurationFromVideo(event.currentTarget)}
                            onDurationChange={(event) => syncDurationFromVideo(event.currentTarget)}
                            onLoadedData={(event) => syncDurationFromVideo(event.currentTarget)}
                            onProgress={(event) => syncDurationFromVideo(event.currentTarget)}
                            onPlay={() => actions.setPlaying(true)}
                            onPause={() => actions.setPlaying(false)}
                            onWaiting={() => actions.setIsBuffering(true)}
                            onPlaying={() => {
                                actions.setIsBuffering(false);
                                actions.setPlaying(true);
                            }}
                            onCanPlay={() => actions.setIsBuffering(false)}
                            onEnded={() => actions.setPlaying(false)}
                            onError={actions.onVideoError}
                        />
                        {state.regionRect ? (
                            <div
                                className="capture-region"
                                style={{
                                    left: `${state.regionRect.x}px`,
                                    top: `${state.regionRect.y}px`,
                                    width: `${state.regionRect.width}px`,
                                    height: `${state.regionRect.height}px`,
                                }}
                            />
                        ) : null}
                    </div>

                    <SourceBar
                        urlInput={state.urlInput}
                        onUrlInputChange={actions.setUrlInput}
                        onOpenUrlSource={actions.openUrlSource}
                        onOpenLocalSource={actions.openLocalSource}
                    />

                    <PlaybackControls
                        isPlaying={state.isPlaying}
                        isMuted={state.isMuted}
                        rate={state.rate}
                        volume={state.volume}
                        onTogglePlay={actions.togglePlay}
                        onSeekBy={actions.seekBy}
                        onToggleMute={actions.toggleMute}
                        onSetPlaybackRate={actions.setPlaybackRate}
                        onSetPlaybackVolume={actions.setPlaybackVolume}
                        onCaptureFullFrame={actions.captureFullFrame}
                        onStartRegionCapture={actions.startRegionCapture}
                    />

                    <PlaybackStatusPanel
                        durationMs={state.durationMs}
                        currentTimeMs={state.currentTimeMs}
                        isSeekable={state.isSeekable}
                        sourceUrl={state.sourceUrl}
                        isBuffering={state.isBuffering}
                        isPlaying={state.isPlaying}
                        playlist={state.videoPlaylist}
                        currentVideoId={state.currentVideoId}
                        feedback={state.feedback}
                        onSelectVideo={actions.switchVideo}
                        onRenameVideo={actions.renameVideo}
                        onDeleteVideo={actions.deleteVideo}
                        onReorderVideo={actions.reorderVideo}
                        onSeekTo={actions.seekTo}
                        onProgressKeyboardSeek={actions.onProgressKeyboardSeek}
                    />
                </section>

                <AssetListPanel
                    items={state.items}
                    onAssetContextMenu={actions.onAssetContextMenu}
                    ocrSummaries={state.ocrSummaries}
                    ocrLoadingByAssetId={state.ocrLoadingByAssetId}
                    onRunAssetOcr={actions.runAssetOcr}
                    onInsertAsset={actions.insertAssetImage}
                />

                <MarkdownEditorPanel
                    value={state.markdownText}
                    onChange={actions.setMarkdownText}
                    onInsertTimestamp={actions.insertTimestampToken}
                    onSelectionChange={actions.setMarkdownSelectionRange}
                    onFocusChange={actions.setMarkdownFocus}
                />
            </div>

            <AssetContextMenu
                assetMenu={state.assetMenu}
                onOpenAssetFolder={actions.openAssetFolder}
                onDeleteAsset={actions.deleteAsset}
            />

            <ToastStack toasts={state.toasts} onDismissToast={actions.dismissToast} />

            {state.isSaveDialogOpen ? (
                <div className="app-modal-layer" role="dialog" aria-modal="true" aria-label="另存为项目">
                    <div className="app-modal-card">
                        <h3>另存为项目</h3>
                        <label className="app-modal-field">
                            <span>项目名称</span>
                            <input
                                type="text"
                                value={state.saveProjectNameInput}
                                onChange={(event) => actions.onSaveProjectNameChange(event.currentTarget.value)}
                            />
                        </label>
                        <label className="app-modal-field">
                            <span>目录名称</span>
                            <input
                                type="text"
                                value={state.saveDirectoryNameInput}
                                onChange={(event) => actions.setSaveDirectoryNameInput(event.currentTarget.value)}
                            />
                        </label>

                        <div className="app-modal-path-toolbar">
                            <button type="button" onClick={actions.navigateSaveParentPath} disabled={!state.saveParentPath}>上级目录</button>
                            <span className="app-modal-path-preview">{state.saveBrowserPath}</span>
                        </div>

                        <div className="app-modal-path-list">
                            {state.saveDirectories.map((entry) => (
                                <button
                                    key={entry.path}
                                    type="button"
                                    className="app-modal-path-item"
                                    onClick={() => actions.navigateSavePath(entry.path)}
                                >
                                    {entry.name}
                                </button>
                            ))}
                        </div>

                        <div className="app-modal-new-folder">
                            <input
                                type="text"
                                placeholder="新建文件夹名称"
                                value={state.newFolderName}
                                onChange={(event) => actions.setNewFolderName(event.currentTarget.value)}
                            />
                            <button type="button" onClick={actions.createFolderInSavePath}>新建文件夹</button>
                        </div>

                        <p className="app-modal-path-preview">{`${state.saveBrowserPath}/${state.saveDirectoryNameInput || 'project'}`}</p>

                        <div className="app-modal-actions">
                            <button type="button" onClick={actions.closeSaveDialog}>取消</button>
                            <button type="button" onClick={actions.submitProjectSaveAs} disabled={state.isSaveSubmitting}>保存</button>
                        </div>
                    </div>
                </div>
            ) : null}

            {state.isCloseConfirmOpen ? (
                <div className="app-modal-layer" role="dialog" aria-modal="true" aria-label="关闭确认">
                    <div className="app-modal-card app-modal-card--compact">
                        <h3>检测到未保存改动</h3>
                        <p>是否保存当前项目后退出？</p>
                        <div className="app-modal-actions">
                            <button type="button" onClick={actions.closeCloseConfirm}>取消</button>
                            <button type="button" onClick={actions.closeWithoutSaving}>不保存退出</button>
                            <button type="button" onClick={actions.saveAndExit}>保存并退出</button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
