import test from "node:test";
import assert from "node:assert/strict";
import {
  selectModelPhotos,
  type TaggedPhoto,
} from "../lib/model-photo-selection";
import { getModelImage } from "../lib/model-image";
const photos: TaggedPhoto[] = [
  {
    modelId: "a",
    url: "old",
    startAt: "2026-09-01T00:00:00+00:00",
    sortOrder: 0,
  },
  {
    modelId: "a",
    url: "second",
    startAt: "2026-10-01T00:00:00+00:00",
    sortOrder: 2,
  },
  {
    modelId: "a",
    url: "first",
    startAt: "2026-10-01T00:00:00+00:00",
    sortOrder: 1,
  },
];
test("manual avatar always wins, manual gallery stays separate", () => {
  const result = selectModelPhotos(" avatar ", [" own ", "own"], photos);
  assert.equal(result.main, "avatar");
  assert.deepEqual(result.gallery, ["own"]);
});
test("blank avatar/gallery use newest tagged activity, then image sort order", () => {
  const result = selectModelPhotos("   ", [], photos);
  assert.equal(result.main, "first");
  assert.deepEqual(result.gallery, ["first", "second", "old"]);
});
test("empty data remains honest, not another model's photo", () => {
  assert.deepEqual(selectModelPhotos(null, null, []), {
    main: "",
    gallery: [],
    activityPhotos: [],
  });
  assert.equal(getModelImage(null, "test"), "/images/models/placeholder.svg");
});
test("manual gallery is capped at ten, no minimum-five requirement", () => {
  assert.equal(
    selectModelPhotos(
      null,
      Array.from({ length: 12 }, (_, i) => String(i)),
      [],
    ).gallery.length,
    10,
  );
  assert.equal(selectModelPhotos(null, ["one"], []).gallery.length, 1);
});
test("activity fallback deduplicates and caps at ten", () => {
  const many = Array.from({ length: 15 }, (_, i) => ({
    ...photos[0],
    url: `p${i}`,
  }));
  const result = selectModelPhotos(null, [], [...many, ...many]);
  assert.equal(result.gallery.length, 10);
  assert.equal(result.activityPhotos.length, 15);
});
test("empty model list does not request all tags", async () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "test-key";
  const { loadTaggedModelPhotos } = await import("../lib/model-photos");
  assert.deepEqual(await loadTaggedModelPhotos([]), []);
});
test("activity dates are compared as instants, not timezone strings", () => {
  const result = selectModelPhotos(
    null,
    [],
    [
      { ...photos[0], url: "earlier", startAt: "2026-10-01T09:00:00+08:00" },
      { ...photos[0], url: "later", startAt: "2026-10-01T02:00:00Z" },
    ],
  );
  assert.equal(result.main, "later");
});
