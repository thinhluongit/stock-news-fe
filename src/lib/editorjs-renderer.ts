/**
 * Converts EditorJS OutputData JSON (stored as a string) to an HTML string
 * suitable for use with dangerouslySetInnerHTML.
 *
 * Block types handled: paragraph, header, list, quote, image, embed, delimiter.
 * Falls back to rendering the raw string if the input is not valid EditorJS JSON.
 */

interface EditorBlock {
  id?: string;
  type: string;
  data: Record<string, unknown>;
}

interface EditorData {
  time?: number;
  version?: string;
  blocks: EditorBlock[];
}

function renderBlock(block: EditorBlock): string {
  const { type, data } = block;

  switch (type) {
    case 'paragraph': {
      const text = (data.text as string) ?? '';
      return `<p>${text}</p>`;
    }

    case 'header': {
      const text  = (data.text as string) ?? '';
      const level = (data.level as number) ?? 2;
      const tag   = `h${Math.min(Math.max(level, 1), 6)}`;
      return `<${tag}>${text}</${tag}>`;
    }

    case 'list': {
      const items   = (data.items as string[]) ?? [];
      const ordered = (data.style as string) === 'ordered';
      const tag     = ordered ? 'ol' : 'ul';
      const lis     = items.map((item) => `<li>${item}</li>`).join('');
      return `<${tag}>${lis}</${tag}>`;
    }

    case 'quote': {
      const text    = (data.text as string) ?? '';
      const caption = (data.caption as string) ?? '';
      const cite    = caption ? `<cite>— ${caption}</cite>` : '';
      return `<blockquote>${text}${cite}</blockquote>`;
    }

    case 'image': {
      const file      = (data.file as { url?: string }) ?? {};
      const url       = file.url ?? (data.url as string) ?? '';
      const caption   = (data.caption as string) ?? '';
      const stretched = data.stretched ? ' image--stretched' : '';
      const withBg    = data.withBackground ? ' image--with-background' : '';
      const withBorder = data.withBorder ? ' image--with-border' : '';
      const figcaption = caption ? `<figcaption>${caption}</figcaption>` : '';
      return `<figure class="image${stretched}${withBg}${withBorder}"><img src="${url}" alt="${caption}" loading="lazy" />${figcaption}</figure>`;
    }

    case 'embed': {
      const src     = (data.embed as string) ?? '';
      const caption = (data.caption as string) ?? '';
      const width   = (data.width as number) ?? 560;
      const height  = (data.height as number) ?? 315;
      const figcaption = caption ? `<figcaption>${caption}</figcaption>` : '';
      return `<figure class="embed"><iframe src="${src}" width="${width}" height="${height}" frameborder="0" allowfullscreen loading="lazy"></iframe>${figcaption}</figure>`;
    }

    case 'delimiter':
      return '<hr />';

    default:
      return '';
  }
}

export function renderEditorContent(content: string | null | undefined): string {
  if (!content) return '';

  // Try to parse as EditorJS JSON
  try {
    const parsed = JSON.parse(content) as EditorData;
    if (parsed && Array.isArray(parsed.blocks)) {
      return parsed.blocks.map(renderBlock).join('\n');
    }
  } catch {
    // Not JSON — fall through to return as-is (legacy plain HTML content)
  }

  return content;
}
