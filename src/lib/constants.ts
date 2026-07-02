import type { RenderSettings } from '../types'

export const EXPORT_WIDTH = 2560
export const EXPORT_HEIGHT = 1440

/** Padding in pixels around the track when fitting the export map view. */
export const EXPORT_PADDING_PX = 100

/** 12 Mbps is generous for 1440p60 content over a static base map. */
export const VIDEO_BITRATE = 12_000_000

/** H.264 High@L5.1 — the lowest level that allows 2560x1440@60fps. */
export const H264_CODEC_STRING = 'avc1.640033'

export const MAP_IDLE_TIMEOUT_MS = 30_000

export const DEFAULT_SETTINGS: RenderSettings = {
    durationSec: 2.5,
    endHoldSec: 1,
    fps: 60,
    lineColor: '#2b2b96',
    lineOpacity: 0.7,
    lineWidth: 10,
}
