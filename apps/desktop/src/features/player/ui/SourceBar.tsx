import type { ChangeEvent, RefObject } from 'react';

type SourceBarProps = {
    urlInput: string;
    onUrlInputChange: (value: string) => void;
    onOpenUrlSource: () => void;
    onOpenLocalSource: () => void;
    fileInputRef: RefObject<HTMLInputElement>;
    onSelectLocalFile: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function SourceBar({
    urlInput,
    onUrlInputChange,
    onOpenUrlSource,
    onOpenLocalSource,
    fileInputRef,
    onSelectLocalFile,
}: SourceBarProps) {
    return (
        <div className="source-bar">
            <textarea
                className="source-input"
                value={urlInput}
                onChange={(event) => onUrlInputChange(event.target.value)}
                placeholder={'输入视频直链或 JSON 源配置（mp4/webm/m3u8/mpd）'}
                rows={1}
            />
            <button type="button" className="source-action-button" onClick={onOpenUrlSource}>打开直链</button>
            <button type="button" className="source-action-button" onClick={onOpenLocalSource}>打开本地文件</button>
            <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden-file-input"
                onChange={onSelectLocalFile}
            />
        </div>
    );
}
