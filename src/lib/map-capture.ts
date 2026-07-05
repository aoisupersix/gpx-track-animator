import maplibregl from 'maplibre-gl'

import { EXPORT_PADDING_PX, MAP_IDLE_TIMEOUT_MS } from './constants'
import { osmRasterStyle } from './osm-style'
import { pinAppearFraction } from './speed'
import { introCamera } from './zoom'

import type { PinRender } from './track-renderer'
import type { Camera } from './zoom'
import type { PixelPoint, RoutePin, Track } from '../types'

export type CapturedMap = {
    /** Base map rendered at the exact output size, without the track. */
    baseImage: ImageBitmap
    /** Track points projected to output pixel coordinates. */
    pixels: PixelPoint[]
    /** Pins projected to output pixel coordinates. */
    pins: PinRender[]
}

/** A single frame of the opening zoom: the map image and the start dot's spot. */
export type IntroFrame = {
    image: ImageBitmap
    startPixel: PixelPoint
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
 * Creates an offscreen, non-interactive map fitted to the track at the exact
 * output size and resolves once its tiles have loaded. The caller owns the
 * returned map and container and must remove() both when done.
 */
const createFittedMap = async (
    track: Track,
    width: number,
    height: number,
): Promise<{ map: maplibregl.Map; container: HTMLDivElement }> => {
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
        return { map, container }
    } catch (cause) {
        map.remove()
        container.remove()
        throw cause
    }
}

/** Projects the full track and pins against the map at its current camera. */
const projectTrack = (
    map: maplibregl.Map,
    track: Track,
    pins: RoutePin[],
    speedBased: boolean,
    pauseOnStop: boolean,
): { pixels: PixelPoint[]; pins: PinRender[] } => {
    const pixels = track.points.map((point): PixelPoint => {
        const projected = map.project([point.lon, point.lat])
        return { x: projected.x, y: projected.y }
    })
    const pinRenders = pins.map((pin): PinRender => {
        const projected = map.project([pin.lon, pin.lat])
        return {
            pixel: { x: projected.x, y: projected.y },
            appearAt: pinAppearFraction(
                track,
                speedBased,
                pauseOnStop,
                pin.progress,
            ),
            label: pin.label,
        }
    })
    return { pixels, pins: pinRenders }
}

/**
 * Renders the base map (without the track) at the exact output size in an
 * offscreen container, captures it once, and projects every track point to
 * output pixel coordinates. The map instance is torn down before returning.
 * The caller must close() the returned ImageBitmap when done.
 */
export const captureBaseMap = async (
    track: Track,
    pins: RoutePin[],
    width: number,
    height: number,
    speedBased: boolean,
    pauseOnStop: boolean,
): Promise<CapturedMap> => {
    const { map, container } = await createFittedMap(track, width, height)
    try {
        const baseImage = await createImageBitmap(map.getCanvas())
        const projected = projectTrack(
            map,
            track,
            pins,
            speedBased,
            pauseOnStop,
        )
        return { baseImage, ...projected }
    } finally {
        map.remove()
        container.remove()
    }
}

/**
 * A live offscreen map kept alive across the whole MP4 render so the opening
 * zoom can capture one frame at a time (holding every frame in memory at 4K
 * would be prohibitive). Callers must close() when done.
 */
export type MapSession = {
    /** Captures the fitted base map plus projected track/pins (final view). */
    captureFinal: () => Promise<CapturedMap>
    /**
     * Captures one opening-zoom frame. `fraction` 0 = fully zoomed in on the
     * start point, 1 = the fitted view. Caller must close() the returned image.
     */
    captureIntroFrame: (fraction: number) => Promise<IntroFrame>
    close: () => void
}

export const openMapSession = async (
    track: Track,
    pins: RoutePin[],
    width: number,
    height: number,
    speedBased: boolean,
    pauseOnStop: boolean,
    initialLevel: number,
): Promise<MapSession> => {
    const { map, container } = await createFittedMap(track, width, height)
    const finalCenter = map.getCenter()
    const finalCamera: Camera = {
        center: [finalCenter.lng, finalCenter.lat],
        zoom: map.getZoom(),
    }
    // The overview shares the fitted center and only pulls the zoom out.
    const startCamera: Camera = {
        center: finalCamera.center,
        zoom: initialLevel,
    }
    const startPoint = track.points[0] ?? {
        lon: finalCamera.center[0],
        lat: finalCamera.center[1],
    }
    // The map is already fitted and idle, so capture the final view now rather
    // than jumping back to it later (a jump to an unchanged camera may never
    // fire 'idle'). Intro frames move the camera afterwards.
    const final: CapturedMap = {
        baseImage: await createImageBitmap(map.getCanvas()),
        ...projectTrack(map, track, pins, speedBased, pauseOnStop),
    }
    return {
        captureFinal: (): Promise<CapturedMap> => Promise.resolve(final),
        captureIntroFrame: async (fraction): Promise<IntroFrame> => {
            const camera = introCamera(startCamera, finalCamera, fraction)
            map.jumpTo({ center: camera.center, zoom: camera.zoom })
            await waitForIdle(map)
            const image = await createImageBitmap(map.getCanvas())
            // The dot marks the actual start point, not the (fitted) center.
            const projected = map.project([startPoint.lon, startPoint.lat])
            return { image, startPixel: { x: projected.x, y: projected.y } }
        },
        close: (): void => {
            map.remove()
            container.remove()
        },
    }
}
