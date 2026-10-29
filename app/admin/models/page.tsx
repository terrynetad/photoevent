"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import {
  loadTaggedModelPhotos,
  selectModelPhotos,
  type TaggedPhoto,
} from "@/lib/model-photos";
import ModelPhoto from "@/app/models/model-photo";
import styles from "./models.module.css";

type Model = {
  id: string;
  name: string;
  slug: string;
  avatar_url: string | null;
  gallery_urls: string[];
  is_active: boolean;
  sort_order: number;
};
const columns = "id,name,slug,avatar_url,gallery_urls,is_active,sort_order";
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

async function validateImage(file: File) {
  if (!allowedTypes.includes(file.type) || file.size > 5 * 1024 * 1024)
    throw new Error("相片只接受 JPG、PNG、WebP，每張最多 5 MB。");
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(`${file.name} 不是有效圖片。`);
  });
  bitmap.close();
}

export default function AdminModelsPage() {
  const [auth, setAuth] = useState<"checking" | "admin" | "denied">("checking");
  const [models, setModels] = useState<Model[]>([]);
  const [modelSearch, setModelSearch] = useState("");
  const [selected, setSelected] = useState<Model | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [gallery, setGallery] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>([]);
  const [tagged, setTagged] = useState<TaggedPhoto[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const lock = useRef(false);
  const avatarPreviewUrlRef = useRef<string | null>(null);
  const galleryPreviewUrlsRef = useRef<string[]>([]);

  function replaceAvatarFile(file: File | null) {
    if (avatarPreviewUrlRef.current)
      URL.revokeObjectURL(avatarPreviewUrlRef.current);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    avatarPreviewUrlRef.current = previewUrl;
    setAvatarFile(file);
    setAvatarPreviewUrl(previewUrl);
  }

  function replaceGalleryFiles(files: File[]) {
    for (const previewUrl of galleryPreviewUrlsRef.current)
      URL.revokeObjectURL(previewUrl);
    const previewUrls = files.map((file) => URL.createObjectURL(file));
    galleryPreviewUrlsRef.current = previewUrls;
    setGalleryFiles(files);
    setGalleryPreviewUrls(previewUrls);
  }

  useEffect(
    () => () => {
      if (avatarPreviewUrlRef.current)
        URL.revokeObjectURL(avatarPreviewUrlRef.current);
      for (const previewUrl of galleryPreviewUrlsRef.current)
        URL.revokeObjectURL(previewUrl);
    },
    [],
  );

  async function loadModels() {
    const { data, error } = await supabase
      .from("models")
      .select(columns)
      .order("sort_order")
      .order("name");
    if (error)
      throw new Error(
        `無法載入 Model：${error.message}。請先在測試環境套用 Model Profile migration。`,
      );
    setModels((data ?? []) as Model[]);
    setLoaded(true);
  }

  useEffect(() => {
    let alive = true;
    async function check() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setAuth("denied");
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!alive) return;
      if (error || data?.role !== "admin") {
        setAuth("denied");
        return;
      }
      setAuth("admin");
      try {
        await loadModels();
      } catch (error) {
        if (alive) setMessage((error as Error).message);
      }
    }
    void check();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && alive) {
        setAuth("denied");
        setModels([]);
        setSelected(null);
      }
    });
    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    if (selected)
      loadTaggedModelPhotos([selected.id])
        .then((photos) => {
          if (alive) setTagged(photos);
        })
        .catch(() => {
          if (alive) setMessage("已標記活動相片預覽暫時無法載入。");
        });
    return () => {
      alive = false;
    };
  }, [selected]);

  function edit(model: Model | null) {
    setTagged([]);
    setSelected(model);
    setName(model?.name ?? "");
    setAvatar(model?.avatar_url ?? "");
    setGallery(model?.gallery_urls ?? []);
    replaceAvatarFile(null);
    replaceGalleryFiles([]);
    setMessage("");
    setFormKey((key) => key + 1);
  }

  async function upload(
    file: File,
    modelId: string,
    kind: "avatar" | "gallery",
  ) {
    await validateImage(file);
    const extension = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    }[file.type];
    const path = `${modelId}/${kind}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("model-images")
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw new Error(`上傳失敗：${error.message}`);
    return supabase.storage.from("model-images").getPublicUrl(path).data
      .publicUrl;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    let committed = false;
    try {
      if (!name.trim()) throw new Error("請輸入 Model 名字。");
      if (gallery.length + galleryFiles.length > 10)
        throw new Error("其他相片最多 10 張。");
      for (const file of [...(avatarFile ? [avatarFile] : []), ...galleryFiles])
        await validateImage(file);
      // Fresh auth check plus database/Storage RLS, never trust the UI alone.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("登入已過期，請重新登入。");
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError || profile?.role !== "admin")
        throw new Error("沒有管理員權限。");
      // Detect changes made since opening this editor before uploading.
      if (selected) {
        const { data: latest, error } = await supabase
          .from("models")
          .select(columns)
          .eq("id", selected.id)
          .single();
        if (error) throw error;
        if (JSON.stringify(latest) !== JSON.stringify(selected))
          throw new Error(
            "資料已被其他操作修改，請重新選擇此 Model 後再編輯。",
          );
      }
      const id = selected?.id ?? crypto.randomUUID();
      const avatarUrl = avatarFile
        ? await upload(avatarFile, id, "avatar")
        : avatar.trim() || null;
      const nextGallery = [...gallery];
      for (const file of galleryFiles)
        nextGallery.push(await upload(file, id, "gallery"));
      const values = {
        name: name.trim(),
        avatar_url: avatarUrl,
        gallery_urls: nextGallery,
      };
      const result = selected
        ? await supabase
            .from("models")
            .update(values)
            .eq("id", id)
            .select(columns)
            .single()
        : await supabase
            .from("models")
            .insert({
              id,
              slug: `model-${id}`,
              is_active: true,
              sort_order: 0,
              ...values,
            })
            .select(columns)
            .single();
      if (result.error) throw result.error;
      committed = true;
      const saved = result.data as Model;
      // No Storage deletion: replacing/removing a photo only changes references.
      edit(saved);
      await loadModels();
      setMessage(
        "已儲存。舊相片檔案保留，可按還原文件恢復。公開頁只顯示名字及相片，不顯示 IG 或 Bio。",
      );
    } catch (error) {
      setMessage(
        `${committed ? "資料已儲存，但列表更新失敗。請重新整理。" : "未完成儲存。"}${(error as Error).message}${committed ? "" : " 原有 Model 記錄未被刪除；若有已上傳但未引用的新圖片，請按文件清理。"}`,
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }

  if (auth === "checking")
    return (
      <main className={styles.page}>
        <p>正在驗證管理員權限⋯</p>
      </main>
    );
  if (auth === "denied")
    return (
      <main className={styles.page}>
        <h1>需要管理員登入</h1>
        <p>請先在活動後台登入具有 admin 權限的帳號。</p>
        <Link href="/admin">前往登入</Link>
      </main>
    );
  const preview = selectModelPhotos(avatarFile ? "" : avatar, gallery, tagged);
  const normalizedSearch = modelSearch.trim().toLowerCase();
  const filteredModels = models.filter((model) =>
    `${model.name} ${model.slug}`.toLowerCase().includes(normalizedSearch),
  );
  return (
    <main className={styles.page}>
      <nav>
        <Link href="/admin">← 活動管理</Link>
        <Link href="/models" target="_blank">
          公開 Model 列表 ↗
        </Link>
      </nav>
      <header>
        <p>PHOTOEVENT / MODEL MANAGEMENT</p>
        <h1>Model 個人檔案</h1>
        <p>
          只需名字、主要相片及其他相片。相片留空時，自動使用已標記的已發布活動圖片。
        </p>
      </header>
      {message ? (
        <p className={styles.notice} role="status">
          {message}
        </p>
      ) : null}
      <div className={styles.layout}>
        <aside>
          <button
            type="button"
            disabled={busy || !loaded}
            onClick={() => edit(null)}
          >
            ＋ 新增 Model
          </button>
          <label>
            搜尋 Model
            <input
              type="search"
              aria-label="搜尋 Model 名稱或 slug"
              placeholder="輸入名稱或 slug"
              value={modelSearch}
              onChange={(event) => setModelSearch(event.target.value)}
            />
          </label>
          <ul>
            {filteredModels.map((model) => (
              <li key={model.id}>
                <button
                  type="button"
                  disabled={busy}
                  aria-pressed={selected?.id === model.id}
                  onClick={() => edit(model)}
                >
                  {model.name}
                  {!model.is_active ? "（未啟用）" : ""}
                </button>
              </li>
            ))}
          </ul>
          {models.length > 0 && filteredModels.length === 0 ? (
            <p role="status">找不到符合的 Model。</p>
          ) : null}
        </aside>
        <form key={formKey} onSubmit={save}>
          <fieldset disabled={busy || !loaded}>
            <legend>{selected ? `編輯 ${selected.name}` : "新增 Model"}</legend>
            <label>
              名字
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={120}
                autoComplete="off"
              />
            </label>
            <h2>主要相片</h2>
            <p>建議 4:5、1200 × 1500 px。JPG／PNG／WebP，每張最多 5 MB。</p>
            <ModelPhoto
              key={avatarPreviewUrl ?? avatar ?? "empty"}
              src={avatarPreviewUrl ?? preview.main}
              alternatives={avatarPreviewUrl ? [] : preview.activityPhotos}
              name={name || "Model"}
              className={styles.preview}
            />
            <label>
              上傳／更換主要相片
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  replaceAvatarFile(event.target.files?.[0] ?? null)
                }
              />
            </label>
            {avatarFile ? <p>待上傳：{avatarFile.name}</p> : null}
            <button
              type="button"
              onClick={() => {
                setAvatar("");
                replaceAvatarFile(null);
                setFormKey((key) => key + 1);
              }}
            >
              主要相片改用活動圖片
            </button>
            <h2>其他相片（建議 5–10 張，最多 10 張）</h2>
            <p>
              不足 5
              張仍可儲存；整個相簿留空時，才自動使用活動圖片，不會混入手選相簿。
            </p>
            <ol className={styles.gallery}>
              {gallery.map((url, index) => (
                <li key={url}>
                  <ModelPhoto
                    src={url}
                    name={name || "Model"}
                    className={styles.thumb}
                  />
                  <div>
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() =>
                        setGallery((previous) => {
                          const next = [...previous];
                          [next[index - 1], next[index]] = [
                            next[index],
                            next[index - 1],
                          ];
                          return next;
                        })
                      }
                    >
                      前移
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setGallery((previous) =>
                          previous.filter((_, position) => position !== index),
                        )
                      }
                    >
                      移除
                    </button>
                  </div>
                </li>
              ))}
            </ol>
            <label>
              新增其他相片
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  replaceGalleryFiles(Array.from(event.target.files ?? []))
                }
              />
            </label>
            <p>
              已有 {gallery.length} 張，待上傳 {galleryFiles.length} 張。
            </p>
            {galleryFiles.length ? (
              <div className={styles.gallery}>
                {galleryFiles.map((file, index) => (
                  <figure
                    className={styles.pendingGalleryItem}
                    key={`${file.name}-${index}`}
                  >
                    <ModelPhoto
                      src={galleryPreviewUrls[index]}
                      name={name || "Model"}
                      className={styles.thumb}
                    />
                    <figcaption>{file.name}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
            {!gallery.length && !galleryFiles.length ? (
              <>
                <p>活動圖片預覽：</p>
                <div className={styles.gallery}>
                  {preview.gallery.map((url) => (
                    <ModelPhoto
                      src={url}
                      key={url}
                      name={name || "Model"}
                      className={styles.thumb}
                    />
                  ))}
                </div>
              </>
            ) : null}
            <p>
              儲存不會刪除舊相片檔案；沒有相片時顯示「暫無相片」。現有
              slug、啟用狀態、排序、Bio 及 IG 資料不會被覆寫。
            </p>
            <div className={styles.actions}>
              <button type="submit">{busy ? "儲存中⋯" : "儲存個人檔案"}</button>
              {selected ? (
                <Link href={`/models/${selected.slug}`} target="_blank">
                  預覽公開頁 ↗
                </Link>
              ) : null}
            </div>
          </fieldset>
        </form>
      </div>
    </main>
  );
}
