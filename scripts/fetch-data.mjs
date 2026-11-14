// Artificial Analysis の無料APIからモデル一覧を取得し、models.json を生成する。
// 使い方: AA_API_KEY=<キー> node scripts/fetch-data.mjs
// GitHub Actions からは Secrets の AA_API_KEY を環境変数で渡す。
//
// 注意:
// - 無料枠は 1日あたりのリクエスト上限が小さい（目安100回/日）。このスクリプトは数回しか叩かない。
// - フィールド名は 2026-11 時点の API v2 の形に合わせた推定を含む。
//   初回実行時に実レスポンスを見て、合わない項目があれば mapping を直すこと。
// - データの出典表示が必須（ページ側フッターに明記済み）。

import { writeFileSync } from "node:fs";

const API_KEY = process.env.AA_API_KEY;
if (!API_KEY) {
  console.error("AA_API_KEY が未設定です。artificialanalysis.ai で無料キーを発行してください。");
  process.exit(1);
}

const BASE = "https://artificialanalysis.ai/api/v2/language/models/free";

async function fetchPage(page) {
  const url = page > 1 ? `${BASE}?page=${page}` : BASE;
  const res = await fetch(url, { headers: { "x-api-key": API_KEY } });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

function familyOf(name) {
  // "Claude Fable 5.2 (max)" -> "Claude Fable 5.2" のように末尾の (...) を落とす
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function num(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function mapModel(m) {
  const name = m.name ?? "";
  const ev = m.evaluations ?? {};
  const intelligence = num(ev.artificial_analysis_intelligence_index);
  if (!name || intelligence === null) return null;
  const pricing = m.pricing ?? {};
  const pin = num(pricing.price_1m_input_tokens);
  const pout = num(pricing.price_1m_output_tokens);
  // 混合価格の目安: 入力:出力 = 3:1 で加重平均（Artificial Analysis の blended と同方式）
  const price1m = pin !== null && pout !== null ? (pin * 3 + pout) / 4 : pin ?? pout;
  const cost = m.artificial_analysis_intelligence_index_cost ?? {};
  const costPerTask = num(cost.cost_per_task?.total_cost) ?? num(cost.cost_per_task);
  const speed =
    num(m.median_output_tokens_per_second) ??
    num(m.performance?.median_output_tokens_per_second) ??
    null;
  return {
    name,
    family: familyOf(name),
    maker: m.model_creator?.name ?? m.model_creator?.id ?? "",
    intelligence,
    price1m,
    costPerTask,
    speed,
  };
}

const first = await fetchPage(1);
const totalPages = first.pagination?.total_pages ?? 1;
let raw = [...(first.data ?? [])];
for (let p = 2; p <= totalPages; p++) {
  const page = await fetchPage(p);
  raw = raw.concat(page.data ?? []);
}

const models = raw.map(mapModel).filter(Boolean);
models.sort((a, b) => b.intelligence - a.intelligence);

const out = {
  updated: new Date().toISOString().slice(0, 10),
  source: "Artificial Analysis",
  indexVersion: first.intelligence_index_version ?? null,
  models,
};
writeFileSync(new URL("../models.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`models.json を生成しました（${models.length} 件）`);
