import type { Page, Route } from "@playwright/test";

export const MOCK_SUPABASE_URL = "https://model-profile-mock.invalid";
export const MOCK_IMAGE_ORIGIN = "https://model-profile-images.invalid";
export const MOCK_APP_URL = `http://127.0.0.1:${process.env.MOCK_UI_PORT ?? "4317"}`;

type MockModel = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
  gallery_urls: string[];
  is_active: boolean;
  sort_order: number;
};

const image = (name: string) => `${MOCK_IMAGE_ORIGIN}/${name}.png`;
const brokenImages = new Set([
  "/broken-main.png",
  "/broken-empty-main.png",
  "/broken-empty-activity.png",
]);

const initialModels: MockModel[] = [
  {
    id: "model-blank",
    name: "空白相片測試",
    slug: "blank-model",
    bio: "只供測試的私密簡介",
    avatar_url: null,
    gallery_urls: [],
    is_active: true,
    sort_order: 0,
  },
  {
    id: "model-manual",
    name: "手選相片測試",
    slug: "manual-model",
    bio: null,
    avatar_url: image("manual-main"),
    gallery_urls: [image("manual-gallery")],
    is_active: true,
    sort_order: 1,
  },
  {
    id: "model-broken",
    name: "失效主要相片測試",
    slug: "broken-model",
    bio: null,
    avatar_url: image("broken-main"),
    gallery_urls: [],
    is_active: true,
    sort_order: 2,
  },
  {
    id: "model-empty",
    name: "全部相片失效測試",
    slug: "empty-model",
    bio: null,
    avatar_url: image("broken-empty-main"),
    gallery_urls: [],
    is_active: true,
    sort_order: 3,
  },
  {
    id: "model-ten",
    name: "十張相簿測試",
    slug: "ten-model",
    bio: null,
    avatar_url: image("ten-main"),
    gallery_urls: Array.from({ length: 10 }, (_, index) =>
      image(`ten-gallery-${index + 1}`),
    ),
    is_active: true,
    sort_order: 4,
  },
];

type TaggedImage = {
  model_id: string;
  activity_images: {
    image_url: string;
    sort_order: number;
    activities: { start_at: string; status: "published" | "draft" };
  };
};

const taggedImages: TaggedImage[] = [
  {
    model_id: "model-blank",
    activity_images: {
      image_url: image("blank-newest-first"),
      sort_order: 0,
      activities: {
        start_at: "2026-10-25T10:00:00+08:00",
        status: "published",
      },
    },
  },
  {
    model_id: "model-blank",
    activity_images: {
      image_url: image("blank-newest-second"),
      sort_order: 1,
      activities: {
        start_at: "2026-10-25T10:00:00+08:00",
        status: "published",
      },
    },
  },
  {
    model_id: "model-blank",
    activity_images: {
      image_url: image("blank-older"),
      sort_order: 0,
      activities: {
        start_at: "2026-10-01T10:00:00+08:00",
        status: "published",
      },
    },
  },
  {
    model_id: "model-blank",
    activity_images: {
      image_url: image("draft-must-not-show"),
      sort_order: 0,
      activities: {
        start_at: "2026-10-26T10:00:00+08:00",
        status: "draft",
      },
    },
  },
  {
    model_id: "model-manual",
    activity_images: {
      image_url: image("tagged-but-manual-wins"),
      sort_order: 0,
      activities: {
        start_at: "2026-10-26T10:00:00+08:00",
        status: "published",
      },
    },
  },
  {
    model_id: "model-broken",
    activity_images: {
      image_url: image("broken-model-activity-fallback"),
      sort_order: 0,
      activities: {
        start_at: "2026-10-26T10:00:00+08:00",
        status: "published",
      },
    },
  },
  {
    model_id: "model-empty",
    activity_images: {
      image_url: image("broken-empty-activity"),
      sort_order: 0,
      activities: {
        start_at: "2026-10-26T10:00:00+08:00",
        status: "published",
      },
    },
  },
  {
    model_id: "model-ten",
    activity_images: {
      image_url: image("ten-tagged-fallback"),
      sort_order: 0,
      activities: {
        start_at: "2026-10-26T10:00:00+08:00",
        status: "published",
      },
    },
  },
];

const testUser = {
  id: "mock-admin",
  aud: "authenticated",
  role: "authenticated",
  email: "mock-admin@example.invalid",
  email_confirmed_at: "2026-10-01T00:00:00.000Z",
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  identities: [],
  created_at: "2026-10-01T00:00:00.000Z",
};

export const MOCK_PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGO4fmLrfwAIIgNUd+ibTQAAAABJRU5ErkJggg==",
  "base64",
);

export type MockNetworkLog = {
  blockedExternalRequests: string[];
  databaseWrites: string[];
  modelUpdates: Partial<MockModel>[];
  storageUploads: string[];
  storageDownloads: string[];
  storageObjects: Array<{
    path: string;
    contentType: string;
    byteLength: number;
  }>;
};

function matchesFilter(value: string | null, actual: string) {
  if (!value) return true;
  if (value.startsWith("eq.")) return actual === value.slice(3);
  if (value.startsWith("in.("))
    return value
      .slice(4, -1)
      .split(",")
      .map((item) => item.replace(/^"|"$/g, ""))
      .includes(actual);
  return true;
}

function corsHeaders(origin: string) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
    "access-control-allow-headers":
      "apikey,authorization,content-type,x-client-info,prefer,accept-profile,content-profile,range,x-upsert",
    "access-control-max-age": "86400",
  };
}

async function fulfillJson(
  route: Route,
  origin: string,
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
) {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: { ...corsHeaders(origin), ...headers },
    body: JSON.stringify(body),
  });
}

function getUploadedFile(
  request: import("@playwright/test").Request,
): { bytes: Buffer; contentType: string } | null {
  const body = request.postDataBuffer();
  if (!body?.length) return null;

  const requestContentType = request.headers()["content-type"] ?? "";
  const boundaryMatch = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(
    requestContentType,
  );
  if (!boundaryMatch) {
    return { bytes: Buffer.from(body), contentType: requestContentType };
  }

  const boundary = Buffer.from(`--${boundaryMatch[1] ?? boundaryMatch[2]}`);
  const headerSeparator = Buffer.from("\r\n\r\n");
  let offset = 0;
  while (offset < body.length) {
    const boundaryStart = body.indexOf(boundary, offset);
    if (boundaryStart < 0) return null;
    let headerStart = boundaryStart + boundary.length;
    if (body.subarray(headerStart, headerStart + 2).toString() === "--")
      return null;
    if (body.subarray(headerStart, headerStart + 2).toString() === "\r\n")
      headerStart += 2;
    const headerEnd = body.indexOf(headerSeparator, headerStart);
    if (headerEnd < 0) return null;
    const headers = body.subarray(headerStart, headerEnd).toString("utf8");
    const contentStart = headerEnd + headerSeparator.length;
    const nextBoundary = body.indexOf(boundary, contentStart);
    if (nextBoundary < 0) return null;
    const contentEnd =
      body.subarray(nextBoundary - 2, nextBoundary).toString() === "\r\n"
        ? nextBoundary - 2
        : nextBoundary;

    if (/content-disposition:\s*form-data;[^\r\n]*\bfilename=/i.test(headers)) {
      const partContentType =
        /^content-type:\s*(.+)$/im.exec(headers)?.[1]?.trim() ??
        "application/octet-stream";
      return {
        bytes: Buffer.from(body.subarray(contentStart, contentEnd)),
        contentType: partContentType,
      };
    }
    offset = nextBoundary;
  }
  return null;
}

export async function installModelProfileMocks(
  page: Page,
): Promise<MockNetworkLog> {
  const log: MockNetworkLog = {
    blockedExternalRequests: [],
    databaseWrites: [],
    modelUpdates: [],
    storageUploads: [],
    storageDownloads: [],
    storageObjects: [],
  };
  const models = structuredClone(initialModels);
  const storedFiles = new Map<
    string,
    { bytes: Buffer; contentType: string }
  >();
  const apiOrigin = new URL(MOCK_SUPABASE_URL).origin;
  const imageOrigin = new URL(MOCK_IMAGE_ORIGIN).origin;
  const appOrigin = new URL(MOCK_APP_URL).origin;
  const mockedAssetOrigins = new Set([
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://images.unsplash.com",
  ]);

  await page.context().route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (url.origin === appOrigin) {
      await route.continue();
      return;
    }

    if (url.origin === imageOrigin) {
      if (brokenImages.has(url.pathname)) {
        await route.fulfill({ status: 404, contentType: "image/png", body: "" });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "image/png",
        body: MOCK_PNG_BYTES,
      });
      return;
    }

    if (mockedAssetOrigins.has(url.origin)) {
      await route.fulfill({
        status: 200,
        contentType:
          url.origin === "https://fonts.googleapis.com"
            ? "text/css"
            : url.origin === "https://fonts.gstatic.com"
              ? "font/woff2"
              : "image/png",
        body: url.origin === "https://images.unsplash.com" ? MOCK_PNG_BYTES : "",
      });
      return;
    }

    if (url.origin !== apiOrigin) {
      log.blockedExternalRequests.push(url.href);
      await route.abort("blockedbyclient");
      return;
    }

    const origin = appOrigin;
    const method = request.method();
    const pathname = url.pathname;
    if (method === "OPTIONS") {
      await route.fulfill({
        status: 204,
        headers: corsHeaders(origin),
        body: "",
      });
      return;
    }

    if (pathname === "/auth/v1/user" && method === "GET") {
      await fulfillJson(route, origin, testUser);
      return;
    }

    if (pathname === "/auth/v1/token" && method === "POST") {
      await fulfillJson(route, origin, {
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: "mock-refresh-token",
        user: testUser,
      });
      return;
    }

    if (pathname === "/rest/v1/profiles" && method === "GET") {
      await fulfillJson(route, origin, {
        role: "admin",
        email: testUser.email,
      });
      return;
    }

    if (pathname === "/rest/v1/models") {
      if (method === "PATCH" || method === "POST" || method === "DELETE")
        log.databaseWrites.push(`${method} ${url.pathname}${url.search}`);

      const idFilter = url.searchParams.get("id");
      const slugFilter = url.searchParams.get("slug");
      let matched = models.filter(
        (model) =>
          matchesFilter(idFilter, model.id) &&
          matchesFilter(slugFilter, model.slug) &&
          matchesFilter(
            url.searchParams.get("is_active"),
            String(model.is_active),
          ),
      );

      if (method === "PATCH") {
        const changes = request.postDataJSON() as Partial<MockModel>;
        log.modelUpdates.push(changes);
        if (matched[0]) Object.assign(matched[0], changes);
      } else if (method === "POST") {
        const created = request.postDataJSON() as MockModel;
        models.push(created);
        matched = [created];
      }

      const accept = request.headers()["accept"] ?? "";
      const singular = accept.includes("application/vnd.pgrst.object+json");
      const responseBody = singular ? (matched[0] ?? null) : matched;
      await fulfillJson(
        route,
        origin,
        responseBody,
        200,
        singular ? { "content-range": "0-0/1" } : {},
      );
      return;
    }

    if (pathname === "/rest/v1/activity_image_models" && method === "GET") {
      const modelFilter = url.searchParams.get("model_id");
      const publishedOnly =
        url.searchParams.get("activity_images.activities.status") ===
        "eq.published";
      const rows = taggedImages.filter(
        (tag) =>
          matchesFilter(modelFilter, tag.model_id) &&
          (!publishedOnly ||
            tag.activity_images.activities.status === "published"),
      );
      await fulfillJson(route, origin, rows);
      return;
    }

    if (pathname.startsWith("/rest/v1/")) {
      const table = pathname.slice("/rest/v1/".length);
      const allowedEmptyTables = new Set([
        "activities",
        "activity_models",
        "activity_images",
        "activity_themes",
        "activity_outfits",
        "themes",
        "outfits",
      ]);
      if (method === "GET" && allowedEmptyTables.has(table)) {
        await fulfillJson(route, origin, []);
        return;
      }
    }

    const uploadPrefix = "/storage/v1/object/model-images/";
    if (pathname.startsWith(uploadPrefix) && method === "POST") {
      log.storageUploads.push(pathname);
      const objectPath = pathname.slice(uploadPrefix.length);
      const uploadedFile = getUploadedFile(request);
      if (!uploadedFile?.bytes.length) {
        await fulfillJson(
          route,
          origin,
          { message: "Mock upload did not contain a file" },
          400,
        );
        return;
      }
      storedFiles.set(objectPath, {
        bytes: uploadedFile.bytes,
        contentType: uploadedFile.contentType,
      });
      log.storageObjects.push({
        path: objectPath,
        contentType: uploadedFile.contentType,
        byteLength: uploadedFile.bytes.length,
      });
      await fulfillJson(route, origin, { Key: `model-images/${objectPath}` });
      return;
    }

    const publicImagePrefix = "/storage/v1/object/public/model-images/";
    if (pathname.startsWith(publicImagePrefix) && method === "GET") {
      const objectPath = pathname.slice(publicImagePrefix.length);
      const storedFile = storedFiles.get(objectPath);
      if (!storedFile) {
        await fulfillJson(route, origin, { message: "Mock image not found" }, 404);
        return;
      }
      log.storageDownloads.push(pathname);
      await route.fulfill({
        status: 200,
        contentType: storedFile.contentType,
        headers: corsHeaders(origin),
        body: storedFile.bytes,
      });
      return;
    }

    log.blockedExternalRequests.push(url.href);
    await route.abort("blockedbyclient");
  });

  return log;
}
