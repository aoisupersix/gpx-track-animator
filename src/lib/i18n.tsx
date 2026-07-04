import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react'

import type { ReactNode } from 'react'

export type Lang = 'en' | 'ja'

type Vars = Record<string, string | number>

/** English is the source of truth and the fallback for missing translations. */
const en = {
    'settings.legend': 'Export settings',
    'settings.resolution': 'Output size',
    'settings.width': 'Width (px)',
    'settings.height': 'Height (px)',
    'settings.startHold': 'Hold before start (s)',
    'settings.duration': 'Animation duration (s)',
    'settings.endHold': 'Hold after finish (s)',
    'settings.fps': 'Frame rate',
    'settings.lineColor': 'Line color',
    'settings.lineWidth': 'Line width (px)',
    'settings.lineOpacity': 'Line opacity ({value})',
    'settings.pinDropHeight': 'Pin drop height (×radius)',
    'settings.pinDropSec': 'Pin drop duration (s)',
    'settings.pinBounce': 'Pin bounce ({value})',
    'settings.speedBased': 'Match recorded GPX speed',
    'settings.pauseOnStop': 'Stop animation during stops',
    'pins.legend': 'Pins',
    'pins.add': 'Add pin',
    'pins.cancel': 'Cancel',
    'pins.adding': 'Click the map to place a pin',
    'pins.empty': 'No pins yet',
    'pins.labelPlaceholder': 'Label',
    'pins.position': '{percent}%',
    'pins.delete': 'Delete pin',
    'preset.custom': 'Custom',
    'buttons.preview': 'Play preview',
    'buttons.exportPng': 'Export PNG ({width}×{height})',
    'buttons.exportMp4': 'Export MP4 (H.264 / {width}×{height})',
    'buttons.mp4Unsupported':
        'Your browser does not support H.264 encoding (WebCodecs), so MP4 export is unavailable. Please use Chrome / Edge / Safari. PNG export is available.',
    'progress.exporting': 'Exporting…',
    'progress.encoding': 'Encoding video… {percent}%',
    'fileInput.prompt': 'Drop a GPX file, or click to select',
    'map.empty': 'Load a GPX file to see the track',
    'error.parse':
        'Could not parse the GPX file. Make sure it is a valid GPX file containing a track (trk) or route (rte).',
    'error.fileLoad': 'Failed to load the file: {message}',
    'error.pngExport': 'Failed to export the image: {message}',
    'error.mp4Export': 'Failed to export the video: {message}',
} as const

export type MessageKey = keyof typeof en

const ja: Partial<Record<MessageKey, string>> = {
    'settings.legend': '書き出し設定',
    'settings.resolution': '出力サイズ',
    'settings.width': '幅（px）',
    'settings.height': '高さ（px）',
    'settings.startHold': '開始前の待機時間（秒）',
    'settings.duration': 'アニメーション時間（秒）',
    'settings.endHold': '終了後の静止時間（秒）',
    'settings.fps': 'フレームレート',
    'settings.lineColor': '線の色',
    'settings.lineWidth': '線の太さ（px）',
    'settings.lineOpacity': '線の不透明度（{value}）',
    'settings.pinDropHeight': 'ピンの落下高さ（×半径）',
    'settings.pinDropSec': 'ピンの落下時間（秒）',
    'settings.pinBounce': 'ピンの跳ね返り（{value}）',
    'settings.speedBased': 'GPXの記録速度に連動',
    'settings.pauseOnStop': '停止中はアニメーションも停止',
    'pins.legend': 'ピン',
    'pins.add': 'ピンを追加',
    'pins.cancel': 'キャンセル',
    'pins.adding': 'マップをクリックしてピンを配置',
    'pins.empty': 'ピンはまだありません',
    'pins.labelPlaceholder': 'ラベル',
    'pins.position': '{percent}%',
    'pins.delete': 'ピンを削除',
    'preset.custom': 'カスタム',
    'buttons.preview': 'プレビュー再生',
    'buttons.exportPng': 'PNG書き出し（{width}×{height}）',
    'buttons.exportMp4': 'MP4書き出し（H.264 / {width}×{height}）',
    'buttons.mp4Unsupported':
        'お使いのブラウザはH.264エンコード（WebCodecs）に未対応のため、MP4書き出しは利用できません。Chrome / Edge / Safari をご利用ください。PNG書き出しは利用できます。',
    'progress.exporting': '書き出し中…',
    'progress.encoding': '動画をエンコード中… {percent}%',
    'fileInput.prompt': 'GPXファイルをドロップ、またはクリックして選択',
    'map.empty': 'GPXファイルを読み込むと軌跡が表示されます',
    'error.parse':
        'GPXファイルを解析できませんでした。トラック（trk）またはルート（rte）を含む正しいGPXファイルか確認してください。',
    'error.fileLoad': 'ファイルの読み込みに失敗しました: {message}',
    'error.pngExport': '画像の書き出しに失敗しました: {message}',
    'error.mp4Export': '動画の書き出しに失敗しました: {message}',
}

const messages: Record<Lang, Partial<Record<MessageKey, string>>> = { en, ja }

const interpolate = (template: string, vars?: Vars): string =>
    vars === undefined
        ? template
        : template.replace(/\{(\w+)\}/g, (_, name: string) =>
              name in vars ? String(vars[name]) : `{${name}}`,
          )

export const translate = (lang: Lang, key: MessageKey, vars?: Vars): string =>
    interpolate(messages[lang][key] ?? en[key], vars)

const STORAGE_KEY = 'gpx-track-animator.lang'

const detectLang = (): Lang => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ja') {
        return stored
    }
    const candidates = navigator.languages ?? [navigator.language]
    return candidates.some((l) => l.toLowerCase().startsWith('ja'))
        ? 'ja'
        : 'en'
}

type I18nValue = {
    lang: Lang
    setLang: (lang: Lang) => void
    t: (key: MessageKey, vars?: Vars) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export const I18nProvider = ({ children }: { children: ReactNode }) => {
    const [lang, setLangState] = useState<Lang>(detectLang)

    const setLang = useCallback((next: Lang): void => {
        setLangState(next)
        localStorage.setItem(STORAGE_KEY, next)
    }, [])

    useEffect(() => {
        document.documentElement.lang = lang
    }, [lang])

    const value = useMemo<I18nValue>(
        () => ({
            lang,
            setLang,
            t: (key, vars) => translate(lang, key, vars),
        }),
        [lang, setLang],
    )

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export const useI18n = (): I18nValue => {
    const value = useContext(I18nContext)
    if (value === null) {
        throw new Error('useI18n must be used within an I18nProvider')
    }
    return value
}
