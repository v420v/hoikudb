
## 環境変数の設定

このアプリケーションはS3からデータを取得するため、以下の環境変数を設定する必要があります。

`.env.local`ファイルを作成し、以下の内容を設定してください：

```bash
# S3設定（サーバーサイド用 - NEXT_PUBLIC_プレフィックスなし）
S3_ACCESS_KEY=your_access_key_here
S3_SECRET_ACCESS_KEY=your_secret_access_key_here
S3_REGION=ap-northeast-1
S3_BUCKET_NAME=hoipla-monthly
```
