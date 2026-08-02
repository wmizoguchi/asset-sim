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
