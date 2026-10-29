import { expect, test } from "@playwright/test";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  installModelProfileMocks,
  MOCK_IMAGE_ORIGIN,
  MOCK_PNG_BYTES,
} from "./model-profile.mock";

const image = (name: string) => `${MOCK_IMAGE_ORIGIN}/${name}.png`;
const screenshotDirectory = path.join(
  "test-results",
  "mock-ui-screenshots",
);

async function loginToModelAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin");
  await page.getByLabel("Email").fill("mock-admin@example.invalid");
  await page.getByLabel("Password").fill("mock-password");
  await page.getByRole("button", { name: "登入管理後台" }).click();
  await page.getByRole("link", { name: "Model 管理" }).click();
  await expect(
    page.getByRole("heading", { name: "Model 個人檔案" }),
  ).toBeVisible();
}

test("manual headed mock preview", async ({ page }) => {
  const network = await installModelProfileMocks(page);
  await page.goto("/models");
  await expect(page.getByRole("heading", { name: "全部 Models" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "查看 空白相片測試 的個人頁" }),
  ).toBeVisible();
  expect(network.blockedExternalRequests).toEqual([]);
  await page.pause();
});

async function captureLabeledScreenshot(
  page: import("@playwright/test").Page,
  filename: string,
) {
  mkdirSync(screenshotDirectory, { recursive: true });
  await page.addStyleTag({
    content: `
      body::before {
        content: "MOCK DATA - NOT REAL";
        position: fixed;
        z-index: 2147483647;
        top: 0;
        left: 0;
        padding: 6px 12px;
        background: #9c1c1c;
        color: #fff;
        font: 700 12px/1.2 sans-serif;
        letter-spacing: .04em;
      }
    `,
  });
  await page.screenshot({
    path: path.join(screenshotDirectory, filename),
    fullPage: false,
  });
}

test("blank profile photos use only tagged published activity images on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const network = await installModelProfileMocks(page);

  await page.goto("/models/blank-model");

  await expect(
    page.getByRole("heading", { name: "空白相片測試", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".model-profile-hero img")).toHaveAttribute(
    "src",
    image("blank-newest-first"),
  );
  await expect(page.locator("#portfolio .section-heading span")).toHaveText(
    "3 張",
  );
  await expect(page.locator("#portfolio img")).toHaveCount(3);
  await expect(page.locator("body")).not.toContainText("draft-must-not-show");
  await expect(page.locator("body")).not.toContainText("只供測試的私密簡介");
  await captureLabeledScreenshot(page, "model-profile-mobile.png");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(network.blockedExternalRequests).toEqual([]);
});

test("manual avatar and gallery stay separate from activity fallback", async ({
  page,
}) => {
  const network = await installModelProfileMocks(page);

  await page.goto("/models/manual-model");

  await expect(page.locator(".model-profile-hero img")).toHaveAttribute(
    "src",
    image("manual-main"),
  );
  await expect(page.locator("#portfolio .section-heading span")).toHaveText(
    "1 張",
  );
  await expect(page.locator("#portfolio img")).toHaveAttribute(
    "src",
    image("manual-gallery"),
  );
  await captureLabeledScreenshot(page, "model-profile-desktop.png");
  await expect(page.locator("body")).not.toContainText(
    "tagged-but-manual-wins",
  );
  expect(network.blockedExternalRequests).toEqual([]);
});

test("broken main photo falls back and unusable photos become placeholders", async ({
  page,
}) => {
  const network = await installModelProfileMocks(page);

  await page.goto("/models/broken-model");
  await expect(page.locator(".model-profile-hero img")).toHaveAttribute(
    "src",
    image("broken-model-activity-fallback"),
  );

  await page.goto("/models/empty-model");
  await expect(
    page.getByRole("img", { name: "全部相片失效測試 暫無相片" }),
  ).toHaveCount(2);
  expect(network.blockedExternalRequests).toEqual([]);
});

test("selected photos preview locally and mock storage serves saved image bytes", async ({
  page,
}) => {
  const network = await installModelProfileMocks(page);
  await loginToModelAdmin(page);

  await page.getByRole("button", { name: "空白相片測試" }).click();
  const avatarFile = {
    name: "mock-avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(MOCK_PNG_BYTES),
  };
  await page.getByLabel("上傳／更換主要相片").setInputFiles(avatarFile);
  const mainPhotoPreview = page.locator("form img").first();
  await expect(mainPhotoPreview).toHaveAttribute("src", /^blob:/);
  await expect(mainPhotoPreview).toHaveJSProperty("naturalWidth", 1);
  await expect(page.getByText("待上傳：mock-avatar.png")).toBeVisible();
  expect(network.storageUploads).toEqual([]);

  await page.getByRole("button", { name: "儲存個人檔案" }).click();
  await expect(page.getByRole("status")).toContainText("已儲存");
  expect(network.modelUpdates).toHaveLength(1);
  expect(network.modelUpdates[0].avatar_url).toMatch(
    /^https:\/\/model-profile-mock\.invalid\/storage\/v1\/object\/public\/model-images\/model-blank\/avatar\/.+\.png$/,
  );
  expect(network.storageUploads).toHaveLength(1);
  expect(network.storageObjects).toEqual([
    expect.objectContaining({
      path: expect.stringMatching(/^model-blank\/avatar\/.+\.png$/),
      contentType: "image/png",
      byteLength: MOCK_PNG_BYTES.length,
    }),
  ]);
  expect(network.storageDownloads).toHaveLength(1);
  expect(network.blockedExternalRequests).toEqual([]);
  await expect(mainPhotoPreview).toHaveAttribute(
    "src",
    /^https:\/\/model-profile-mock\.invalid\/storage\/v1\/object\/public\/model-images\/model-blank\/avatar\/.+\.png$/,
  );
  await expect(mainPhotoPreview).toHaveJSProperty("naturalWidth", 1);
  const savedAvatarUrl = await mainPhotoPreview.getAttribute("src");
  if (!savedAvatarUrl) throw new Error("Saved mock avatar URL is missing.");
  expect(network.storageUploads).toHaveLength(1);
  expect(network.storageDownloads).toHaveLength(1);

  await page.goto("/models/blank-model");
  const publicAvatar = page.locator(".model-profile-hero img");
  await expect(publicAvatar).toHaveAttribute("src", savedAvatarUrl);
  await expect(publicAvatar).toHaveJSProperty("naturalWidth", 1);
  expect(network.blockedExternalRequests).toEqual([]);
});

test("admin mock preserves authorization flow and rejects an eleventh gallery image", async ({
  page,
}) => {
  const network = await installModelProfileMocks(page);

  await loginToModelAdmin(page);
  const search = page.getByRole("searchbox", {
    name: "搜尋 Model 名稱或 slug",
  });
  await search.fill("ten-model");
  await expect(
    page.getByRole("button", { name: "十張相簿測試" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "空白相片測試" }),
  ).toHaveCount(0);
  await search.clear();
  await page.getByRole("button", { name: "十張相簿測試" }).click();
  await expect(page.getByLabel("名字")).toHaveValue("十張相簿測試");
  await expect(page.locator("form ol li")).toHaveCount(10);
  await page.locator("form ol").scrollIntoViewIfNeeded();
  await captureLabeledScreenshot(page, "model-admin-desktop.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await captureLabeledScreenshot(page, "model-admin-mobile.png");

  await page.getByLabel("新增其他相片").setInputFiles({
    name: "eleventh.png",
    mimeType: "image/png",
    buffer: Buffer.from(MOCK_PNG_BYTES),
  });
  await expect(page.locator('img[src^="blob:"]')).toHaveCount(1);
  await page.getByRole("button", { name: "儲存個人檔案" }).click();

  await expect(page.getByRole("status")).toContainText("其他相片最多 10 張");
  expect(network.storageUploads).toEqual([]);
  expect(network.databaseWrites).toEqual([]);
  expect(network.blockedExternalRequests).toEqual([]);
});
