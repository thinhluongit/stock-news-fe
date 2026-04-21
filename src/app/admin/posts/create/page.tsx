"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "../../../../store/hooks";
import { fetchCategories } from "../../../../store/slices/newsSlice";
import { useLocale } from "../../../../i18n/LocaleContext";
import { postsApi } from "../../../../services/api";
import {
  ChevronLeft,
  Loader2,
  Upload,
  X,
  Plus,
  Video,
  ImageIcon,
} from "lucide-react";
import type { Article } from "../../../../types";
import type { OutputData } from "@editorjs/editorjs";
import type { EditorBlockRef } from "../../../../components/editor/EditorBlock";

const EditorBlock = dynamic(
  () => import("../../../../components/editor/EditorBlock"),
  { ssr: false },
);

const MEDIA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm";

export default function AdminPostCreatePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { t } = useLocale();
  const { categories } = useAppSelector((s) => s.news);

  const editorRef = useRef<EditorBlockRef>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);

  useEffect(() => {
    dispatch(fetchCategories());
  }, [dispatch]);

  useEffect(() => {
    if (!thumbnailFile) return;
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  useEffect(() => {
    if (!thumbnailFile) setThumbnailPreviewUrl(thumbnail);
  }, [thumbnail, thumbnailFile]);

  const clearThumbnail = () => {
    setThumbnailFile(null);
    setThumbnail("");
    setThumbnailPreviewUrl("");
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const outputData: OutputData | null = editorRef.current
        ? await editorRef.current.save()
        : null;
      const form = new FormData();
      form.append("title", title);
      if (summary) form.append("summary", summary);
      form.append("content", outputData ? JSON.stringify(outputData) : "");
      if (categoryId) form.append("category_id", categoryId);
      form.append("is_featured", String(isFeatured));

      if (thumbnailFile) {
        form.append("thumbnail", thumbnailFile);
      } else if (thumbnail) {
        form.append("thumbnail_url", thumbnail);
      }

      for (const file of mediaFiles) form.append("media", file);
      for (const [key, value] of form.entries()) {
        console.log(key, value);
      }

      const res = await postsApi.create(form);
      const created = (res.data as { data: Article }).data;
      router.push(`/admin/posts/${created.id}`);
    } catch {
      setError(t("admin.error_load"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/posts")}
          className="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          {t("admin.post.new_post")}
        </h1>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {t("admin.post.title")} <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Summary */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {t("admin.post.summary")}
          </label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 resize-y"
          />
        </div>

        {/* Content */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {t("admin.post.content")} <span className="text-red-400">*</span>
          </label>
          <EditorBlock ref={editorRef} />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {t("admin.post.thumbnail")}
          </label>
          {thumbnailPreviewUrl && (
            <div className="relative rounded-lg overflow-hidden bg-gray-800 mb-2 max-h-48">
              <img
                src={thumbnailPreviewUrl}
                alt=""
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={clearThumbnail}
                className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors whitespace-nowrap shrink-0">
              <Upload size={14} />
              {t("admin.post.thumbnail_upload")}
              <input
                type="file"
                accept={MEDIA_ACCEPT}
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file) {
                    setThumbnailFile(file);
                    setThumbnail("");
                  }
                  e.target.value = "";
                }}
              />
            </label>
            <span className="text-gray-500 dark:text-gray-500 text-xs shrink-0">
              {t("admin.post.or_url")}
            </span>
            <input
              type="text"
              value={thumbnailFile ? "" : thumbnail}
              onChange={(e) => {
                setThumbnail(e.target.value);
                setThumbnailFile(null);
              }}
              disabled={!!thumbnailFile}
              placeholder="https://..."
              className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          {thumbnailFile && (
            <p className="mt-1 text-xs text-gray-500 truncate">
              {thumbnailFile.name}
            </p>
          )}
        </div>

        {/* Media Gallery */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {t("admin.post.media_gallery")}
          </label>

          {mediaFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {mediaFiles.map((file, i) => (
                <div
                  key={i}
                  className="relative w-20 h-20 rounded-lg overflow-hidden bg-green-900/20 border border-green-700/40 flex flex-col items-center justify-center gap-1 px-1"
                >
                  {file.type.startsWith("image/") ? (
                    <ImageIcon size={18} className="text-green-400" />
                  ) : (
                    <Video size={18} className="text-green-400" />
                  )}
                  <p className="text-xs text-green-300 text-center leading-none truncate w-full px-1">
                    {file.name}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setMediaFiles((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="absolute top-1 right-1 p-0.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer w-fit bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-400 dark:border-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Plus size={14} />
            {t("admin.post.add_media")}
            <input
              type="file"
              accept={MEDIA_ACCEPT}
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) setMediaFiles((prev) => [...prev, ...files]);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1.5">
            {t("admin.post.category")}
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-green-500"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Featured toggle */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-900 dark:text-white">
            {t("admin.post.is_featured")}
          </p>
          <button
            type="button"
            onClick={() => setIsFeatured((v) => !v)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isFeatured ? "bg-green-500" : "bg-gray-600"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isFeatured ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={() => router.push("/admin/posts")}
          className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          {t("admin.actions.cancel")}
        </button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-white bg-green-600 hover:bg-green-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? t("admin.post.creating") : t("admin.post.create_post")}
        </button>
      </div>
    </div>
  );
}
