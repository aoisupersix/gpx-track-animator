import {
    createFrameContext,
    drawPins,
    drawTrackFrame,
    toFrameStyle,
    toPinStyle,
} from './track-renderer'

import type { RenderSettings } from '../types'
import type { CapturedMap } from './map-capture'

/** Renders the full track over the captured base map as a PNG blob. */
export const renderPngBlob = (
    captured: CapturedMap,
    settings: RenderSettings,
): Promise<Blob> => {
    const ctx = createFrameContext(
        captured.baseImage.width,
        captured.baseImage.height,
    )
    drawTrackFrame(
        ctx,
        captured.baseImage,
        captured.pixels,
        toFrameStyle(settings),
        true,
    )
    drawPins(
        ctx,
        captured.pins,
        Infinity,
        settings.durationSec,
        toPinStyle(settings),
    )
    return new Promise((resolve, reject) => {
        ctx.canvas.toBlob((blob) => {
            if (blob === null) {
                reject(new Error('PNG encoding failed'))
            } else {
                resolve(blob)
            }
        }, 'image/png')
    })
}
