import { useTranslation } from 'react-i18next';

type MarkdownEditorPanelProps = {
    value: string;
    onChange: (value: string) => void;
    onInsertTimestamp: () => void;
    onSelectionChange: (selection: { start: number; end: number }) => void;
    onFocusChange: (focused: boolean) => void;
};

export function MarkdownEditorPanel({
    value,
    onChange,
    onInsertTimestamp,
    onSelectionChange,
    onFocusChange,
}: MarkdownEditorPanelProps) {
    const { t } = useTranslation();

    const emitSelection = (target: HTMLTextAreaElement) => {
        onSelectionChange({
            start: target.selectionStart,
            end: target.selectionEnd,
        });
    };

    return (
        <section className="markdown-editor-panel">
            <div className="markdown-editor-header">
                <h2>{t('markdown.title')}</h2>
                <button type="button" className="markdown-editor-action" onClick={onInsertTimestamp}>
                    {t('markdown.insertTimestamp')}
                </button>
            </div>
            <textarea
                className="markdown-editor-input"
                value={value}
                placeholder={t('markdown.placeholder')}
                onChange={(event) => onChange(event.currentTarget.value)}
                onSelect={(event) => emitSelection(event.currentTarget)}
                onClick={(event) => emitSelection(event.currentTarget)}
                onKeyUp={(event) => emitSelection(event.currentTarget)}
                onFocus={() => onFocusChange(true)}
                onBlur={() => onFocusChange(false)}
            />
        </section>
    );
}
