import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "缺少 Supabase 環境變數。請檢查專案根目錄的 .env.local 檔案。"
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);