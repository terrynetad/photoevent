const DEFAULT_MODEL_IMAGES = [
  "/images/models/image1.jpeg",
  "/images/models/image2.jpeg",
  "/images/models/image3.jpeg",
  "/images/models/image4.jpeg",
];

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash);
}

/**
 * 有 avatar_url 時優先使用資料庫內的真人相片。
 * 沒有 avatar_url 時，依 slug / id 固定分配本機預設相片。
 */
export function getModelImage(
  avatarUrl: string | null | undefined,
  seed: string
) {
  const imageUrl = avatarUrl?.trim();

  if (imageUrl) {
    return imageUrl;
  }

  const safeSeed = seed?.trim() || "default-model";

  return DEFAULT_MODEL_IMAGES[
    hashText(safeSeed) % DEFAULT_MODEL_IMAGES.length
  ];
}