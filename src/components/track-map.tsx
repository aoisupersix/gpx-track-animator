import maplibregl from 'maplibre-gl'
import { useCallback, useEffect, useRef } from 'react'

import { useI18n } from '../lib/i18n'
import { osmRasterStyle } from '../lib/osm-style'
import { partialPath } from '../lib/pixel-path'
import { headDistanceFraction, pinAppearFraction } from '../lib/speed'
import {
    drawPins,
    drawTrackFrame,
    toFrameStyle,
    toPinStyle,
} from '../lib/track-renderer'
import { introCamera } from '../lib/zoom'

import type { PinRender } from '../lib/track-renderer'
import type { Camera } from '../lib/zoom'
import type { RenderSettings, RoutePin, Track } from '../types'
import type { PixelPoint } from '../types'
import type { LngLat } from 'maplibre-gl'

import 'maplibre-gl/dist/maplibre-gl.css'

type Props = {
    track: Track | null
    settings: RenderSettings
    pins: RoutePin[]
    /** When true, clicking the map places a new pin. */
    addingPin: boolean
    onPlacePin: (lngLat: LngLat) => void
    /** Incremented by the parent each time preview playback is requested. */
    previewRequestId: number
}

/**
 * Interactive preview map with a transparent overlay canvas. The overlay uses
 * the same interpolation and drawing code as the exports, so the preview is
 * identical to the exported output (WYSIWYG).
 */
export const TrackMap = ({
    track,
    settings,
    pins,
    addingPin,
    onPlacePin,
    previewRequestId,
}: Props) => {
    const { t } = useI18n()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const overlayRef = useRef<HTMLCanvasElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const trackRef = useRef<Track | null>(null)
    const settingsRef = useRef<RenderSettings>(settings)
    const pinsRef = useRef<RoutePin[]>(pins)
    /** Animation progress (0..1 of the duration); 1 means the full track. */
    const progressRef = useRef(1)
    /** Elapsed playback time in seconds; Infinity means fully settled. */
    const elapsedRef = useRef(Infinity)

    const redraw = useCallback(() => {
        const map = mapRef.current
        const canvas = overlayRef.current
        if (map === null || canvas === null) {
            return
        }
        const pixelRatio = window.devicePixelRatio || 1
        const width = canvas.clientWidth
        const height = canvas.clientHeight
        if (
            canvas.width !== width * pixelRatio ||
            canvas.height !== height * pixelRatio
        ) {
            canvas.width = width * pixelRatio
            canvas.height = height * pixelRatio
        }
        const ctx = canvas.getContext('2d')
        if (ctx === null) {
            return
        }
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
        const currentTrack = trackRef.current
        if (currentTrack === null) {
            ctx.clearRect(0, 0, width, height)
            return
        }
        const pixels = currentTrack.points.map((point): PixelPoint => {
            const projected = map.project([point.lon, point.lat])
            return { x: projected.x, y: projected.y }
        })
        const { speedBased, pauseOnStop } = settingsRef.current
        const path = partialPath(
            pixels,
            currentTrack.cumulative,
            headDistanceFraction(
                currentTrack,
                speedBased,
                pauseOnStop,
                progressRef.current,
            ),
        )
        drawTrackFrame(
            ctx,
            null,
            path,
            toFrameStyle(settingsRef.current),
            false,
        )
        const pinRenders = pinsRef.current.map((pin): PinRender => {
            const projected = map.project([pin.lon, pin.lat])
            return {
                pixel: { x: projected.x, y: projected.y },
                appearAt: pinAppearFraction(
                    currentTrack,
                    speedBased,
                    pauseOnStop,
                    pin.progress,
                ),
                label: pin.label,
            }
        })
        drawPins(
            ctx,
            pinRenders,
            elapsedRef.current,
            settingsRef.current.durationSec,
            toPinStyle(settingsRef.current),
        )
    }, [])

    useEffect(() => {
        const container = containerRef.current
        if (container === null) {
            return
        }
        const map = new maplibregl.Map({
            container,
            style: osmRasterStyle,
            center: [137.0, 36.5],
            zoom: 4,
        })
        map.on('move', redraw)
        map.on('resize', redraw)
        mapRef.current = map
        return () => {
            mapRef.current = null
            map.remove()
        }
    }, [redraw])

    useEffect(() => {
        trackRef.current = track
        progressRef.current = 1
        elapsedRef.current = Infinity
        const map = mapRef.current
        if (map !== null && track !== null) {
            map.fitBounds(track.bounds, { padding: 60, duration: 0 })
        }
        redraw()
    }, [track, redraw])

    useEffect(() => {
        settingsRef.current = settings
        redraw()
    }, [settings, redraw])

    useEffect(() => {
        pinsRef.current = pins
        redraw()
    }, [pins, redraw])

    useEffect(() => {
        const map = mapRef.current
        if (map === null || !addingPin) {
            return
        }
        const canvas = map.getCanvas()
        canvas.style.cursor = 'crosshair'
        const handleClick = (event: maplibregl.MapMouseEvent): void => {
            onPlacePin(event.lngLat)
        }
        map.on('click', handleClick)
        return () => {
            map.off('click', handleClick)
            canvas.style.cursor = ''
        }
    }, [addingPin, onPlacePin])

    useEffect(() => {
        const currentTrack = trackRef.current
        const map = mapRef.current
        if (previewRequestId === 0 || currentTrack === null) {
            return
        }
        const settings = settingsRef.current
        // Resolve the opening-zoom cameras against the current (fitted) view.
        // The overview shares the fitted center and only pulls the zoom out.
        let intro: { start: Camera; final: Camera } | null = null
        if (settings.zoomIntro && map !== null) {
            const fit = map.cameraForBounds(currentTrack.bounds, {
                padding: 60,
            })
            if (fit?.center !== undefined) {
                const center = maplibregl.LngLat.convert(fit.center)
                const final: Camera = {
                    center: [center.lng, center.lat],
                    zoom: fit.zoom ?? map.getZoom(),
                }
                intro = {
                    start: {
                        center: final.center,
                        zoom: settings.zoomInitialLevel,
                    },
                    final,
                }
            }
        }
        const preZoomHoldMs =
            intro === null ? 0 : Math.max(settings.preZoomHoldSec, 0) * 1000
        const introMs =
            intro === null ? 0 : Math.max(settings.zoomDurationSec, 0) * 1000
        const startHoldMs = Math.max(settings.startHoldSec, 0) * 1000
        const durationMs = Math.max(settings.durationSec, 0.1) * 1000
        // Hold the overview, zoom in, hold on the start point, then play
        // through the end hold so late pins finish their drop-in, matching the
        // exported video.
        const totalMs =
            preZoomHoldMs +
            introMs +
            startHoldMs +
            durationMs +
            Math.max(settings.endHoldSec, 0) * 1000
        const start = performance.now()
        let settled = false
        let frameHandle = 0
        const tick = (now: number): void => {
            const elapsedMs = now - start
            if (intro !== null && map !== null && elapsedMs < preZoomHoldMs) {
                // Pre-zoom hold: the wide overview stays still, no pins yet.
                map.jumpTo({
                    center: intro.start.center,
                    zoom: intro.start.zoom,
                })
                progressRef.current = 0
                elapsedRef.current = -1
                redraw()
                frameHandle = requestAnimationFrame(tick)
                return
            }
            const zoomMs = elapsedMs - preZoomHoldMs
            if (intro !== null && map !== null && zoomMs < introMs) {
                // Opening zoom: head stays at the start, no pins yet.
                const camera = introCamera(
                    intro.start,
                    intro.final,
                    zoomMs / introMs,
                )
                map.jumpTo({ center: camera.center, zoom: camera.zoom })
                progressRef.current = 0
                elapsedRef.current = -1
                redraw()
                frameHandle = requestAnimationFrame(tick)
                return
            }
            if (intro !== null && map !== null && !settled) {
                // Land exactly on the fitted view before the track animation.
                map.jumpTo({
                    center: intro.final.center,
                    zoom: intro.final.zoom,
                })
                settled = true
            }
            // Negative until the start hold ends: head stays put, no pins yet.
            const animMs = elapsedMs - preZoomHoldMs - introMs - startHoldMs
            progressRef.current = Math.min(Math.max(animMs, 0) / durationMs, 1)
            elapsedRef.current = animMs / 1000
            if (elapsedMs < totalMs) {
                redraw()
                frameHandle = requestAnimationFrame(tick)
            } else {
                progressRef.current = 1
                elapsedRef.current = Infinity
                redraw()
            }
        }
        frameHandle = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(frameHandle)
        }
    }, [previewRequestId, redraw])

    return (
        <div className="track-map">
            <div ref={containerRef} className="track-map-canvas" />
            <canvas ref={overlayRef} className="track-map-overlay" />
            {track === null && (
                <div className="track-map-empty">{t('map.empty')}</div>
            )}
            {addingPin && track !== null && (
                <div className="track-map-hint">{t('pins.adding')}</div>
            )}
        </div>
    )
}
