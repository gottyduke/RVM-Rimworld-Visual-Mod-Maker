export type GeneCategory =
  | "recommended"
  | "appearance"
  | "bodyParts"
  | "abilities"
  | "combat"
  | "skills"
  | "moodMind"
  | "metabolism"
  | "temperature"
  | "toxPollution"
  | "vampire"
  | "misc";

export type GeneOption = {
  defName: string;
  label: string;
  description: string;
  requiresBiotech: boolean;
  category: GeneCategory;
};

export const GENE_CATEGORY_LABELS: Record<GeneCategory, string> = {
  recommended: "推荐 / 常用",
  appearance: "外观 / 颜色",
  bodyParts: "身体部位 / 头脸",
  abilities: "能力",
  combat: "战斗 / 生存",
  skills: "技能倾向",
  moodMind: "心情 / 灵能 / 行为",
  metabolism: "代谢 / 饮食 / 睡眠",
  temperature: "温度适应",
  toxPollution: "毒素 / 污染",
  vampire: "吸血鬼 / Archite",
  misc: "其他"
};

function gene(defName: string, category: GeneCategory, label?: string, description?: string): GeneOption {
  return {
    defName,
    category,
    label: label || humanizeGeneDefName(defName),
    description: description || `Biotech GeneDef: ${defName}`,
    requiresBiotech: true
  };
}

/**
 * Vanilla RimWorld Biotech GeneDef names used by the UI.
 * This is intentionally a curated library plus a custom GeneDef input in the UI,
 * because other DLC/mods may add more GeneDefs.
 */
export const BIOTECH_GENE_OPTIONS: GeneOption[] = uniqueGenes([
  gene("MeleeDamage_Strong", "recommended", "Strong melee damage / 强近战伤害", "近战伤害更高。旧错误名：StrongMeleeDamage。"),
  gene("Robust", "recommended", "Robust / 强壮耐打", "受到的伤害降低。"),
  gene("MoveSpeed_Quick", "recommended", "Fast runner / 快速奔跑", "移动速度提高。旧错误名：FastRunner。"),
  gene("MoveSpeed_VeryQuick", "recommended", "Very fast runner / 极速奔跑"),
  gene("Immunity_SuperStrong", "recommended", "Super immunity / 超级免疫", "疾病免疫获得速度显著提高。旧错误名：SuperImmune。"),
  gene("Ageless", "recommended", "Ageless / 不老", "成年后停止生物年龄增长。旧错误名：SlowAging。"),
  gene("PsychicAbility_Dull", "recommended", "Psychically dull / 灵能迟钝", "灵能敏感度降低。旧错误名：PsychicallyDull。"),
  gene("PsychicAbility_Enhanced", "recommended", "Psychically sensitive / 灵能敏感"),
  gene("DarkVision", "recommended", "Dark vision / 暗视"),
  gene("WoundHealing_Fast", "recommended", "Fast wound healing / 快速愈合"),
  gene("WoundHealing_SuperFast", "recommended", "Superfast wound healing / 超快愈合"),
  gene("FireResistant", "recommended", "Fire resistant / 防火"),

  gene("Beard_Always", "appearance"),
  gene("Beard_NoBeardOnly", "appearance"),
  gene("Beard_BushyOnly", "appearance"),
  gene("Body_Hulk", "appearance"),
  gene("Body_Thin", "appearance"),
  gene("Body_Standard", "appearance"),
  gene("Body_Fat", "appearance"),
  gene("Brow_Heavy", "appearance"),
  gene("Eyes_Red", "appearance"),
  gene("Eyes_Gray", "appearance"),
  gene("Hair_BaldOnly", "appearance"),
  gene("Hair_ShortOnly", "appearance"),
  gene("Hair_LongOnly", "appearance"),
  gene("Hair_Grayless", "appearance"),
  gene("Hair_Pink", "appearance"),
  gene("Hair_Blonde", "appearance"),
  gene("Hair_SandyBlonde", "appearance"),
  gene("Hair_ReddishBrown", "appearance"),
  gene("Hair_DarkBrown", "appearance"),
  gene("Hair_DarkSaturatedReddish", "appearance"),
  gene("Hair_DarkReddish", "appearance"),
  gene("Hair_MidBlack", "appearance"),
  gene("Hair_DarkBlack", "appearance"),
  gene("Hair_InkBlack", "appearance"),
  gene("Hair_SnowWhite", "appearance"),
  gene("Hair_Gray", "appearance"),
  gene("Hair_LightOrange", "appearance"),
  gene("Hair_LightPurple", "appearance"),
  gene("Hair_LightBlue", "appearance"),
  gene("Hair_LightTeal", "appearance"),
  gene("Hair_LightGreen", "appearance"),
  gene("Hair_BrightRed", "appearance"),
  gene("Furskin", "appearance"),
  gene("Skin_Blue", "appearance"),
  gene("Skin_DeepRed", "appearance"),
  gene("Skin_DeepYellow", "appearance"),
  gene("Skin_Green", "appearance"),
  gene("Skin_InkBlack", "appearance"),
  gene("Skin_LightGray", "appearance"),
  gene("Skin_Orange", "appearance"),
  gene("Skin_PaleRed", "appearance"),
  gene("Skin_PaleYellow", "appearance"),
  gene("Skin_Purple", "appearance"),
  gene("Skin_SheerWhite", "appearance"),
  gene("Skin_SlateGray", "appearance"),
  gene("Skin_Melanin1", "appearance"),
  gene("Skin_Melanin2", "appearance"),
  gene("Skin_Melanin3", "appearance"),
  gene("Skin_Melanin4", "appearance"),
  gene("Skin_Melanin5", "appearance"),
  gene("Skin_Melanin6", "appearance"),
  gene("Skin_Melanin7", "appearance"),
  gene("Skin_Melanin8", "appearance"),
  gene("Skin_Melanin9", "appearance"),

  gene("Ears_Cat", "bodyParts"),
  gene("Ears_Floppy", "bodyParts"),
  gene("Ears_Human", "bodyParts"),
  gene("Ears_Pig", "bodyParts"),
  gene("Ears_Pointed", "bodyParts"),
  gene("FacialRidges", "bodyParts"),
  gene("ElongatedFingers", "bodyParts"),
  gene("Hands_Human", "bodyParts"),
  gene("Hands_Pig", "bodyParts"),
  gene("Headbone_MiniHorns", "bodyParts"),
  gene("Headbone_Human", "bodyParts"),
  gene("Headbone_CenterHorn", "bodyParts"),
  gene("Head_Gaunt", "bodyParts"),
  gene("Jaw_Baseline", "bodyParts"),
  gene("Jaw_Heavy", "bodyParts"),
  gene("Nose_Human", "bodyParts"),
  gene("Nose_Pig", "bodyParts"),
  gene("Tail_Furry", "bodyParts"),
  gene("Tail_Smooth", "bodyParts"),
  gene("Voice_Human", "bodyParts"),
  gene("VoicePig", "bodyParts"),
  gene("VoiceRoar", "bodyParts"),

  gene("AcidSpray", "abilities"),
  gene("AnimalWarcall", "abilities"),
  gene("Bloodfeeder", "abilities"),
  gene("Coagulate", "abilities"),
  gene("FireSpew", "abilities"),
  gene("FoamSpray", "abilities"),
  gene("LongjumpLegs", "abilities"),
  gene("PiercingSpine", "abilities"),
  gene("Resurrect", "abilities"),
  gene("XenogermReimplanter", "abilities"),

  gene("MeleeDamage_Weak", "combat"),
  gene("MeleeDamage_Strong", "combat"),
  gene("MoveSpeed_Slow", "combat"),
  gene("MoveSpeed_Quick", "combat"),
  gene("MoveSpeed_VeryQuick", "combat"),
  gene("Pain_Reduced", "combat"),
  gene("Pain_Extra", "combat"),
  gene("Delicate", "combat"),
  gene("Robust", "combat"),
  gene("FireResistant", "combat"),
  gene("Unstoppable", "combat"),
  gene("NakedSpeed", "combat"),
  gene("WoundHealing_Slow", "combat"),
  gene("WoundHealing_Fast", "combat"),
  gene("WoundHealing_SuperFast", "combat"),

  gene("AptitudeTerrible_Animals", "skills"),
  gene("AptitudeTerrible_Social", "skills"),
  gene("AptitudeTerrible_Artistic", "skills"),
  gene("AptitudeTerrible_Mining", "skills"),
  gene("AptitudeTerrible_Plants", "skills"),
  gene("AptitudePoor_Artistic", "skills"),
  gene("AptitudePoor_Intellectual", "skills"),
  gene("AptitudePoor_Social", "skills"),
  gene("AptitudePoor_Shooting", "skills"),
  gene("AptitudePoor_Cooking", "skills"),
  gene("AptitudePoor_Plants", "skills"),
  gene("AptitudePoor_Animals", "skills"),
  gene("AptitudeStrong_Melee", "skills"),
  gene("AptitudeStrong_Social", "skills"),
  gene("AptitudeStrong_Intellectual", "skills"),
  gene("AptitudeRemarkable_Shooting", "skills"),
  gene("AptitudeRemarkable_Melee", "skills"),
  gene("AptitudeRemarkable_Animals", "skills"),
  gene("AptitudeRemarkable_Mining", "skills"),
  gene("AptitudeRemarkable_Social", "skills"),

  gene("Aggression_HyperAggressive", "moodMind"),
  gene("Aggression_Aggressive", "moodMind"),
  gene("Aggression_DeadCalm", "moodMind"),
  gene("Beauty_VeryUgly", "moodMind"),
  gene("Beauty_Ugly", "moodMind"),
  gene("Beauty_Pretty", "moodMind"),
  gene("Beauty_Beautiful", "moodMind"),
  gene("Mood_Depressive", "moodMind"),
  gene("Mood_Pessimist", "moodMind"),
  gene("Mood_Optimist", "moodMind"),
  gene("Mood_Sanguine", "moodMind"),
  gene("PsychicAbility_Deaf", "moodMind"),
  gene("PsychicAbility_Dull", "moodMind"),
  gene("PsychicAbility_Enhanced", "moodMind"),
  gene("PsychicAbility_Extreme", "moodMind"),
  gene("KindInstinct", "moodMind"),
  gene("ViolenceDisabled", "moodMind"),
  gene("PsychicBonding", "moodMind"),
  gene("KillThirst", "moodMind"),
  gene("DarkVision", "moodMind"),
  gene("Nearsighted", "moodMind"),

  gene("ChemicalDependency_GoJuice", "metabolism"),
  gene("ChemicalDependency_Psychite", "metabolism"),
  gene("Sterile", "metabolism"),
  gene("Fertile", "metabolism"),
  gene("Immunity_Weak", "metabolism"),
  gene("Immunity_Strong", "metabolism"),
  gene("Immunity_SuperStrong", "metabolism"),
  gene("Learning_Slow", "metabolism"),
  gene("Learning_Fast", "metabolism"),
  gene("Libido_Low", "metabolism"),
  gene("Libido_High", "metabolism"),
  gene("Neversleep", "metabolism"),
  gene("LowSleep", "metabolism"),
  gene("Sleepy", "metabolism"),
  gene("VerySleepy", "metabolism"),
  gene("RobustDigestion", "metabolism"),
  gene("StrongStomach", "metabolism"),

  gene("MinTemp_SmallDecrease", "temperature"),
  gene("MinTemp_SmallIncrease", "temperature"),
  gene("MinTemp_LargeIncrease", "temperature"),
  gene("MaxTemp_SmallDecrease", "temperature"),
  gene("MaxTemp_SmallIncrease", "temperature"),
  gene("MaxTemp_LargeIncrease", "temperature"),
  gene("UVSensitivity_Intense", "temperature"),
  gene("UVSensitivity_Mild", "temperature"),

  gene("ToxicEnvironmentResistance_Partial", "toxPollution"),
  gene("ToxicEnvironmentResistance_Total", "toxPollution"),
  gene("ToxResist_Partial", "toxPollution"),
  gene("ToxResist_Total", "toxPollution"),
  gene("PollutionRush", "toxPollution"),

  gene("Hemogenic", "vampire"),
  gene("HemogenDrain", "vampire"),
  gene("DiseaseFree", "vampire"),
  gene("TotalHealing", "vampire"),
  gene("Deathrest", "vampire"),
  gene("Ageless", "vampire"),
  gene("Deathless", "vampire"),
  gene("ArchiteMetabolism", "vampire"),
  gene("PerfectImmunity", "vampire"),
  gene("FireWeakness", "vampire"),
  gene("FireTerror", "vampire"),

  gene("AddictionImmune_WakeUp", "misc"),
  gene("Inbred", "misc"),
  gene("Instability_Mild", "misc"),
  gene("Instability_Major", "misc"),
  gene("Superclotting", "misc")
]);

export const BIOTECH_GENE_CATEGORIES: GeneCategory[] = [
  "recommended",
  "appearance",
  "bodyParts",
  "abilities",
  "combat",
  "skills",
  "moodMind",
  "metabolism",
  "temperature",
  "toxPollution",
  "vampire",
  "misc"
];

const LEGACY_GENE_DEFNAME_MAP: Record<string, string> = {
  StrongMeleeDamage: "MeleeDamage_Strong",
  FastRunner: "MoveSpeed_Quick",
  SuperImmune: "Immunity_SuperStrong",
  SlowAging: "Ageless",
  PsychicallyDull: "PsychicAbility_Dull"
};

export function normalizeGeneDefName(defName: string): string {
  return LEGACY_GENE_DEFNAME_MAP[defName] ?? defName.trim();
}

export function normalizeGeneDefNames(defNames: string[]): string[] {
  return Array.from(new Set(defNames.map(normalizeGeneDefName).filter(Boolean)));
}

export function isKnownBiotechGeneDefName(defName: string): boolean {
  const normalized = normalizeGeneDefName(defName);
  return BIOTECH_GENE_OPTIONS.some((option) => option.defName === normalized);
}

export function isValidGeneDefName(defName: string): boolean {
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(normalizeGeneDefName(defName));
}

function uniqueGenes(options: GeneOption[]): GeneOption[] {
  const seen = new Set<string>();
  const result: GeneOption[] = [];
  for (const option of options) {
    if (seen.has(option.defName)) continue;
    seen.add(option.defName);
    result.push(option);
  }
  return result;
}

function humanizeGeneDefName(defName: string): string {
  return defName
    .replace(/_/g, " / ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
