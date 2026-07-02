import { useI18n } from '../lib/i18n'

type Props = {
    trackLoaded: boolean
    exporting: boolean
    /** null while support detection is still running. */
    mp4Supported: boolean | null
    width: number
    height: number
    onPreview: () => void
    onExportPng: () => void
    onExportMp4: () => void
}

export const ExportButtons = ({
    trackLoaded,
    exporting,
    mp4Supported,
    width,
    height,
    onPreview,
    onExportPng,
    onExportMp4,
}: Props) => {
    const { t } = useI18n()
    const disabled = !trackLoaded || exporting
    return (
        <div className="export-buttons">
            <button type="button" onClick={onPreview} disabled={disabled}>
                {t('buttons.preview')}
            </button>
            <button type="button" onClick={onExportPng} disabled={disabled}>
                {t('buttons.exportPng', { width, height })}
            </button>
            <button
                type="button"
                onClick={onExportMp4}
                disabled={disabled || mp4Supported !== true}
            >
                {t('buttons.exportMp4', { width, height })}
            </button>
            {mp4Supported === false && (
                <p className="notice">{t('buttons.mp4Unsupported')}</p>
            )}
        </div>
    )
}
