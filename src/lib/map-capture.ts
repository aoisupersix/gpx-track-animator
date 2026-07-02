import maplibregl from 'maplibre-gl'

import { EXPORT_PADDING_PX, MAP_IDLE_TIMEOUT_MS } from './constants'
import { osmRasterStyle } from './osm-style'

import type { PixelPoint, Track } from '../types'

export type CapturedMap = {
    /** Base map rendered at the exact output size, without the track. */
    baseImage: ImageBitmap
    /** Track points projected to output pixel coordinates. */
    pixels: PixelPoint[]
}

const waitForIdle = (map: maplibregl.Map): Promise<void> =>
    new Promise((resolve, reject) => {
        const cleanup = (): void => {
            window.clearTimeout(timer)
            map.off('idle', handleIdle)
            map.off('error', handleError)
        }
        const handleIdle = (): void => {
            cleanup()
            resolve()
        }
        const handleError = (event: { error: unknown }): void => {
            cleanup()
            reject(
                event.error instanceof Error
                    ? event.error
                    : new Error('Map failed to load'),
            )
        }
        const timer = window.setTimeout(() => {
            cleanup()
            reject(new Error('Timed out while loading map tiles'))
        }, MAP_IDLE_TIMEOUT_MS)
        map.on('idle', handleIdle)
        map.on('error', handleError)
    })

/**
 * Renders the base map (without the track) at the exact output size in an
 * offscreen container, captures it once, and projects every track point to
 * output pixel coordinates. The map instance is torn down before returning.
 * The caller must close() the returned ImageBitmap when done.
 */
export const captureBaseMap = async (
    track: Track,
    width: number,
    height: number,
): Promise<CapturedMap> => {
    const container = document.createElement('div')
    // The container must have real layout dimensions, so it is hidden with
    // opacity/z-index instead of display: none.
    container.style.cssText =
        `position: fixed; top: 0; left: 0; width: ${width}px; height: ${height}px; ` +
        'z-index: -1; opacity: 0; pointer-events: none;'
    document.body.appendChild(container)
    const map = new maplibregl.Map({
        container,
        style: osmRasterStyle,
        bounds: track.bounds,
        fitBoundsOptions: { padding: EXPORT_PADDING_PX },
        // Pin the canvas to CSS pixels so its size is exactly width x height
        // and map.project() coordinates match canvas coordinates.
        pixelRatio: 1,
        canvasContextAttributes: { preserveDrawingBuffer: true },
        // Disable the raster cross-fade so tiles are fully opaque at 'idle'.
        fadeDuration: 0,
        interactive: false,
        attributionControl: false,
    })
    try {
        await waitForIdle(map)
        const baseImage = await createImageBitmap(map.getCanvas())
        const pixels = track.points.map((point): PixelPoint => {
            const projected = map.project([point.lon, point.lat])
            return { x: projected.x, y: projected.y }
        })
        return { baseImage, pixels }
    } finally {
        map.remove()
        container.remove()
    }
}
