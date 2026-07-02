import { useCallback, useEffect, useState } from 'react'

import { ExportButtons } from './components/export-buttons'
import { ExportProgress } from './components/export-progress'
import { GpxFileInput } from './components/gpx-file-input'
import { LanguageSwitcher } from './components/language-switcher'
import { PinList } from './components/pin-list'
import { SettingsForm } from './components/settings-form'
import { TrackMap } from './components/track-map'
import { DEFAULT_SETTINGS } from './lib/constants'
import { downloadBlob } from './lib/download'
import { isH264EncodeSupported, renderMp4Blob } from './lib/export-mp4'
import { renderPngBlob } from './lib/export-png'
import { buildTrack, haversineDistance } from './lib/geo'
import { GpxParseError, parseGpx } from './lib/gpx'
import { useI18n } from './lib/i18n'
import { captureBaseMap } from './lib/map-capture'

import type { RenderSettings, RoutePin, Track } from './types'
import type { LngLat } from 'maplibre-gl'

type ExportState =
    { kind: 'idle' } | { kind: 'png' } | { kind: 'mp4'; progress: number }

const errorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : String(error)

export const App = () => {
    const { t } = useI18n()
    const [track, setTrack] = useState<Track | null>(null)
    const [fileName, setFileName] = useState<string | null>(null)
    const [settings, setSettings] = useState<RenderSettings>(DEFAULT_SETTINGS)
    const [pins, setPins] = useState<RoutePin[]>([])
    const [addingPin, setAddingPin] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [exportState, setExportState] = useState<ExportState>({
        kind: 'idle',
    })
    const [mp4Supported, setMp4Supported] = useState<boolean | null>(null)
    const [previewRequestId, setPreviewRequestId] = useState(0)

    useEffect(() => {
        let cancelled = false
        isH264EncodeSupported()
            .then((supported) => {
                if (!cancelled) {
                    setMp4Supported(supported)
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setMp4Supported(false)
                }
            })
        return () => {
            cancelled = true
        }
    }, [])

    const handleFileSelected = useCallback(
        async (file: File) => {
            try {
                const text = await file.text()
                const loaded = buildTrack(parseGpx(text))
                setTrack(loaded)
                setFileName(file.name)
                setPins([])
                setAddingPin(false)
                setError(null)
            } catch (cause) {
                setTrack(null)
                setFileName(null)
                setPins([])
                setAddingPin(false)
                setError(
                    cause instanceof GpxParseError
                        ? t('error.parse')
                        : t('error.fileLoad', { message: errorMessage(cause) }),
                )
            }
        },
        [t],
    )

    const handlePlacePin = useCallback(
        (lngLat: LngLat): void => {
            if (track === null) {
                return
            }
            // Snap to the nearest track point so the pin's timing is well-defined.
            const clicked = { lon: lngLat.lng, lat: lngLat.lat }
            let nearest = 0
            let nearestDistance = Infinity
            track.points.forEach((point, index) => {
                const distance = haversineDistance(clicked, point)
                if (distance < nearestDistance) {
                    nearestDistance = distance
                    nearest = index
                }
            })
            const point = track.points[nearest]
            if (point === undefined) {
                return
            }
            const progress =
                track.totalDistance === 0
                    ? 0
                    : (track.cumulative[nearest] ?? 0) / track.totalDistance
            setPins((current) => [
                ...current,
                {
                    id: crypto.randomUUID(),
                    lon: point.lon,
                    lat: point.lat,
                    progress,
                    label: '',
                },
            ])
            setAddingPin(false)
        },
        [track],
    )

    const handlePinLabelChange = useCallback(
        (id: string, label: string): void => {
            setPins((current) =>
                current.map((pin) => (pin.id === id ? { ...pin, label } : pin)),
            )
        },
        [],
    )

    const handlePinDelete = useCallback((id: string): void => {
        setPins((current) => current.filter((pin) => pin.id !== id))
    }, [])

    const outputBaseName =
        fileName === null ? 'track' : fileName.replace(/\.gpx$/i, '')

    const handleExportPng = async (): Promise<void> => {
        if (track === null || exportState.kind !== 'idle') {
            return
        }
        setExportState({ kind: 'png' })
        setError(null)
        try {
            const captured = await captureBaseMap(
                track,
                pins,
                settings.width,
                settings.height,
            )
            try {
                downloadBlob(
                    await renderPngBlob(captured, settings),
                    `${outputBaseName}.png`,
                )
            } finally {
                captured.baseImage.close()
            }
        } catch (cause) {
            setError(t('error.pngExport', { message: errorMessage(cause) }))
        } finally {
            setExportState({ kind: 'idle' })
        }
    }

    const handleExportMp4 = async (): Promise<void> => {
        if (track === null || exportState.kind !== 'idle') {
            return
        }
        setExportState({ kind: 'mp4', progress: 0 })
        setError(null)
        try {
            const captured = await captureBaseMap(
                track,
                pins,
                settings.width,
                settings.height,
            )
            try {
                const blob = await renderMp4Blob(
                    captured,
                    track,
                    settings,
                    (progress) => {
                        setExportState({ kind: 'mp4', progress })
                    },
                )
                downloadBlob(blob, `${outputBaseName}.mp4`)
            } finally {
                captured.baseImage.close()
            }
        } catch (cause) {
            setError(t('error.mp4Export', { message: errorMessage(cause) }))
        } finally {
            setExportState({ kind: 'idle' })
        }
    }

    return (
        <div className="app">
            <header className="app-header">
                <h1>GPX Track Animator</h1>
                <LanguageSwitcher />
            </header>
            <div className="app-body">
                <aside className="sidebar">
                    <GpxFileInput
                        fileName={fileName}
                        onFileSelected={handleFileSelected}
                    />
                    <SettingsForm
                        settings={settings}
                        disabled={exportState.kind !== 'idle'}
                        onChange={setSettings}
                    />
                    <PinList
                        pins={pins}
                        addingPin={addingPin}
                        disabled={track === null || exportState.kind !== 'idle'}
                        onToggleAdd={() => setAddingPin((value) => !value)}
                        onLabelChange={handlePinLabelChange}
                        onDelete={handlePinDelete}
                    />
                    <ExportButtons
                        trackLoaded={track !== null}
                        exporting={exportState.kind !== 'idle'}
                        mp4Supported={mp4Supported}
                        width={settings.width}
                        height={settings.height}
                        onPreview={() => setPreviewRequestId((id) => id + 1)}
                        onExportPng={handleExportPng}
                        onExportMp4={handleExportMp4}
                    />
                    {exportState.kind === 'png' && (
                        <ExportProgress progress={null} />
                    )}
                    {exportState.kind === 'mp4' && (
                        <ExportProgress progress={exportState.progress} />
                    )}
                    {error !== null && (
                        <p className="error" role="alert">
                            {error}
                        </p>
                    )}
                </aside>
                <main className="map-area">
                    <TrackMap
                        track={track}
                        settings={settings}
                        pins={pins}
                        addingPin={addingPin}
                        onPlacePin={handlePlacePin}
                        previewRequestId={previewRequestId}
                    />
                </main>
            </div>
        </div>
    )
}
