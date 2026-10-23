"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import styles from "./admin.module.css";

const STORAGE_BUCKET = "activity-images";
const HONG_KONG_TIME_ZONE = "Asia/Hong_Kong";

type StatusFilter = "all" | "draft" | "published";
type ActivityStatus = "draft" | "published";

type BasicOption = {
  id: string;
  name: string;
  slug: string;
  is_active?: boolean;
  sort_order?: number;
};

type RelationModel = {
  id: string;
  name: string;
  slug: string;
};

type RelationTheme = {
  id: string;
  name: string;
  slug: string;
};

type RelationOutfit = {
  id: string;
  name: string;
  slug: string;
};

type ActivityImageModelRelation = {
  model_id: string;
  models: RelationModel | RelationModel[] | null;
};

type ActivityImage = {
  id: string;
  activity_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  activity_image_models?: ActivityImageModelRelation[] | null;
};

type FormActivityImage = ActivityImage & {
  modelIds: string[];
};

type ActivityModelRelation = {
  model_id: string;
  sort_order: number;
  models: RelationModel | RelationModel[] | null;
};

type ActivityThemeRelation = {
  theme_id: string;
  themes: RelationTheme | RelationTheme[] | null;
};

type ActivityOutfitRelation = {
  outfit_id: string;
  outfits: RelationOutfit | RelationOutfit[] | null;
};

type ActivityRow = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  notes: string | null;
  start_at: string;
  end_at: string | null;
  registration_deadline: string | null;
  location_name: string | null;
  location_address: string | null;
  map_url: string | null;
  price: number | string | null;
  currency: string;
  contact_name: string | null;
  contact_url: string | null;
  cover_image_url: string | null;
  status: ActivityStatus;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  activity_images: ActivityImage[] | null;
  activity_models: ActivityModelRelation[] | null;
  activity_themes: ActivityThemeRelation[] | null;
  activity_outfits: ActivityOutfitRelation[] | null;
};

type FormState = {
  id: string | null;
  title: string;
  slug: string;
  description: string;
  notes: string;
  start_at: string;
  end_at: string;
  registration_deadline: string;
  location_name: string;
  location_address: string;
  map_url: string;
  price: string;
  currency: string;
  contact_name: string;
  contact_url: string;
  status: ActivityStatus;
  is_featured: boolean;
  sort_order: string;
  modelIds: string[];
  themeIds: string[];
  outfitIds: string[];
  cover_image_url: string;
  images: FormActivityImage[];
};

const EMPTY_FORM: FormState = {
  id: null,
  title: "",
  slug: "",
  description: "",
  notes: "",
  start_at: "",
  end_at: "",
  registration_deadline: "",
  location_name: "",
  location_address: "",
  map_url: "",
  price: "",
  currency: "HKD",
  contact_name: "",
  contact_url: "",
  status: "draft",
  is_featured: false,
  sort_order: "0",
  modelIds: [],
  themeIds: [],
  outfitIds: [],
  cover_image_url: "",
  images: [],
};

function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return slug || "activity";
}

function escapeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createUniqueId() {
  if (
    typeof globalThis !== "undefined" &&
    globalThis.crypto &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);
      const value = character === "x" ? random : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

function getFileExtension(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension && /^[a-z0-9]+$/.test(extension)) {
    return extension;
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  if (file.type === "image/avif") {
    return "avif";
  }

  return "jpg";
}

function getHongKongDateTimeInput(value: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${getPart("year")}-${getPart("month")}-${getPart(
    "day"
  )}T${getPart("hour")}:${getPart("minute")}`;
}

function hongKongInputToIso(value: string) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(`${value}:00+08:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate.toISOString();
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: HONG_KONG_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatPrice(price: number | string | null, currency: string) {
  if (price === null || price === undefined || price === "") {
    return "費用待定";
  }

  const numberPrice = Number(price);

  if (Number.isNaN(numberPrice)) {
    return "費用待定";
  }

  const currencyLabel =
    currency === "HKD" ? "HK$" : currency === "TWD" ? "NT$" : currency;

  return `${currencyLabel}${new Intl.NumberFormat("en-HK", {
    maximumFractionDigits: 0,
  }).format(numberPrice)}`;
}

function getStoragePathFromPublicUrl(
  publicUrl: string | null | undefined
): string | null {
  if (!publicUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const index = publicUrl.indexOf(marker);

  if (index === -1) {
    return null;
  }

  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

function getRelationNames<T extends { name: string }>(
  relations: T[] | null | undefined
) {
  return (relations || []).map((item) => item.name).filter(Boolean);
}

function getImageModelIds(image: ActivityImage): string[] {
  return [...(image.activity_image_models || [])]
    .map((relation) => relation.model_id)
    .filter(Boolean);
}

export default function AdminPage() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [models, setModels] = useState<BasicOption[]>([]);
  const [themes, setThemes] = useState<BasicOption[]>([]);
  const [outfits, setOutfits] = useState<BasicOption[]>([]);

  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataMessage, setDataMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formMessage, setFormMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [duplicatingActivityId, setDuplicatingActivityId] = useState<
    string | null
  >(null);

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviewUrls, setGalleryPreviewUrls] = useState<string[]>([]);

  const [newModelName, setNewModelName] = useState("");
  const [newThemeName, setNewThemeName] = useState("");
  const [newOutfitName, setNewOutfitName] = useState("");
  const [creatingLookup, setCreatingLookup] = useState("");

  useEffect(() => {
    void checkAdminAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void checkAdminAccess();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }

      galleryPreviewUrls.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [coverPreviewUrl, galleryPreviewUrls]);

  async function checkAdminAccess() {
    setIsCheckingAuth(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setIsAdmin(false);
      setAdminEmail("");
      setIsCheckingAuth(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "admin") {
      setIsAdmin(false);
      setAdminEmail(user.email || "");
      setIsCheckingAuth(false);
      return;
    }

    setAdminEmail(profile.email || user.email || "");
    setIsAdmin(true);
    setIsCheckingAuth(false);

    await loadAdminData();
  }

  async function loadAdminData() {
    setIsLoadingData(true);
    setDataMessage("");

    const [activitiesResult, modelsResult, themesResult, outfitsResult] =
      await Promise.all([
        supabase
          .from("activities")
          .select(
            `
              id,
              title,
              slug,
              description,
              notes,
              start_at,
              end_at,
              registration_deadline,
              location_name,
              location_address,
              map_url,
              price,
              currency,
              contact_name,
              contact_url,
              cover_image_url,
              status,
              is_featured,
              sort_order,
              created_at,
              updated_at,
              activity_images (
                id,
                activity_id,
                image_url,
                alt_text,
                sort_order,
                activity_image_models (
                  model_id,
                  models (
                    id,
                    name,
                    slug
                  )
                )
              ),
              activity_models (
                model_id,
                sort_order,
                models (
                  id,
                  name,
                  slug
                )
              ),
              activity_themes (
                theme_id,
                themes (
                  id,
                  name,
                  slug
                )
              ),
              activity_outfits (
                outfit_id,
                outfits (
                  id,
                  name,
                  slug
                )
              )
            `
          )
          .order("start_at", { ascending: false })
          .order("sort_order", { ascending: true }),
        supabase
          .from("models")
          .select("id, name, slug, is_active, sort_order")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("themes")
          .select("id, name, slug, is_active, sort_order")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        supabase
          .from("outfits")
          .select("id, name, slug, is_active, sort_order")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

    const errors = [
      activitiesResult.error,
      modelsResult.error,
      themesResult.error,
      outfitsResult.error,
    ].filter(Boolean);

    if (errors.length > 0) {
      console.error("Admin load failed:", errors);
      setDataMessage("無法載入後台資料，請檢查 Supabase RLS 或瀏覽器 Console。");
      setIsLoadingData(false);
      return;
    }

    setActivities((activitiesResult.data || []) as unknown as ActivityRow[]);
    setModels((modelsResult.data || []) as BasicOption[]);
    setThemes((themesResult.data || []) as BasicOption[]);
    setOutfits((outfitsResult.data || []) as BasicOption[]);
    setIsLoadingData(false);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginEmail.trim() || !loginPassword) {
      setLoginMessage("請輸入 Email 與 Password。");
      return;
    }

    setLoginLoading(true);
    setLoginMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (error) {
      setLoginMessage(`登入失敗：${error.message}`);
      setLoginLoading(false);
      return;
    }

    setLoginMessage("登入驗證中⋯");
    await checkAdminAccess();
    setLoginLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setAdminEmail("");
    setActivities([]);
    setLoginPassword("");
    setLoginMessage("");
  }

  function openNewActivityEditor() {
    resetTemporaryUploads();
    setForm(EMPTY_FORM);
    setFormMessage("");
    setIsEditorOpen(true);
  }

  function openEditActivityEditor(activity: ActivityRow) {
    resetTemporaryUploads();

    const imageList: FormActivityImage[] = [
      ...(activity.activity_images || []),
    ]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((image) => ({
        ...image,
        modelIds: getImageModelIds(image),
      }));

    const selectedModelIds = [...(activity.activity_models || [])]
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((relation) => relation.model_id);

    const selectedThemeIds = (activity.activity_themes || []).map(
      (relation) => relation.theme_id
    );

    const selectedOutfitIds = (activity.activity_outfits || []).map(
      (relation) => relation.outfit_id
    );

    setForm({
      id: activity.id,
      title: activity.title || "",
      slug: activity.slug || "",
      description: activity.description || "",
      notes: activity.notes || "",
      start_at: getHongKongDateTimeInput(activity.start_at),
      end_at: getHongKongDateTimeInput(activity.end_at),
      registration_deadline: getHongKongDateTimeInput(
        activity.registration_deadline
      ),
      location_name: activity.location_name || "",
      location_address: activity.location_address || "",
      map_url: activity.map_url || "",
      price:
        activity.price === null || activity.price === undefined
          ? ""
          : String(activity.price),
      currency: activity.currency || "HKD",
      contact_name: activity.contact_name || "",
      contact_url: activity.contact_url || "",
      status: activity.status === "published" ? "published" : "draft",
      is_featured: Boolean(activity.is_featured),
      sort_order: String(activity.sort_order ?? 0),
      modelIds: selectedModelIds,
      themeIds: selectedThemeIds,
      outfitIds: selectedOutfitIds,
      cover_image_url: activity.cover_image_url || "",
      images: imageList,
    });

    setFormMessage("");
    setIsEditorOpen(true);
  }

  function closeEditor() {
    if (isSaving) {
      return;
    }

    resetTemporaryUploads();
    setForm(EMPTY_FORM);
    setFormMessage("");
    setIsEditorOpen(false);
  }

  function resetTemporaryUploads() {
    if (coverPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    galleryPreviewUrls.forEach((url) => {
      if (url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    });

    setCoverFile(null);
    setCoverPreviewUrl("");
    setGalleryFiles([]);
    setGalleryPreviewUrls([]);
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleTitleChange(value: string) {
    setForm((current) => ({
      ...current,
      title: value,
      slug:
        !current.id || current.slug === slugify(current.title)
          ? slugify(value)
          : current.slug,
    }));
  }

  function toggleMultiSelect(
    key: "modelIds" | "themeIds" | "outfitIds",
    id: string
  ) {
    setForm((current) => {
      const values = current[key];

      return {
        ...current,
        [key]: values.includes(id)
          ? values.filter((item) => item !== id)
          : [...values, id],
      };
    });
  }

  function toggleImageModel(imageId: string, modelId: string) {
    setForm((current) => ({
      ...current,
      images: current.images.map((image) => {
        if (image.id !== imageId) {
          return image;
        }

        return {
          ...image,
          modelIds: image.modelIds.includes(modelId)
            ? image.modelIds.filter((item) => item !== modelId)
            : [...image.modelIds, modelId],
        };
      }),
    }));
  }

  function handleCoverFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    if (!isImageFile(selectedFile)) {
      setFormMessage("Cover Image 必須是圖片檔案。");
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setFormMessage("Cover Image 超過 10 MB，請使用較小的圖片。");
      return;
    }

    if (coverPreviewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(coverPreviewUrl);
    }

    setCoverFile(selectedFile);
    setCoverPreviewUrl(URL.createObjectURL(selectedFile));
    setFormMessage("");
    event.target.value = "";
  }

  function handleGalleryFilesChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) {
      return;
    }

    const invalidFile = selectedFiles.find(
      (file) => !isImageFile(file) || file.size > 10 * 1024 * 1024
    );

    if (invalidFile) {
      setFormMessage(
        `"${invalidFile.name}" 不是有效圖片，或檔案大小超過 10 MB。`
      );
      return;
    }

    const previewUrls = selectedFiles.map((file) => URL.createObjectURL(file));

    setGalleryFiles((current) => [...current, ...selectedFiles]);
    setGalleryPreviewUrls((current) => [...current, ...previewUrls]);
    setFormMessage("");
    event.target.value = "";
  }

  function removeQueuedGalleryImage(index: number) {
    setGalleryFiles((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );

    setGalleryPreviewUrls((current) => {
      const url = current[index];

      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }

      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  async function uploadImageFile(
    activityId: string,
    folder: "cover" | "gallery",
    file: File
  ): Promise<{
    storagePath: string;
    publicUrl: string;
  }> {
    const extension = getFileExtension(file);
    const originalName = escapeFileName(file.name.replace(/\.[^/.]+$/, ""));
    const fileName = `${Date.now()}-${createUniqueId()}-${originalName}.${extension}`;
    const storagePath = `${activityId}/${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);

      throw new Error("圖片已上傳，但無法取得 Supabase Storage 公開網址。");
    }

    return {
      storagePath,
      publicUrl,
    };
  }

  async function removeStorageImage(
    publicUrl: string | null | undefined
  ): Promise<void> {
    const storagePath = getStoragePathFromPublicUrl(publicUrl);

    if (!storagePath) {
      return;
    }

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn("Storage image removal failed:", error.message);
    }
  }

  function getStorageFileExtension(storagePath: string) {
    const fileName = storagePath.split("/").pop() || "";
    const extension = fileName.split(".").pop()?.toLowerCase();

    return extension && /^[a-z0-9]+$/.test(extension) ? extension : "jpg";
  }

  async function copyStorageImageToNewActivity(
    sourceUrl: string | null | undefined,
    newActivityId: string,
    folder: "cover" | "gallery",
    index: number
  ): Promise<{
    publicUrl: string;
    createdStoragePath: string | null;
  }> {
    if (!sourceUrl) {
      return {
        publicUrl: "",
        createdStoragePath: null,
      };
    }

    const sourceStoragePath = getStoragePathFromPublicUrl(sourceUrl);

    if (!sourceStoragePath) {
      return {
        publicUrl: sourceUrl,
        createdStoragePath: null,
      };
    }

    const extension = getStorageFileExtension(sourceStoragePath);
    const destinationPath = `${newActivityId}/${folder}/${Date.now()}-${index}-${createUniqueId()}.${extension}`;

    const { error: copyError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .copy(sourceStoragePath, destinationPath);

    if (copyError) {
      throw new Error(`複製圖片檔案失敗：${copyError.message}`);
    }

    const { data: publicUrlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(destinationPath);

    const publicUrl = publicUrlData?.publicUrl;

    if (!publicUrl) {
      await supabase.storage.from(STORAGE_BUCKET).remove([destinationPath]);

      throw new Error("圖片已複製，但無法取得新圖片公開網址。");
    }

    return {
      publicUrl,
      createdStoragePath: destinationPath,
    };
  }

  async function deleteImageModelRelationsByActivityId(activityId: string) {
    const { data: imageRows, error: imageLoadError } = await supabase
      .from("activity_images")
      .select("id")
      .eq("activity_id", activityId);

    if (imageLoadError) {
      throw new Error(`讀取活動圖片失敗：${imageLoadError.message}`);
    }

    const imageIds = (imageRows || []).map((image) => image.id).filter(Boolean);

    if (imageIds.length === 0) {
      return;
    }

    const { error: relationDeleteError } = await supabase
      .from("activity_image_models")
      .delete()
      .in("activity_image_id", imageIds);

    if (relationDeleteError) {
      throw new Error(`刪除圖片 Model 關聯失敗：${relationDeleteError.message}`);
    }
  }

  async function cleanupDuplicatedActivity(
    activityId: string,
    storagePaths: string[]
  ) {
    try {
      await deleteImageModelRelationsByActivityId(activityId);
    } catch (error) {
      console.warn("Cleanup image-model relations failed:", error);
    }

    await Promise.all([
      supabase.from("activity_models").delete().eq("activity_id", activityId),
      supabase.from("activity_themes").delete().eq("activity_id", activityId),
      supabase.from("activity_outfits").delete().eq("activity_id", activityId),
      supabase.from("activity_images").delete().eq("activity_id", activityId),
    ]);

    await supabase.from("activities").delete().eq("id", activityId);

    if (storagePaths.length > 0) {
      await supabase.storage.from(STORAGE_BUCKET).remove(storagePaths);
    }
  }

  async function validateSlug(slug: string, activityId: string | null) {
    let query = supabase.from("activities").select("id").eq("slug", slug);

    if (activityId) {
      query = query.neq("id", activityId);
    }

    const { data, error } = await query.limit(1);

    if (error) {
      throw new Error(`無法檢查 slug：${error.message}`);
    }

    return (data || []).length === 0;
  }

  async function saveRelations(activityId: string, nextForm: FormState) {
    const deleteResults = await Promise.all([
      supabase.from("activity_models").delete().eq("activity_id", activityId),
      supabase.from("activity_themes").delete().eq("activity_id", activityId),
      supabase.from("activity_outfits").delete().eq("activity_id", activityId),
    ]);

    const deleteError = deleteResults.find((result) => result.error)?.error;

    if (deleteError) {
      throw new Error(`清除舊關聯資料失敗：${deleteError.message}`);
    }

    const insertJobs: PromiseLike<{ error: { message: string } | null }>[] = [];

    if (nextForm.modelIds.length > 0) {
      insertJobs.push(
        supabase.from("activity_models").insert(
          nextForm.modelIds.map((modelId, index) => ({
            activity_id: activityId,
            model_id: modelId,
            sort_order: index,
          }))
        )
      );
    }

    if (nextForm.themeIds.length > 0) {
      insertJobs.push(
        supabase.from("activity_themes").insert(
          nextForm.themeIds.map((themeId) => ({
            activity_id: activityId,
            theme_id: themeId,
          }))
        )
      );
    }

    if (nextForm.outfitIds.length > 0) {
      insertJobs.push(
        supabase.from("activity_outfits").insert(
          nextForm.outfitIds.map((outfitId) => ({
            activity_id: activityId,
            outfit_id: outfitId,
          }))
        )
      );
    }

    const insertResults = await Promise.all(insertJobs);
    const insertError = insertResults.find((result) => result.error)?.error;

    if (insertError) {
      throw new Error(`建立活動關聯資料失敗：${insertError.message}`);
    }
  }

  async function saveImageModelRelations(images: FormActivityImage[]) {
    for (const image of images) {
      const { error: deleteError } = await supabase
        .from("activity_image_models")
        .delete()
        .eq("activity_image_id", image.id);

      if (deleteError) {
        throw new Error(
          `清除圖片 Model 關聯失敗：${deleteError.message}`
        );
      }

      if (image.modelIds.length === 0) {
        continue;
      }

      const { error: insertError } = await supabase
        .from("activity_image_models")
        .insert(
          image.modelIds.map((modelId) => ({
            activity_image_id: image.id,
            model_id: modelId,
          }))
        );

      if (insertError) {
        throw new Error(
          `儲存圖片 Model 關聯失敗：${insertError.message}`
        );
      }
    }
  }

  async function handleSaveActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanTitle = form.title.trim();
    const cleanSlug = slugify(form.slug || form.title);

    if (!cleanTitle) {
      setFormMessage("請輸入活動名稱。");
      return;
    }

    if (!form.start_at) {
      setFormMessage("請輸入活動開始時間。");
      return;
    }

    const startAt = hongKongInputToIso(form.start_at);
    const endAt = hongKongInputToIso(form.end_at);
    const registrationDeadline = hongKongInputToIso(form.registration_deadline);

    if (!startAt) {
      setFormMessage("活動開始時間格式不正確。");
      return;
    }

    if (form.end_at && !endAt) {
      setFormMessage("活動結束時間格式不正確。");
      return;
    }

    if (form.end_at && endAt && new Date(endAt) <= new Date(startAt)) {
      setFormMessage("活動結束時間必須晚於開始時間。");
      return;
    }

    const numericPrice = form.price.trim() === "" ? null : Number(form.price);

    if (
      numericPrice !== null &&
      (Number.isNaN(numericPrice) || numericPrice < 0)
    ) {
      setFormMessage("活動費用必須是 0 或正數。");
      return;
    }

    setIsSaving(true);
    setFormMessage("正在儲存活動資料⋯");

    try {
      const isSlugAvailable = await validateSlug(cleanSlug, form.id);

      if (!isSlugAvailable) {
        throw new Error(`網址代號 "${cleanSlug}" 已被使用，請修改 slug。`);
      }

      const activityPayload = {
        title: cleanTitle,
        slug: cleanSlug,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null,
        start_at: startAt,
        end_at: endAt,
        registration_deadline: registrationDeadline,
        location_name: form.location_name.trim() || null,
        location_address: form.location_address.trim() || null,
        map_url: form.map_url.trim() || null,
        price: numericPrice,
        currency: form.currency,
        contact_name: form.contact_name.trim() || null,
        contact_url: form.contact_url.trim() || null,
        status: form.status,
        is_featured: form.is_featured,
        sort_order: Number.parseInt(form.sort_order, 10) || 0,
        updated_at: new Date().toISOString(),
      };

      let activityId = form.id;
      let oldCoverImageUrl = form.cover_image_url;

      if (activityId) {
        const { error } = await supabase
          .from("activities")
          .update(activityPayload)
          .eq("id", activityId);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { data, error } = await supabase
          .from("activities")
          .insert(activityPayload)
          .select("id")
          .single();

        if (error || !data) {
          throw new Error(error?.message || "新增活動失敗。");
        }

        activityId = data.id;
        oldCoverImageUrl = "";
      }

      if (!activityId) {
        throw new Error("活動儲存失敗：未能取得 activity ID。");
      }

      await saveRelations(activityId, form);

      if (form.images.length > 0) {
        setFormMessage("正在同步每張活動圖片的 Model 標記⋯");
        await saveImageModelRelations(form.images);
      }

      let nextCoverImageUrl = oldCoverImageUrl;

      if (coverFile) {
        setFormMessage("正在上傳 Cover Image⋯");

        const uploadedCover = await uploadImageFile(activityId, "cover", coverFile);

        const { error: coverUpdateError } = await supabase
          .from("activities")
          .update({
            cover_image_url: uploadedCover.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", activityId);

        if (coverUpdateError) {
          await removeStorageImage(uploadedCover.publicUrl);
          throw new Error(`更新 Cover Image 失敗：${coverUpdateError.message}`);
        }

        nextCoverImageUrl = uploadedCover.publicUrl;

        if (oldCoverImageUrl && oldCoverImageUrl !== uploadedCover.publicUrl) {
          await removeStorageImage(oldCoverImageUrl);
        }
      }

      if (galleryFiles.length > 0) {
        setFormMessage(`正在上傳 ${galleryFiles.length} 張 Gallery Images⋯`);

        const existingImagesCount = form.images.length;

        for (let index = 0; index < galleryFiles.length; index += 1) {
          const file = galleryFiles[index];
          const uploadedImage = await uploadImageFile(activityId, "gallery", file);

          const { error: imageInsertError } = await supabase
            .from("activity_images")
            .insert({
              activity_id: activityId,
              image_url: uploadedImage.publicUrl,
              alt_text: `${cleanTitle} 活動照片`,
              sort_order: existingImagesCount + index,
            });

          if (imageInsertError) {
            await removeStorageImage(uploadedImage.publicUrl);
            throw new Error(`寫入相簿資料失敗：${imageInsertError.message}`);
          }
        }
      }

      await loadAdminData();

      resetTemporaryUploads();

      const updatedActivity = activities.find((activity) => activity.id === activityId);

      setForm((current) => ({
        ...current,
        id: activityId,
        slug: cleanSlug,
        cover_image_url: nextCoverImageUrl,
        images: updatedActivity
          ? [...(updatedActivity.activity_images || [])]
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((image) => ({
                ...image,
                modelIds: getImageModelIds(image),
              }))
          : current.images,
      }));

      setFormMessage(
        form.status === "published"
          ? "活動已儲存並發布。"
          : "草稿已儲存，尚未在公開網站顯示。"
      );
    } catch (error) {
      console.error("Save activity failed:", error);

      setFormMessage(
        `儲存失敗：${error instanceof Error ? error.message : "未知錯誤"}`
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGalleryImage(image: FormActivityImage) {
    const confirmed = window.confirm(
      "確定刪除這張 Gallery Image？圖片與圖中 Model 關聯都會一併移除，此操作不能復原。"
    );

    if (!confirmed) {
      return;
    }

    setFormMessage("正在刪除圖片及其 Model 關聯⋯");

    const { error: relationDeleteError } = await supabase
      .from("activity_image_models")
      .delete()
      .eq("activity_image_id", image.id);

    if (relationDeleteError) {
      setFormMessage(`刪除圖片 Model 關聯失敗：${relationDeleteError.message}`);
      return;
    }

    const { error: databaseError } = await supabase
      .from("activity_images")
      .delete()
      .eq("id", image.id);

    if (databaseError) {
      setFormMessage(`刪除圖片資料失敗：${databaseError.message}`);
      return;
    }

    await removeStorageImage(image.image_url);

    setForm((current) => ({
      ...current,
      images: current.images.filter((item) => item.id !== image.id),
    }));

    await loadAdminData();
    setFormMessage("圖片及其圖中 Model 標記已刪除。");
  }

  async function duplicateActivity(activity: ActivityRow) {
    const confirmed = window.confirm(
      `確定複製「${activity.title}」？\n\n系統會建立一個新的草稿活動，並實體複製 Cover Image、Gallery Images、每張照片的 Model、活動 Model、主題及服裝關聯。\n\n新副本不會立即公開。`
    );

    if (!confirmed) {
      return;
    }

    const duplicateTitle = `${activity.title}（副本）`;

    const sourceSlug = (activity.slug || "activity")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-");

    const duplicateSlug = `${sourceSlug || "activity"}-copy-${Date.now()}`;

    const sourceImages = [...(activity.activity_images || [])].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );

    const duplicateForm: FormState = {
      id: null,
      title: duplicateTitle,
      slug: duplicateSlug,
      description: activity.description || "",
      notes: activity.notes || "",
      start_at: getHongKongDateTimeInput(activity.start_at),
      end_at: getHongKongDateTimeInput(activity.end_at),
      registration_deadline: getHongKongDateTimeInput(
        activity.registration_deadline
      ),
      location_name: activity.location_name || "",
      location_address: activity.location_address || "",
      map_url: activity.map_url || "",
      price:
        activity.price === null || activity.price === undefined
          ? ""
          : String(activity.price),
      currency: activity.currency || "HKD",
      contact_name: activity.contact_name || "",
      contact_url: activity.contact_url || "",
      status: "draft",
      is_featured: false,
      sort_order: String(activity.sort_order ?? 0),
      modelIds: [...(activity.activity_models || [])]
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((relation) => relation.model_id),
      themeIds: (activity.activity_themes || []).map(
        (relation) => relation.theme_id
      ),
      outfitIds: (activity.activity_outfits || []).map(
        (relation) => relation.outfit_id
      ),
      cover_image_url: "",
      images: [],
    };

    let newActivityId = "";
    const createdStoragePaths: string[] = [];

    setDuplicatingActivityId(activity.id);
    setDataMessage(`正在複製「${activity.title}」及其圖片⋯`);

    try {
      const { data: createdActivity, error: activityCreateError } =
        await supabase
          .from("activities")
          .insert({
            title: duplicateForm.title,
            slug: duplicateForm.slug,
            description: duplicateForm.description || null,
            notes: duplicateForm.notes || null,
            start_at: hongKongInputToIso(duplicateForm.start_at),
            end_at: hongKongInputToIso(duplicateForm.end_at),
            registration_deadline: hongKongInputToIso(
              duplicateForm.registration_deadline
            ),
            location_name: duplicateForm.location_name || null,
            location_address: duplicateForm.location_address || null,
            map_url: duplicateForm.map_url || null,
            price:
              duplicateForm.price.trim() === ""
                ? null
                : Number(duplicateForm.price),
            currency: duplicateForm.currency,
            contact_name: duplicateForm.contact_name || null,
            contact_url: duplicateForm.contact_url || null,
            status: "draft",
            is_featured: false,
            sort_order: Number.parseInt(duplicateForm.sort_order, 10) || 0,
            cover_image_url: null,
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();

      if (activityCreateError || !createdActivity) {
        throw new Error(activityCreateError?.message || "建立活動副本失敗。");
      }

      newActivityId = createdActivity.id;

      setDataMessage(`正在複製「${activity.title}」的 Model、主題及服裝設定⋯`);

      await saveRelations(newActivityId, duplicateForm);

      let copiedCoverImageUrl = "";

      if (activity.cover_image_url) {
        setDataMessage(`正在複製「${activity.title}」的 Cover Image⋯`);

        const copiedCover = await copyStorageImageToNewActivity(
          activity.cover_image_url,
          newActivityId,
          "cover",
          0
        );

        copiedCoverImageUrl = copiedCover.publicUrl;

        if (copiedCover.createdStoragePath) {
          createdStoragePaths.push(copiedCover.createdStoragePath);
        }

        const { error: coverUpdateError } = await supabase
          .from("activities")
          .update({
            cover_image_url: copiedCoverImageUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", newActivityId);

        if (coverUpdateError) {
          throw new Error(`更新新活動 Cover Image 失敗：${coverUpdateError.message}`);
        }
      }

      const copiedGalleryImages: FormActivityImage[] = [];

      for (let index = 0; index < sourceImages.length; index += 1) {
        const sourceImage = sourceImages[index];

        setDataMessage(
          `正在複製圖片 ${index + 1} / ${sourceImages.length}：${activity.title}`
        );

        const copiedImage = await copyStorageImageToNewActivity(
          sourceImage.image_url,
          newActivityId,
          "gallery",
          index
        );

        if (copiedImage.createdStoragePath) {
          createdStoragePaths.push(copiedImage.createdStoragePath);
        }

        const { data: createdImage, error: imageCreateError } = await supabase
          .from("activity_images")
          .insert({
            activity_id: newActivityId,
            image_url: copiedImage.publicUrl,
            alt_text:
              sourceImage.alt_text || `${duplicateTitle} 活動照片`,
            sort_order: sourceImage.sort_order ?? index,
          })
          .select("id, activity_id, image_url, alt_text, sort_order")
          .single();

        if (imageCreateError || !createdImage) {
          throw new Error(
            imageCreateError?.message ||
              `建立第 ${index + 1} 張相簿圖片資料失敗。`
          );
        }

        const sourceImageModelIds = getImageModelIds(sourceImage);

        if (sourceImageModelIds.length > 0) {
          const { error: imageModelInsertError } = await supabase
            .from("activity_image_models")
            .insert(
              sourceImageModelIds.map((modelId) => ({
                activity_image_id: createdImage.id,
                model_id: modelId,
              }))
            );

          if (imageModelInsertError) {
            throw new Error(
              `複製第 ${index + 1} 張圖片的 Model 關聯失敗：${imageModelInsertError.message}`
            );
          }
        }

        copiedGalleryImages.push({
          ...(createdImage as ActivityImage),
          activity_image_models: [],
          modelIds: sourceImageModelIds,
        });
      }

      resetTemporaryUploads();

      setForm({
        ...duplicateForm,
        id: newActivityId,
        cover_image_url: copiedCoverImageUrl,
        images: copiedGalleryImages,
      });

      setFormMessage(
        `已建立「${duplicateTitle}」。請優先修改活動名稱、日期與時間，確認後再發布。`
      );

      setIsEditorOpen(true);

      await loadAdminData();

      setDataMessage(
        `「${activity.title}」已複製為草稿，包含 ${copiedGalleryImages.length} 張 Gallery Images 及其圖中 Model 標記。`
      );
    } catch (error) {
      console.error("Duplicate activity failed:", error);

      if (newActivityId) {
        await cleanupDuplicatedActivity(newActivityId, createdStoragePaths);
      }

      setDataMessage(
        `複製失敗：${
          error instanceof Error ? error.message : "未知錯誤"
        }`
      );
    } finally {
      setDuplicatingActivityId(null);
    }
  }

  async function deleteActivity(activity: ActivityRow) {
    const confirmed = window.confirm(
      `確定永久刪除「${activity.title}」？\n\n活動資料、關聯標籤、每張圖片的 Model 關聯與已上傳圖片都會被移除，此操作不能復原。`
    );

    if (!confirmed) {
      return;
    }

    setDataMessage(`正在刪除「${activity.title}」⋯`);

    try {
      const activityImages = activity.activity_images || [];
      const storageUrls = [
        activity.cover_image_url,
        ...activityImages.map((image) => image.image_url),
      ].filter((url): url is string => Boolean(url));

      await deleteImageModelRelationsByActivityId(activity.id);

      const relationDeleteResults = await Promise.all([
        supabase.from("activity_models").delete().eq("activity_id", activity.id),
        supabase.from("activity_themes").delete().eq("activity_id", activity.id),
        supabase.from("activity_outfits").delete().eq("activity_id", activity.id),
        supabase.from("activity_images").delete().eq("activity_id", activity.id),
      ]);

      const relationError = relationDeleteResults.find(
        (result) => result.error
      )?.error;

      if (relationError) {
        throw new Error(relationError.message);
      }

      const { error: activityDeleteError } = await supabase
        .from("activities")
        .delete()
        .eq("id", activity.id);

      if (activityDeleteError) {
        throw new Error(activityDeleteError.message);
      }

      await Promise.all(storageUrls.map((url) => removeStorageImage(url)));

      if (form.id === activity.id) {
        closeEditor();
      }

      await loadAdminData();
      setDataMessage(`「${activity.title}」已永久刪除。`);
    } catch (error) {
      console.error("Delete activity failed:", error);

      setDataMessage(
        `刪除失敗：${error instanceof Error ? error.message : "未知錯誤"}`
      );
    }
  }

  async function createLookup(
    table: "models" | "themes" | "outfits",
    value: string,
    formKey: "modelIds" | "themeIds" | "outfitIds",
    clearInput: () => void
  ) {
    const cleanName = value.trim();

    if (!cleanName) {
      setFormMessage("請先輸入名稱。");
      return;
    }

    const lookupLabel =
      table === "models"
        ? "Model"
        : table === "themes"
        ? "拍攝主題"
        : "服裝風格";

    setCreatingLookup(table);

    try {
      const { data: existing, error: findError } = await supabase
        .from(table)
        .select("id, name, slug, is_active, sort_order")
        .ilike("name", cleanName)
        .limit(1)
        .maybeSingle();

      if (findError) {
        throw new Error(findError.message);
      }

      let result = existing as BasicOption | null;

      if (!result) {
        const baseSlug = slugify(cleanName);
        const uniqueSlug = `${baseSlug}-${Date.now()}`;

        const { data, error } = await supabase
          .from(table)
          .insert({
            name: cleanName,
            slug: uniqueSlug,
            is_active: true,
            sort_order: 0,
          })
          .select("id, name, slug, is_active, sort_order")
          .single();

        if (error || !data) {
          throw new Error(error?.message || `新增 ${lookupLabel} 失敗。`);
        }

        result = data as BasicOption;
      }

      if (table === "models") {
        setModels((current) =>
          [...current.filter((item) => item.id !== result!.id), result!].sort(
            (a, b) => a.name.localeCompare(b.name, "zh-Hant")
          )
        );
      }

      if (table === "themes") {
        setThemes((current) =>
          [...current.filter((item) => item.id !== result!.id), result!].sort(
            (a, b) => a.name.localeCompare(b.name, "zh-Hant")
          )
        );
      }

      if (table === "outfits") {
        setOutfits((current) =>
          [...current.filter((item) => item.id !== result!.id), result!].sort(
            (a, b) => a.name.localeCompare(b.name, "zh-Hant")
          )
        );
      }

      setForm((current) => ({
        ...current,
        [formKey]: current[formKey].includes(result!.id)
          ? current[formKey]
          : [...current[formKey], result!.id],
      }));

      clearInput();
      setFormMessage(`${lookupLabel}「${result.name}」已加入並選取。`);
    } catch (error) {
      setFormMessage(
        `新增失敗：${error instanceof Error ? error.message : "未知錯誤"}`
      );
    } finally {
      setCreatingLookup("");
    }
  }

  const filteredActivities = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return activities.filter((activity) => {
      const matchedStatus =
        statusFilter === "all" || activity.status === statusFilter;

      const matchedSearch =
        !keyword ||
        activity.title.toLowerCase().includes(keyword) ||
        activity.slug.toLowerCase().includes(keyword) ||
        (activity.location_name || "").toLowerCase().includes(keyword);

      return matchedStatus && matchedSearch;
    });
  }, [activities, searchTerm, statusFilter]);

  const activityStatistics = useMemo(
    () => ({
      total: activities.length,
      published: activities.filter((item) => item.status === "published").length,
      draft: activities.filter((item) => item.status === "draft").length,
      featured: activities.filter((item) => item.is_featured).length,
    }),
    [activities]
  );

  if (isCheckingAuth) {
    return (
      <main className={styles.statePage}>
        <div className={styles.stateCard}>
          <p className={styles.eyebrow}>PHOTOEVENT / ADMIN</p>
          <h1>正在驗證管理員權限⋯</h1>
          <p>系統正在檢查 Supabase Auth 與 profiles.role。</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className={styles.loginPage}>
        <section className={styles.loginBrandPanel}>
          <Link href="/" className={styles.brand}>
            <span className={styles.brandMark}>P</span>
            <span>
              <strong>PHOTO</strong>
              <em>EVENT</em>
            </span>
          </Link>

          <div className={styles.loginBrandContent}>
            <p className={styles.eyebrow}>RESTRICTED AREA</p>
            <h1>活動管理後台</h1>
            <p>
              管理活動資料、攝影主題、Model、服裝標籤，以及 Supabase Storage
              圖片。
            </p>
          </div>

          <p className={styles.loginFooter}>© PhotoEvent Admin Console</p>
        </section>

        <section className={styles.loginFormPanel}>
          <form className={styles.loginForm} onSubmit={handleLogin}>
            <p className={styles.eyebrowDark}>ADMIN ACCESS</p>
            <h2>登入管理帳號</h2>

            <p className={styles.loginHint}>
              請使用已在 Supabase Auth 建立，並於 profiles 設定為 admin 的帳號登入。
            </p>

            {adminEmail && (
              <div className={styles.warningBox}>
                目前登入的帳號 <strong>{adminEmail}</strong> 並沒有 admin 權限。
              </div>
            )}

            {loginMessage && (
              <div
                className={
                  loginMessage.startsWith("登入失敗")
                    ? styles.errorBox
                    : styles.infoBox
                }
              >
                {loginMessage}
              </div>
            )}

            <label className={styles.field}>
              <span>Email</span>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                disabled={loginLoading}
              />
            </label>

            <label className={styles.field}>
              <span>Password</span>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="輸入管理員密碼"
                autoComplete="current-password"
                disabled={loginLoading}
              />
            </label>

            <button
              className={styles.primaryButton}
              type="submit"
              disabled={loginLoading}
            >
              {loginLoading ? "驗證中⋯" : "登入管理後台"}
              <span>→</span>
            </button>

            <Link href="/" className={styles.backHomeLink}>
              ← 返回公開網站
            </Link>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.adminPage}>
      <header className={styles.topbar}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>P</span>
          <span>
            <strong>PHOTO</strong>
            <em>EVENT</em>
          </span>
        </Link>

        <div className={styles.topbarRight}>
          <span className={styles.adminIdentity}>
            ADMIN <strong>{adminEmail}</strong>
          </span>

          <Link href="/" className={styles.publicSiteLink} target="_blank">
            開啟公開網站 ↗
          </Link>

          <button
            className={styles.logoutButton}
            type="button"
            onClick={handleLogout}
          >
            登出
          </button>
        </div>
      </header>

      <section className={styles.dashboardHeader}>
        <div>
          <p className={styles.eyebrow}>CONTROL CENTER</p>
          <h1>活動管理</h1>
          <p>新增、管理及發布 PhotoEvent 攝影活動與活動圖片。</p>
        </div>

        <button
          className={styles.primaryButton}
          type="button"
          onClick={openNewActivityEditor}
        >
          新增活動 <span>＋</span>
        </button>
      </section>

      <section className={styles.statisticsGrid}>
        <article>
          <span>全部活動</span>
          <strong>{activityStatistics.total}</strong>
        </article>
        <article>
          <span>已發布</span>
          <strong>{activityStatistics.published}</strong>
        </article>
        <article>
          <span>草稿</span>
          <strong>{activityStatistics.draft}</strong>
        </article>
        <article>
          <span>首頁精選</span>
          <strong>{activityStatistics.featured}</strong>
        </article>
      </section>

      <section className={styles.activityPanel}>
        <div className={styles.panelToolbar}>
          <div>
            <p className={styles.eyebrowDark}>ACTIVITY DATABASE</p>
            <h2>活動列表</h2>
          </div>

          <div className={styles.toolbarControls}>
            <input
              className={styles.searchInput}
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="搜尋名稱、slug、地點⋯"
            />

            <select
              className={styles.filterSelect}
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
            >
              <option value="all">全部狀態</option>
              <option value="published">已發布</option>
              <option value="draft">草稿</option>
            </select>

            <button
              className={styles.refreshButton}
              type="button"
              onClick={loadAdminData}
              disabled={isLoadingData}
            >
              {isLoadingData ? "更新中⋯" : "重新載入"}
            </button>
          </div>
        </div>

        {dataMessage && <div className={styles.infoBox}>{dataMessage}</div>}

        {isLoadingData ? (
          <div className={styles.emptyState}>正在從 Supabase 載入活動資料⋯</div>
        ) : filteredActivities.length === 0 ? (
          <div className={styles.emptyState}>
            <strong>沒有符合條件的活動。</strong>
            <span>可以按右上方「新增活動」建立第一個活動。</span>
          </div>
        ) : (
          <div className={styles.activityList}>
            {filteredActivities.map((activity) => {
              const activityModels = (activity.activity_models || [])
                .sort((a, b) => a.sort_order - b.sort_order)
                .flatMap((relation) => ensureArray(relation.models));

              const activityThemes = (activity.activity_themes || []).flatMap(
                (relation) => ensureArray(relation.themes)
              );

              const coverImage =
                activity.cover_image_url ||
                activity.activity_images?.[0]?.image_url ||
                "";

              return (
                <article className={styles.activityCard} key={activity.id}>
                  <div className={styles.activityImage}>
                    {coverImage ? (
                      <img src={coverImage} alt={activity.title} />
                    ) : (
                      <span>NO IMAGE</span>
                    )}
                  </div>

                  <div className={styles.activityCardContent}>
                    <div className={styles.activityCardTopline}>
                      <div className={styles.statusRow}>
                        <span
                          className={
                            activity.status === "published"
                              ? styles.publishedBadge
                              : styles.draftBadge
                          }
                        >
                          {activity.status === "published" ? "PUBLISHED" : "DRAFT"}
                        </span>

                        {activity.is_featured && (
                          <span className={styles.featuredBadge}>FEATURED</span>
                        )}
                      </div>

                      <span className={styles.sortLabel}>
                        排序 {activity.sort_order}
                      </span>
                    </div>

                    <h3>{activity.title}</h3>

                    <p className={styles.activityDate}>
                      {formatEventDate(activity.start_at)}
                    </p>

                    <p className={styles.activityLocation}>
                      {activity.location_name || "地點待公布"} ・{" "}
                      {formatPrice(activity.price, activity.currency)}
                    </p>

                    <div className={styles.cardTags}>
                      {getRelationNames(activityModels)
                        .slice(0, 3)
                        .map((name) => (
                          <span key={`model-${activity.id}-${name}`}>{name}</span>
                        ))}

                      {getRelationNames(activityThemes)
                        .slice(0, 3)
                        .map((name) => (
                          <span key={`theme-${activity.id}-${name}`}>{name}</span>
                        ))}
                    </div>
                  </div>

                  <div className={styles.activityCardActions}>
                    {activity.status === "published" && (
                      <Link
                        href={`/events/${activity.slug}`}
                        target="_blank"
                        className={styles.openEventButton}
                      >
                        預覽 ↗
                      </Link>
                    )}

                    <button
                      className={styles.duplicateButton}
                      type="button"
                      onClick={() => void duplicateActivity(activity)}
                      disabled={duplicatingActivityId !== null}
                    >
                      {duplicatingActivityId === activity.id
                        ? "複製中⋯"
                        : "複製活動"}
                    </button>

                    <button
                      className={styles.editButton}
                      type="button"
                      onClick={() => openEditActivityEditor(activity)}
                    >
                      編輯
                    </button>

                    <button
                      className={styles.deleteButton}
                      type="button"
                      onClick={() => void deleteActivity(activity)}
                    >
                      刪除
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {isEditorOpen && (
        <div className={styles.modalBackdrop} role="presentation">
          <section
            className={styles.editorModal}
            role="dialog"
            aria-modal="true"
            aria-label={form.id ? "編輯活動" : "新增活動"}
          >
            <div className={styles.editorHeader}>
              <div>
                <p className={styles.eyebrow}>
                  {form.id ? "EDIT ACTIVITY" : "CREATE ACTIVITY"}
                </p>
                <h2>{form.id ? "編輯活動資料" : "新增活動"}</h2>
              </div>

              <button
                className={styles.closeButton}
                type="button"
                onClick={closeEditor}
                disabled={isSaving}
                aria-label="關閉"
              >
                ×
              </button>
            </div>

            <form className={styles.editorForm} onSubmit={handleSaveActivity}>
              {formMessage && (
                <div
                  className={
                    formMessage.includes("失敗") ||
                    formMessage.includes("請") ||
                    formMessage.includes("必須")
                      ? styles.errorBox
                      : styles.infoBox
                  }
                >
                  {formMessage}
                </div>
              )}

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrowDark}>BASIC INFORMATION</p>
                  <h3>活動基本資料</h3>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={`${styles.field} ${styles.fullWidth}`}>
                    <span>
                      活動名稱 <b>*</b>
                    </span>
                    <input
                      value={form.title}
                      onChange={(event) => handleTitleChange(event.target.value)}
                      placeholder="例如：香港日落人像攝影活動"
                      disabled={isSaving}
                      required
                    />
                  </label>

                  <label className={`${styles.field} ${styles.fullWidth}`}>
                    <span>
                      活動網址 Slug <b>*</b>
                    </span>
                    <div className={styles.slugInputWrap}>
                      <span>/events/</span>
                      <input
                        value={form.slug}
                        onChange={(event) =>
                          updateForm("slug", slugify(event.target.value))
                        }
                        placeholder="hong-kong-sunset-portrait"
                        disabled={isSaving}
                        required
                      />
                    </div>
                  </label>

                  <label className={styles.field}>
                    <span>
                      開始時間（香港時間）<b>*</b>
                    </span>
                    <input
                      type="datetime-local"
                      value={form.start_at}
                      onChange={(event) => updateForm("start_at", event.target.value)}
                      disabled={isSaving}
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    <span>結束時間（香港時間）</span>
                    <input
                      type="datetime-local"
                      value={form.end_at}
                      onChange={(event) => updateForm("end_at", event.target.value)}
                      disabled={isSaving}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>報名截止時間（香港時間）</span>
                    <input
                      type="datetime-local"
                      value={form.registration_deadline}
                      onChange={(event) =>
                        updateForm("registration_deadline", event.target.value)
                      }
                      disabled={isSaving}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>活動排序</span>
                    <input
                      type="number"
                      value={form.sort_order}
                      onChange={(event) =>
                        updateForm("sort_order", event.target.value)
                      }
                      placeholder="0"
                      disabled={isSaving}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>發布狀態</span>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        updateForm(
                          "status",
                          event.target.value as ActivityStatus
                        )
                      }
                      disabled={isSaving}
                    >
                      <option value="draft">Draft（不公開）</option>
                      <option value="published">Published（公開顯示）</option>
                    </select>
                  </label>

                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(event) =>
                        updateForm("is_featured", event.target.checked)
                      }
                      disabled={isSaving}
                    />
                    <span>
                      <strong>設為首頁精選活動</strong>
                      <small>前台首頁可使用 is_featured 顯示此活動。</small>
                    </span>
                  </label>
                </div>

                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>活動簡介</span>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="介紹活動拍攝內容、流程、適合對象與創作方向⋯"
                    rows={5}
                    disabled={isSaving}
                  />
                </label>

                <label className={`${styles.field} ${styles.fullWidth}`}>
                  <span>注意事項／報名說明</span>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateForm("notes", event.target.value)}
                    placeholder="例如：請自備器材、如遇惡劣天氣將另行通知⋯"
                    rows={4}
                    disabled={isSaving}
                  />
                </label>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrowDark}>LOCATION & CONTACT</p>
                  <h3>地點、費用及聯絡資料</h3>
                </div>

                <div className={styles.fieldGrid}>
                  <label className={styles.field}>
                    <span>活動地點名稱</span>
                    <input
                      value={form.location_name}
                      onChange={(event) =>
                        updateForm("location_name", event.target.value)
                      }
                      placeholder="例如：西九文化區"
                      disabled={isSaving}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>活動費用</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.price}
                      onChange={(event) => updateForm("price", event.target.value)}
                      placeholder="例如：350"
                      disabled={isSaving}
                    />
                  </label>

                  <label className={styles.field}>
                    <span>貨幣</span>
                    <select
                      value={form.currency}
                      onChange={(event) =>
                        updateForm("currency", event.target.value)
                      }
                      disabled={isSaving}
                    >
                      <option value="HKD">HKD（HK$）</option>
                      <option value="TWD">TWD（NT$）</option>
                      <option value="USD">USD（US$）</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>聯絡人／主辦名稱</span>
                    <input
                      value={form.contact_name}
                      onChange={(event) =>
                        updateForm("contact_name", event.target.value)
                      }
                      placeholder="例如：PhotoEvent Team"
                      disabled={isSaving}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.fullWidth}`}>
                    <span>詳細地址</span>
                    <input
                      value={form.location_address}
                      onChange={(event) =>
                        updateForm("location_address", event.target.value)
                      }
                      placeholder="例如：九龍尖沙咀西九文化區藝術公園"
                      disabled={isSaving}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.fullWidth}`}>
                    <span>Google Maps／地圖 URL</span>
                    <input
                      type="url"
                      value={form.map_url}
                      onChange={(event) => updateForm("map_url", event.target.value)}
                      placeholder="https://maps.google.com/..."
                      disabled={isSaving}
                    />
                  </label>

                  <label className={`${styles.field} ${styles.fullWidth}`}>
                    <span>聯絡網址</span>
                    <input
                      type="url"
                      value={form.contact_url}
                      onChange={(event) =>
                        updateForm("contact_url", event.target.value)
                      }
                      placeholder="https://instagram.com/... 或 https://forms.gle/..."
                      disabled={isSaving}
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrowDark}>COVER & GALLERY</p>
                  <h3>活動圖片</h3>
                  <p>支援 image/*，每張圖片最大 10 MB。</p>
                </div>

                <div className={styles.imageUploadGrid}>
                  <div className={styles.coverUploadArea}>
                    <span className={styles.uploadLabel}>Cover Image</span>

                    <div className={styles.coverPreview}>
                      {coverPreviewUrl || form.cover_image_url ? (
                        <img
                          src={coverPreviewUrl || form.cover_image_url}
                          alt="活動 Cover Preview"
                        />
                      ) : (
                        <span>尚未設定 Cover Image</span>
                      )}
                    </div>

                    <label className={styles.uploadButton}>
                      {coverFile ? "更換已選擇圖片" : "選擇 Cover Image"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverFileChange}
                        disabled={isSaving}
                      />
                    </label>

                    {coverFile && (
                      <small className={styles.fileName}>{coverFile.name}</small>
                    )}
                  </div>

                  <div className={styles.galleryUploadArea}>
                    <span className={styles.uploadLabel}>Gallery Images</span>

                    <label className={styles.galleryDropZone}>
                      <strong>＋ 選擇多張相簿圖片</strong>
                      <small>
                        可一次選擇多張，儲存活動時會上傳至 Supabase Storage。
                      </small>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryFilesChange}
                        disabled={isSaving}
                      />
                    </label>

                    {(form.images.length > 0 || galleryPreviewUrls.length > 0) && (
                      <div className={styles.galleryGrid}>
                        {form.images.map((image) => (
                          <div className={styles.galleryItem} key={image.id}>
                            <img
                              src={image.image_url}
                              alt={image.alt_text || "活動圖片"}
                            />

                            <button
                              type="button"
                              onClick={() => void deleteGalleryImage(image)}
                              disabled={isSaving}
                              aria-label="刪除圖片"
                            >
                              ×
                            </button>

                            <span>已上傳</span>

                            <div
                              style={{
                                width: "100%",
                                marginTop: "10px",
                                paddingTop: "10px",
                                borderTop: "1px solid rgba(0, 0, 0, 0.12)",
                              }}
                            >
                              <strong
                                style={{
                                  display: "block",
                                  marginBottom: "7px",
                                  fontSize: "12px",
                                }}
                              >
                                圖中 Model
                              </strong>

                              {models.length === 0 ? (
                                <small>尚未建立任何 Model。</small>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: "6px",
                                  }}
                                >
                                  {models.map((model) => {
                                    const selected = image.modelIds.includes(
                                      model.id
                                    );

                                    return (
                                      <button
                                        key={`${image.id}-${model.id}`}
                                        type="button"
                                        onClick={() =>
                                          toggleImageModel(image.id, model.id)
                                        }
                                        disabled={isSaving}
                                        style={{
                                          position: "static",
                                          width: "auto",
                                          height: "auto",
                                          padding: "5px 7px",
                                          borderRadius: "0",
                                          border: selected
                                            ? "1px solid #8d6327"
                                            : "1px solid #c9c2b6",
                                          color: selected ? "#ffffff" : "#4c453a",
                                          background: selected
                                            ? "#8d6327"
                                            : "#ffffff",
                                          fontSize: "12px",
                                          lineHeight: 1.2,
                                        }}
                                      >
                                        {selected ? "✓ " : "+ "}
                                        {model.name}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {galleryPreviewUrls.map((url, index) => (
                          <div
                            className={`${styles.galleryItem} ${styles.queuedGalleryItem}`}
                            key={`${url}-${index}`}
                          >
                            <img src={url} alt={`準備上傳圖片 ${index + 1}`} />

                            <button
                              type="button"
                              onClick={() => removeQueuedGalleryImage(index)}
                              disabled={isSaving}
                              aria-label="移除待上傳圖片"
                            >
                              ×
                            </button>

                            <span>待上傳</span>

                            <small
                              style={{
                                display: "block",
                                width: "100%",
                                marginTop: "9px",
                                color: "#6c655c",
                                fontSize: "11px",
                                lineHeight: 1.5,
                              }}
                            >
                              儲存活動後即可為此圖片選擇圖中 Model。
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <p className={styles.eyebrowDark}>CREATIVE SETTINGS</p>
                  <h3>Model、拍攝主題及服裝風格</h3>
                </div>

                <div className={styles.lookupGrid}>
                  <LookupSelector
                    title="Models"
                    description="選擇本次拍攝的 Model。"
                    items={models}
                    selectedIds={form.modelIds}
                    onToggle={(id) => toggleMultiSelect("modelIds", id)}
                    newValue={newModelName}
                    onNewValueChange={setNewModelName}
                    onCreate={() =>
                      void createLookup(
                        "models",
                        newModelName,
                        "modelIds",
                        () => setNewModelName("")
                      )
                    }
                    isCreating={creatingLookup === "models"}
                    disabled={isSaving}
                  />

                  <LookupSelector
                    title="拍攝主題"
                    description="例如：人像、日落、街拍、棚拍。"
                    items={themes}
                    selectedIds={form.themeIds}
                    onToggle={(id) => toggleMultiSelect("themeIds", id)}
                    newValue={newThemeName}
                    onNewValueChange={setNewThemeName}
                    onCreate={() =>
                      void createLookup(
                        "themes",
                        newThemeName,
                        "themeIds",
                        () => setNewThemeName("")
                      )
                    }
                    isCreating={creatingLookup === "themes"}
                    disabled={isSaving}
                  />

                  <LookupSelector
                    title="服裝風格"
                    description="例如：Casual、泳裝、復古、制服。"
                    items={outfits}
                    selectedIds={form.outfitIds}
                    onToggle={(id) => toggleMultiSelect("outfitIds", id)}
                    newValue={newOutfitName}
                    onNewValueChange={setNewOutfitName}
                    onCreate={() =>
                      void createLookup(
                        "outfits",
                        newOutfitName,
                        "outfitIds",
                        () => setNewOutfitName("")
                      )
                    }
                    isCreating={creatingLookup === "outfits"}
                    disabled={isSaving}
                  />
                </div>
              </section>

              <div className={styles.editorFooter}>
                <div>
                  {form.id && form.status === "published" && (
                    <Link
                      href={`/events/${form.slug}`}
                      target="_blank"
                      className={styles.previewLink}
                    >
                      開啟公開活動頁 ↗
                    </Link>
                  )}
                </div>

                <div className={styles.editorFooterButtons}>
                  <button
                    className={styles.cancelButton}
                    type="button"
                    onClick={closeEditor}
                    disabled={isSaving}
                  >
                    取消
                  </button>

                  <button
                    className={styles.primaryButton}
                    type="submit"
                    disabled={isSaving}
                  >
                    {isSaving
                      ? "儲存中⋯"
                      : form.id
                      ? "儲存活動變更"
                      : "建立活動"}
                    <span>→</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

type LookupSelectorProps = {
  title: string;
  description: string;
  items: BasicOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  newValue: string;
  onNewValueChange: (value: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  disabled: boolean;
};

function LookupSelector({
  title,
  description,
  items,
  selectedIds,
  onToggle,
  newValue,
  onNewValueChange,
  onCreate,
  isCreating,
  disabled,
}: LookupSelectorProps) {
  return (
    <div className={styles.lookupSelector}>
      <div className={styles.lookupHeader}>
        <h4>{title}</h4>
        <p>{description}</p>
      </div>

      <div className={styles.optionList}>
        {items.length === 0 ? (
          <span className={styles.noOptions}>尚未建立任何選項。</span>
        ) : (
          items.map((item) => {
            const selected = selectedIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                className={selected ? styles.selectedOption : styles.optionButton}
                onClick={() => onToggle(item.id)}
                disabled={disabled}
              >
                <span>{selected ? "✓" : "+"}</span>
                {item.name}
              </button>
            );
          })
        )}
      </div>

      <div className={styles.newLookupRow}>
        <input
          value={newValue}
          onChange={(event) => onNewValueChange(event.target.value)}
          placeholder={`新增 ${title}`}
          disabled={disabled || isCreating}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onCreate();
            }
          }}
        />

        <button
          type="button"
          onClick={onCreate}
          disabled={disabled || isCreating || !newValue.trim()}
        >
          {isCreating ? "⋯" : "新增"}
        </button>
      </div>
    </div>
  );
}