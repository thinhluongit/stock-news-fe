'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type EditorJSClass from '@editorjs/editorjs';
import type { OutputData } from '@editorjs/editorjs';
import VideoTool from './VideoTool';

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
      await editorRef.current.isReady;
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
      import('@editorjs/underline'),
      import('@editorjs/delimiter'),
      import('editorjs-text-color-plugin'),
    ]).then(([
      { default: EditorJS },
      { default: Header },
      { default: List },
      { default: Quote },
      { default: ImageTool },
      { default: Embed },
      { default: Underline },
      { default: Delimiter },
      { default: ColorPlugin },
    ]) => {
      // Re-check inside the async callback: in React Strict Mode both the first
      // and second mount start this Promise.all while editorRef.current is still
      // null, so without this guard a second EditorJS instance would overwrite
      // the first and save() would always return {"blocks":[]}.
      if (!holderRef.current || editorRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      editorRef.current = new EditorJS({
        holder: holderRef.current,
        data,
        readOnly,
        inlineToolbar: ['bold', 'italic', 'underline', 'textColor', 'link'],
        tools: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          header: { class: Header as any, config: { levels: [2, 3, 4], defaultLevel: 2 } },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          list: { class: List as any },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          quote: { class: Quote as any },
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          underline: { class: Underline as any },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          delimiter: { class: Delimiter as any },
          textColor: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            class: ColorPlugin as any,
            config: {
              colorCollections: [
                '#FFFFFF', '#9CA3AF', '#F87171', '#FB923C',
                '#FACC15', '#22c55e', '#34D399', '#60A5FA',
                '#A78BFA', '#F472B6', '#000000',
              ],
              defaultColor: '#FFFFFF',
              type: 'text and background',
              customPicker: true,
            },
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          video: {
            class: VideoTool as any,
            config: {
              uploadUrl: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'}/upload`,
              getToken: () => typeof window !== 'undefined' ? localStorage.getItem('token') : null,
            },
          },
        },
        placeholder: 'Start writing your article…',
      });
    });

    return () => {
      // Null synchronously so the next mount's guard sees null immediately,
      // preventing a race where both mounts pass the guard before either creates
      // an instance (React Strict Mode double-invoke pattern).
      const instance = editorRef.current;
      editorRef.current = null;
      if (instance) {
        instance.isReady
          .then(() => instance.destroy())
          .catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={holderRef}
      className={`min-h-[400px] bg-gray-100 dark:bg-gray-800 border rounded-lg px-3 py-2 text-gray-900 dark:text-white transition-colors [&_.ce-block\_\_content]:max-w-none [&_.codex-editor\_\_redactor]:pb-8 ${
        readOnly
          ? 'border-gray-300 dark:border-gray-700 opacity-60 pointer-events-none'
          : 'border-gray-300 dark:border-gray-700 focus-within:border-green-500'
      }`}
    />
  );
});

EditorBlock.displayName = 'EditorBlock';
export default EditorBlock;
