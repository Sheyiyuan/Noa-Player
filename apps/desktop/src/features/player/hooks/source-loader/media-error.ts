export function getMediaErrorMessage(error: MediaError | null): string {
    if (!error) {
        return '未知媒体错误，请检查视频链接和网络状态。';
    }

    switch (error.code) {
        case error.MEDIA_ERR_ABORTED:
            return '播放被中断（可能是主动切换了视频源）。';
        case error.MEDIA_ERR_NETWORK:
            return '网络错误：视频资源请求失败，请检查链接是否可访问。';
        case error.MEDIA_ERR_DECODE:
            return '解码失败：当前视频编码可能不受支持。';
        case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
            return '资源不支持：格式不受支持或跨域策略阻止加载。';
        default:
            return '媒体加载失败，请检查格式、链接或跨域设置。';
    }
}
