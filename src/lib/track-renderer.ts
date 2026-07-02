import type { PixelPoint, RenderSettings } from '../types'

export type FrameStyle = {
    color: string
    opacity: number
    width: number
}

/** A pin resolved to canvas pixel coordinates, ready to draw. */
export type PinRender = {
    pixel: PixelPoint
    progress: number
    label: string
}

export type PinStyle = {
    /** Radius of the pin's round head in pixels. */
    radius: number
    /** Fill color of the pin body. */
    color: string
    /** Label font size in pixels. */
    fontPx: number
    /** Drop-in start offset above the resting position, in pixels. */
    dropHeight: number
    /** Drop-in duration in seconds. */
    animSec: number
    /** Landing bounce amount (0..1). */
    bounce: number
}

const ATTRIBUTION_TEXT = '© OpenStreetMap contributors'
const ATTRIBUTION_FONT_PX = 22
const ATTRIBUTION_PADDING_PX = 8

export const toFrameStyle = (settings: RenderSettings): FrameStyle => ({
    color: settings.lineColor,
    opacity: settings.lineOpacity,
    width: settings.lineWidth,
})

/** Pin dimensions scale with the line width so they stay proportional. */
export const toPinStyle = (settings: RenderSettings): PinStyle => {
    const radius = Math.max(settings.lineWidth * 1.4, 8)
    return {
        radius,
        color: settings.lineColor,
        fontPx: Math.max(settings.lineWidth * 2.2, 16),
        dropHeight: radius * Math.max(settings.pinDropHeight, 0),
        // Clamp above zero so the animation timeline never divides by zero.
        animSec: Math.max(settings.pinDropSec, 0.01),
        bounce: Math.min(Math.max(settings.pinBounce, 0), 1),
    }
}

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

/** Ratio of the pin height (tip to head center) to the head radius. */
const PIN_TIP_RATIO = 2.4

/** Fraction of the animation spent fading in. */
const PIN_FADE_PORTION = 0.35

/** Elapsed time (seconds) at which a pin's drop-in animation begins. */
const pinAppearSec = (pin: PinRender, durationSec: number): number =>
    pin.progress * durationSec

/** True while any pin's drop-in animation is still playing at `elapsedSec`. */
export const anyPinAnimating = (
    pins: PinRender[],
    elapsedSec: number,
    durationSec: number,
    animSec: number,
): boolean =>
    pins.some((pin) => {
        const t = elapsedSec - pinAppearSec(pin, durationSec)
        return t >= 0 && t < animSec
    })

/** Smooth deceleration used when the bounce amount is zero. */
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)

/** Bounce easing so a dropped pin settles with a rebound. */
const easeOutBounce = (t: number): number => {
    const n1 = 7.5625
    const d1 = 2.75
    if (t < 1 / d1) {
        return n1 * t * t
    }
    if (t < 2 / d1) {
        const u = t - 1.5 / d1
        return n1 * u * u + 0.75
    }
    if (t < 2.5 / d1) {
        const u = t - 2.25 / d1
        return n1 * u * u + 0.9375
    }
    const u = t - 2.625 / d1
    return n1 * u * u + 0.984375
}

/** Blends smooth and bounce easing by `bounce` (0..1); both settle at 1. */
const dropEase = (t: number, bounce: number): number =>
    easeOutCubic(t) * (1 - bounce) + easeOutBounce(t) * bounce

/**
 * Draws teardrop pins whose position the animation head has reached by
 * `elapsedSec`. Each pin drops in and fades over `style.animSec` once the head
 * passes it. Pass `Infinity` for a static, fully-settled rendering. Must be
 * called after {@link drawTrackFrame} so pins sit above the track.
 */
export const drawPins = (
    ctx: CanvasRenderingContext2D,
    pins: PinRender[],
    elapsedSec: number,
    durationSec: number,
    style: PinStyle,
): void => {
    for (const pin of pins) {
        const t = (elapsedSec - pinAppearSec(pin, durationSec)) / style.animSec
        // Skip pins the head has not reached yet.
        if (t <= 0) {
            continue
        }
        const progress = Math.min(t, 1)
        const alpha = Math.min(progress / PIN_FADE_PORTION, 1)
        const drop = (1 - dropEase(progress, style.bounce)) * style.dropHeight
        ctx.save()
        try {
            ctx.globalAlpha = alpha
            ctx.translate(0, -drop)
            drawPinMarker(ctx, pin.pixel, style)
            if (pin.label !== '') {
                drawPinLabel(ctx, pin.pixel, pin.label, style)
            }
        } finally {
            ctx.restore()
        }
    }
}

const drawPinMarker = (
    ctx: CanvasRenderingContext2D,
    tip: PixelPoint,
    style: PinStyle,
): void => {
    const r = style.radius
    const centerY = tip.y - r * PIN_TIP_RATIO
    const beta = Math.acos(1 / PIN_TIP_RATIO)
    const sin = Math.sin(beta)
    const cos = Math.cos(beta)
    // Tangent points where the round head meets the straight sides of the tip.
    const leftAngle = Math.atan2(cos, -sin)
    const rightAngle = Math.atan2(cos, sin)
    ctx.beginPath()
    ctx.moveTo(tip.x, tip.y)
    ctx.lineTo(tip.x - r * sin, centerY + r * cos)
    // false sweeps over the top of the head from the left tangent to the right.
    ctx.arc(tip.x, centerY, r, leftAngle, rightAngle, false)
    ctx.closePath()
    ctx.fillStyle = style.color
    ctx.fill()
    ctx.lineWidth = Math.max(r * 0.18, 1.5)
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(tip.x, centerY, r * 0.42, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
}

const drawPinLabel = (
    ctx: CanvasRenderingContext2D,
    tip: PixelPoint,
    label: string,
    style: PinStyle,
): void => {
    const r = style.radius
    const centerY = tip.y - r * PIN_TIP_RATIO
    ctx.font = `${style.fontPx}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const padX = style.fontPx * 0.4
    const padY = style.fontPx * 0.3
    const boxWidth = ctx.measureText(label).width + padX * 2
    const boxHeight = style.fontPx + padY * 2
    const boxX = tip.x + r
    const boxY = centerY - boxHeight / 2
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
    ctx.beginPath()
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, padY)
    ctx.fill()
    ctx.fillStyle = '#222222'
    ctx.fillText(label, boxX + padX, centerY)
}
