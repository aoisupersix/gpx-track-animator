import { useRef, useState } from 'react'

import { useI18n } from '../lib/i18n'

import type { ChangeEvent, DragEvent, KeyboardEvent } from 'react'

type Props = {
    fileName: string | null
    onFileSelected: (file: File) => void
}

export const GpxFileInput = ({ fileName, onFileSelected }: Props) => {
    const { t } = useI18n()
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [dragOver, setDragOver] = useState(false)

    const handleDrop = (event: DragEvent<HTMLDivElement>): void => {
        event.preventDefault()
        setDragOver(false)
        const file = event.dataTransfer.files[0]
        if (file !== undefined) {
            onFileSelected(file)
        }
    }

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const file = event.target.files?.[0]
        if (file !== undefined && file !== null) {
            onFileSelected(file)
        }
        // Allow re-selecting the same file.
        event.target.value = ''
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            inputRef.current?.click()
        }
    }

    return (
        <div
            className={dragOver ? 'file-drop drag-over' : 'file-drop'}
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={handleKeyDown}
            onDragOver={(event) => {
                event.preventDefault()
                setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".gpx"
                onChange={handleChange}
                hidden
            />
            <p>{fileName ?? t('fileInput.prompt')}</p>
        </div>
    )
}
