import type { RenderSettings } from '../types'
import type { ChangeEvent } from 'react'

type Props = {
    settings: RenderSettings
    disabled: boolean
    onChange: (settings: RenderSettings) => void
}

const applyNumber = (
    event: ChangeEvent<HTMLInputElement>,
    apply: (value: number) => void,
): void => {
    const value = event.target.valueAsNumber
    if (Number.isFinite(value)) {
        apply(value)
    }
}

export const SettingsForm = ({ settings, disabled, onChange }: Props) => {
    const update = (patch: Partial<RenderSettings>): void => {
        onChange({ ...settings, ...patch })
    }

    return (
        <fieldset className="settings" disabled={disabled}>
            <legend>書き出し設定</legend>
            <label>
                アニメーション時間（秒）
                <input
                    type="number"
                    min={0.5}
                    max={60}
                    step={0.1}
                    value={settings.durationSec}
                    onChange={(event) =>
                        applyNumber(event, (durationSec) =>
                            update({ durationSec }),
                        )
                    }
                />
            </label>
            <label>
                終了後の静止時間（秒）
                <input
                    type="number"
                    min={0}
                    max={10}
                    step={0.1}
                    value={settings.endHoldSec}
                    onChange={(event) =>
                        applyNumber(event, (endHoldSec) =>
                            update({ endHoldSec }),
                        )
                    }
                />
            </label>
            <label>
                フレームレート
                <select
                    value={settings.fps}
                    onChange={(event) =>
                        update({ fps: event.target.value === '30' ? 30 : 60 })
                    }
                >
                    <option value="60">60 fps</option>
                    <option value="30">30 fps</option>
                </select>
            </label>
            <label>
                線の色
                <input
                    type="color"
                    value={settings.lineColor}
                    onChange={(event) =>
                        update({ lineColor: event.target.value })
                    }
                />
            </label>
            <label>
                線の太さ（px）
                <input
                    type="number"
                    min={1}
                    max={50}
                    step={1}
                    value={settings.lineWidth}
                    onChange={(event) =>
                        applyNumber(event, (lineWidth) => update({ lineWidth }))
                    }
                />
            </label>
            <label>
                線の不透明度（{settings.lineOpacity.toFixed(2)}）
                <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={settings.lineOpacity}
                    onChange={(event) =>
                        applyNumber(event, (lineOpacity) =>
                            update({ lineOpacity }),
                        )
                    }
                />
            </label>
        </fieldset>
    )
}
