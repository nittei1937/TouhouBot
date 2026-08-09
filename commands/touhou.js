const fs = require("fs");
const path = require("path");
const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

const dataPath = path.join(__dirname, "..", "data", "touhou", "characters.json");

function loadCharacters() {
    try {
        return JSON.parse(fs.readFileSync(dataPath, "utf8"));
    } catch (error) {
        console.error("[touhou] characters.json の読み込みに失敗しました。", error);
        return {};
    }
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
        if (subcommand !== "character") return;

        const query = interaction.options.getString("name", true);
        const characters = loadCharacters();

        // オートコンプリートのkeyでの一致を優先し、無ければ表示名の完全一致も見る
        const character =
            characters[query] ??
            Object.values(characters).find(entry => entry.name === query);

        if (!character) {
            return interaction.reply({
                content: `「${query}」というキャラクターは見つかりませんでした。`,
                ephemeral: true,
            });
        }

        return interaction.reply({ embeds: [buildCharacterEmbed(character)] });
    },
};
