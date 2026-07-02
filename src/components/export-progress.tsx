type Props = {
    /** 0..1, or null for an indeterminate state. */
    progress: number | null
}

export const ExportProgress = ({ progress }: Props) => (
    <div className="export-progress">
        {progress === null ? (
            <progress />
        ) : (
            <progress max={1} value={progress} />
        )}
        <span>
            {progress === null
                ? '書き出し中…'
                : `動画をエンコード中… ${Math.round(progress * 100)}%`}
        </span>
    </div>
)
