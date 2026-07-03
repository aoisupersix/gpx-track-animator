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
import type { CapturedMap } from './map-capture'

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
 * Encodes the track animation as an H.264 MP4. The track grows from start to
 * end over `durationSec` — at constant geographic speed, or following the
 * recorded GPX pace when `settings.speedBased` is on — then the full track
 * stays visible for `endHoldSec`.
 */
export const renderMp4Blob = async (
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
    const animationFrames = Math.max(
        Math.round(settings.durationSec * settings.fps),
        2,
    )
    const holdFrames = Math.round(settings.endHoldSec * settings.fps)
    const totalFrames = animationFrames + holdFrames
    const style = toFrameStyle(settings)
    const pinStyle = toPinStyle(settings)
    let lastProgress = -1
    for (let frame = 0; frame < totalFrames; frame++) {
        const animFraction = Math.min(frame / (animationFrames - 1), 1)
        const progress = headDistanceFraction(
            track,
            settings.speedBased,
            settings.pauseOnStop,
            animFraction,
        )
        const elapsedSec = frame / settings.fps
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
    }
    source.close()
    await output.finalize()
    if (target.buffer === null) {
        throw new Error('MP4 muxing produced no data')
    }
    return new Blob([target.buffer], { type: 'video/mp4' })
}
