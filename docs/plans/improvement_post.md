# Plan: Rich Inline Formatting for Post Editor

## Context

The post writing page already uses EditorJS v2 (block-based), so flexible multi-block structure (paragraph → image → paragraph → video, etc.) already works. What was missing:

1. **Inline toolbar not exposed for most blocks.** Bold and italic are built into EditorJS but `inlineToolbar` was only set on `list` and `quote` — paragraph and header blocks had no formatting toolbar.
2. **Underline not installed.** Needed `@editorjs/underline`.
3. **Color selection not installed.** Needed `editorjs-text-color-plugin` (text color + background highlight + custom color picker).
4. **Video blocks not rendered** on the public side. `editorjs-renderer.ts` had no `video` case and returned `""`.
5. **Delimiter block not available** even though the renderer already handled it.

## Changes Made

### Packages installed
```
@editorjs/underline
@editorjs/delimiter
editorjs-text-color-plugin
```

### Files modified

| File | Change |
|---|---|
| `src/components/editor/EditorBlock.tsx` | Added `inlineToolbar` globally; registered `underline`, `delimiter`, `textColor` tools |
| `src/lib/editorjs-renderer.ts` | Added `video` case to `renderBlock` |
| `src/types/editorjs-text-color-plugin.d.ts` | Type shim for untyped community package |

### Inline toolbar (global — applies to paragraph, header, list, quote, etc.)
```
Bold · Italic · Underline · Color · Link
```

### Color tool config
- 11 preset colours including brand green `#22c55e`
- `type: 'text and background'` — both text colour and highlight tabs
- `customPicker: true` — hex/rgb input beyond presets

### Block tools available in editor
paragraph (default), header (H2/H3/H4), list, quote, image, embed, video, **delimiter** (new)

## Notes

- `editorjs-text-color-plugin` stores colour as inline `<span style="color:…">` / `<mark style="background:…">` inside the `text` field. The renderer passes this through automatically via raw HTML output — no renderer change needed for colour.
- `@editorjs/underline` stores underline as `<u>` tags, also passed through by the renderer.
- The `video` renderer fix is independent of the inline formatting work but was a pre-existing gap.
