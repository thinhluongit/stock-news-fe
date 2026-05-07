# i18n Multi-Language Expansion Report

**Date:** 2026-04-23  
**Feature:** Added French, Chinese, Korean, and Japanese language support with flag-based language switcher

---

## Summary

Expanded the localization system from 2 languages (EN, VI) to 6 languages and replaced the text-based toggle button with a flag dropdown in both the public Header and the Admin panel.

---

## Changes Made

### New Files

| File | Description |
|------|-------------|
| `src/i18n/locales/fr.json` | French translations — 191 keys |
| `src/i18n/locales/zh.json` | Chinese Simplified translations — 191 keys |
| `src/i18n/locales/ko.json` | Korean translations — 191 keys |
| `src/i18n/locales/ja.json` | Japanese translations — 191 keys |
| `src/components/ui/LanguageSwitcher.tsx` | Reusable flag dropdown component |

### Modified Files

| File | Change |
|------|--------|
| `src/i18n/LocaleContext.tsx` | Added `fr`, `zh`, `ko`, `ja` imports and types; exported `LOCALES` metadata array; widened localStorage validation |
| `src/components/layout/Header.tsx` | Replaced text toggle button with `<LanguageSwitcher />` |
| `src/app/admin/layout.tsx` | Replaced text toggle button with `<LanguageSwitcher />` |

---

## Language Coverage

| Code | Language | Flag | Native Name |
|------|----------|------|-------------|
| `en` | English | 🇺🇸 | English |
| `vi` | Vietnamese | 🇻🇳 | Tiếng Việt |
| `fr` | French | 🇫🇷 | Français |
| `zh` | Chinese (Simplified) | 🇨🇳 | 中文 |
| `ko` | Korean | 🇰🇷 | 한국어 |
| `ja` | Japanese | 🇯🇵 | 日本語 |

---

## Architecture

### `LOCALES` export (`LocaleContext.tsx`)

A typed array exported from the context module. Each entry has `code`, `flag`, and `name`. This is the single source of truth — adding a new language only requires adding a new entry here plus its JSON file.

```ts
export const LOCALES: { code: Locale; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
  { code: 'zh', flag: '🇨🇳', name: '中文' },
  { code: 'ko', flag: '🇰🇷', name: '한국어' },
  { code: 'ja', flag: '🇯🇵', name: '日本語' },
];
```

### `LanguageSwitcher` component (`src/components/ui/LanguageSwitcher.tsx`)

- Shows the current language's flag emoji as the trigger button
- Chevron rotates when open
- Dropdown lists all 6 languages — each row has flag + native name
- Active language highlighted in green
- Outside-click closes the dropdown
- Reused in both Header and Admin layout (single component, no duplication)

### localStorage compatibility

The saved locale key is validated against `VALID_LOCALES` (derived from `LOCALES`), so previously saved `'en'` or `'vi'` values continue to work without migration.

---

## Translation Scope

All 191 keys translated for each new language, covering:

- Navigation labels and search placeholder
- Home, featured, news list, sidebar
- Stocks table and market page
- Auth (login + register) — including all error messages
- Full admin panel (dashboard, users, posts, categories, stocks, actions, filters)
- Footer (description, navigation, topics, disclaimer)

---

## How to Add Another Language

1. Create `src/i18n/locales/<code>.json` with all 191 keys translated
2. Import it in `LocaleContext.tsx` and add it to `messages`
3. Add a new entry to the `LOCALES` array with `code`, `flag`, and `name`
4. Extend the `Locale` union type

No changes needed to `LanguageSwitcher`, `Header`, or `AdminLayout`.
