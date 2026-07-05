import {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    canEncodeVideo,
} from 'mediabunny'

import { DEFAULT_EXPORT_HEIGHT, DEFAULT_EXPORT_WIDTH } from './constants'
import { h264CodecString, videoBitrate } from './encode-config'
import { partialPath } from './pixel-path'
import { headDistanceFraction } from './speed'
import {
    anyPinAnimating,
    createFrameContext,
    drawPins,
    drawTrackFrame,
    toFrameStyle,
    toPinStyle,
} from './track-renderer'

import type { RenderSettings, Track } from '../types'
import type { CapturedMap, MapSession } from './map-capture'

/**
 * Probes actual encoder support instead of trusting isConfigSupported();
 * Firefox currently cannot encode H.264 via WebCodecs.
 */
export const isH264EncodeSupported = (): Promise<boolean> =>
    canEncodeVideo('avc', {
        width: DEFAULT_EXPORT_WIDTH,
        height: DEFAULT_EXPORT_HEIGHT,
        bitrate: videoBitrate(DEFAULT_EXPORT_WIDTH, DEFAULT_EXPORT_HEIGHT, 60),
    })

/**
 * Encodes the track animation as an H.264 MP4. When `settings.zoomIntro` is on
 * the video holds on a wide overview for `preZoomHoldSec`, zooms in to the
 * fitted view over `zoomDurationSec`, then holds on the start point for
 * `startHoldSec`. The track then grows from start to end over `durationSec` —
 * at constant geographic speed, or following the recorded GPX pace when
 * `settings.speedBased` is on — and finally the full track stays visible for
 * `endHoldSec`.
 */
export const renderMp4Blob = async (
    session: MapSession,
    captured: CapturedMap,
    track: Track,
    settings: RenderSettings,
    onProgress: (ratio: number) => void,
): Promise<Blob> => {
    const ctx = createFrameContext(
        captured.baseImage.width,
        captured.baseImage.height,
    )
    const width = captured.baseImage.width
    const height = captured.baseImage.height
    const target = new BufferTarget()
    const output = new Output({ format: new Mp4OutputFormat(), target })
    const source = new CanvasSource(ctx.canvas, {
        codec: 'avc',
        bitrate: videoBitrate(width, height, settings.fps),
        fullCodecString: h264CodecString(width, height, settings.fps),
    })
    output.addVideoTrack(source, { frameRate: settings.fps })
    await output.start()
    const preZoomHoldFrames = settings.zoomIntro
        ? Math.max(Math.round(settings.preZoomHoldSec * settings.fps), 0)
        : 0
    const introFrames = settings.zoomIntro
        ? Math.max(Math.round(settings.zoomDurationSec * settings.fps), 0)
        : 0
    const startHoldFrames = Math.round(settings.startHoldSec * settings.fps)
    const animationFrames = Math.max(
        Math.round(settings.durationSec * settings.fps),
        2,
    )
    const holdFrames = Math.round(settings.endHoldSec * settings.fps)
    const mainFrames = startHoldFrames + animationFrames + holdFrames
    const totalFrames = preZoomHoldFrames + introFrames + mainFrames
    const style = toFrameStyle(settings)
    const pinStyle = toPinStyle(settings)
    let frame = 0
    // Pre-zoom hold: the wide overview stays still. Captured once and held,
    // since nothing moves.
    if (preZoomHoldFrames > 0) {
        const { image, startPixel } = await session.captureIntroFrame(0)
        drawTrackFrame(ctx, image, [startPixel], style, true)
        image.close()
        for (let i = 0; i < preZoomHoldFrames; i++) {
            await source.add(frame / settings.fps, 1 / settings.fps)
            onProgress((frame + 1) / totalFrames)
            frame++
        }
    }
    // Opening zoom: re-render the map at each interpolated camera. Only the
    // start point shows, matching the first frame of the start hold.
    for (let i = 0; i < introFrames; i++) {
        const fraction = introFrames <= 1 ? 1 : i / (introFrames - 1)
        const { image, startPixel } = await session.captureIntroFrame(fraction)
        drawTrackFrame(ctx, image, [startPixel], style, true)
        image.close()
        await source.add(frame / settings.fps, 1 / settings.fps)
        onProgress((frame + 1) / totalFrames)
        frame++
    }
    let lastProgress = -1
    for (let main = 0; main < mainFrames; main++) {
        // Negative during the start hold, so the head stays at the origin and
        // no pin has appeared yet.
        const animFrame = main - startHoldFrames
        const animFraction = Math.min(
            Math.max(animFrame, 0) / (animationFrames - 1),
            1,
        )
        const progress = headDistanceFraction(
            track,
            settings.speedBased,
            settings.pauseOnStop,
            animFraction,
        )
        const elapsedSec = animFrame / settings.fps
        // Keep redrawing while pins animate, even after the line is complete.
        if (
            progress !== lastProgress ||
            anyPinAnimating(
                captured.pins,
                elapsedSec,
                settings.durationSec,
                pinStyle.animSec,
            )
        ) {
            const path = partialPath(
                captured.pixels,
                track.cumulative,
                progress,
            )
            drawTrackFrame(ctx, captured.baseImage, path, style, true)
            drawPins(
                ctx,
                captured.pins,
                elapsedSec,
                settings.durationSec,
                pinStyle,
            )
            lastProgress = progress
        }
        // Awaiting add() respects encoder backpressure and keeps the UI responsive.
        await source.add(frame / settings.fps, 1 / settings.fps)
        onProgress((frame + 1) / totalFrames)
        frame++
    }
    source.close()
    await output.finalize()
    if (target.buffer === null) {
        throw new Error('MP4 muxing produced no data')
    }
    return new Blob([target.buffer], { type: 'video/mp4' })
}
