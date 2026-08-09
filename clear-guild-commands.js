// ギルド限定で登録されたスラッシュコマンドを全て削除するスクリプト
// 使い方: .envにGUILD_IDを設定した状態で `node clear-guild-commands.js` を実行
// （過去にGUILD_ID付きでdeploy-commands.jsを実行したことがある場合、
//   そのサーバーIDをGUILD_IDに指定してください）

require("dotenv").config();
const { REST, Routes } = require("discord.js");

const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !CLIENT_ID || !GUILD_ID) {
    console.error("エラー: .envにDISCORD_TOKEN, CLIENT_ID, GUILD_IDを設定してください。");
    console.error("(GUILD_IDは重複が発生しているサーバーのIDです)");
    process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
    try {
        console.log(`ギルド(${GUILD_ID})のコマンドを全て削除します...`);
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [] });
        console.log("削除完了。数分待ってからDiscordを再起動(Ctrl+R)して確認してください。");
    } catch (error) {
        console.error("削除中にエラーが発生しました:", error);
    }
})();