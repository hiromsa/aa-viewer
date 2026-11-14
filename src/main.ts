// AIモデル ベンチマーク・ビューア
// Artificial Analysis の Intelligence Index / 価格 / 速度 を、
// 横棒グラフで見やすく一覧表示するための小さなビューアです。
//
// データの読み込み:
//   1. 同じ場所に models.json があればそれを読む（GitHub Actions が API から定期生成）
//   2. 無ければこのファイル内のスナップショットを使う
//
// 規約メモ: Artificial Analysis のデータを使う場合は出典表示が必要です。

interface ModelEntry {
  name: string; // 表示名（例: "Claude Fable 5.2 (max)"）
  family: string; // まとめ単位（例: "Claude Fable 5.2"）
  maker: string; // 例: "Anthropic"
  intelligence: number; // Artificial Analysis Intelligence Index
  price1m: number | null; // 100万トークンあたり価格の目安 (USD, 混合価格)
  costPerTask: number | null; // 1タスクあたりコスト (USD)
  speed: number | null; // 出力速度 (tokens/s)
}

interface ModelData {
  updated: string;
  source: string;
  indexVersion?: string; // Intelligence Index のバージョン（例: "5.0.1"）
  models: ModelEntry[];
}

// ---- スナップショット（2026-11-13 時点、Artificial Analysis 公表値より） ----
const SNAPSHOT: ModelData = {
  updated: "2026-11-13",
  source: "Artificial Analysis (snapshot)",
  indexVersion: "5.0.1",
  models: [
    { name: "Claude Fable 5.2 (max)", family: "Claude Fable 5.2", maker: "Anthropic", intelligence: 64.6, price1m: 16.0, costPerTask: 26.54, speed: 94 },
    { name: "Claude Fable 5.2 (xhigh)", family: "Claude Fable 5.2", maker: "Anthropic", intelligence: 62.0, price1m: null, costPerTask: 14.83, speed: null },
    { name: "Claude Fable 5.2 (high)", family: "Claude Fable 5.2", maker: "Anthropic", intelligence: 62.0, price1m: null, costPerTask: 9.08, speed: null },
    { name: "Gemini 4 Carbon (high)", family: "Gemini 4 Carbon", maker: "Google", intelligence: 60.0, price1m: 8.0, costPerTask: 5.48, speed: 97 },
    { name: "Claude Opus 5.5 (max)", family: "Claude Opus 5.5", maker: "Anthropic", intelligence: 59.1, price1m: 8.0, costPerTask: null, speed: 97 },
    { name: "GPT-6 Astra (max)", family: "GPT-6 Astra", maker: "OpenAI", intelligence: 56.9, price1m: 20.0, costPerTask: 6.24, speed: 46 },
    { name: "Claude Sonnet 5.5 (max)", family: "Claude Sonnet 5.5", maker: "Anthropic", intelligence: 56.0, price1m: null, costPerTask: 5.46, speed: 136 },
    { name: "GPT-6.1 Sol (max)", family: "GPT-6.1 Sol", maker: "OpenAI", intelligence: 54.6, price1m: 4.0, costPerTask: 1.27, speed: 59 },
    { name: "Claude Opus 5.5 (high)", family: "Claude Opus 5.5", maker: "Anthropic", intelligence: 54.0, price1m: null, costPerTask: 1.82, speed: null },
    { name: "GPT-6.1 Sol (xhigh)", family: "GPT-6.1 Sol", maker: "OpenAI", intelligence: 52.0, price1m: null, costPerTask: 0.76, speed: null },
    { name: "GPT-6.1 Terra (max)", family: "GPT-6.1 Terra", maker: "OpenAI", intelligence: 51.0, price1m: null, costPerTask: 0.96, speed: null },
    { name: "Muse Wonder Full", family: "Muse Wonder", maker: "Meta", intelligence: 50.1, price1m: null, costPerTask: null, speed: null },
    { name: "Gemini 4 Hydrogen (medium)", family: "Gemini 4 Hydrogen", maker: "Google", intelligence: 41.2, price1m: null, costPerTask: null, speed: 234 },
    { name: "Claude Haiku 5.5", family: "Claude Haiku 5.5", maker: "Anthropic", intelligence: 36.5, price1m: 0.1, costPerTask: null, speed: 234 },
    { name: "Muse Ember (max)", family: "Muse Ember", maker: "Meta", intelligence: 36.0, price1m: 0.2, costPerTask: null, speed: 760 },
    { name: "Grok 4.7 (xhigh)", family: "Grok 4.7", maker: "SpaceXAI", intelligence: 35.0, price1m: null, costPerTask: 7.77, speed: null },
    { name: "Agnes 2.5 Pro Theta", family: "Agnes 2.5 Pro", maker: "Sapiens AI", intelligence: 24.0, price1m: 0.15, costPerTask: null, speed: null },
    { name: "K2 Horizon 375B A23B", family: "K2 Horizon", maker: "IFM", intelligence: 17.8, price1m: null, costPerTask: null, speed: 1026 },
    { name: "Gemini 3.5 Flash-Lite", family: "Gemini 3.5 Flash-Lite", maker: "Google", intelligence: 11.7, price1m: 0.3, costPerTask: null, speed: 409 },
    { name: "Nemotron 3.5 Lightning", family: "Nemotron 3.5", maker: "NVIDIA", intelligence: 5.5, price1m: null, costPerTask: null, speed: null },
  ],
};

// ---- キーワードパレット（タップで ON/OFF） ----
const PALETTE: string[] = [
  "GPT", "Gemini", "Claude", "Muse", "Grok",
  "Fable", "Opus", "Sonnet", "Haiku", "Ember",
  "Carbon", "Hydrogen", "Astra", "Sol", "Flash",
  "Anthropic", "Google", "OpenAI", "Meta",
];

// ---- 状態 ----
type SortKey = "intelligence" | "value" | "price" | "speed";
const state = {
  tokens: new Set<string>(), // パレットで選択中のキーワード
  inputText: "",
  filterOn: true,
  highlightOn: true,
  groupOn: false,
  showAllNames: false,
  sortKey: "intelligence" as SortKey,
  zoom: 1.0,
  anchorName: null as string | null,
  expanded: new Set<string>(), // 展開中の family
  jumpPos: -1,
};
let DATA: ModelData = SNAPSHOT;

// ---- ユーティリティ ----
const $ = (sel: string): HTMLElement => document.querySelector(sel) as HTMLElement;

function allTokens(): string[] {
  const fromInput = state.inputText
    .split(/[\s,、]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return [...state.tokens, ...fromInput];
}

function matches(m: ModelEntry, tokens: string[]): boolean {
  if (tokens.length === 0) return false;
  const hay = `${m.name} ${m.family} ${m.maker}`.toLowerCase();
  return tokens.some((t) => hay.includes(t.toLowerCase()));
}

function valueOf(m: ModelEntry): number | null {
  // コスパ = Index あたりの価格効率（100万トークン価格で割る）
  if (m.price1m === null || m.price1m <= 0) return null;
  return m.intelligence / m.price1m;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;"
  );
}

// キーワードを <mark> でハイライトした HTML を返す
function highlighted(text: string, tokens: string[]): string {
  if (!state.highlightOn || tokens.length === 0) return escapeHtml(text);
  const lower = text.toLowerCase();
  const ranges: Array<[number, number]> = [];
  for (const t of tokens) {
    const needle = t.toLowerCase();
    if (!needle) continue;
    let i = 0;
    while (true) {
      const j = lower.indexOf(needle, i);
      if (j < 0) break;
      ranges.push([j, j + needle.length]);
      i = j + needle.length;
    }
  }
  if (ranges.length === 0) return escapeHtml(text);
  ranges.sort((a, b) => a[0] - b[0]);
  let out = "";
  let pos = 0;
  for (const [s, e] of ranges) {
    if (s < pos) continue;
    out += escapeHtml(text.slice(pos, s)) + "<mark>" + escapeHtml(text.slice(s, e)) + "</mark>";
    pos = e;
  }
  out += escapeHtml(text.slice(pos));
  return out;
}

const MAKER_COLORS: Record<string, string> = {
  Anthropic: "#d97757",
  Google: "#4285f4",
  OpenAI: "#10a37f",
  Meta: "#0082fb",
  SpaceXAI: "#666666",
  NVIDIA: "#76b900",
};
function barColor(maker: string): string {
  return MAKER_COLORS[maker] ?? "#8a93a6";
}

// ---- 並び替え ----
function sortModels(list: ModelEntry[]): ModelEntry[] {
  const arr = [...list];
  switch (state.sortKey) {
    case "intelligence":
      arr.sort((a, b) => b.intelligence - a.intelligence);
      break;
    case "value":
      arr.sort((a, b) => (valueOf(b) ?? -1) - (valueOf(a) ?? -1));
      break;
    case "price":
      arr.sort((a, b) => (a.price1m ?? Number.POSITIVE_INFINITY) - (b.price1m ?? Number.POSITIVE_INFINITY));
      break;
    case "speed":
      arr.sort((a, b) => (b.speed ?? -1) - (a.speed ?? -1));
      break;
  }
  return arr;
}

// ---- 描画 ----
function fmt(n: number | null, digits = 1): string {
  return n === null ? "—" : n.toFixed(digits);
}

// カッコ内（effort）の文字列から色分けクラスを決める。検知できなければ ""（従来色）
function effortClass(effort: string): string {
  const e = effort.toLowerCase();
  if (!e) return "";
  if (e.includes("xhigh") || e.includes("x-high")) return "lv-xhigh";
  if (e.includes("max")) return "lv-max";
  if (e.includes("high")) return "lv-high";
  if (e.includes("medium") || e.includes("mid")) return "lv-medium";
  if (e.includes("low") || e.includes("min")) return "lv-low";
  return "";
}

// 差分表示モード時の、バーの値ラベル（例: "64.6 (+8.6)" / 基準行は "56.0（基準）"）
function valueLabel(m: ModelEntry): string {
  const base = fmt(m.intelligence);
  if (!state.anchorName) return base;
  if (m.name === state.anchorName) return `${base} <span class="diff base">（基準）</span>`;
  const anchor = DATA.models.find((x) => x.name === state.anchorName);
  if (!anchor) return base;
  const d = m.intelligence - anchor.intelligence;
  if (d === 0) return `${base} <span class="diff zero">(±0)</span>`;
  const sign = d > 0 ? "+" : "-";
  return `${base} <span class="diff ${d > 0 ? "plus" : "minus"}">(${sign}${Math.abs(d).toFixed(1)})</span>`;
}

function rowHtml(m: ModelEntry, maxIndex: number, opts: { variant?: boolean; variantCount?: number } = {}): string {
  const tokens = allTokens();
  const pct = Math.max(2, (m.intelligence / maxIndex) * 100);
  const v = valueOf(m);
  const isAnchor = state.anchorName === m.name;
  const cls = ["row", opts.variant ? "variant" : "", isAnchor ? "anchor" : ""].join(" ");
  const expandBtn =
    opts.variantCount && opts.variantCount > 1
      ? `<button class="expand" data-family="${escapeHtml(m.family)}">${state.expanded.has(m.family) ? "▼" : "▶"} 他${opts.variantCount - 1}種</button>`
      : "";
  const paren = m.name.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
  const displayName = paren ? paren[1] : m.name;
  // "(Max, Default Fallback)" のような併記は先頭の語だけを列に出す
  const effort = paren ? paren[2].split(",")[0].trim() : "";
  return `
  <div class="${cls}" data-name="${escapeHtml(m.name)}">
    <span class="model-name" title="${escapeHtml(m.name)}">${highlighted(displayName, tokens)}</span>
    <span class="effort ${effortClass(effort)}">${highlighted(effort, tokens)}</span>
    <div class="bar-track" title="タップで基準にする">
      <div class="bar" style="width:${pct}%;background:${barColor(m.maker)}"></div>
      <span class="bar-value">${valueLabel(m)}</span>
    </div>
    ${expandBtn}
    ${tokens.some((t) => m.maker.toLowerCase().includes(t.toLowerCase())) ? `<span class="maker">${highlighted(m.maker, tokens)}</span>` : ""}
  </div>`;
}

function render(): void {
  const tokens = allTokens();
  const filtering = state.filterOn && tokens.length > 0;
  const maxIndex = Math.max(...DATA.models.map((m) => m.intelligence), 1);
  const chart = $("#chart");
  chart.classList.toggle("all-names", state.showAllNames);
  let html = "";

  if (state.groupOn) {
    // family ごとにまとめ、代表は最も Index の高いバリエーション
    const byFamily = new Map<string, ModelEntry[]>();
    for (const m of DATA.models) {
      const list = byFamily.get(m.family) ?? [];
      list.push(m);
      byFamily.set(m.family, list);
    }
    interface FamRow { rep: ModelEntry; variants: ModelEntry[] }
    let fams: FamRow[] = [...byFamily.values()].map((variants) => {
      const sorted = sortModels(variants);
      return { rep: sorted.reduce((a, b) => (b.intelligence > a.intelligence ? b : a)), variants: sorted };
    });
    if (filtering) {
      fams = fams
        .map((f) => ({ rep: f.rep, variants: f.variants.filter((m) => matches(m, tokens)) }))
        .filter((f) => f.variants.length > 0)
        .map((f) => ({ rep: f.variants.reduce((a, b) => (b.intelligence > a.intelligence ? b : a)), variants: f.variants }));
    }
    // family の並びは代表モデルで決める
    const repSorted = sortModels(fams.map((f) => f.rep));
    const order = new Map(repSorted.map((m, i) => [m.family, i]));
    fams.sort((a, b) => (order.get(a.rep.family) ?? 0) - (order.get(b.rep.family) ?? 0));
    for (const f of fams) {
      html += rowHtml(f.rep, maxIndex, { variantCount: f.variants.length });
      if (state.expanded.has(f.rep.family)) {
        for (const v of f.variants) {
          if (v.name === f.rep.name) continue;
          html += rowHtml(v, maxIndex, { variant: true });
        }
      }
    }
  } else {
    let list = sortModels(DATA.models);
    if (filtering) list = list.filter((m) => matches(m, tokens));
    for (const m of list) html += rowHtml(m, maxIndex);
  }

  chart.innerHTML = html || `<p class="empty">一致するモデルがありません。</p>`;
  $("#count").textContent = filtering
    ? `${chart.querySelectorAll(".row").length} 件を表示中（全 ${DATA.models.length} 件）`
    : `全 ${DATA.models.length} 件`;
  $("#dataInfo").textContent = `データ: ${DATA.source} / ${DATA.updated} 時点${DATA.indexVersion ? ` / Intelligence Index v${DATA.indexVersion}` : ""}`;

  chart.querySelectorAll<HTMLElement>(".model-name, .effort").forEach((el) => {
    el.addEventListener("click", () => {
      el.closest(".row")?.classList.toggle("name-full");
    });
  });
  chart.querySelectorAll<HTMLElement>(".bar-track").forEach((el) => {
    el.addEventListener("click", () => {
      const name = el.closest(".row")?.getAttribute("data-name");
      if (!name) return;
      state.anchorName = state.anchorName === name ? null : name;
      render();
    });
  });
  chart.querySelectorAll<HTMLButtonElement>(".expand").forEach((btn) => {
    btn.addEventListener("click", () => {
      const fam = btn.getAttribute("data-family")!;
      if (state.expanded.has(fam)) state.expanded.delete(fam);
      else state.expanded.add(fam);
      render();
    });
  });
  state.jumpPos = -1;
}

// ---- ジャンプ（次の一致へスクロール） ----
function jumpNext(): void {
  const tokens = allTokens();
  if (tokens.length === 0) return;
  const rows = [...document.querySelectorAll<HTMLElement>(".row")].filter((el) => {
    const name = el.getAttribute("data-name") ?? "";
    const m = DATA.models.find((x) => x.name === name);
    return m ? matches(m, tokens) : false;
  });
  if (rows.length === 0) return;
  state.jumpPos = (state.jumpPos + 1) % rows.length;
  const el = rows[state.jumpPos];
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
  $("#jumpInfo").textContent = `${state.jumpPos + 1} / ${rows.length} 件目`;
}

// ---- 初期化 ----
function buildPalette(): void {
  const pal = $("#palette");
  pal.innerHTML = "";
  for (const word of PALETTE) {
    const chip = document.createElement("button");
    chip.className = "chip" + (state.tokens.has(word) ? " on" : "");
    chip.textContent = word;
    chip.addEventListener("click", () => {
      if (state.tokens.has(word)) state.tokens.delete(word);
      else state.tokens.add(word);
      chip.classList.toggle("on");
      render();
    });
    pal.appendChild(chip);
  }
}

function applyZoom(): void {
  document.documentElement.style.setProperty("--zoom", String(state.zoom));
  $("#zoomLabel").textContent = `${Math.round(state.zoom * 100)}%`;
}

async function loadData(): Promise<void> {
  // 単一ファイル配布用: models.json が埋め込まれていればそれを最優先で使う
  const embedded = (window as unknown as { __MODELS__?: ModelData }).__MODELS__;
  if (embedded && Array.isArray(embedded.models) && embedded.models.length > 0) {
    DATA = embedded;
    render();
    return;
  }
  try {
    const res = await fetch("./models.json", { cache: "no-store" });
    if (res.ok) {
      const json = (await res.json()) as ModelData;
      if (json && Array.isArray(json.models) && json.models.length > 0) {
        DATA = json;
      }
    }
  } catch {
    // スナップショットのまま続行
  }
  render();
}

function init(): void {
  buildPalette();
  applyZoom();
  ($("#kw") as HTMLInputElement).addEventListener("input", (e) => {
    state.inputText = (e.target as HTMLInputElement).value;
    render();
  });
  ($("#filterOn") as HTMLInputElement).addEventListener("change", (e) => {
    state.filterOn = (e.target as HTMLInputElement).checked;
    render();
  });
  ($("#highlightOn") as HTMLInputElement).addEventListener("change", (e) => {
    state.highlightOn = (e.target as HTMLInputElement).checked;
    render();
  });
  ($("#groupOn") as HTMLInputElement).addEventListener("change", (e) => {
    state.groupOn = (e.target as HTMLInputElement).checked;
    render();
  });
  ($("#allNames") as HTMLInputElement).addEventListener("change", (e) => {
    state.showAllNames = (e.target as HTMLInputElement).checked;
    render();
  });
  ($("#sort") as HTMLSelectElement).addEventListener("change", (e) => {
    state.sortKey = (e.target as HTMLSelectElement).value as SortKey;
    render();
  });
  $("#jumpBtn").addEventListener("click", jumpNext);
  $("#zoomOut").addEventListener("click", () => {
    state.zoom = Math.max(0.6, +(state.zoom - 0.1).toFixed(2));
    applyZoom();
  });
  $("#zoomIn").addEventListener("click", () => {
    state.zoom = Math.min(1.8, +(state.zoom + 0.1).toFixed(2));
    applyZoom();
  });
  $("#clearBtn").addEventListener("click", () => {
    state.tokens.clear();
    state.inputText = "";
    ($("#kw") as HTMLInputElement).value = "";
    buildPalette();
    render();
  });
  void loadData();
}

document.addEventListener("DOMContentLoaded", init);
