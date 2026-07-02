import { useI18n } from '../lib/i18n'

import type { Lang } from '../lib/i18n'

const LABELS: Record<Lang, string> = {
    en: 'English',
    ja: '日本語',
}

export const LanguageSwitcher = () => {
    const { lang, setLang } = useI18n()

    return (
        <label className="language-switcher">
            <span className="visually-hidden">Language</span>
            <select
                value={lang}
                onChange={(event) => setLang(event.target.value as Lang)}
            >
                {(Object.keys(LABELS) as Lang[]).map((value) => (
                    <option key={value} value={value}>
                        {LABELS[value]}
                    </option>
                ))}
            </select>
        </label>
    )
}
