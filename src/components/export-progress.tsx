import { useI18n } from '../lib/i18n'

type Props = {
    /** 0..1, or null for an indeterminate state. */
    progress: number | null
}

export const ExportProgress = ({ progress }: Props) => {
    const { t } = useI18n()
    return (
        <div className="export-progress">
            {progress === null ? (
                <progress />
            ) : (
                <progress max={1} value={progress} />
            )}
            <span>
                {progress === null
                    ? t('progress.exporting')
                    : t('progress.encoding', {
                          percent: Math.round(progress * 100),
                      })}
            </span>
        </div>
    )
}
