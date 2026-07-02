import type { PixelPoint, RenderSettings } from '../types'

export type FrameStyle = {
    color: string
    opacity: number
    width: number
}

const ATTRIBUTION_TEXT = '© OpenStreetMap contributors'
const ATTRIBUTION_FONT_PX = 22
const ATTRIBUTION_PADDING_PX = 8

export const toFrameStyle = (settings: RenderSettings): FrameStyle => ({
    color: settings.lineColor,
    opacity: settings.lineOpacity,
    width: settings.lineWidth,
})

/** Creates a 2D context on a fresh canvas of the given size. */
export const createFrameContext = (
    width: number,
    height: number,
): CanvasRenderingContext2D => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (ctx === null) {
        throw new Error('Failed to create a 2D canvas context')
    }
    return ctx
}

/**
 * Draws a single frame: the base map image (or a cleared transparent
 * background when `base` is null), the given portion of the track, and
 * optionally the OSM attribution box (which assumes an identity transform).
 * The path is stroked once as a single Path2D so a semi-transparent line
 * keeps uniform opacity where segments overlap or cross.
 */
export const drawTrackFrame = (
    ctx: CanvasRenderingContext2D,
    base: ImageBitmap | null,
    path: PixelPoint[],
    style: FrameStyle,
    withAttribution: boolean,
): void => {
    ctx.save()
    try {
        if (base === null) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
        } else {
            ctx.drawImage(base, 0, 0)
        }
        ctx.globalAlpha = style.opacity
        ctx.strokeStyle = style.color
        ctx.fillStyle = style.color
        const first = path[0]
        if (path.length >= 2 && first !== undefined) {
            const line = new Path2D()
            line.moveTo(first.x, first.y)
            for (const point of path.slice(1)) {
                line.lineTo(point.x, point.y)
            }
            ctx.lineWidth = style.width
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.stroke(line)
        } else if (first !== undefined) {
            // A single point (animation start) is drawn as a round dot.
            ctx.beginPath()
            ctx.arc(first.x, first.y, style.width / 2, 0, Math.PI * 2)
            ctx.fill()
        }
        if (withAttribution) {
            drawAttribution(ctx)
        }
    } finally {
        ctx.restore()
    }
}

const drawAttribution = (ctx: CanvasRenderingContext2D): void => {
    const { width, height } = ctx.canvas
    ctx.globalAlpha = 1
    ctx.font = `${ATTRIBUTION_FONT_PX}px sans-serif`
    const textWidth = ctx.measureText(ATTRIBUTION_TEXT).width
    const boxWidth = textWidth + ATTRIBUTION_PADDING_PX * 2
    const boxHeight = ATTRIBUTION_FONT_PX + ATTRIBUTION_PADDING_PX * 2
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.fillRect(width - boxWidth, height - boxHeight, boxWidth, boxHeight)
    ctx.fillStyle = '#333333'
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    ctx.fillText(
        ATTRIBUTION_TEXT,
        width - boxWidth + ATTRIBUTION_PADDING_PX,
        height - boxHeight / 2,
    )
}
