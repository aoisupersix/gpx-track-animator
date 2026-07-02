type Props = {
    trackLoaded: boolean
    exporting: boolean
    /** null while support detection is still running. */
    mp4Supported: boolean | null
    onPreview: () => void
    onExportPng: () => void
    onExportMp4: () => void
}

export const ExportButtons = ({
    trackLoaded,
    exporting,
    mp4Supported,
    onPreview,
    onExportPng,
    onExportMp4,
}: Props) => {
    const disabled = !trackLoaded || exporting
    return (
        <div className="export-buttons">
            <button type="button" onClick={onPreview} disabled={disabled}>
                プレビュー再生
            </button>
            <button type="button" onClick={onExportPng} disabled={disabled}>
                PNG書き出し（2560×1440）
            </button>
            <button
                type="button"
                onClick={onExportMp4}
                disabled={disabled || mp4Supported !== true}
            >
                MP4書き出し（H.264 / 2560×1440）
            </button>
            {mp4Supported === false && (
                <p className="notice">
                    お使いのブラウザはH.264エンコード（WebCodecs）に未対応のため、MP4書き出しは利用できません。
                    Chrome / Edge / Safari
                    をご利用ください。PNG書き出しは利用できます。
                </p>
            )}
        </div>
    )
}
