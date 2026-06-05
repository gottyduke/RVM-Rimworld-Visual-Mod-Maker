import { z } from "zod";

const DirectionalTextureSchema = z.object({
  frontAssetId: z.string(),
  sideAssetId: z.string(),
  backAssetId: z.string()
});

const RaceTextureSetSchema = z.object({
  body: DirectionalTextureSchema,
  head: DirectionalTextureSchema
});

export const CustomRaceSchema = z.object({
  enabled: z.boolean(),
  defName: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "defName 只能包含英文字母、数字和下划线，且必须以字母开头"),
  label: z.string().min(1, "Label 不能为空"),
  description: z.string().min(1, "Description 不能为空"),
  textureMode: z.enum(["shared", "gendered"]),
  texture: RaceTextureSetSchema,
  genderedTexture: z.object({
    male: RaceTextureSetSchema,
    female: RaceTextureSetSchema
  }),
  stats: z.object({
    healthScale: z.number().min(0.1).max(10),
    moveSpeed: z.number().min(0.1).max(20),
    meleeDamage: z.number().min(0).max(100),
    baseBodySize: z.number().min(0.1).max(10),
    lifeExpectancy: z.number().min(1).max(1000)
  }),
  genes: z.object({
    mode: z.enum(["none", "biotechOptional", "har"]),
    selectedGeneDefs: z.array(z.string()),
    metabolismOffset: z.number().min(-20).max(20)
  }),
  xenotype: z.object({
    enabled: z.boolean(),
    defName: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Xenotype defName 只能包含英文字母、数字和下划线，且必须以字母开头"),
    label: z.string().min(1, "Xenotype 称呼不能为空"),
    description: z.string().min(1, "Xenotype 描述不能为空"),
    descriptionShort: z.string().min(1, "Xenotype 简短描述不能为空"),
    iconPath: z.string().min(1),
    inheritable: z.boolean()
  }),

  storyteller: z.object({
    enabled: z.boolean(),
    defName: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Storyteller defName 只能包含英文字母、数字和下划线，且必须以字母开头"),
    label: z.string().min(1, "叙述者名称不能为空"),
    description: z.string().min(1, "叙述者描述不能为空"),
    quotation: z.string().min(1, "叙述者引言不能为空"),
    baseProfile: z.enum(["Cassandra", "Phoebe", "Randy"]),
    listOrder: z.number().int().min(1).max(9999),
    desiredPopulationMin: z.number().min(0).max(100),
    desiredPopulationMax: z.number().min(1).max(200),
    desiredPopulationCritical: z.number().min(1).max(300),
    threatCycleLength: z.number().min(0.1).max(100),
    minDaysBetweenThreatBigs: z.number().min(0).max(100),
    randomEventMtbDays: z.number().min(0.05).max(100),
    threatSmallMtbDays: z.number().min(0.05).max(100),
    threatBigMtbDays: z.number().min(0.05).max(100),
    portraitLargeAssetId: z.string().optional().default(""),
    portraitTinyAssetId: z.string().optional().default("")
  }),
  scenario: z.object({
    enabled: z.boolean(),
    defName: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Scenario defName 只能包含英文字母、数字和下划线，且必须以字母开头"),
    label: z.string().min(1, "剧本名称不能为空"),
    summary: z.string().min(1, "剧本摘要不能为空"),
    description: z.string().min(1, "剧本描述不能为空"),
    playerFactionDef: z.string().min(1),
    startingPawnCount: z.number().int().min(1).max(10),
    chooseFromPawnCount: z.number().int().min(1).max(20),
    startWithSilver: z.number().int().min(0).max(10000),
    startWithPackagedMeals: z.number().int().min(0).max(500),
    startWithMedicine: z.number().int().min(0).max(200),
    startWithComponents: z.number().int().min(0).max(500),
    startWithSteel: z.number().int().min(0).max(5000)
  }),
  faction: z.object({
    enabled: z.boolean(),
    defName: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*$/, "Faction defName 只能包含英文字母、数字和下划线，且必须以字母开头，不能以数字结尾"),
    label: z.string().min(1, "派系名称不能为空"),
    fixedName: z.string().min(1, "地图派系固定名称不能为空"),
    description: z.string().min(1, "派系描述不能为空"),
    cultureDefName: z.string().optional().default(""),
    culturalStyle: z.string().min(1),
    categoryTag: z.enum(["Outlander", "Tribal", "Pirate"]),
    techLevel: z.enum(["Neolithic", "Medieval", "Industrial", "Spacer", "Ultra", "Archotech"]),
    leaderTitle: z.string().min(1),
    pawnSingular: z.string().min(1),
    pawnsPlural: z.string().min(1),
    startingGoodwill: z.number().min(-100).max(100),
    naturalColonyGoodwill: z.number().min(-100).max(100),
    maxConfigurableAtWorldCreation: z.number().int().min(0).max(9999),
    requiredCountAtGameStart: z.number().int().min(0).max(10),
    canMakeRandomly: z.boolean(),
    canSiege: z.boolean(),
    canStageAttacks: z.boolean()
  }),
  advanced: z.object({
    raceBodyDef: z.string().min(1),
    intelligence: z.enum(["Animal", "ToolUser", "Humanlike"]),
    foodType: z.string().min(1)
  })
}).superRefine((race, ctx) => {
  if (!race.enabled) return;

  const directions = ["frontAssetId", "sideAssetId", "backAssetId"] as const;
  const directionLabels: Record<(typeof directions)[number], string> = {
    frontAssetId: "Front",
    sideAssetId: "Side",
    backAssetId: "Back"
  };

  const requiredTextures: Array<[string[], string]> = [];

  if (race.textureMode === "gendered") {
    for (const variant of ["male", "female"] as const) {
      for (const group of ["body", "head"] as const) {
        for (const direction of directions) {
          requiredTextures.push([["genderedTexture", variant, group, direction], `请上传 ${variant} ${group} ${directionLabels[direction]} PNG`]);
        }
      }
    }
  } else {
    for (const group of ["body", "head"] as const) {
      for (const direction of directions) {
        requiredTextures.push([["texture", group, direction], `请上传 shared ${group} ${directionLabels[direction]} PNG`]);
      }
    }
  }

  for (const [path, message] of requiredTextures) {
    const value = path.reduce<unknown>((obj, key) => typeof obj === "object" && obj !== null ? (obj as Record<string, unknown>)[key] : undefined, race);
    if (typeof value !== "string" || value.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    }
  }
});

export type CustomRaceData = z.infer<typeof CustomRaceSchema>;

export const CUSTOM_RACE_MODULE_TYPE = "rimworld.customRace";
export const HAR_RACE_COMPILER_ID = "harAlienRace.v1";
export const VANILLA_RACE_COMPILER_ID = "vanillaThingDef.v1";
