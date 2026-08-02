# asset-sim

資産運用シミュレータ（OpenClaw 自動開発パイロットプロジェクト）。

初期投資額・毎月の積立額・想定年率・運用年数を入力すると、将来の資産額を年次で推定して表示する Web アプリ。

## 目的

このリポジトリは OpenClaw が開発タスクに従って自動的にコードを書き、テストし、
PR を作成するワークフローを検証するためのパイロットプロジェクト。
本番運用ではなく実験用。

## スタック

- React + TypeScript
- Vite（開発サーバー / ビルド）
- Vitest（ユニットテスト）
- ESLint

## 開発

```bash
npm install
npm run dev      # 開発サーバー起動
npm run test     # テスト実行
npm run lint     # lint
npm run build    # 本番ビルド
```

## 開発フロー

- `main` ブランチは保護されており、直接 push はできない
- 変更は feature ブランチ → Pull Request → レビュー → マージ の流れで行う
- CI（GitHub Actions）で lint / test / build が通ることを確認してからマージする

## レビュー環境 / 実行環境（homelab k8s）

このアプリは homelab の k8s クラスタ上（LAN 内限定）で動作させる。インターネットへの
公開は行わない。

- `main` に push されると GitHub Actions（`.github/workflows/build-image.yml`）が
  Docker イメージをビルドし、`ghcr.io/wmizoguchi/asset-sim`（**private**）へ push する
  （タグ: `latest` と `${{ github.sha }}`）。
- 実際のデプロイ manifest（Deployment / Service / 内部限定 Ingress）は
  `homelab` リポジトリの `applications/asset-sim/` にある。
  レビュー環境と本番相当の環境は分けず、同じ k8s 上の 1 環境として運用する
  （実験用プロジェクトのため過剰な環境分離はしない）。
- private image のため、pull 用に GHCR 向け `imagePullSecret` が
  デプロイ先 namespace に必要（`homelab` リポジトリ側で管理）。
- mainマージ後、新しいイメージタグを `homelab` リポジトリの Deployment manifest に
  反映（タグ bump）してコミットすると ArgoCD が同期してデプロイされる。
  当面は手動 bump で運用する。
