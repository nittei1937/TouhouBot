// index.js - TouhouBot メインプログラム

require("dotenv").config();

const fs = require("fs");
const path = require("path");
const express = require("express");
const {
    Client,
    Collection,
    GatewayIntentBits,
    Events,
    MessageFlags,
} = require("discord.js");

// =========================
// Discord Client
// =========================

const { DISCORD_TOKEN } = process.env;

if (!DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN が .env に設定されていません。");
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

// =========================
// コマンド読み込み
// =========================

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if (Array.isArray(command)) {
            for (const cmd of command) {
                client.commands.set(cmd.data.name, cmd);
                console.log(`✅ コマンド読込 : /${cmd.data.name}`);
            }
        } else {
            client.commands.set(command.data.name, command);
            console.log(`✅ コマンド読込 : /${command.data.name}`);
        }

    } catch (error) {

        console.error(`❌ ${file} の読み込みに失敗しました。`);
        console.error(error);

    }

}

// =========================
// Bot起動完了
// =========================

client.once(Events.ClientReady, (readyClient) => {
    console.log("====================================");
    console.log("🎉 TouhouBot 起動完了");
    console.log(`🤖 Bot : ${readyClient.user.tag}`);
    console.log(`📊 サーバー数 : ${readyClient.guilds.cache.size}`);

    readyClient.guilds.cache.forEach(guild => {
        console.log(`- ${guild.name} (${guild.id})`);
    });

    console.log("====================================");
});

// =========================
// スラッシュコマンド
// =========================

client.on(Events.InteractionCreate, async interaction => {

    // ---------- Autocomplete ----------

    if (interaction.isAutocomplete()) {

        const command = client.commands.get(interaction.commandName);

        if (!command) return;

        if (typeof command.autocomplete !== "function") return;

        try {

            await command.autocomplete(interaction);

        } catch (error) {

            console.error(
                `❌ Autocompleteエラー (${interaction.commandName})`
            );

            console.error(error);

        }

        return;

    }

    // ---------- Slash Command ----------

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {

        console.error(
            `❌ 未登録コマンド : ${interaction.commandName}`
        );

        return;

    }

    try {

        await command.execute(interaction);

    } catch (error) {

        console.error(
            `❌ コマンド実行エラー (${interaction.commandName})`
        );

        console.error(error);

        const reply = {
            content: "コマンドの実行中にエラーが発生しました。",
            flags: MessageFlags.Ephemeral,
        };

        if (interaction.replied || interaction.deferred) {

            await interaction.followUp(reply);

        } else {

            await interaction.reply(reply);

        }

    }

});

// =========================
// Discord Error
// =========================

client.on("error", error => {

    console.error("❌ Discord Client Error");
    console.error(error);

});

// =========================
// 終了処理
// =========================

process.on("SIGINT", () => {

    console.log("");
    console.log("🛑 Botを終了します");

    client.destroy();

    process.exit(0);

});

// =========================
// Discord Login
// =========================

console.log("🔄 Discordへ接続中...");

client.login(DISCORD_TOKEN).catch(error => {

    console.error("❌ Discordへのログインに失敗しました。");
    console.error(error);

    process.exit(1);

});

// =========================
// Express (Render)
// =========================

const app = express();

const port = process.env.PORT || 3000;

app.get("/", (req, res) => {

    res.json({
        status: "Bot is running! 🤖",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });

});

app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        uptime: process.uptime(),
    });

});

app.listen(port, () => {

    console.log(`🌐 Web Server : Port ${port}`);

});
