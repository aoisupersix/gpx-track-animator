import maplibregl from 'maplibre-gl'
import { useCallback, useEffect, useRef } from 'react'

import { useI18n } from '../lib/i18n'
import { osmRasterStyle } from '../lib/osm-style'
import { partialPath } from '../lib/pixel-path'
import { drawTrackFrame, toFrameStyle } from '../lib/track-renderer'

import type { PixelPoint, RenderSettings, Track } from '../types'

import 'maplibre-gl/dist/maplibre-gl.css'

type Props = {
    track: Track | null
    settings: RenderSettings
    /** Incremented by the parent each time preview playback is requested. */
    previewRequestId: number
}

/**
 * Interactive preview map with a transparent overlay canvas. The overlay uses
 * the same interpolation and drawing code as the exports, so the preview is
 * identical to the exported output (WYSIWYG).
 */
export const TrackMap = ({ track, settings, previewRequestId }: Props) => {
    const { t } = useI18n()
    const containerRef = useRef<HTMLDivElement | null>(null)
    const overlayRef = useRef<HTMLCanvasElement | null>(null)
    const mapRef = useRef<maplibregl.Map | null>(null)
    const trackRef = useRef<Track | null>(null)
    const settingsRef = useRef<RenderSettings>(settings)
    /** Currently drawn animation progress; 1 means the full track. */
    const progressRef = useRef(1)

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
        const path = partialPath(
            pixels,
            currentTrack.cumulative,
            progressRef.current,
        )
        drawTrackFrame(
            ctx,
            null,
            path,
            toFrameStyle(settingsRef.current),
            false,
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
        if (previewRequestId === 0 || trackRef.current === null) {
            return
        }
        const durationMs = Math.max(settingsRef.current.durationSec, 0.1) * 1000
        const start = performance.now()
        let frameHandle = 0
        const tick = (now: number): void => {
            const progress = Math.min((now - start) / durationMs, 1)
            progressRef.current = progress
            redraw()
            if (progress < 1) {
                frameHandle = requestAnimationFrame(tick)
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
        </div>
    )
}
