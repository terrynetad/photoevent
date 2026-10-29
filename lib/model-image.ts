/** Preserve the public helper API, but never substitute an unrelated person's photo. */
export function getModelImage(
  avatarUrl: string | null | undefined,
  _seed: string,
) {
  void _seed;
  return avatarUrl?.trim() || "/images/models/placeholder.svg";
}
