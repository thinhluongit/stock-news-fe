interface VideoToolData {
  url?: string;
}

interface VideoToolConfig {
  uploadUrl: string;
  getToken: () => string | null;
}

export default class VideoTool {
  private data: VideoToolData;
  private config: VideoToolConfig;
  private readOnly: boolean;
  private wrapper: HTMLElement | null = null;

  static get toolbox() {
    return {
      title: 'Video',
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
    };
  }

  static get isReadOnlySupported() {
    return true;
  }

  constructor({ data, config, api }: {
    data: VideoToolData;
    config: VideoToolConfig;
    api: { readOnly: { isEnabled: boolean } };
  }) {
    this.data = data ?? {};
    this.config = config;
    this.readOnly = api.readOnly.isEnabled;
  }

  render(): HTMLElement {
    this.wrapper = document.createElement('div');
    this.wrapper.style.margin = '0.5rem 0';

    if (this.data.url) {
      this._renderVideo(this.data.url);
    } else if (!this.readOnly) {
      this._renderUploader();
    } else {
      const p = document.createElement('p');
      p.textContent = '[Video not available]';
      p.style.cssText = 'color:#6b7280;font-style:italic;font-size:0.875rem';
      this.wrapper.appendChild(p);
    }

    return this.wrapper;
  }

  private _renderVideo(url: string): void {
    if (!this.wrapper) return;
    this.wrapper.innerHTML = '';
    const video = document.createElement('video');
    video.src = url;
    video.controls = true;
    video.style.cssText = 'max-width:100%;border-radius:0.5rem';
    this.wrapper.appendChild(video);
  }

  private _renderUploader(): void {
    if (!this.wrapper) return;
    this.wrapper.innerHTML = '';

    const label = document.createElement('label');
    label.style.cssText = 'display:inline-flex;align-items:center;gap:0.5rem;padding:0.5rem 1rem;cursor:pointer;border:1px dashed #4b5563;border-radius:0.5rem;font-size:0.875rem;color:#9ca3af';
    label.textContent = 'Upload video (MP4 or WebM, max 50 MB)';

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/mp4,video/webm';
    input.style.display = 'none';

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;

      label.textContent = 'Uploading…';

      try {
        const form = new FormData();
        form.append('image', file); // /upload expects field name "image" for all media
        const token = this.config.getToken();
        const res = await fetch(this.config.uploadUrl, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        const json = await res.json() as { success: number; file: { url: string } };
        if (json.success && json.file?.url) {
          this.data = { url: json.file.url };
          this._renderVideo(json.file.url);
        } else {
          label.textContent = 'Upload failed. Try again.';
          label.style.color = '#f87171';
        }
      } catch {
        label.textContent = 'Upload failed. Try again.';
        label.style.color = '#f87171';
      }
    });

    label.appendChild(input);
    this.wrapper.appendChild(label);
  }

  save(): VideoToolData {
    return { url: this.data.url };
  }
}
