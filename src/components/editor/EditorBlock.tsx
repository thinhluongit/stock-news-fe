'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type EditorJSClass from '@editorjs/editorjs';
import type { OutputData } from '@editorjs/editorjs';

export interface EditorBlockRef {
  save(): Promise<OutputData>;
}

interface Props {
  data?: OutputData;
  readOnly?: boolean;
}

const EditorBlock = forwardRef<EditorBlockRef, Props>(({ data, readOnly = false }, ref) => {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorJSClass | null>(null);

  useImperativeHandle(ref, () => ({
    async save() {
      if (!editorRef.current) throw new Error('Editor not ready');
      return editorRef.current.save();
    },
  }));

  useEffect(() => {
    if (!holderRef.current || editorRef.current) return;

    Promise.all([
      import('@editorjs/editorjs'),
      import('@editorjs/header'),
      import('@editorjs/list'),
      import('@editorjs/quote'),
      import('@editorjs/image'),
      import('@editorjs/embed'),
    ]).then(([
      { default: EditorJS },
      { default: Header },
      { default: List },
      { default: Quote },
      { default: ImageTool },
      { default: Embed },
    ]) => {
      if (!holderRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editorRef.current = new EditorJS({
        holder: holderRef.current,
        data,
        readOnly,
        tools: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          header: { class: Header as any, config: { levels: [2, 3, 4], defaultLevel: 2 } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          list: { class: List as any, inlineToolbar: true },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          quote: { class: Quote as any, inlineToolbar: true },
          image: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class: ImageTool as any,
            config: {
              uploader: {
                uploadByFile: async (file: File) => {
                  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                  const form = new FormData();
                  form.append('image', file);
                  const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'}/upload`,
                    {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: form,
                    }
                  );
                  return res.json();
                },
              },
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          embed: { class: Embed as any },
        },
        placeholder: 'Start writing your article…',
      });
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.isReady
          .then(() => { editorRef.current?.destroy(); editorRef.current = null; })
          .catch(() => { editorRef.current = null; });
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={holderRef}
      className={`min-h-[400px] bg-gray-800 border rounded-lg px-3 py-2 text-white transition-colors [&_.ce-block\_\_content]:max-w-none [&_.codex-editor\_\_redactor]:pb-8 ${
        readOnly
          ? 'border-gray-700 opacity-60 pointer-events-none'
          : 'border-gray-700 focus-within:border-green-500'
      }`}
    />
  );
});

EditorBlock.displayName = 'EditorBlock';
export default EditorBlock;
