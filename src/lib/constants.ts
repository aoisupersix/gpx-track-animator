import type { RenderSettings } from '../types'

export const DEFAULT_EXPORT_WIDTH = 2560
export const DEFAULT_EXPORT_HEIGHT = 1440

/** Selectable output sizes; all are 16:9 with even dimensions. */
export type ResolutionPreset = {
    name: string
    width: number
    height: number
}

export const RESOLUTION_PRESETS: readonly ResolutionPreset[] = [
    { name: 'HD', width: 1280, height: 720 },
    { name: 'Full HD', width: 1920, height: 1080 },
    {
        name: 'WQHD',
        width: DEFAULT_EXPORT_WIDTH,
        height: DEFAULT_EXPORT_HEIGHT,
    },
    { name: '4K UHD', width: 3840, height: 2160 },
]

/** H.264 requires even dimensions; clamp to a sane range. */
export const MIN_EXPORT_SIZE = 320
export const MAX_EXPORT_SIZE = 7680

/** Padding in pixels around the track when fitting the export map view. */
export const EXPORT_PADDING_PX = 100

export const MAP_IDLE_TIMEOUT_MS = 30_000

export const DEFAULT_SETTINGS: RenderSettings = {
    width: DEFAULT_EXPORT_WIDTH,
    height: DEFAULT_EXPORT_HEIGHT,
    durationSec: 2.5,
    endHoldSec: 1,
    fps: 60,
    lineColor: '#2b2b96',
    lineOpacity: 0.7,
    lineWidth: 10,
    pinDropHeight: 3.5,
    pinDropSec: 0.5,
    pinBounce: 1,
}
