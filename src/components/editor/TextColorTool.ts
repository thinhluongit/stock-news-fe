const COLORS: { label: string; value: string }[] = [
  { label: 'White',      value: '#FFFFFF' },
  { label: 'Silver',     value: '#D1D5DB' },
  { label: 'Gray',       value: '#6B7280' },
  { label: 'Black',      value: '#111827' },
  { label: 'Red',        value: '#EF4444' },
  { label: 'Orange',     value: '#F97316' },
  { label: 'Yellow',     value: '#EAB308' },
  { label: 'Green',      value: '#22C55E' },
  { label: 'Teal',       value: '#14B8A6' },
  { label: 'Sky',        value: '#38BDF8' },
  { label: 'Blue',       value: '#3B82F6' },
  { label: 'Indigo',     value: '#6366F1' },
  { label: 'Purple',     value: '#A855F7' },
  { label: 'Pink',       value: '#EC4899' },
  { label: 'Rose',       value: '#F43F5E' },
];

// Light colours that need a border so they're visible on the dark palette background
const LIGHT = new Set(['#FFFFFF', '#D1D5DB', '#EAB308']);

export default class TextColorTool {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private api: any;
  private button: HTMLButtonElement | null = null;
  private palette: HTMLElement | null = null;
  private savedRange: Range | null = null;
  private outsideListener: ((e: MouseEvent) => void) | null = null;

  static get isInline() { return true; }
  static get title()    { return 'Text Color'; }

  // Tell EditorJS to preserve <span style="…"> when saving blocks
  static get sanitize() {
    return { span: { style: true } };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor({ api }: { api: any }) {
    this.api = api;
  }

  // ─── EditorJS lifecycle ──────────────────────────────────────────────────

  render(): HTMLButtonElement {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.classList.add(this.api.styles.inlineToolButton);
    this.button.title = 'Text Color';
    this.setButtonBar('');
    return this.button;
  }

  surround(range: Range): void {
    this.savedRange = range;
    const palette = this.buildPalette();
    if (palette.style.display === 'grid') {
      this.closePalette();
    } else {
      this.openPalette();
    }
  }

  checkState(selection: Selection): boolean {
    const anchor = selection?.anchorNode;
    if (!anchor) { this.setButtonBar(''); return false; }

    const el = anchor.nodeType === Node.TEXT_NODE
      ? anchor.parentElement
      : (anchor as Element);
    const span = this.findColorSpan(el);

    if (span) {
      this.setButtonBar(span.style.color);
      return true;
    }
    this.setButtonBar('');
    return false;
  }

  // ─── Palette ─────────────────────────────────────────────────────────────

  private buildPalette(): HTMLElement {
    if (this.palette) return this.palette;

    const el = document.createElement('div');
    el.setAttribute('data-text-color-palette', 'true');
    el.style.cssText = [
      'position:fixed',
      'z-index:99999',
      'display:none',
      'grid-template-columns:repeat(4,28px)',
      'gap:5px',
      'padding:10px',
      'background:#1f2937',
      'border:1px solid #374151',
      'border-radius:10px',
      'box-shadow:0 6px 28px rgba(0,0,0,0.65)',
    ].join(';');

    COLORS.forEach(({ label, value }) => {
      el.appendChild(this.makeSwatch(label, value));
    });
    el.appendChild(this.makeRemoveButton());

    document.body.appendChild(el);
    this.palette = el;
    return el;
  }

  private makeSwatch(label: string, value: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = label;
    btn.style.cssText = [
      `background:${value}`,
      'width:28px',
      'height:28px',
      'border-radius:50%',
      `border:2px solid ${LIGHT.has(value) ? '#4B5563' : 'transparent'}`,
      'cursor:pointer',
      'padding:0',
      'outline:none',
      'transition:transform 0.12s ease,border-color 0.12s ease',
    ].join(';');

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.2)';
      btn.style.borderColor = 'rgba(255,255,255,0.55)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.borderColor = LIGHT.has(value) ? '#4B5563' : 'transparent';
    });
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.applyColor(value);
    });
    return btn;
  }

  private makeRemoveButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.title = 'Remove colour';
    btn.textContent = '✕';
    btn.style.cssText = [
      'width:28px',
      'height:28px',
      'border-radius:50%',
      'border:2px solid #4B5563',
      'background:transparent',
      'cursor:pointer',
      'font-size:11px',
      'color:#9CA3AF',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:0',
      'outline:none',
      'transition:transform 0.12s ease,border-color 0.12s ease',
    ].join(';');
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.2)';
      btn.style.borderColor = '#9CA3AF';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
      btn.style.borderColor = '#4B5563';
    });
    btn.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.removeColor();
    });
    return btn;
  }

  private openPalette(): void {
    const palette = this.buildPalette();
    if (!this.button) return;

    const rect = this.button.getBoundingClientRect();
    palette.style.top  = `${rect.bottom + 6}px`;
    palette.style.left = `${rect.left}px`;
    palette.style.display = 'grid';

    // Prevent the palette from overflowing the right edge of the viewport
    requestAnimationFrame(() => {
      if (!this.palette) return;
      const pr = this.palette.getBoundingClientRect();
      if (pr.right > window.innerWidth - 8) {
        this.palette.style.left = `${window.innerWidth - pr.width - 8}px`;
      }
    });

    // Close when clicking anywhere outside the palette
    this.outsideListener = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!palette.contains(t) && t !== this.button) {
        this.closePalette();
      }
    };
    setTimeout(() => {
      if (this.outsideListener) {
        document.addEventListener('mousedown', this.outsideListener);
      }
    }, 0);
  }

  private closePalette(): void {
    if (this.palette) this.palette.style.display = 'none';
    if (this.outsideListener) {
      document.removeEventListener('mousedown', this.outsideListener);
      this.outsideListener = null;
    }
    this.savedRange = null;
  }

  // ─── Colour application ───────────────────────────────────────────────────

  private applyColor(color: string): void {
    this.restoreRange();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) { this.closePalette(); return; }

    const range = sel.getRangeAt(0);
    const existing = this.findColorSpan(
      range.commonAncestorContainer.nodeType === Node.TEXT_NODE
        ? range.commonAncestorContainer.parentElement
        : (range.commonAncestorContainer as Element)
    );

    if (existing) {
      // Update the colour of an already-coloured span in-place
      existing.style.color = color;
    } else {
      const span = document.createElement('span');
      span.style.color = color;
      try {
        // Simple case: selection doesn't cross element boundaries
        range.surroundContents(span);
      } catch {
        // Cross-element selection: extract → wrap → reinsert
        span.appendChild(range.extractContents());
        range.insertNode(span);
      }
      // Move caret to end of new span
      const next = document.createRange();
      next.setStartAfter(span);
      next.collapse(true);
      sel.removeAllRanges();
      sel.addRange(next);
    }

    this.closePalette();
    try { this.api.inlineToolbar.close(); } catch { /* tolerate missing API */ }
  }

  private removeColor(): void {
    this.restoreRange();
    const sel = window.getSelection();
    if (!sel) { this.closePalette(); return; }

    const anchor = sel.anchorNode;
    const el = anchor
      ? (anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : anchor as Element)
      : null;
    const span = this.findColorSpan(el);

    if (span) {
      const parent = span.parentNode!;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    }

    this.closePalette();
    try { this.api.inlineToolbar.close(); } catch { /* tolerate missing API */ }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private restoreRange(): void {
    if (!this.savedRange) return;
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(this.savedRange);
    }
  }

  private findColorSpan(el: Element | null): HTMLElement | null {
    const BLOCK_TAGS = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE']);
    let cur: Element | null = el;
    while (cur) {
      if (cur.tagName === 'SPAN' && (cur as HTMLElement).style.color) {
        return cur as HTMLElement;
      }
      if (BLOCK_TAGS.has(cur.tagName)) break;
      cur = cur.parentElement;
    }
    return null;
  }

  private setButtonBar(color: string): void {
    if (!this.button) return;
    const bar = color || 'rgba(255,255,255,0.25)';
    const border = color ? 'none' : '1px solid rgba(255,255,255,0.2)';
    this.button.innerHTML =
      `<span style="display:inline-flex;flex-direction:column;align-items:center;gap:2px;pointer-events:none">` +
      `<span style="font-weight:800;font-size:13px;line-height:1">A</span>` +
      `<span style="width:14px;height:3px;background:${bar};border-radius:1px;border:${border}"></span>` +
      `</span>`;
  }
}
