import { useTranslation } from 'react-i18next';

type SourceBarProps = {
    urlInput: string;
    onUrlInputChange: (value: string) => void;
    onOpenUrlSource: () => void;
    onOpenLocalSource: () => void;
};

export function SourceBar({
    urlInput,
    onUrlInputChange,
    onOpenUrlSource,
    onOpenLocalSource,
}: SourceBarProps) {
    const { t } = useTranslation();

    return (
        <div className="source-bar">
            <textarea
                className="source-input"
                value={urlInput}
                onChange={(event) => onUrlInputChange(event.target.value)}
                placeholder={t('source.placeholder')}
                rows={1}
            />
            <button type="button" className="source-action-button" onClick={onOpenUrlSource}>{t('source.openUrl')}</button>
            <button type="button" className="source-action-button" onClick={onOpenLocalSource}>{t('source.openLocal')}</button>
        </div>
    );
}
