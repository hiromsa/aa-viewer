# AIモデル ベンチマーク・ビューア

Artificial Analysis の Intelligence Index・価格・速度を、横棒グラフで見やすく一覧表示する小さな Web アプリです（TypeScript 製）。

## 機能

- 全モデルを Intelligence Index の**横棒グラフ**で一覧表示（価格・コスパ・速度つき）
- **キーワードパレット**：GPT / Gemini / Claude などのチップをタップして ON/OFF（スマホ向け）
- キーワード入力（空白区切りで**複数指定**OK）で
  - **フィルター表示**（絞り込み）
  - **ハイライト表示**（一致箇所を黄色く表示）
  - **ジャンプ**（「次の一致へ」ボタンで順にスクロール）
- **拡大 / 縮小**ボタン
- `(max)` `(high)` などの**バリエーションをモデルごとにまとめて**表示（タップで展開）
- 📍で基準モデルを指定すると、他モデルに「基準比 +○○ / 価格 ○倍」を表示
- 並び替え：Index順 / コスパ順 / 価格が安い順 / 速度順

## データについて

- 同じフォルダに `models.json` があればそれを読み、無ければ `src/main.ts` 内のスナップショット（2026-11-13 時点）を表示します。
- `models.json` は `scripts/fetch-data.mjs` が Artificial Analysis の公式 API（無料枠）から生成します。
- **規約**：Artificial Analysis のデータには出典表示が必要です（フッターに明記済み）。再配布については同サービスの規約を確認してください。

## GitHub Pages で公開する手順

1. このフォルダを GitHub リポジトリに push する
2. [artificialanalysis.ai](https://artificialanalysis.ai/data-api) で無料アカウントを作り、API キーを発行する
3. リポジトリの Settings → Secrets and variables → Actions に `AA_API_KEY` を登録する
4. Settings → Pages で Source を「GitHub Actions」にする
5. Actions タブから「Update data and deploy to GitHub Pages」を手動実行（以降は毎日自動実行）

API キーが無くても、スナップショット表示の静的サイトとして公開できます（その場合はワークフローの Fetch ステップを削除してください）。

## ローカル開発

```sh
npm install
npm run build   # tsc で dist/main.js を生成
# index.html をブラウザで開く（models.json を読ませる場合は簡易サーバー経由で）
```

注意：`scripts/fetch-data.mjs` のフィールド対応づけは API v2 の想定を含みます。初回実行時に実レスポンスと見比べ、合わない項目があれば直してください。

## UI decisions (2026-11-14, user-directed)
- Dark theme, compact one-line rows; name / effort / bar columns are FIXED width so all bar starts align.
- Name & effort: truncated (…) by default; wrap to full text (row grows taller, bar position unchanged) when the row is tapped, or for all rows with the 「名前を全部表示」 switch.
- Grouping variants is OFF by default.
- Toggles are switch-style (not checkboxes).
- Tapping a bar sets the anchor (diff mode): values render as "64.6 (+8.6)", anchor row "56.0（基準）", zero diff "(±0)"; diff text is white. Tap again to clear.
- Effort strings are color-coded by substring: max=red, xhigh=orange, high=yellow, medium=green, low/min=blue, unknown=gray (check xhigh before high).
- Maker name shows only when a keyword matches the maker.
- Footer shows the Intelligence Index version from models.json (indexVersion).
