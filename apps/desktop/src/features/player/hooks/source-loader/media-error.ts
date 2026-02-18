import i18n from '../../../../i18n';

export function getMediaErrorMessage(error: MediaError | null, sourceUrl?: string | null): string {
    if (!error) {
        return i18n.t('feedback.mediaUnknown');
    }

    switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
            return i18n.t('feedback.mediaAborted');
        case error.MEDIA_ERR_NETWORK:
            return i18n.t('feedback.mediaNetwork');
        case error.MEDIA_ERR_DECODE:
            return i18n.t('feedback.mediaDecode');
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            if (sourceUrl && /^(blob:|file:|data:)/i.test(sourceUrl)) {
                return i18n.t('feedback.mediaLocalSrcUnsupported');
            }
            return i18n.t('feedback.mediaSrcUnsupported');
        default:
            return i18n.t('feedback.mediaLoadFailed');
    }
}
