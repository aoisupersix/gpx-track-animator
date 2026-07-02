import {
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    canEncodeVideo,
} from 'mediabunny'

import {
    EXPORT_HEIGHT,
    EXPORT_WIDTH,
    H264_CODEC_STRING,
    VIDEO_BITRATE,
} from './constants'
import { partialPath } from './pixel-path'
import {
    createFrameContext,
    drawTrackFrame,
    toFrameStyle,
} from './track-renderer'

import type { RenderSettings, Track } from '../types'
import type { CapturedMap } from './map-capture'

/**
 * Probes actual encoder support instead of trusting isConfigSupported();
 * Firefox currently cannot encode H.264 via WebCodecs.
 */
export const isH264EncodeSupported = (): Promise<boolean> =>
    canEncodeVideo('avc', {
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        bitrate: VIDEO_BITRATE,
    })

/**
 * Encodes the track animation as an H.264 MP4. The track grows from start to
 * end over `durationSec` at constant geographic speed, then the full track
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
    const target = new BufferTarget()
    const output = new Output({ format: new Mp4OutputFormat(), target })
    const source = new CanvasSource(ctx.canvas, {
        codec: 'avc',
        bitrate: VIDEO_BITRATE,
        fullCodecString: H264_CODEC_STRING,
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
    let lastProgress = -1
    for (let frame = 0; frame < totalFrames; frame++) {
        const progress = Math.min(frame / (animationFrames - 1), 1)
        if (progress !== lastProgress) {
            const path = partialPath(
                captured.pixels,
                track.cumulative,
                progress,
            )
            drawTrackFrame(ctx, captured.baseImage, path, style, true)
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
