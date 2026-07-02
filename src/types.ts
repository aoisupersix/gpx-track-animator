export type TrackPoint = {
    lon: number
    lat: number
}

export type Track = {
    points: TrackPoint[]
    /** Cumulative distance in meters from the start; cumulative[i] corresponds to points[i]. */
    cumulative: number[]
    /** Total track length in meters. */
    totalDistance: number
    /** [[west, south], [east, north]] */
    bounds: [[number, number], [number, number]]
}

export type PixelPoint = {
    x: number
    y: number
}

export type RenderSettings = {
    /** Duration of the start-to-end animation in seconds. */
    durationSec: number
    /** How long the full track stays visible at the end of the video, in seconds. */
    endHoldSec: number
    fps: 30 | 60
    lineColor: string
    lineOpacity: number
    lineWidth: number
}
