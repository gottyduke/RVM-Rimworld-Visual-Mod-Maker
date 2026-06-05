import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { compileProject, exportProjectZip, getRacePreviewXml, validateRaceForUi } from "../core/compiler";
import {
  directionLabels,
  getGeneratedWestItemTexturePath,
  getGeneratedWestTexturePath,
  groupLabels,
  itemTextureDirectionLabels,
  makeItemTextureAssetRole,
  makeRaceTextureAssetRole,
  raceTextureDirections,
  raceTextureGroups,
  sanitizeDefName,
  packageIdFromModName,
  sanitizeFolderName,
  sanitizePackageId,
  sanitizeThingDefName
} from "../core/assets";
import type { AppTab } from "../store/modProjectStore";
import { countUploadedRaceTextures, getAddItems, getItemAssets, getRaceAssets, getRaceData, getStorytellerAssets, useModProjectStore } from "../store/modProjectStore";
import type { CustomRaceData } from "../modules/customRace/schema";
import type { AddItemData, ItemKind } from "../modules/addItem/schema";
import { textureRequirementForKind } from "../modules/addItem/defaults";
import { BIOTECH_GENE_CATEGORIES, BIOTECH_GENE_OPTIONS, GENE_CATEGORY_LABELS, isValidGeneDefName, normalizeGeneDefNames } from "../modules/customRace/genes";
import type { GeneCategory } from "../modules/customRace/genes";
import type { BuildIssue, ItemTextureDirection, ProjectAsset, RaceTextureDirection, RaceTextureGroup, StorytellerPortraitRole, VirtualFile } from "../core/types";
import "./styles.css";


type UiLanguage = "zh" | "en";
const UI_LANGUAGE_STORAGE_KEY = "rimworldVisualModMaker.uiLanguage.v22";

const uiTranslations: Record<string, string> = {
  "Mod 信息": "Mod Info",
  "自定义种族": "Custom Race",
  "核心编辑器": "Core editor",
  "派系系统": "Faction System",
  "AI叙述者": "AI Storyteller",
  "自定义剧本": "Custom Scenario",
  "添加物品": "Add Item",
  "素材管理": "Assets",
  "XML 预览": "XML Preview",
  "实时生成": "Live generated",
  "导出": "Export",
  "ZIP / 报告": "ZIP / report",
  "构建状态": "Build Status",
  "个问题需要修复": "issues need fixing",
  "Schema 校验通过": "Schema validation passed",
  "自定义种族：": "Custom race: ",
  "未启用": "Disabled",
  "贴图：": "Textures: ",
  "已上传": "uploaded",
  "未启用种族时无需上传": "no textures required when race is disabled",
  "附加物品：": "Add items: ",
  "自定义种族未启用": "Custom race disabled",
  "设置": "Settings",
  "界面语言": "UI language",
  "中文": "Chinese",
  "英文": "English",
  "代码、变量名和 Def 名称始终保持英文。": "Code, variable names, and Def names always remain English.",
  "HAR 人形种族 Mod": "HAR humanoid race mod",
  "当前种族：": "Current race: ",
  "已取消导出。": "Export canceled.",
  "已导出：": "Exported: ",
  "导出失败。": "Export failed.",
  "身体 Body": "Body",
  "头部 Head": "Head",
  "正面 Front": "Front",
  "侧面 Side": "Side",
  "背面 Back": "Back",
  "单张图 Single": "Single texture",
  "上传 正面 Front": "Upload Front",
  "上传 侧面 Side": "Upload Side",
  "上传 背面 Back": "Upload Back",
  "上传 单张图 Single": "Upload Single texture",
  "上传 大立绘 portraitLarge": "Upload large portrait portraitLarge",
  "上传 小头像 portraitTiny": "Upload tiny portrait portraitTiny",
  "缺少 PNG": "Missing PNG",
  "预计目录结构": "Expected folder structure",
  "生成文件": "Generated files",
  "先验证": "Validate first",
  "Mod 基础信息": "Mod Basic Info",
  "会生成 About/About.xml": "Generates About/About.xml",
  "Mod 名称": "Mod name",
  "Package ID（必须全局唯一，不能和旧导出的 Mod 重复）": "Package ID (must be globally unique; cannot duplicate an old exported mod)",
  "作者": "Author",
  "描述": "Description",
  "目标游戏版本": "Target game version",
  "根据 Mod 名称自动生成唯一 Package ID": "Generate unique Package ID from Mod name",
  "模块注册视图": "Module Registry View",
  "Beta 1.0 已注册 Custom Race + HAR Compiler": "Beta 1.0 registered Custom Race + HAR Compiler",
  "如果启用自定义种族，导出将使用 Humanoid Alien Races：ThingDef 会生成为 AlienRace.ThingDef_AlienRace，并在 About.xml 写入 HAR 前置依赖。关闭自定义种族后，可以只导出物品、StorytellerDef 或 ScenarioDef。": "When Custom Race is enabled, export uses Humanoid Alien Races: ThingDef is generated as AlienRace.ThingDef_AlienRace and HAR is written as a dependency in About.xml. When Custom Race is disabled, you can export only items, StorytellerDef, or ScenarioDef.",
  "启用自定义种族 / HAR RaceDef": "Enable Custom Race / HAR RaceDef",
  "自定义种族已关闭：不会生成 HAR RaceDef、PawnKindDef、FactionDef，也不要求上传身体/头部贴图。": "Custom Race is disabled: HAR RaceDef, PawnKindDef, and FactionDef will not be generated, and body/head textures are not required.",
  "基础信息": "Basic Info",
  "ThingDef 的 defName / label / description；关闭后可只导出物品、叙述者或剧本": "ThingDef defName / label / description; when disabled, you can export only items, storytellers, or scenarios",
  "游戏内名称 Label": "In-game name Label",
  "唯一标识符 defName": "Unique identifier defName",
  "Single source of truth": "Single source of truth",
  "Build Report": "Build Report",
  "Schema、素材、路径校验": "Schema, asset, and path validation",
  "PNG / 路径": "PNG / paths",
  "路径": "paths",
  "发型：": "Hair: ",
  "衣物装备：": "Apparel: ",
  "食品、武器、通用物品：": "Food, weapons, generic items: ",
  "派系：": "Faction: ",
  "叙述者：": "Storyteller: ",
  "描述 Description": "Description",
  "数值编辑器": "Stats Editor",
  "滑块会实时同步中央 ModProject JSON": "Sliders sync live to central ModProject JSON",
  "基础血量倍率 baseHealthScale": "Base health scale baseHealthScale",
  "移动速度 MoveSpeed": "Move speed MoveSpeed",
  "近战伤害 Melee Damage": "Melee Damage",
  "体型 baseBodySize": "Body size baseBodySize",
  "寿命 lifeExpectancy": "Life expectancy lifeExpectancy",
  "素材上传": "Texture Upload",
  "仅在启用自定义种族时需要：身体和头部各 3 张": "Required only when Custom Race is enabled: 3 body textures and 3 head textures",
  "当前未启用自定义种族，上传贴图不是必需项。": "Custom Race is disabled; texture upload is not required.",
  "基因/特性配置": "Genes / Trait Configuration",
  "模式": "Mode",
  "搜索 GeneDef（已选": "Search GeneDef (selected",
  "手动添加 GeneDef / 模组基因": "Manually add GeneDef / modded genes",
  "添加": "Add",
  "展开全部": "Expand all",
  "折叠到推荐": "Collapse to recommended",
  "清空已选": "Clear selected",
  "推荐 / 常用": "Recommended / Common",
  "外观 / 颜色": "Appearance / Color",
  "身体部位 / 头脸": "Body parts / Head",
  "能力": "Abilities",
  "战斗 / 生存": "Combat / Survival",
  "技能倾向": "Skill aptitude",
  "心情 / 灵能 / 行为": "Mood / Psy / Behavior",
  "代谢 / 饮食 / 睡眠": "Metabolism / Food / Sleep",
  "温度 / 环境": "Temperature / Environment",
  "毒素 / 药物": "Toxin / Drug",
  "吸血鬼 / Archite": "Sanguophage / Archite",
  "Xenotype 称呼 / 基因面板显示": "Xenotype name / Gene panel display",
  "修改游戏基因界面里原本显示为“智人种”的称呼": "Change the label that would otherwise display as Baseline in the gene panel",
  "启用自定义 XenotypeDef，并在 PawnKindDef 中强制使用它": "Enable custom XenotypeDef and force it in PawnKindDef",
  "游戏内称呼 label": "In-game label label",
  "详细描述 description": "Full description description",
  "简短描述 descriptionShort": "Short description descriptionShort",
  "图标路径 iconPath": "Icon path iconPath",
  "可遗传 inheritable": "Inheritable inheritable",
  "高级设置": "Advanced Settings",
  "HAR 种族继承 Human，保留这些字段给高级用户覆盖": "HAR race inherits Human; these fields are kept for advanced overrides",
  "种族派系系统": "Race Faction System",
  "为当前种族生成 FactionDef，并让该派系默认使用本种族和本 Xenotype。": "Generate FactionDef for the current race, and make that faction use this race and Xenotype by default.",
  "启用派系 FactionDef": "Enable FactionDef",
  "自定义种族未启用时不会导出该派系，因为当前派系模板依赖种族 PawnKind。": "This faction will not be exported when Custom Race is disabled because the current faction template depends on the race PawnKind.",
  "派系 defName": "Faction defName",
  "派系名称 label": "Faction name label",
  "地图固定名称 fixedName": "Fixed map name fixedName",
  "派系描述 description": "Faction description description",
  "文化描述 culturalStyle": "Culture description culturalStyle",
  "Ideology CultureDef，可留空": "Ideology CultureDef, optional",
  "派系规则": "Faction Rules",
  "控制世界生成、科技水平、首领称呼和关系倾向。": "Controls world generation, tech level, leader title, and relation tendencies.",
  "派系大类 categoryTag": "Faction categoryTag",
  "科技水平 techLevel": "Tech level techLevel",
  "首领称号 leaderTitle": "Leader title leaderTitle",
  "单个成员称呼 pawnSingular": "Single member label pawnSingular",
  "多个成员称呼 pawnsPlural": "Plural member label pawnsPlural",
  "开局必定生成数量 requiredCountAtGameStart": "Required count at game start requiredCountAtGameStart",
  "世界创建界面可添加上限 maxConfigurableAtWorldCreation": "Max configurable at world creation maxConfigurableAtWorldCreation",
  "允许世界生成 canMakeRandomly": "Allow random world generation canMakeRandomly",
  "允许围攻 canSiege": "Allow siege canSiege",
  "允许主动袭击 canStageAttacks": "Allow active attacks canStageAttacks",
  "自定义 AI 故事叙述者": "Custom AI Storyteller",
  "生成新的 StorytellerDef，不再覆盖 Cassandra / Phoebe / Randy。": "Generate a new StorytellerDef; do not overwrite Cassandra / Phoebe / Randy.",
  "启用自定义 StorytellerDef": "Enable custom StorytellerDef",
  "叙述者 defName": "Storyteller defName",
  "显示名称 label": "Display name label",
  "叙述者描述 description": "Storyteller description description",
  "事件逻辑模板 baseProfile": "Event logic template baseProfile",
  "列表排序 listOrder": "List order listOrder",
  "叙述者立绘": "Storyteller Portraits",
  "上传 PNG 后会导出到 Textures/<packageId>/Storytellers/，并由新 StorytellerDef 引用。": "Uploaded PNGs are exported to Textures/<packageId>/Storytellers/ and referenced by the new StorytellerDef.",
  "大立绘 portraitLarge": "Large portrait portraitLarge",
  "小头像 portraitTiny": "Tiny portrait portraitTiny",
  "自定义剧本 ScenarioDef": "Custom Scenario ScenarioDef",
  "可选生成一个新的开局剧本，出现在“选择剧本”列表中。": "Optionally generate a new starting scenario that appears in the Select Scenario list.",
  "启用自定义剧本": "Enable custom ScenarioDef",
  "剧本 defName": "Scenario defName",
  "剧本名称 label": "Scenario name label",
  "剧本摘要 summary": "Scenario summary summary",
  "剧本描述 description": "Scenario description description",
  "玩家派系 playerFactionDef": "Player faction playerFactionDef",
  "实际开局人数 startingPawnCount": "Starting pawn count startingPawnCount",
  "可选候选人数 chooseFromPawnCount": "Choose-from pawn count chooseFromPawnCount",
  "控制捏人数量和起始资源。": "Controls starting pawns and starting resources.",
  "银 startWithSilver": "Silver startWithSilver",
  "包装生存餐 startWithPackagedMeals": "Packaged survival meals startWithPackagedMeals",
  "工业药 startWithMedicine": "Medicine startWithMedicine",
  "零部件 startWithComponents": "Components startWithComponents",
  "钢铁 startWithSteel": "Steel startWithSteel",
  "添加物品 Add Item": "Add Item",
  "发型、食品、衣物装备、武器、通用物品。每个物品独立生成 Def 和贴图路径。": "Hair, food, apparel, weapons, and generic items. Each item generates its own Def and texture path.",
  "新增物品": "New item",
  "物品类型": "Item type",
  "食品 Food ThingDef（单图）": "Food ThingDef (single texture)",
  "发型 HairDef（三视图）": "HairDef (three-view textures)",
  "衣物装备 Apparel（三视图 + 自动地面图）": "Apparel (three-view textures + auto ground texture)",
  "武器 Weapon ThingDef（单图）": "Weapon ThingDef (single texture)",
  "通用物品 Generic ThingDef（单图）": "Generic ThingDef (single texture)",
  "市场价值 MarketValue": "Market value MarketValue",
  "质量 Mass": "Mass Mass",
  "堆叠数量 StackLimit": "Stack limit StackLimit",
  "删除": "Delete",
  "素材清单": "Asset List",
  "还没有上传 PNG。请到自定义种族页面上传 Body 和 Head 的正面、侧面、背面。": "No PNG uploaded yet. Upload Body and Head front, side, and back textures on the Custom Race page.",
  "原文件：": "Original file: ",
  "预览": "Preview",
  "中央状态 ModProject JSON": "Central State ModProject JSON",
  "导出 ZIP": "Export ZIP",
  "点击“先验证”查看构建报告。": "Click Validate First to see the build report.",
  "构建通过，将生成": "Build passed; will generate",
  "个文件。": "files.",
  "构建失败，请修复错误。最常见原因是 6 张方向 PNG 未上传。低层 XML 仍可预览。": "Build failed; please fix errors. The most common cause is missing 6 directional PNGs. Low-level XML can still be previewed.",
  "一键导出": "One-click export",
  "生成标准 RimWorld Mod 文件夹并压缩为 ZIP": "Generate a standard RimWorld mod folder and compress it as ZIP",
  "已在浏览器中下载：": "Downloaded in browser: ",
  "导出失败。请检查素材与字段。": "Export failed. Check assets and fields.",
  "游戏内红字快速判断": "Quick in-game red error check",
  "帮助区分是本工具导出的 Mod，还是其他 Mod 的报错": "Helps distinguish this generated mod from errors caused by other mods",
  "优先看关键词：": "Check keywords first: ",
  "干净测试：": "Clean test: ",
  "常见无关红字：": "Common unrelated red errors: ",
  "贴图规则说明": "Texture Rule Notes",
  "当前限制：": "Current limits: ",
  "RimWorld 用 packageId 判断是不是同一个 Mod。请确保每个导出的 Mod 都使用唯一的 Package ID；如果与旧 Mod 重复，游戏会把它当成同一个 Mod 的重复副本并隐藏/忽略。": "RimWorld uses packageId to decide whether two mod folders are the same mod. Make sure every exported mod uses a unique Package ID; if it duplicates an older mod, the game will treat it as a duplicate copy and hide/ignore it.",
  "导出命名：": "Export naming: ",
  "并自动复制为": "and automatically copies it as",
  "点击移除": "Click to remove",
  "导出 XML 时会使用 ": "Exported XML uses ",
  "，例如 ": ", for example ",
  "。如果启用下方自定义 Xenotype，已选基因会写入 ": ". If the custom Xenotype below is enabled, selected genes are written into ",
  "，并让生成的 Pawn 不再显示为“智人种”。": ", so generated pawns no longer display as Baseline.",
  "代谢偏移 metabolismOffset（预留字段，当前不直接改写 GeneDef 代谢值）": "Metabolism offset metabolismOffset (reserved; does not directly rewrite GeneDef metabolism)",
  "导出后会生成 ": "Export generates ",
  "，并在 ": " and writes ",
  " 中写入 ": " into ",
  " 与 ": " and ",
  "。": ".",
  "初始好感 startingGoodwill（1.6 暂不导出）": "Starting goodwill startingGoodwill (not exported in 1.6)",
  "自然好感 naturalColonyGoodwill（1.6 暂不导出）": "Natural colony goodwill naturalColonyGoodwill (not exported in 1.6)",
  "生成逻辑：": "Generation logic: ",
  "FactionDef 会写入 ": "FactionDef writes ",
  "，并在世界创建界面的“添加...”列表中出现。": " and appears in the world creation Add... list.",
  "成员逻辑：": "Member logic: ",
  " 都会指向 ": " both point to ",
  "异种绑定：": "Xenotype binding: ",
  "如果启用 Xenotype，自定义派系会通过 ": "If Xenotype is enabled, the custom faction uses ",
  " 强制使用当前种族的 Xenotype。": " to force the current race Xenotype.",
  "文化字段：": "Culture field: ",
  "CultureDef 属于 Ideology 体系，留空最安全；填写时会使用 ": "CultureDef belongs to the Ideology system. Leaving it blank is safest; when filled, it uses ",
  "叙述者引言 quotation": "Storyteller quote quotation",
  "导出方式：": "Export method: ",
  "会生成 ": "Generates ",
  "，游戏的叙述者选择界面会出现一个新的选项。": ", and a new option appears in the storyteller selection screen.",
  "事件模板：": "Event template: ",
  "模板只决定 ": "The template only controls ",
  " 和默认节奏；名称、描述、引言和立绘都由你自定义。": " and default pacing; name, description, quote, and portraits are customized by you.",
  "事件节奏与人口目标": "Event Pacing and Population Targets",
  "控制威胁周期、大小事件间隔和叙述者希望维持的人口区间。": "Controls threat cycles, event intervals, and the population range the storyteller tries to maintain.",
  "期望人口下限 desiredPopulationMin": "Desired population minimum desiredPopulationMin",
  "期望人口上限 desiredPopulationMax": "Desired population maximum desiredPopulationMax",
  "危急人口 desiredPopulationCritical": "Critical population desiredPopulationCritical",
  "威胁周期 threatCycleLength": "Threat cycle length threatCycleLength",
  "大型威胁最小间隔 minDaysBetweenThreatBigs": "Minimum days between major threats minDaysBetweenThreatBigs",
  "随机事件 MTB classic_RandomEventMTBDays": "Random event MTB classic_RandomEventMTBDays",
  "小威胁 MTB classic_ThreatSmallMTBDays": "Small threat MTB classic_ThreatSmallMTBDays",
  "大威胁 MTB classic_ThreatBigMTBDays": "Major threat MTB classic_ThreatBigMTBDays",
  "可以只上传大立绘；未上传的小头像会使用所选模板的原版头像。XML 贴图路径不会包含 ": "You may upload only the large portrait; missing tiny portraits use the selected template's vanilla icon. XML texture paths do not include ",
  "建议：": "Recommendation: ",
  "普通殖民地用 ": "Use ",
  "；部落开局可尝试 ": " for ordinary colonies; try ",
  "说明：": "Note: ",
  "剧本系统字段较多，本版先生成稳定的基础开局：玩家派系、开局人数和起始物资。": "The scenario system has many fields. This version generates a stable basic start: player faction, pawn counts, and starting resources.",
  "开局人数与物资": "Starting Pawns and Resources",
  "还没有物品。点击“新增物品”开始添加发型、食品、衣物装备或武器。": "No items yet. Click New item to add hair, food, apparel, or weapons.",
  "按类型自动决定上传三视图或单张图": "Automatically requires three-view or single texture uploads by item type",
  "使用 ": "Uses ",
  "，需要正面 / 侧面 / 背面三视图，导出为 ": ", requires front / side / back textures, exports as ",
  "穿在角色身上时使用三视图；本工具会额外把正面图复制为单张地面 / 物品栏贴图。": "Uses three-view textures when worn; this tool also copies the front image as the single ground / inventory texture.",
  "使用单张 ": "Use a single ",
  " 贴图。": " texture.",
  "武器支持基础近战和基础远程；复杂武器、配方、科技、材料、工作台生产和音效会在后续版本扩展。": "Weapons currently support basic melee and basic ranged modes; complex weapons, recipes, research, materials, workbench production, and sounds will be expanded later.",
  "物品": "Item",
  "营养 Nutrition": "Nutrition Nutrition",
  "食物喜好度 Preferability": "Food preferability Preferability",
  "腐烂天数 rotDays": "Rot days rotDays",
  "穿戴层 layer": "Wear layer layer",
  "覆盖身体部位 bodyPartGroup": "Covered body part group bodyPartGroup",
  "锐器护甲 Armor Sharp": "Sharp armor Armor Sharp",
  "钝器护甲 Armor Blunt": "Blunt armor Armor Blunt",
  "热量护甲 Armor Heat": "Heat armor Armor Heat",
  "防寒 Insulation Cold": "Cold insulation Insulation Cold",
  "防暑 Insulation Heat": "Heat insulation Insulation Heat",
  "武器类型": "Weapon type",
  "伤害 damage": "Damage damage",
  "冷却 cooldown": "Cooldown cooldown",
  "可制作：生成 costList，避免 recipeMaker 红字": "Craftable: generate costList to avoid recipeMaker red errors",
  "制作工作量 WorkToMake": "Work to make WorkToMake",
  "钢铁成本 Steel": "Steel cost Steel",
  "零部件成本 Components": "Component cost Components",
  "射程 range": "Range range",
  "近距命中 AccuracyShort": "Short accuracy AccuracyShort",
  "中距命中 AccuracyMedium": "Medium accuracy AccuracyMedium",
  "远距命中 AccuracyLong": "Long accuracy AccuracyLong",
  "hairTags，用英文逗号分隔": "hairTags, separated by English commas",
  "导出时复制到 Textures/ 目录": "Copied into the Textures/ directory during export",
  "路径规则": "Path Rules",
  "XML texPath 使用基础路径；具体图片使用方向后缀": "XML texPath uses the base path; actual images use directional suffixes",
  "实际文件": "Actual file",
  "将导出 ": "Will export ",
  "如果日志包含 ": "If the log contains ",
  "，才大概率是当前导出包的问题。": ", it is likely an issue from the current exported package.",
  "只启用 Harmony、Core/DLC、Humanoid Alien Races 和本工具导出的 Mod，再开新档测试。": "Enable only Harmony, Core/DLC, Humanoid Alien Races, and the mod exported by this tool, then start a new test save.",
  "其他 Mod 缺 packageId / supportedVersions，通常不是本工具生成的内容。": "other mods missing packageId / supportedVersions are usually not generated by this tool.",
  "上传 ": "Upload ",
  "未上传": "Not uploaded"
};

const textNodeOriginals = new WeakMap<Text, string>();

function readInitialLanguage(): UiLanguage {
  if (typeof window === "undefined") return "en";
  const saved = window.localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  if (saved === "zh" || saved === "en") return saved;
  return "en";
}

function translateSourceText(text: string, language: UiLanguage): string {
  if (language === "zh") return text;

  let output = text;
  const entries = Object.entries(uiTranslations).sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of entries) {
    if (from && output.includes(from)) output = output.split(from).join(to);
  }

  output = output.replace(/(\d+) 个问题需要修复/g, "$1 issues need fixing");
  output = output.replace(/已选 (\d+) 个/g, "selected $1");
  output = output.replace(/(\d+)\/6 已上传/g, "$1/6 uploaded");
  output = output.replace(/附加物品：(\d+) 个/g, "Add items: $1");
  return output;
}

function shouldSkipTranslationNode(node: Node): boolean {
  const parent = node.parentElement;
  if (!parent) return true;
  return Boolean(parent.closest("code, pre, textarea, input, [data-no-translate]"));
}

function getCanonicalText(node: Text, language: UiLanguage): string {
  const saved = textNodeOriginals.get(node);
  if (!saved) {
    textNodeOriginals.set(node, node.data);
    return node.data;
  }

  const savedZh = translateSourceText(saved, "zh");
  const savedEn = translateSourceText(saved, "en");

  // React may update a text node in-place after counts or validation messages change.
  // If the current text is neither the saved source nor our own translated output,
  // treat it as a fresh canonical source instead of translating the old one again.
  if (node.data !== savedZh && node.data !== savedEn) {
    textNodeOriginals.set(node, node.data);
    return node.data;
  }

  return saved;
}

function translateDom(root: ParentNode, language: UiLanguage) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    if (shouldSkipTranslationNode(node)) continue;
    const source = getCanonicalText(node, language);
    const next = translateSourceText(source, language);
    if (next !== node.data) node.data = next;
  }
}

function useUiLanguageTranslator(language: UiLanguage) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    let translating = false;
    let scheduled = false;
    const apply = () => {
      scheduled = false;
      if (translating) return;
      translating = true;
      translateDom(document.body, language);
      translating = false;
    };
    const scheduleApply = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(apply);
    };
    apply();
    const observer = new MutationObserver(scheduleApply);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [language]);
}


const geneCategoryEnglishLabels: Record<GeneCategory, string> = {
  recommended: "Recommended / Common",
  appearance: "Appearance / Color",
  bodyParts: "Body parts / Head",
  abilities: "Abilities",
  combat: "Combat / Survival",
  skills: "Skill aptitude",
  moodMind: "Mood / Psy / Behavior",
  metabolism: "Metabolism / Food / Sleep",
  temperature: "Temperature adaptation",
  toxPollution: "Toxins / Pollution",
  vampire: "Sanguophage / Archite",
  misc: "Misc"
};

const geneEnglishDescriptions: Record<string, string> = {
  MeleeDamage_Strong: "Higher melee damage. Old alias: StrongMeleeDamage.",
  Robust: "Reduces incoming damage.",
  MoveSpeed_Quick: "Increases movement speed. Old alias: FastRunner.",
  MoveSpeed_VeryQuick: "Greatly increases movement speed.",
  Immunity_SuperStrong: "Greatly increases immunity gain speed. Old alias: SuperImmune.",
  Ageless: "Stops biological aging after adulthood. Old alias: SlowAging.",
  PsychicAbility_Dull: "Reduces psychic sensitivity. Old alias: PsychicallyDull.",
  PsychicAbility_Enhanced: "Increases psychic sensitivity.",
  DarkVision: "Improves vision in darkness.",
  WoundHealing_Fast: "Increases wound healing speed.",
  WoundHealing_SuperFast: "Greatly increases wound healing speed.",
  FireResistant: "Improves resistance to fire."
};

function displayGeneCategory(category: GeneCategory, language: UiLanguage): string {
  return language === "en" ? geneCategoryEnglishLabels[category] : GENE_CATEGORY_LABELS[category];
}

function displayGeneLabel(gene: { defName: string; label: string }, language: UiLanguage): string {
  if (language === "zh") return gene.label;
  return gene.label.split("/")[0].trim() || gene.defName;
}

function displayGeneDescription(gene: { defName: string; description: string }, language: UiLanguage): string {
  if (language === "zh") return gene.description;
  if (geneEnglishDescriptions[gene.defName]) return geneEnglishDescriptions[gene.defName];
  if (/[^\x00-\x7F]/.test(gene.description)) return `Biotech GeneDef: ${gene.defName}`;
  return gene.description;
}

const tabs: Array<{ id: AppTab; label: string; description: string }> = [
  { id: "mod", label: "Mod 信息", description: "About.xml" },
  { id: "race", label: "自定义种族", description: "核心编辑器" },
  { id: "faction", label: "派系系统", description: "FactionDef" },
  { id: "storyteller", label: "AI叙述者", description: "StorytellerDef" },
  { id: "scenario", label: "自定义剧本", description: "ScenarioDef" },
  { id: "items", label: "添加物品", description: "Add Item" },
  { id: "assets", label: "素材管理", description: "PNG / 路径" },
  { id: "preview", label: "XML 预览", description: "实时生成" },
  { id: "export", label: "导出", description: "ZIP / 报告" }
];


export default function App() {
  const [language, setLanguage] = useState<UiLanguage>(() => readInitialLanguage());
  useUiLanguageTranslator(language);
  const activeTab = useModProjectStore((state) => state.activeTab);
  const setActiveTab = useModProjectStore((state) => state.setActiveTab);
  const project = useModProjectStore((state) => state.project);
  const race = getRaceData(project);
  const raceIssues = validateRaceForUi(race);
  const assets = getRaceAssets(project);
  const uploadedCount = countUploadedRaceTextures(assets, race.textureMode);
  const itemCount = getAddItems(project).length;

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="brandBlock">
          <div className="brandMark">RW</div>
          <div>
            <h1>Visual Mod Maker</h1>
            <p>Beta 1.0 · HAR 人形种族 Mod</p>
          </div>
        </div>

        <nav className="tabList">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tabButton ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.description}</small>
            </button>
          ))}
        </nav>

        <div className="sidebarCard">
          <strong>构建状态</strong>
          <p className={raceIssues.length ? "dangerText" : "okText"}>
            {raceIssues.length ? `${raceIssues.length} 个问题需要修复` : "Schema 校验通过"}
          </p>
          <small>自定义种族：{race.enabled ? race.defName : "未启用"}</small>
          <small>贴图：{race.enabled ? `${uploadedCount}/${race.textureMode === "gendered" ? 12 : 6} 已上传` : "未启用种族时无需上传"}</small>
          <small>附加物品：{itemCount} 个</small>
        </div>
      </aside>

      <main className="mainPanel">
        <TopBar language={language} setLanguage={setLanguage} />
        {activeTab === "mod" && <ModInfoEditor />}
        {activeTab === "race" && <RaceEditor race={race} language={language} />}
        {activeTab === "faction" && <FactionPanel race={race} />}
        {activeTab === "storyteller" && <StorytellerPanel race={race} />}
        {activeTab === "scenario" && <ScenarioPanel race={race} />}
        {activeTab === "items" && <ItemsPanel />}
        {activeTab === "assets" && <AssetsPanel />}
        {activeTab === "preview" && <PreviewPanel />}
        {activeTab === "export" && <ExportPanel />}
      </main>
    </div>
  );
}

function TopBar({ language, setLanguage }: { language: UiLanguage; setLanguage(language: UiLanguage): void }) {
  const project = useModProjectStore((state) => state.project);
  const race = getRaceData(project);
  const assets = getRaceAssets(project);
  const uploadedCount = countUploadedRaceTextures(assets, race.textureMode);
  const itemCount = getAddItems(project).length;

  return (
    <header className="topBar">
      <div>
        <h2>{project.mod.name}</h2>
        <p>
          packageId: <code>{project.mod.packageId}</code> · {race.enabled ? <>defName: <code>{race.defName}</code></> : <>自定义种族未启用</>}
        </p>
      </div>
      <div className="topBarRight">
        <div className="statusPills">
          <span className="pill">RimWorld {project.targetGameVersion}</span>
          <span className={`pill ${!race.enabled || uploadedCount === (race.textureMode === "gendered" ? 12 : 6) ? "success" : "warning"}`}>Textures {race.enabled ? `${uploadedCount}/${race.textureMode === "gendered" ? 12 : 6}` : "Off"}</span>
          <span className="pill">{race.enabled ? "HAR Compiler" : "Race Off"}</span>
          <span className="pill">Items {itemCount}</span>
          {race.storyteller.enabled && <span className="pill success">StorytellerDef</span>}
        </div>
        <div className="settingsControl" aria-label="Settings">
          <span className="settingsIcon">⚙</span>
          <label>
            <span>界面语言/UI Language</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value as UiLanguage)}>
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </label>
          <small>{language === "en" ? "Code, variable names, and Def names always remain English." : "代码、变量名和 Def 名称始终保持英文。"}</small>
        </div>
      </div>
    </header>
  );
}

function ModInfoEditor() {
  const project = useModProjectStore((state) => state.project);
  const setModField = useModProjectStore((state) => state.setModField);
  const setTargetGameVersion = useModProjectStore((state) => state.setTargetGameVersion);

  return (
    <section className="pageGrid twoColumns">
      <Card title="Mod 基础信息" subtitle="会生成 About/About.xml">
        <TextInput label="Mod 名称" value={project.mod.name} onChange={(value) => setModField("name", value)} />
        <TextInput label="Package ID（必须全局唯一，不能和旧导出的 Mod 重复）" value={project.mod.packageId} onChange={(value) => setModField("packageId", sanitizePackageId(value))} />
        <div className="hintBox warningHint">
          RimWorld 用 packageId 判断是不是同一个 Mod。请确保每个导出的 Mod 都使用唯一的 Package ID；如果与旧 Mod 重复，游戏会把它当成同一个 Mod 的重复副本并隐藏/忽略。
        </div>
        <button
          className="ghostButton"
          type="button"
          onClick={() => setModField("packageId", packageIdFromModName(project.mod.name, project.mod.author))}
        >
          根据 Mod 名称自动生成唯一 Package ID
        </button>
        <TextInput label="作者" value={project.mod.author} onChange={(value) => setModField("author", value)} />
        <TextArea label="描述" value={project.mod.description} onChange={(value) => setModField("description", value)} />
        <SelectInput
          label="目标游戏版本"
          value={project.targetGameVersion}
          onChange={setTargetGameVersion}
          options={["1.6", "1.5", "1.4"]}
        />
      </Card>

      <Card title="模块注册视图" subtitle="Beta 1.0 已注册 Custom Race + HAR Compiler">
        <div className="moduleDiagram">
          <div className="moduleBox green">Data Schema</div>
          <div className="arrow">→</div>
          <div className="moduleBox blue">React UI</div>
          <div className="arrow">→</div>
          <div className="moduleBox red">XML Compiler</div>
        </div>
        <p className="muted">
          如果启用自定义种族，导出将使用 Humanoid Alien Races：ThingDef 会生成为 AlienRace.ThingDef_AlienRace，并在 About.xml 写入 HAR 前置依赖。关闭自定义种族后，可以只导出物品、StorytellerDef 或 ScenarioDef。
        </p>
        <CodeBlock code={JSON.stringify(project.dependencies, null, 2)} />
      </Card>
    </section>
  );
}

function RaceEditor({ race, language }: { race: CustomRaceData; language: UiLanguage }) {
  const updateRace = useModProjectStore((state) => state.updateRace);
  const uploadRaceTexture = useModProjectStore((state) => state.uploadRaceTexture);
  const project = useModProjectStore((state) => state.project);
  const assets = getRaceAssets(project);
  const [geneSearch, setGeneSearch] = useState("");
  const [customGeneDef, setCustomGeneDef] = useState("");
  const [expandedGeneCategories, setExpandedGeneCategories] = useState<Set<GeneCategory>>(() => new Set(["recommended"]));
  const selectedGeneDefs = normalizeGeneDefNames(race.genes.selectedGeneDefs);
  const filteredGeneOptions = useMemo(() => {
    const query = geneSearch.trim().toLowerCase();
    if (!query) return BIOTECH_GENE_OPTIONS;
    return BIOTECH_GENE_OPTIONS.filter((gene) =>
      gene.defName.toLowerCase().includes(query)
      || gene.label.toLowerCase().includes(query)
      || gene.description.toLowerCase().includes(query)
      || GENE_CATEGORY_LABELS[gene.category].toLowerCase().includes(query)
      || displayGeneCategory(gene.category, "en").toLowerCase().includes(query)
      || displayGeneCategory(gene.category, "zh").toLowerCase().includes(query)
    );
  }, [geneSearch]);
  const selectedGeneSet = new Set(selectedGeneDefs);

  function toggleGene(defName: string, enabled: boolean) {
    updateRace((current) => {
      const selected = new Set(normalizeGeneDefNames(current.genes.selectedGeneDefs));
      if (enabled) selected.add(defName);
      else selected.delete(defName);
      return {
        ...current,
        genes: { ...current.genes, selectedGeneDefs: Array.from(selected) }
      };
    });
  }

  function addCustomGeneDef() {
    const value = customGeneDef.trim();
    if (!isValidGeneDefName(value)) {
      alert("GeneDef 名称只能包含英文字母、数字、下划线，并且必须以字母开头。");
      return;
    }
    toggleGene(value, true);
    setCustomGeneDef("");
  }

  function toggleGeneCategory(category: GeneCategory) {
    setExpandedGeneCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function expandAllGeneCategories() {
    setExpandedGeneCategories(new Set(BIOTECH_GENE_CATEGORIES));
  }

  function collapseAllGeneCategories() {
    setExpandedGeneCategories(new Set(["recommended"]));
  }

  function clearSelectedGenes() {
    updateRace((current) => ({
      ...current,
      genes: { ...current.genes, selectedGeneDefs: [] }
    }));
  }

  return (
    <section className="pageGrid threeColumns">
      <div className="mainColumn">
        <Card title="基础信息" subtitle="ThingDef 的 defName / label / description；关闭后可只导出物品、叙述者或剧本">
          <CheckboxInput
            label="启用自定义种族 / HAR RaceDef"
            checked={race.enabled}
            onChange={(checked) => updateRace((current) => ({ ...current, enabled: checked }))}
          />
          {!race.enabled && <p className="noticeText">自定义种族已关闭：不会生成 HAR RaceDef、PawnKindDef、FactionDef，也不要求上传身体/头部贴图。</p>}
          <TextInput
            label="唯一标识符 defName"
            value={race.defName}
            onChange={(value) => updateRace((current) => ({
              ...current,
              defName: value,
              xenotype: {
                ...current.xenotype,
                defName: current.xenotype.defName === `${current.defName}_Xenotype` ? `${value}_Xenotype` : current.xenotype.defName
              },
              faction: {
                ...current.faction,
                defName: current.faction.defName === `${current.defName}Faction` ? `${value}Faction` : current.faction.defName
              }
            }))}
          />
          <TextInput
            label="游戏内名称 Label"
            value={race.label}
            onChange={(value) => updateRace((current) => ({
              ...current,
              label: value,
              xenotype: {
                ...current.xenotype,
                label: current.xenotype.label === current.label ? value : current.xenotype.label
              },
              faction: {
                ...current.faction,
                pawnSingular: current.faction.pawnSingular === current.label ? value : current.faction.pawnSingular,
                pawnsPlural: current.faction.pawnsPlural === current.label ? value : current.faction.pawnsPlural
              }
            }))}
          />
          <TextArea
            label="描述 Description"
            value={race.description}
            onChange={(value) => updateRace((current) => ({ ...current, description: value }))}
          />
        </Card>

        <Card title="数值编辑器" subtitle="滑块会实时同步中央 ModProject JSON">
          <SliderInput
            label="基础血量倍率 baseHealthScale"
            min={0.1}
            max={10}
            step={0.05}
            value={race.stats.healthScale}
            onChange={(value) => updateRace((current) => ({ ...current, stats: { ...current.stats, healthScale: value } }))}
          />
          <SliderInput
            label="移动速度 MoveSpeed"
            min={0.1}
            max={20}
            step={0.1}
            value={race.stats.moveSpeed}
            onChange={(value) => updateRace((current) => ({ ...current, stats: { ...current.stats, moveSpeed: value } }))}
          />
          <SliderInput
            label="近战伤害 Melee Damage"
            min={0}
            max={100}
            step={0.5}
            value={race.stats.meleeDamage}
            onChange={(value) => updateRace((current) => ({ ...current, stats: { ...current.stats, meleeDamage: value } }))}
          />
          <SliderInput
            label="体型 baseBodySize"
            min={0.1}
            max={10}
            step={0.05}
            value={race.stats.baseBodySize}
            onChange={(value) => updateRace((current) => ({ ...current, stats: { ...current.stats, baseBodySize: value } }))}
          />
          <SliderInput
            label="寿命 lifeExpectancy"
            min={1}
            max={1000}
            step={1}
            value={race.stats.lifeExpectancy}
            onChange={(value) => updateRace((current) => ({ ...current, stats: { ...current.stats, lifeExpectancy: value } }))}
          />
        </Card>
      </div>

      <div className="sideColumn">
        <Card title="素材上传" subtitle="可选择一套通用贴图，或按 Male / Female 分别上传身体和头部三视图">
          {!race.enabled && <p className="muted">当前未启用自定义种族，上传贴图不是必需项。</p>}
          <SelectInput
            label="贴图模式 textureMode"
            value={race.textureMode}
            options={["shared", "gendered"]}
            onChange={(value) => updateRace((current) => ({ ...current, textureMode: value as CustomRaceData["textureMode"] }))}
          />
          {race.textureMode === "shared" ? (
            <div className="textureVariantBlock">
              <h4>Shared texture set</h4>
              <TextureGroupUpload
                group="body"
                assets={assets.shared.body}
                onFile={(direction, file) => uploadRaceTexture(makeRaceTextureAssetRole("body", direction, "shared"), file)}
              />
              <TextureGroupUpload
                group="head"
                assets={assets.shared.head}
                onFile={(direction, file) => uploadRaceTexture(makeRaceTextureAssetRole("head", direction, "shared"), file)}
              />
            </div>
          ) : (
            <>
              <div className="textureVariantBlock">
                <h4>Male texture set</h4>
                <TextureGroupUpload
                  group="body"
                  assets={assets.male.body}
                  onFile={(direction, file) => uploadRaceTexture(makeRaceTextureAssetRole("body", direction, "male"), file)}
                />
                <TextureGroupUpload
                  group="head"
                  assets={assets.male.head}
                  onFile={(direction, file) => uploadRaceTexture(makeRaceTextureAssetRole("head", direction, "male"), file)}
                />
              </div>
              <div className="textureVariantBlock">
                <h4>Female texture set</h4>
                <TextureGroupUpload
                  group="body"
                  assets={assets.female.body}
                  onFile={(direction, file) => uploadRaceTexture(makeRaceTextureAssetRole("body", direction, "female"), file)}
                />
                <TextureGroupUpload
                  group="head"
                  assets={assets.female.head}
                  onFile={(direction, file) => uploadRaceTexture(makeRaceTextureAssetRole("head", direction, "female"), file)}
                />
              </div>
            </>
          )}
          <p className="muted">
            导出命名：front → _south.png，side → _east.png 并自动复制为 _west.png，back → _north.png。
          </p>
        </Card>

        <Card title="基因/特性配置" subtitle="Biotech XenotypeDef + HAR 种族；可搜索、分类勾选，也可输入模组 GeneDef">
          <SelectInput
            label="模式"
            value={race.genes.mode}
            options={["none", "biotechOptional", "har"]}
            onChange={(value) => updateRace((current) => ({ ...current, genes: { ...current.genes, mode: value as CustomRaceData["genes"]["mode"] } }))}
          />

          <div className="geneToolbar">
            <TextInput label={`搜索 GeneDef（已选 ${selectedGeneDefs.length} 个）`} value={geneSearch} onChange={setGeneSearch} />
            <div className="customGeneRow">
              <TextInput label="手动添加 GeneDef / 模组基因" value={customGeneDef} onChange={setCustomGeneDef} />
              <button className="ghostButton" type="button" onClick={addCustomGeneDef}>添加</button>
            </div>
          </div>

          {selectedGeneDefs.length > 0 && (
            <div className="selectedGeneList">
              {selectedGeneDefs.map((defName) => (
                <button key={defName} className="geneChip" type="button" onClick={() => toggleGene(defName, false)} title="点击移除">
                  {defName} ×
                </button>
              ))}
            </div>
          )}

          <div className="geneActionRow">
            <button className="ghostButton compactButton" type="button" onClick={expandAllGeneCategories}>展开全部</button>
            <button className="ghostButton compactButton" type="button" onClick={collapseAllGeneCategories}>折叠到推荐</button>
            <button className="ghostButton compactButton danger" type="button" onClick={clearSelectedGenes} disabled={selectedGeneDefs.length === 0}>清空已选</button>
          </div>

          <div className="geneCategoryList">
            {BIOTECH_GENE_CATEGORIES.map((category) => {
              const genes = filteredGeneOptions.filter((gene) => gene.category === category);
              if (genes.length === 0) return null;
              const isExpanded = Boolean(geneSearch) || expandedGeneCategories.has(category);
              return (
                <section key={category} className={`geneCategory ${isExpanded ? "expanded" : ""}`}>
                  <button
                    className="geneCategoryHeader"
                    type="button"
                    onClick={() => toggleGeneCategory(category)}
                    aria-expanded={isExpanded}
                  >
                    <span>{isExpanded ? "▼" : "▶"} {displayGeneCategory(category, language)}</span>
                    <small>{genes.length}</small>
                  </button>
                  {isExpanded && (
                    <div className="geneGrid" role="list">
                      {genes.map((gene) => {
                        const checked = selectedGeneSet.has(gene.defName);
                        return (
                          <label key={gene.defName} className={`geneOption ${checked ? "selected" : ""}`} title={displayGeneDescription(gene, language)}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) => toggleGene(gene.defName, event.target.checked)}
                            />
                            <span className="geneOptionMain">
                              <strong>{displayGeneLabel(gene, language)}</strong>
                              <code>{gene.defName}</code>
                              <small>{displayGeneDescription(gene, language)}</small>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          <p className="muted">导出 XML 时会使用 <code>GeneDef</code>，例如 <code>MeleeDamage_Strong</code>。如果启用下方自定义 Xenotype，已选基因会写入 <code>XenotypeDef</code>，并让生成的 Pawn 不再显示为“智人种”。</p>
          <SliderInput
            label="代谢偏移 metabolismOffset（预留字段，当前不直接改写 GeneDef 代谢值）"
            min={-20}
            max={20}
            step={1}
            value={race.genes.metabolismOffset}
            onChange={(value) => updateRace((current) => ({ ...current, genes: { ...current.genes, metabolismOffset: value } }))}
          />
        </Card>

        <Card title="Xenotype 称呼 / 基因面板显示" subtitle="修改游戏基因界面里原本显示为“智人种”的称呼">
          <CheckboxInput
            label="启用自定义 XenotypeDef，并在 PawnKindDef 中强制使用它"
            checked={race.xenotype.enabled}
            onChange={(checked) => updateRace((current) => ({ ...current, xenotype: { ...current.xenotype, enabled: checked } }))}
          />
          <TextInput
            label="Xenotype defName"
            value={race.xenotype.defName}
            onChange={(value) => updateRace((current) => ({ ...current, xenotype: { ...current.xenotype, defName: value } }))}
          />
          <TextInput
            label="游戏内称呼 label"
            value={race.xenotype.label}
            onChange={(value) => updateRace((current) => ({ ...current, xenotype: { ...current.xenotype, label: value } }))}
          />
          <TextArea
            label="详细描述 description"
            value={race.xenotype.description}
            onChange={(value) => updateRace((current) => ({ ...current, xenotype: { ...current.xenotype, description: value } }))}
          />
          <TextInput
            label="简短描述 descriptionShort"
            value={race.xenotype.descriptionShort}
            onChange={(value) => updateRace((current) => ({ ...current, xenotype: { ...current.xenotype, descriptionShort: value } }))}
          />
          <TextInput
            label="图标路径 iconPath"
            value={race.xenotype.iconPath}
            onChange={(value) => updateRace((current) => ({ ...current, xenotype: { ...current.xenotype, iconPath: value } }))}
          />
          <CheckboxInput
            label="可遗传 inheritable"
            checked={race.xenotype.inheritable}
            onChange={(checked) => updateRace((current) => ({ ...current, xenotype: { ...current.xenotype, inheritable: checked } }))}
          />
          <p className="muted">导出后会生成 <code>XenotypeDef</code>，并在 <code>PawnKindDef</code> 中写入 <code>xenotypeSet</code> 与 <code>useFactionXenotypes=false</code>。</p>
        </Card>

        <Card title="高级设置" subtitle="HAR 种族继承 Human，保留这些字段给高级用户覆盖">
          <TextInput
            label="race.body"
            value={race.advanced.raceBodyDef}
            onChange={(value) => updateRace((current) => ({ ...current, advanced: { ...current.advanced, raceBodyDef: value } }))}
          />
          <SelectInput
            label="intelligence"
            value={race.advanced.intelligence}
            options={["Animal", "ToolUser", "Humanlike"]}
            onChange={(value) => updateRace((current) => ({ ...current, advanced: { ...current.advanced, intelligence: value as CustomRaceData["advanced"]["intelligence"] } }))}
          />
          <TextInput
            label="foodType"
            value={race.advanced.foodType}
            onChange={(value) => updateRace((current) => ({ ...current, advanced: { ...current.advanced, foodType: value } }))}
          />
        </Card>
      </div>
    </section>
  );
}

function TextureGroupUpload({
  group,
  assets,
  onFile
}: {
  group: RaceTextureGroup;
  assets: Record<RaceTextureDirection, ProjectAsset | undefined>;
  onFile(direction: RaceTextureDirection, file: File): void;
}) {
  return (
    <div className="textureGroup">
      <div className="textureGroupHeader">
        <strong>{groupLabels[group]}</strong>
        <small>{raceTextureDirections.filter((direction) => assets[direction]).length}/3</small>
      </div>
      <div className="directionGrid">
        {raceTextureDirections.map((direction) => (
          <TextureUpload
            key={direction}
            label={directionLabels[direction]}
            asset={assets[direction]}
            onFile={(file) => onFile(direction, file)}
          />
        ))}
      </div>
    </div>
  );
}



function FactionPanel({ race }: { race: CustomRaceData }) {
  const updateRace = useModProjectStore((state) => state.updateRace);
  const faction = race.faction;

  function updateFaction<K extends keyof CustomRaceData["faction"]>(field: K, value: CustomRaceData["faction"][K]) {
    updateRace((current) => ({
      ...current,
      faction: {
        ...current.faction,
        [field]: value
      }
    }));
  }

  return (
    <section className="pageGrid twoColumns">
      <Card title="种族派系系统" subtitle="为当前种族生成 FactionDef，并让该派系默认使用本种族和本 Xenotype。">
        {!race.enabled && <p className="noticeText">自定义种族未启用时不会导出该派系，因为当前派系模板依赖种族 PawnKind。</p>}
        <CheckboxInput label="启用派系 FactionDef" checked={faction.enabled} onChange={(value) => updateFaction("enabled", value)} />
        <TextInput label="派系 defName" value={faction.defName} onChange={(value) => updateFaction("defName", sanitizeThingDefName(value))} />
        <TextInput label="派系名称 label" value={faction.label} onChange={(value) => updateFaction("label", value)} />
        <TextInput label="地图固定名称 fixedName" value={faction.fixedName} onChange={(value) => updateFaction("fixedName", value)} />
        <TextArea label="派系描述 description" value={faction.description} onChange={(value) => updateFaction("description", value)} />
        <TextArea label="文化描述 culturalStyle" value={faction.culturalStyle} onChange={(value) => updateFaction("culturalStyle", value)} />
        <TextInput label="Ideology CultureDef，可留空" value={faction.cultureDefName} onChange={(value) => updateFaction("cultureDefName", value.trim() ? sanitizeDefName(value) : "")} />
      </Card>

      <Card title="派系规则" subtitle="控制世界生成、科技水平、首领称呼和关系倾向。">
        <SelectInput label="派系大类 categoryTag" value={faction.categoryTag} options={["Outlander", "Tribal", "Pirate"]} onChange={(value) => updateFaction("categoryTag", value as CustomRaceData["faction"]["categoryTag"])} />
        <SelectInput label="科技水平 techLevel" value={faction.techLevel} options={["Neolithic", "Medieval", "Industrial", "Spacer", "Ultra", "Archotech"]} onChange={(value) => updateFaction("techLevel", value as CustomRaceData["faction"]["techLevel"])} />
        <TextInput label="首领称号 leaderTitle" value={faction.leaderTitle} onChange={(value) => updateFaction("leaderTitle", value)} />
        <TextInput label="单个成员称呼 pawnSingular" value={faction.pawnSingular} onChange={(value) => updateFaction("pawnSingular", value)} />
        <TextInput label="多个成员称呼 pawnsPlural" value={faction.pawnsPlural} onChange={(value) => updateFaction("pawnsPlural", value)} />
        <SliderInput label="初始好感 startingGoodwill（1.6 暂不导出）" min={-100} max={100} step={1} value={faction.startingGoodwill} onChange={(value) => updateFaction("startingGoodwill", value)} />
        <SliderInput label="自然好感 naturalColonyGoodwill（1.6 暂不导出）" min={-100} max={100} step={1} value={faction.naturalColonyGoodwill} onChange={(value) => updateFaction("naturalColonyGoodwill", value)} />
        <SliderInput label="世界创建界面可添加上限 maxConfigurableAtWorldCreation" min={0} max={20} step={1} value={Math.min(20, faction.maxConfigurableAtWorldCreation)} onChange={(value) => updateFaction("maxConfigurableAtWorldCreation", Math.round(value) >= 20 ? 9999 : Math.round(value))} />
        <SliderInput label="开局必定生成数量 requiredCountAtGameStart" min={0} max={5} step={1} value={faction.requiredCountAtGameStart} onChange={(value) => updateFaction("requiredCountAtGameStart", Math.round(value))} />
        <CheckboxInput label="允许世界生成 canMakeRandomly" checked={faction.canMakeRandomly} onChange={(value) => updateFaction("canMakeRandomly", value)} />
        <CheckboxInput label="允许围攻 canSiege" checked={faction.canSiege} onChange={(value) => updateFaction("canSiege", value)} />
        <CheckboxInput label="允许主动袭击 canStageAttacks" checked={faction.canStageAttacks} onChange={(value) => updateFaction("canStageAttacks", value)} />
        <div className="diagnosticList">
          <div><strong>生成逻辑：</strong>FactionDef 会写入 <code>maxConfigurableAtWorldCreation</code> 和 <code>requiredCountAtGameStart</code>，并在世界创建界面的“添加...”列表中出现。</div>
          <div><strong>成员逻辑：</strong><code>basicMemberKind</code> 和 <code>pawnGroupMakers</code> 都会指向 <code>{race.defName}_FactionMember</code>。</div>
          <div><strong>异种绑定：</strong>如果启用 Xenotype，自定义派系会通过 <code>xenotypeSet</code> 强制使用当前种族的 Xenotype。</div>
          <div><strong>文化字段：</strong>CultureDef 属于 Ideology 体系，留空最安全；填写时会使用 <code>MayRequire=Ludeon.RimWorld.Ideology</code>。</div>
        </div>
      </Card>
    </section>
  );
}


function StorytellerPanel({ race }: { race: CustomRaceData }) {
  const project = useModProjectStore((state) => state.project);
  const updateRace = useModProjectStore((state) => state.updateRace);
  const uploadStorytellerPortrait = useModProjectStore((state) => state.uploadStorytellerPortrait);
  const assets = getStorytellerAssets(project);
  const storyteller = race.storyteller;

  function updateStoryteller<K extends keyof CustomRaceData["storyteller"]>(field: K, value: CustomRaceData["storyteller"][K]) {
    updateRace((current) => ({
      ...current,
      storyteller: {
        ...current.storyteller,
        [field]: value
      }
    }));
  }

  function uploadPortrait(role: StorytellerPortraitRole, file: File) {
    uploadStorytellerPortrait(role, file);
  }

  function applyProfile(profile: CustomRaceData["storyteller"]["baseProfile"]) {
    const preset = profile === "Phoebe"
      ? { threatCycleLength: 17, minDaysBetweenThreatBigs: 12.5, randomEventMtbDays: 1, threatSmallMtbDays: 6, threatBigMtbDays: 6 }
      : profile === "Randy"
        ? { threatCycleLength: 3.8, minDaysBetweenThreatBigs: 0.5, randomEventMtbDays: 0.8, threatSmallMtbDays: 3, threatBigMtbDays: 2.5 }
        : { threatCycleLength: 9.2, minDaysBetweenThreatBigs: 1.9, randomEventMtbDays: 1, threatSmallMtbDays: 3.75, threatBigMtbDays: 1.25 };
    updateRace((current) => ({
      ...current,
      storyteller: {
        ...current.storyteller,
        baseProfile: profile,
        ...preset
      }
    }));
  }

  return (
    <section className="pageGrid twoColumns">
      <Card title="自定义 AI 故事叙述者" subtitle="生成新的 StorytellerDef，不再覆盖 Cassandra / Phoebe / Randy。">
        <CheckboxInput label="启用自定义 StorytellerDef" checked={storyteller.enabled} onChange={(value) => updateStoryteller("enabled", value)} />
        <TextInput label="叙述者 defName" value={storyteller.defName} onChange={(value) => updateStoryteller("defName", sanitizeDefName(value))} />
        <TextInput label="显示名称 label" value={storyteller.label} onChange={(value) => updateStoryteller("label", value)} />
        <TextArea label="叙述者描述 description" value={storyteller.description} onChange={(value) => updateStoryteller("description", value)} />
        <TextArea label="叙述者引言 quotation" value={storyteller.quotation} onChange={(value) => updateStoryteller("quotation", value)} />
        <SelectInput
          label="事件逻辑模板 baseProfile"
          value={storyteller.baseProfile}
          options={["Cassandra", "Phoebe", "Randy"]}
          onChange={(value) => applyProfile(value as CustomRaceData["storyteller"]["baseProfile"])}
        />
        <SliderInput label="列表排序 listOrder" min={1} max={200} step={1} value={storyteller.listOrder} onChange={(value) => updateStoryteller("listOrder", Math.round(value))} />
        <div className="diagnosticList">
          <div><strong>导出方式：</strong>会生成 <code>Defs/StorytellerDefs/{storyteller.defName}.xml</code>，游戏的叙述者选择界面会出现一个新的选项。</div>
          <div><strong>事件模板：</strong>模板只决定 <code>incidentMakers</code> 和默认节奏；名称、描述、引言和立绘都由你自定义。</div>
        </div>
      </Card>

      <Card title="事件节奏与人口目标" subtitle="控制威胁周期、大小事件间隔和叙述者希望维持的人口区间。">
        <SliderInput label="期望人口下限 desiredPopulationMin" min={0} max={30} step={1} value={storyteller.desiredPopulationMin} onChange={(value) => updateStoryteller("desiredPopulationMin", value)} />
        <SliderInput label="期望人口上限 desiredPopulationMax" min={1} max={60} step={1} value={storyteller.desiredPopulationMax} onChange={(value) => updateStoryteller("desiredPopulationMax", value)} />
        <SliderInput label="危急人口 desiredPopulationCritical" min={1} max={80} step={1} value={storyteller.desiredPopulationCritical} onChange={(value) => updateStoryteller("desiredPopulationCritical", value)} />
        <SliderInput label="威胁周期 threatCycleLength" min={0.5} max={40} step={0.1} value={storyteller.threatCycleLength} onChange={(value) => updateStoryteller("threatCycleLength", value)} />
        <SliderInput label="大型威胁最小间隔 minDaysBetweenThreatBigs" min={0} max={30} step={0.1} value={storyteller.minDaysBetweenThreatBigs} onChange={(value) => updateStoryteller("minDaysBetweenThreatBigs", value)} />
        <SliderInput label="随机事件 MTB classic_RandomEventMTBDays" min={0.05} max={30} step={0.05} value={storyteller.randomEventMtbDays} onChange={(value) => updateStoryteller("randomEventMtbDays", value)} />
        <SliderInput label="小威胁 MTB classic_ThreatSmallMTBDays" min={0.05} max={30} step={0.05} value={storyteller.threatSmallMtbDays} onChange={(value) => updateStoryteller("threatSmallMtbDays", value)} />
        <SliderInput label="大威胁 MTB classic_ThreatBigMTBDays" min={0.05} max={30} step={0.05} value={storyteller.threatBigMtbDays} onChange={(value) => updateStoryteller("threatBigMtbDays", value)} />
      </Card>

      <Card title="叙述者立绘" subtitle="上传 PNG 后会导出到 Textures/<packageId>/Storytellers/，并由新 StorytellerDef 引用。">
        <TextureUpload
          label="大立绘 portraitLarge"
          asset={assets.large}
          onFile={(file) => uploadPortrait("storyteller.large", file)}
        />
        <TextureUpload
          label="小头像 portraitTiny"
          asset={assets.tiny}
          onFile={(file) => uploadPortrait("storyteller.tiny", file)}
        />
        <p className="muted">可以只上传大立绘；未上传的小头像会使用所选模板的原版头像。XML 贴图路径不会包含 <code>Textures/</code> 和 <code>.png</code>。</p>
      </Card>
    </section>
  );
}

function ScenarioPanel({ race }: { race: CustomRaceData }) {
  const updateRace = useModProjectStore((state) => state.updateRace);
  const scenario = race.scenario;

  function updateScenario<K extends keyof CustomRaceData["scenario"]>(field: K, value: CustomRaceData["scenario"][K]) {
    updateRace((current) => ({
      ...current,
      scenario: {
        ...current.scenario,
        [field]: value
      }
    }));
  }

  return (
    <section className="pageGrid twoColumns">
      <Card title="自定义剧本 ScenarioDef" subtitle="可选生成一个新的开局剧本，出现在“选择剧本”列表中。">
        <CheckboxInput label="启用自定义剧本" checked={scenario.enabled} onChange={(value) => updateScenario("enabled", value)} />
        <TextInput label="剧本 defName" value={scenario.defName} onChange={(value) => updateScenario("defName", sanitizeDefName(value))} />
        <TextInput label="剧本名称 label" value={scenario.label} onChange={(value) => updateScenario("label", value)} />
        <TextArea label="剧本摘要 summary" value={scenario.summary} onChange={(value) => updateScenario("summary", value)} />
        <TextArea label="剧本描述 description" value={scenario.description} onChange={(value) => updateScenario("description", value)} />
        <TextInput label="玩家派系 playerFactionDef" value={scenario.playerFactionDef} onChange={(value) => updateScenario("playerFactionDef", value)} />
        <div className="diagnosticList">
          <div><strong>建议：</strong>普通殖民地用 <code>PlayerColony</code>；部落开局可尝试 <code>PlayerTribe</code>。</div>
          <div><strong>说明：</strong>剧本系统字段较多，本版先生成稳定的基础开局：玩家派系、开局人数和起始物资。</div>
        </div>
      </Card>

      <Card title="开局人数与物资" subtitle="控制捏人数量和起始资源。">
        <SliderInput label="实际开局人数 startingPawnCount" min={1} max={10} step={1} value={scenario.startingPawnCount} onChange={(value) => updateScenario("startingPawnCount", Math.round(value))} />
        <SliderInput label="可选候选人数 chooseFromPawnCount" min={1} max={20} step={1} value={scenario.chooseFromPawnCount} onChange={(value) => updateScenario("chooseFromPawnCount", Math.max(Math.round(value), scenario.startingPawnCount))} />
        <SliderInput label="银 startWithSilver" min={0} max={10000} step={50} value={scenario.startWithSilver} onChange={(value) => updateScenario("startWithSilver", Math.round(value))} />
        <SliderInput label="包装生存餐 startWithPackagedMeals" min={0} max={500} step={5} value={scenario.startWithPackagedMeals} onChange={(value) => updateScenario("startWithPackagedMeals", Math.round(value))} />
        <SliderInput label="工业药 startWithMedicine" min={0} max={200} step={5} value={scenario.startWithMedicine} onChange={(value) => updateScenario("startWithMedicine", Math.round(value))} />
        <SliderInput label="零部件 startWithComponents" min={0} max={500} step={5} value={scenario.startWithComponents} onChange={(value) => updateScenario("startWithComponents", Math.round(value))} />
        <SliderInput label="钢铁 startWithSteel" min={0} max={5000} step={50} value={scenario.startWithSteel} onChange={(value) => updateScenario("startWithSteel", Math.round(value))} />
      </Card>
    </section>
  );
}

const itemKindLabels: Record<ItemKind, string> = {
  hair: "发型 HairDef（三视图）",
  food: "食品 Food ThingDef（单图）",
  apparel: "衣物装备 Apparel（三视图 + 自动地面图）",
  weapon: "武器 Weapon ThingDef（单图）",
  generic: "通用物品 Generic ThingDef（单图）"
};

function ItemsPanel() {
  const project = useModProjectStore((state) => state.project);
  const addItem = useModProjectStore((state) => state.addItem);
  const updateItem = useModProjectStore((state) => state.updateItem);
  const removeItem = useModProjectStore((state) => state.removeItem);
  const uploadItemTexture = useModProjectStore((state) => state.uploadItemTexture);
  const items = getAddItems(project);

  return (
    <section className="pageGrid twoColumns">
      <Card title="添加物品 Add Item" subtitle="发型、食品、衣物装备、武器、通用物品。每个物品独立生成 Def 和贴图路径。">
        <div className="buttonRow">
          <button className="primaryButton" type="button" onClick={addItem}>新增物品</button>
        </div>
        {items.length === 0 && <EmptyState text="还没有物品。点击“新增物品”开始添加发型、食品、衣物装备或武器。" />}
        <div className="itemEditorList">
          {items.map(({ id, data }, index) => (
            <ItemEditorCard
              key={id}
              index={index + 1}
              itemId={id}
              item={data}
              assets={getItemAssets(project, id)}
              onChange={(updater) => updateItem(id, updater)}
              onRemove={() => removeItem(id)}
              onUpload={(direction, file) => uploadItemTexture(makeItemTextureAssetRole(id, direction), file)}
            />
          ))}
        </div>
      </Card>

      <Card title="贴图规则说明" subtitle="按类型自动决定上传三视图或单张图">
        <div className="diagnosticList">
          <div><strong>发型：</strong>使用 <code>HairDef</code>，需要正面 / 侧面 / 背面三视图，导出为 <code>_south/_east/_north</code>，并自动复制 <code>_west</code>。</div>
          <div><strong>衣物装备：</strong>穿在角色身上时使用三视图；本工具会额外把正面图复制为单张地面 / 物品栏贴图。</div>
          <div><strong>食品、武器、通用物品：</strong>使用单张 <code>Graphic_Single</code> 贴图。</div>
          <div><strong>当前限制：</strong>武器支持基础近战和基础远程；复杂武器、配方、科技、材料、工作台生产和音效会在后续版本扩展。</div>
        </div>
      </Card>
    </section>
  );
}

function ItemEditorCard({
  index,
  itemId,
  item,
  assets,
  onChange,
  onRemove,
  onUpload
}: {
  index: number;
  itemId: string;
  item: AddItemData;
  assets: { single?: ProjectAsset; front?: ProjectAsset; side?: ProjectAsset; back?: ProjectAsset };
  onChange(updater: (item: AddItemData) => AddItemData): void;
  onRemove(): void;
  onUpload(direction: ItemTextureDirection, file: File): void;
}) {
  const requirement = textureRequirementForKind(item.kind);
  return (
    <div className="itemEditorCard">
      <div className="itemEditorHeader">
        <div>
          <strong>#{index} {item.label || item.defName}</strong>
          <small>{itemKindLabels[item.kind]} · <code>{item.defName}</code></small>
        </div>
        <button className="ghostButton danger" type="button" onClick={onRemove}>删除</button>
      </div>

      <div className="itemEditorGrid">
        <div className="itemEditorFields">
          <SelectInput
            label="物品类型"
            value={item.kind}
            options={["hair", "food", "apparel", "weapon", "generic"]}
            onChange={(value) => onChange((current) => ({ ...current, kind: value as ItemKind, textureRequirement: textureRequirementForKind(value as ItemKind) }))}
          />
          <TextInput label="defName" value={item.defName} onChange={(value) => onChange((current) => ({ ...current, defName: sanitizeThingDefName(value) }))} />
          <TextInput label="游戏内名称 Label" value={item.label} onChange={(value) => onChange((current) => ({ ...current, label: value }))} />
          <TextArea label="描述 Description" value={item.description} onChange={(value) => onChange((current) => ({ ...current, description: value }))} />

          {item.kind !== "hair" && (
            <>
              <SliderInput label="市场价值 MarketValue" min={0} max={5000} step={1} value={item.common.marketValue} onChange={(value) => onChange((current) => ({ ...current, common: { ...current.common, marketValue: value } }))} />
              <SliderInput label="质量 Mass" min={0} max={100} step={0.05} value={item.common.mass} onChange={(value) => onChange((current) => ({ ...current, common: { ...current.common, mass: value } }))} />
            </>
          )}

          {item.kind === "generic" && (
            <SliderInput label="堆叠数量 StackLimit" min={1} max={750} step={1} value={item.common.stackLimit} onChange={(value) => onChange((current) => ({ ...current, common: { ...current.common, stackLimit: Math.round(value) } }))} />
          )}
          {item.kind === "food" && <FoodItemFields item={item} onChange={onChange} />}
          {item.kind === "apparel" && <ApparelItemFields item={item} onChange={onChange} />}
          {item.kind === "weapon" && <WeaponItemFields item={item} onChange={onChange} />}
          {item.kind === "hair" && <HairItemFields item={item} onChange={onChange} />}
        </div>

        <div className="itemTextureBox">
          {requirement === "single" ? (
            <TextureUpload label={itemTextureDirectionLabels.single} asset={assets.single} onFile={(file) => onUpload("single", file)} />
          ) : (
            <div className="directionGrid">
              {(["front", "side", "back"] as ItemTextureDirection[]).map((direction) => (
                <TextureUpload key={`${itemId}-${direction}`} label={itemTextureDirectionLabels[direction]} asset={assets[direction]} onFile={(file) => onUpload(direction, file)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FoodItemFields({ item, onChange }: { item: AddItemData; onChange(updater: (item: AddItemData) => AddItemData): void }) {
  return (
    <div className="nestedFields">
      <SliderInput label="营养 Nutrition" min={0} max={2} step={0.01} value={item.food.nutrition} onChange={(value) => onChange((current) => ({ ...current, food: { ...current.food, nutrition: value } }))} />
      <SelectInput label="食物喜好度 Preferability" value={item.food.preferability} options={["RawBad", "RawTasty", "MealAwful", "MealSimple", "MealFine", "MealLavish"]} onChange={(value) => onChange((current) => ({ ...current, food: { ...current.food, preferability: value as AddItemData["food"]["preferability"] } }))} />
      <TextInput label="foodType" value={item.food.foodType} onChange={(value) => onChange((current) => ({ ...current, food: { ...current.food, foodType: value } }))} />
      <SliderInput label="腐烂天数 rotDays" min={0} max={1000} step={1} value={item.food.rotDays} onChange={(value) => onChange((current) => ({ ...current, food: { ...current.food, rotDays: value } }))} />
      <SliderInput label="堆叠数量 StackLimit" min={1} max={750} step={1} value={item.common.stackLimit} onChange={(value) => onChange((current) => ({ ...current, common: { ...current.common, stackLimit: Math.round(value) } }))} />
    </div>
  );
}

function ApparelItemFields({ item, onChange }: { item: AddItemData; onChange(updater: (item: AddItemData) => AddItemData): void }) {
  return (
    <div className="nestedFields">
      <SelectInput label="穿戴层 layer" value={item.apparel.layer} options={["Overhead", "OnSkin", "Middle", "Shell", "Belt"]} onChange={(value) => onChange((current) => ({ ...current, apparel: { ...current.apparel, layer: value as AddItemData["apparel"]["layer"] } }))} />
      <SelectInput label="覆盖身体部位 bodyPartGroup" value={item.apparel.bodyPartGroup} options={["FullHead", "UpperHead", "Torso", "Legs", "Shoulders", "Waist"]} onChange={(value) => onChange((current) => ({ ...current, apparel: { ...current.apparel, bodyPartGroup: value as AddItemData["apparel"]["bodyPartGroup"] } }))} />
      <SliderInput label="锐器护甲 Armor Sharp" min={0} max={3} step={0.01} value={item.apparel.armorSharp} onChange={(value) => onChange((current) => ({ ...current, apparel: { ...current.apparel, armorSharp: value } }))} />
      <SliderInput label="钝器护甲 Armor Blunt" min={0} max={3} step={0.01} value={item.apparel.armorBlunt} onChange={(value) => onChange((current) => ({ ...current, apparel: { ...current.apparel, armorBlunt: value } }))} />
      <SliderInput label="热量护甲 Armor Heat" min={0} max={3} step={0.01} value={item.apparel.armorHeat} onChange={(value) => onChange((current) => ({ ...current, apparel: { ...current.apparel, armorHeat: value } }))} />
      <SliderInput label="防寒 Insulation Cold" min={-50} max={80} step={1} value={item.apparel.insCold} onChange={(value) => onChange((current) => ({ ...current, apparel: { ...current.apparel, insCold: value } }))} />
      <SliderInput label="防暑 Insulation Heat" min={-50} max={80} step={1} value={item.apparel.insHeat} onChange={(value) => onChange((current) => ({ ...current, apparel: { ...current.apparel, insHeat: value } }))} />
    </div>
  );
}

function WeaponItemFields({ item, onChange }: { item: AddItemData; onChange(updater: (item: AddItemData) => AddItemData): void }) {
  return (
    <div className="nestedFields">
      <SelectInput label="武器类型" value={item.weapon.kind} options={["melee", "ranged"]} onChange={(value) => onChange((current) => ({ ...current, weapon: { ...current.weapon, kind: value as AddItemData["weapon"]["kind"] } }))} />
      <SliderInput label="伤害 damage" min={0} max={100} step={1} value={item.weapon.damage} onChange={(value) => onChange((current) => ({ ...current, weapon: { ...current.weapon, damage: value } }))} />
      <SliderInput label="冷却 cooldown" min={0.1} max={20} step={0.1} value={item.weapon.cooldown} onChange={(value) => onChange((current) => ({ ...current, weapon: { ...current.weapon, cooldown: value } }))} />
      <CheckboxInput label="可制作：生成 costList，避免 recipeMaker 红字" checked={item.crafting.enabled} onChange={(value) => onChange((current) => ({ ...current, crafting: { ...current.crafting, enabled: value } }))} />
      {item.crafting.enabled && (
        <>
          <SliderInput label="制作工作量 WorkToMake" min={0} max={60000} step={500} value={item.crafting.workToMake} onChange={(value) => onChange((current) => ({ ...current, crafting: { ...current.crafting, workToMake: value } }))} />
          <SliderInput label="钢铁成本 Steel" min={0} max={500} step={1} value={item.crafting.steelCost} onChange={(value) => onChange((current) => ({ ...current, crafting: { ...current.crafting, steelCost: Math.round(value) } }))} />
          <SliderInput label="零部件成本 Components" min={0} max={20} step={1} value={item.crafting.componentCost} onChange={(value) => onChange((current) => ({ ...current, crafting: { ...current.crafting, componentCost: Math.round(value) } }))} />
        </>
      )}
      {item.weapon.kind === "ranged" && (
        <>
          <SliderInput label="射程 range" min={1} max={60} step={1} value={item.weapon.range} onChange={(value) => onChange((current) => ({ ...current, weapon: { ...current.weapon, range: value } }))} />
          <SliderInput label="近距命中 AccuracyShort" min={0} max={1} step={0.01} value={item.weapon.accuracyShort} onChange={(value) => onChange((current) => ({ ...current, weapon: { ...current.weapon, accuracyShort: value } }))} />
          <SliderInput label="中距命中 AccuracyMedium" min={0} max={1} step={0.01} value={item.weapon.accuracyMedium} onChange={(value) => onChange((current) => ({ ...current, weapon: { ...current.weapon, accuracyMedium: value } }))} />
          <SliderInput label="远距命中 AccuracyLong" min={0} max={1} step={0.01} value={item.weapon.accuracyLong} onChange={(value) => onChange((current) => ({ ...current, weapon: { ...current.weapon, accuracyLong: value } }))} />
        </>
      )}
    </div>
  );
}

function HairItemFields({ item, onChange }: { item: AddItemData; onChange(updater: (item: AddItemData) => AddItemData): void }) {
  return (
    <div className="nestedFields">
      <SelectInput label="hairGender" value={item.hair.gender} options={["Any", "MaleUsually", "FemaleUsually"]} onChange={(value) => onChange((current) => ({ ...current, hair: { ...current.hair, gender: value as AddItemData["hair"]["gender"] } }))} />
      <TextInput label="hairTags，用英文逗号分隔" value={item.hair.tags.join(", ")} onChange={(value) => onChange((current) => ({ ...current, hair: { ...current.hair, tags: value.split(",").map((x) => x.trim()).filter(Boolean) } }))} />
    </div>
  );
}

function AssetsPanel() {
  const project = useModProjectStore((state) => state.project);
  const removeAsset = useModProjectStore((state) => state.removeAsset);
  const assets = getRaceAssets(project);

  return (
    <section className="pageGrid twoColumns">
      <Card title="素材清单" subtitle="导出时复制到 Textures/ 目录">
        {project.assets.length === 0 && <EmptyState text="还没有上传 PNG。请到自定义种族页面上传 Body 和 Head 的正面、侧面、背面。" />}
        {project.assets.map((asset) => (
          <div className="assetRow" key={asset.id}>
            <div className="assetPreviewSmall">
              {asset.previewUrl ? <img src={asset.previewUrl} alt={asset.originalName} /> : <span>PNG</span>}
            </div>
            <div className="assetInfo">
              <strong>{asset.role}</strong>
              <small>原文件：{asset.originalName}</small>
              <code>{asset.exportPath}</code>
              <code>XML base: {asset.xmlTexturePath}</code>
              {getGeneratedWestTexturePath(asset) && <code>Auto west: {getGeneratedWestTexturePath(asset)}</code>}
              {getGeneratedWestItemTexturePath(asset) && <code>Auto west: {getGeneratedWestItemTexturePath(asset)}</code>}
            </div>
            <button className="ghostButton danger" onClick={() => removeAsset(asset.id)}>删除</button>
          </div>
        ))}
      </Card>

      <Card title="路径规则" subtitle="XML texPath 使用基础路径；具体图片使用方向后缀">
        {raceTextureGroups.map((group) => (
          <div className="pathGroup" key={group}>
            <strong>{groupLabels[group]}</strong>
            {raceTextureDirections.map((direction) => (
              <PathExample key={`${group}-${direction}`} title={directionLabels[direction]} item={assets.shared[group][direction]} />
            ))}
          </div>
        ))}
      </Card>
    </section>
  );
}

function PathExample({ title, item }: { title: string; item?: ProjectAsset }) {
  if (!item) return <EmptyState text={`${title} 未上传`} />;
  return (
    <div className="pathExample">
      <strong>{title}</strong>
      <small>实际文件</small>
      <code>{item.exportPath}</code>
      <small>XML texPath base</small>
      <code>{item.xmlTexturePath}</code>
    </div>
  );
}

function PreviewPanel() {
  const project = useModProjectStore((state) => state.project);
  const race = getRaceData(project);
  const preview = useMemo(() => getRacePreviewXml(project, race), [project, race]);
  const serializedProject = useMemo(() => JSON.stringify(project, jsonProjectReplacer, 2), [project]);

  return (
    <section className="pageGrid twoColumns previewGrid">
      <Card title="About.xml" subtitle="ModMetaData">
        <CodeBlock code={preview.aboutXml} />
      </Card>
      <Card title="HAR AlienRace XML" subtitle="Defs/ThingDefs/Races/{defName}.xml · AlienRace.ThingDef_AlienRace">
        <CodeBlock code={preview.thingDefXml} />
      </Card>
      <Card title="PawnKindDef XML" subtitle="Defs/PawnKindDefs/{defName}_PawnKind.xml">
        <CodeBlock code={preview.pawnKindXml} />
      </Card>
      <Card title="FactionDef XML" subtitle="Defs/FactionDefs/{FactionDefName}.xml">
        <CodeBlock code={preview.factionDefXml} />
      </Card>
      <Card title="StorytellerDef XML" subtitle="Defs/StorytellerDefs/{defName}.xml">
        <CodeBlock code={preview.storytellerDefXml} />
      </Card>
      <Card title="ScenarioDef XML" subtitle="Defs/ScenarioDefs/{defName}.xml">
        <CodeBlock code={preview.scenarioDefXml} />
      </Card>
      <Card title="中央状态 ModProject JSON" subtitle="Single source of truth">
        <CodeBlock code={serializedProject} />
      </Card>
    </section>
  );
}

function ExportPanel() {
  const project = useModProjectStore((state) => state.project);
  const race = getRaceData(project);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<BuildIssue[]>([]);
  const [files, setFiles] = useState<VirtualFile[]>([]);
  const [message, setMessage] = useState("");

  async function runValidation() {
    setBusy(true);
    setMessage("");
    try {
      const result = await compileProject(project);
      setIssues(result.issues);
      setFiles(result.files);
      if (result.issues.some((issue) => issue.level === "error")) {
        setMessage("构建失败，请修复错误。最常见原因是 6 张方向 PNG 未上传。低层 XML 仍可预览。");
      } else {
        setMessage(`构建通过，将生成 ${result.files.length} 个文件。`);
      }
    } catch (error) {
      setIssues([{ level: "error", message: error instanceof Error ? error.message : String(error) }]);
    } finally {
      setBusy(false);
    }
  }

  async function exportZip() {
    setBusy(true);
    setMessage("");
    try {
      const bytes = await exportProjectZip(project);
      const defaultName = `${sanitizeFolderName(project.mod.name)}.zip`;

      if (window.rimworldModMaker?.saveZip) {
        const result = await window.rimworldModMaker.saveZip(bytes, defaultName);
        if (result?.ok) {
          setMessage(`已导出：${result.filePath}`);
        } else if (result?.canceled) {
          setMessage("已取消导出。");
        } else {
          setMessage(result?.error || "导出失败。");
        }
      } else {
        downloadBytesInBrowser(bytes, defaultName);
        setMessage(`已在浏览器中下载：${defaultName}`);
      }
    } catch (error) {
      setIssues([{ level: "error", message: error instanceof Error ? error.message : String(error) }]);
      setMessage("导出失败。请检查素材与字段。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="pageGrid twoColumns">
      <Card title="一键导出" subtitle="生成标准 RimWorld Mod 文件夹并压缩为 ZIP">
        <div className="exportHero">
          <h3>{project.mod.name}</h3>
          <p>
            将导出 <code>About/About.xml</code>、<code>Defs/</code>、<code>Textures/</code>。{race.enabled ? <>当前种族：<strong>{race.defName}</strong></> : <>自定义种族未启用</>}{race.enabled && race.faction.enabled ? <> · 派系：<strong>{race.faction.defName}</strong></> : null}{race.storyteller.enabled ? <> · 叙述者：<strong>{race.storyteller.defName}</strong></> : null}。
          </p>
          <div className="buttonRow">
            <button className="primaryButton" disabled={busy} onClick={runValidation}>先验证</button>
            <button className="primaryButton accent" disabled={busy} onClick={exportZip}>导出 ZIP</button>
          </div>
          {message && <p className="noticeText">{message}</p>}
        </div>

        <div className="fileTree">
          <strong>预计目录结构</strong>
          <pre>{`${sanitizeFolderName(project.mod.name)}/
  About/
    About.xml
  Defs/
    StorytellerDefs/
      ${race.storyteller.enabled ? `${race.storyteller.defName}.xml` : "# custom storyteller disabled"}
    ScenarioDefs/
      ${race.scenario.enabled ? `${race.scenario.defName}.xml` : "# custom scenario disabled"}
    AddItems/
      # HairDef / Food ThingDef / Apparel ThingDef / Weapon ThingDef
    ThingDefs/
      Races/
        ${race.enabled ? `${race.defName}.xml` : "# custom race disabled"}
    PawnKindDefs/
      ${race.enabled ? `${race.defName}_PawnKind.xml  # ${race.defName}_Colonist / ${race.defName}_FactionMember` : "# custom race disabled"}
    FactionDefs/
      ${race.enabled && race.faction.enabled ? `${race.faction.defName}.xml` : "# faction disabled, or custom race disabled"}
  Textures/
    ${project.mod.packageId}/
      Races/
        ${race.enabled ? `${race.defName}/` : "# custom race disabled"}
          Bodies/
            ${race.defName}_Body_south.png   # front
            ${race.defName}_Body_east.png    # side
            ${race.defName}_Body_west.png    # auto-copy side
            ${race.defName}_Body_north.png   # back
          Heads/
            ${race.defName}_Head_south.png   # front
            ${race.defName}_Head_east.png    # side
            ${race.defName}_Head_west.png    # auto-copy side
            ${race.defName}_Head_north.png   # back
      Storytellers/
        ${race.storyteller.defName}.png       # optional portraitLarge
        ${race.storyteller.defName}_Tiny.png  # optional portraitTiny`}</pre>
        </div>
      </Card>

      <Card title="Build Report" subtitle="Schema、素材、路径校验">
        {issues.length === 0 && files.length === 0 && <EmptyState text="点击“先验证”查看构建报告。" />}
        {issues.map((issue, index) => (
          <div key={`${issue.message}-${index}`} className={`issue ${issue.level}`}>
            <strong>{issue.level.toUpperCase()}</strong>
            <span>{issue.message}</span>
          </div>
        ))}
        {files.length > 0 && (
          <div className="generatedFiles">
            <strong>生成文件</strong>
            {files.map((file) => (
              <code key={file.path}>{file.path}</code>
            ))}
          </div>
        )}
      </Card>

      <Card title="游戏内红字快速判断" subtitle="帮助区分是本工具导出的 Mod，还是其他 Mod 的报错">
        <div className="diagnosticList">
          <div><strong>优先看关键词：</strong>如果日志包含 <code>{project.mod.packageId}</code>、<code>{race.defName}</code>、<code>{race.defName}_Colonist</code>、<code>{race.storyteller.defName}</code>、<code>{race.scenario.defName}</code>，才大概率是当前导出包的问题。</div>
          <div><strong>干净测试：</strong>只启用 Harmony、Core/DLC、Humanoid Alien Races 和本工具导出的 Mod，再开新档测试。</div>
          <div><strong>常见无关红字：</strong><code>Apparel_BunnySuit.xml</code>、<code>VEF.Apparels</code>、<code>CompositeBodysuitRustic</code>、其他 Mod 缺 packageId / supportedVersions，通常不是本工具生成的内容。</div>
        </div>
      </Card>
    </section>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <article className="card">
      <div className="cardHeader">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="cardBody">{children}</div>
    </article>
  );
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value} rows={5} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange(value: string): void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option value={option} key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}


function CheckboxInput({ label, checked, onChange }: { label: string; checked: boolean; onChange(value: boolean): void }) {
  return (
    <label className="checkItem standaloneCheck">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SliderInput({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange(value: number): void }) {
  return (
    <label className="field sliderField">
      <span>{label}</span>
      <div className="sliderRow">
        <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
        <input className="numberInput" type="number" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      </div>
    </label>
  );
}

function TextureUpload({ label, asset, onFile }: { label: string; asset?: ProjectAsset; onFile(file: File): void }) {
  return (
    <div className="textureUpload compact">
      <label className="uploadDrop compact">
        <input
          type="file"
          accept="image/png,.png"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
          }}
        />
        {asset?.previewUrl ? <img src={asset.previewUrl} alt={asset.originalName} /> : <span>上传 {label}</span>}
      </label>
      <div className="textureMeta">
        <strong>{label}</strong>
        {asset ? (
          <>
            <small>{asset.originalName}</small>
            <code>{asset.exportPath}</code>
          </>
        ) : (
          <small className="dangerText">缺少 PNG</small>
        )}
      </div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return <pre className="codeBlock"><code>{code}</code></pre>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="emptyState">{text}</div>;
}

function jsonProjectReplacer(key: string, value: unknown) {
  if (key === "file") return "[Browser File Object]";
  if (key === "previewUrl") return "[Object URL]";
  return value;
}

function downloadBytesInBrowser(bytes: Uint8Array, fileName: string) {
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
