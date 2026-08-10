const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const charactersPath = path.join(__dirname, "..", "data", "touhou", "characters.json");
const TOUHOU_WEBHOOK_NAME = "TouhouBot";

function loadCharacters() {
    try {
        return JSON.parse(fs.readFileSync(charactersPath, "utf8"));
    } catch (error) {
        console.error("[touhou] characters.json の読み込みに失敗しました。", error);
        return {};
    }
}

// 「名前」オプションの入力値（オートコンプリートのkey、または表示名の完全一致）からキャラクターを特定する
function resolveCharacter(characters, query) {
    if (characters[query]) return { key: query, character: characters[query] };

    const entry = Object.entries(characters).find(([, character]) => character.name === query);
    if (!entry) return null;

    return { key: entry[0], character: entry[1] };
}

function pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

// null/未設定の項目は「-」として表示する
function orDash(value) {
    if (value === null || value === undefined || value === "") return "-";
    if (Array.isArray(value)) return value.length > 0 ? value.join("、") : "-";
    return value;
}

function buildCharacterEmbed(character) {
    const embed = new EmbedBuilder()
        .setColor(0xe3005a)
        .setTitle(character.name)
        .setDescription(character.epithet ? `「${character.epithet}」` : null)
        .addFields(
            { name: "愛称", value: orDash(character.aliases), inline: true },
            { name: "種族", value: orDash(character.race), inline: true },
            { name: "初登場", value: orDash(character.firstAppearance), inline: true },
            { name: "拠点", value: orDash(character.residence), inline: true },
            { name: "能力", value: orDash(character.ability) },
            { name: "関連キャラ", value: orDash(character.relatedCharacters) },
            { name: "テーマ曲", value: orDash(character.themeSong) },
            { name: "誕生日", value: orDash(character.birthday), inline: true },
            { name: "身長", value: orDash(character.height), inline: true },
            { name: "趣味", value: orDash(character.hobby), inline: true },
            { name: "好きなもの", value: orDash(character.likes), inline: true },
            { name: "苦手なもの", value: orDash(character.dislikes), inline: true }
        );

    return embed;
}

function buildQuoteEmbed(character, quote) {
    const embed = new EmbedBuilder()
        .setColor(0xe3005a)
        .setAuthor({ name: character.name })
        .setDescription(`**「${quote.text}」**`);

    if (quote.source) {
        embed.setFooter({ text: quote.source });
    }

    return embed;
}

// このチャンネル用のTouhouBot Webhookを取得。無ければ作成する。
async function getTouhouWebhook(channel, client) {
    if (!channel || typeof channel.fetchWebhooks !== "function") {
        throw new Error("このチャンネルではWebhookを使用できません。");
    }

    const webhooks = await channel.fetchWebhooks();

    let webhook = webhooks.find(
        hook => hook.name === TOUHOU_WEBHOOK_NAME && hook.owner?.id === client.user.id
    );

    if (!webhook) {
        webhook = await channel.createWebhook({
            name: TOUHOU_WEBHOOK_NAME,
            reason: "TouhouBot botme機能用Webhook"
        });
    }

    return webhook;
}

async function sendAsCharacter(interaction, character, word) {
    if (!interaction.guild) {
        return interaction.reply({
            content: "このコマンドはサーバー内でのみ使用できます。",
            ephemeral: true
        });
    }

    if (!interaction.channel || typeof interaction.channel.createWebhook !== "function") {
        return interaction.reply({
            content: "このチャンネルではキャラクター投稿を使用できません。通常のテキストチャンネルで実行してください。",
            ephemeral: true
        });
    }

    if (word.length > 2000) {
        return interaction.reply({
            content: "投稿できる文章は2000文字以内です。",
            ephemeral: true
        });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        const webhook = await getTouhouWebhook(interaction.channel, interaction.client);

        // characters.json の avatar が設定されていればキャラクター画像を使用する。
        // 未設定ならWebhook側のアイコンを使用する。
        const avatarURL = character.avatar ?? character.avatarUrl ?? character.avatarURL;

        await webhook.send({
            username: character.name,
            ...(avatarURL ? { avatarURL } : {}),
            content: word,
            allowedMentions: { parse: [] }
        });

        return interaction.editReply("キャラクターとして投稿しました。");
    } catch (error) {
        console.error("[touhou] botme投稿エラー:", error);
        return interaction.editReply(
            "キャラクター投稿に失敗しました。Botに「Webhookの管理」権限があるか確認してください。"
        );
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName("touhou")
        .setDescription("東方Project関連コマンド")
        .addSubcommand(sub =>
            sub
                .setName("character")
                .setDescription("キャラクター図鑑を表示")
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("キャラクター名")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("quote")
                .setDescription("名言をランダムに表示")
                .addStringOption(option =>
                    option
                        .setName("name")
                        .setDescription("キャラクター名（省略すると全キャラからランダム）")
                        .setRequired(false)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(sub =>
            sub
                .setName("botme")
                .setDescription("キャラクターとして文章を投稿")
                .addStringOption(option =>
                    option
                        .setName("character")
                        .setDescription("投稿するキャラクター")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName("word")
                        .setDescription("キャラクターとして投稿する文章")
                        .setRequired(true)
                        .setMaxLength(2000)
                )
        ),

    autocomplete: async interaction => {
        const focused = interaction.options.getFocused().toLowerCase();
        const characters = loadCharacters();

        const matches = Object.entries(characters)
            .filter(([, character]) => {
                const nameMatches = character.name?.toLowerCase().includes(focused);
                const aliasMatches = (character.aliases ?? []).some(alias =>
                    alias.toLowerCase().includes(focused)
                );
                return nameMatches || aliasMatches;
            })
            .slice(0, 25)
            .map(([key, character]) => ({ name: character.name, value: key }));

        await interaction.respond(matches);
    },

    execute: async interaction => {
        const subcommand = interaction.options.getSubcommand();
        const characters = loadCharacters();

        if (subcommand === "character") {
            const query = interaction.options.getString("name", true);
            const resolved = resolveCharacter(characters, query);

            if (!resolved) {
                return interaction.reply({
                    content: `「${query}」というキャラクターは見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return interaction.reply({ embeds: [buildCharacterEmbed(resolved.character)] });
        }

        if (subcommand === "quote") {
            const query = interaction.options.getString("name");

            let key = query ? resolveCharacter(characters, query)?.key : null;

            if (query && !key) {
                return interaction.reply({
                    content: `「${query}」というキャラクターは見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            // 名前未指定なら、名言が1つ以上あるキャラからランダムに選ぶ
            if (!key) {
                const keysWithQuotes = Object.keys(characters).filter(
                    k => (characters[k].quotes ?? []).length > 0
                );
                if (keysWithQuotes.length === 0) {
                    return interaction.reply({
                        content: "登録されている名言がまだありません。",
                        ephemeral: true,
                    });
                }
                key = pickRandom(keysWithQuotes);
            }

            const character = characters[key];
            const characterQuotes = character?.quotes ?? [];

            if (characterQuotes.length === 0) {
                return interaction.reply({
                    content: `${character?.name ?? query} の名言はまだ登録されていません。`,
                    ephemeral: true,
                });
            }

            const quote = pickRandom(characterQuotes);

            return interaction.reply({ embeds: [buildQuoteEmbed(character, quote)] });
        }

        if (subcommand === "botme") {
            const query = interaction.options.getString("character", true);
            const word = interaction.options.getString("word", true);
            const resolved = resolveCharacter(characters, query);

            if (!resolved) {
                return interaction.reply({
                    content: `「${query}」というキャラクターは見つかりませんでした。`,
                    ephemeral: true,
                });
            }

            return sendAsCharacter(interaction, resolved.character, word);
        }
    },
};
