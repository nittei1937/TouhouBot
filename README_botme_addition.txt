【botme機能について】

/touhou botme character: キャラクター word: 投稿文

指定した東方キャラクターの名前でWebhook投稿します。

characters.json の各キャラクターに、必要なら次の項目を追加してください。

"avatar": "https://画像を公開しているURL"

例:
"reimu_hakurei": {
  "name": "博麗霊夢",
  "avatar": "https://example.com/reimu.png",
  ...
}

Botには対象チャンネルで「Webhookの管理」権限が必要です。
初回実行時にチャンネル内へ TouhouBot というWebhookを自動作成します。

※これはDiscordの実ユーザーになりすますものではなく、Webhookの表示名・アイコンをキャラクターに変更して投稿する機能です。
