import { create } from "xmlbuilder2";
import type { Dependency, ModProject } from "./types";
import type { CustomRaceData } from "../modules/customRace/schema";
import type { AddItemData } from "../modules/addItem/schema";
import { normalizeGeneDefNames } from "../modules/customRace/genes";

const HAR_PACKAGE_ID = "erdelf.HumanoidAlienRaces";
const BIOTECH_PACKAGE_ID = "Ludeon.RimWorld.Biotech";

function normalizeXmlList(value: string[]): { li: string[] } {
  return { li: value };
}

export function createXml(root: Record<string, unknown>): string {
  return create({ version: "1.0", encoding: "utf-8" })
    .ele(root)
    .end({ prettyPrint: true });
}

export function buildAboutXml(project: ModProject): string {
  const requiredDependencies = project.dependencies.filter(
    (dependency) => dependency.required && dependency.packageId.toLowerCase() !== "ludeon.rimworld"
  );

  const metadata: Record<string, unknown> = {
    packageId: project.mod.packageId,
    name: project.mod.name,
    author: project.mod.author,
    description: project.mod.description,
    supportedVersions: normalizeXmlList(project.mod.supportedVersions)
  };

  if (requiredDependencies.length > 0) {
    metadata.modDependencies = {
      li: requiredDependencies.map(toModDependencyXml)
    };
    metadata.loadAfter = normalizeXmlList(requiredDependencies.map((dependency) => dependency.packageId));
  }

  return createXml({ ModMetaData: metadata });
}

function toModDependencyXml(dependency: Dependency): Record<string, string> {
  const item: Record<string, string> = {
    packageId: dependency.packageId,
    displayName: dependency.displayName
  };

  if (dependency.steamWorkshopUrl) item.steamWorkshopUrl = dependency.steamWorkshopUrl;
  if (dependency.downloadUrl) item.downloadUrl = dependency.downloadUrl;

  return item;
}

export function buildRaceThingDefXml(params: {
  race: CustomRaceData;
  bodyTexturePath: string;
  headTexturePath: string;
  femaleBodyTexturePath?: string;
  femaleHeadTexturePath?: string;
}): string {
  const { race, bodyTexturePath, headTexturePath, femaleBodyTexturePath, femaleHeadTexturePath } = params;
  const geneList = buildGeneList(race);
  const maleHeadTypeDef = `${race.defName}_Head_Male`;
  const femaleHeadTypeDef = `${race.defName}_Head_Female`;
  const useCustomXenotype = shouldGenerateCustomXenotype(race);

  const generalSettings: Record<string, unknown> = {
    alienPartGenerator: {
      "@Inherit": "False",
      headTypes: {
        li: [maleHeadTypeDef, femaleHeadTypeDef]
      }
    },
    corpseCategory: "CorpsesHumanlike"
  };

  // If a custom XenotypeDef is enabled, the selected genes are owned by that xenotype
  // so the in-game Biotech panel no longer displays the pawn as "Baseliner/智人种".
  // If the custom xenotype is disabled, keep the older HAR raceGenes behavior.
  if (!useCustomXenotype && geneList.length > 0) {
    generalSettings.raceGenes = { li: geneList.map((defName) => ({ defName, chance: 100 })) };
  }

  const defs: Record<string, unknown> = {
    HeadTypeDef: [
      {
        defName: maleHeadTypeDef,
        graphicPath: headTexturePath,
        gender: "Male"
      },
      {
        defName: femaleHeadTypeDef,
        graphicPath: femaleHeadTexturePath || headTexturePath,
        gender: "Female"
      }
    ],
    "AlienRace.ThingDef_AlienRace": {
      "@ParentName": "Human",
      defName: race.defName,
      label: race.label,
      description: race.description,
      race: {
        body: race.advanced.raceBodyDef,
        intelligence: race.advanced.intelligence,
        foodType: race.advanced.foodType,
        baseBodySize: race.stats.baseBodySize,
        baseHealthScale: race.stats.healthScale,
        lifeExpectancy: race.stats.lifeExpectancy,
        hasGenders: true
      },
      statBases: {
        MoveSpeed: race.stats.moveSpeed
      },
      tools: {
        li: {
          label: `${race.label} strike`,
          capacities: { li: "Blunt" },
          power: race.stats.meleeDamage,
          cooldownTime: 2
        }
      },
      alienRace: {
        generalSettings,
        // HAR 1.6 stores body/head as ExtendedGraphicTop fields.
        // Use explicit <path> nodes so the starting-pawn renderer and Character Editor do not fall back to vanilla human graphics.
        graphicPaths: {
          body: buildGenderAwareGraphicPath(bodyTexturePath, femaleBodyTexturePath),
          head: buildGenderAwareGraphicPath(headTexturePath, femaleHeadTexturePath),
        },
        styleSettings: {},
        thoughtSettings: {},
        relationSettings: {},
        raceRestriction: {},
        compatibility: {}
      }
    }
  };

  if (useCustomXenotype) {
    defs.XenotypeDef = buildXenotypeDef(race, geneList);
  }

  return createXml({ Defs: defs });
}

function buildGenderAwareGraphicPath(maleOrSharedPath: string, femalePath?: string): Record<string, unknown> {
  if (!femalePath || femalePath === maleOrSharedPath) return { path: maleOrSharedPath };

  return {
    path: maleOrSharedPath,
    extendedGraphics: {
      li: {
        "@Class": "AlienRace.AlienPartGenerator+ExtendedConditionGraphic",
        path: femalePath,
        conditions: {
          li: {
            "@Class": "AlienRace.ExtendedGraphics.ConditionGender",
            gender: "Female"
          }
        }
      }
    }
  };
}

function buildXenotypeDef(race: CustomRaceData, geneList: string[]): Record<string, unknown> {
  const xenotype: Record<string, unknown> = {
    "@MayRequire": BIOTECH_PACKAGE_ID,
    defName: getXenotypeDefName(race),
    label: race.xenotype.label,
    description: race.xenotype.description,
    descriptionShort: race.xenotype.descriptionShort,
    iconPath: race.xenotype.iconPath,
    inheritable: race.xenotype.inheritable
  };

  if (geneList.length > 0) {
    xenotype.genes = { li: geneList };
  }

  return xenotype;
}

function buildGeneList(race: CustomRaceData): string[] {
  if (race.genes.mode === "none") return [];
  return normalizeGeneDefNames(race.genes.selectedGeneDefs);
}

export function shouldGenerateCustomXenotype(race: CustomRaceData): boolean {
  return race.genes.mode !== "none" && race.xenotype.enabled;
}

export function getXenotypeDefName(race: CustomRaceData): string {
  return race.xenotype.defName || `${race.defName}_Xenotype`;
}

export function buildPawnKindDefXml(params: { race: CustomRaceData; bodyTexturePath: string }): string {
  const { race } = params;
  const useCustomXenotype = shouldGenerateCustomXenotype(race);
  const colonistPawnKind = buildBaseRacePawnKind(race, `${race.defName}_Colonist`, "colonist", "PlayerColony", useCustomXenotype);

  const defs: Record<string, unknown> = {
    PawnKindDef: race.faction.enabled
      ? [
          colonistPawnKind,
          buildBaseRacePawnKind(race, `${race.defName}_FactionMember`, race.faction.pawnSingular, race.faction.defName, useCustomXenotype)
        ]
      : colonistPawnKind
  };

  return createXml({ Defs: defs });
}

function buildBaseRacePawnKind(
  race: CustomRaceData,
  defName: string,
  label: string,
  defaultFactionType: string,
  useCustomXenotype: boolean
): Record<string, unknown> {
  const pawnKind: Record<string, unknown> = {
    "@ParentName": "BasePlayerPawnKind",
    defName,
    label,
    race: race.defName,
    defaultFactionType,
    combatPower: Math.max(35, Math.round(60 * race.stats.healthScale + race.stats.meleeDamage * 5)),
    initialResistanceRange: "13~21"
  };

  if (useCustomXenotype) {
    pawnKind.useFactionXenotypes = false;
    pawnKind.xenotypeSet = {
      xenotypeChances: {
        [getXenotypeDefName(race)]: {
          "@MayRequire": BIOTECH_PACKAGE_ID,
          "#": 999
        }
      }
    };
  }

  return pawnKind;
}

export function buildRaceFactionDefXml(race: CustomRaceData): string {
  const faction = race.faction;
  const factionDef: Record<string, unknown> = {
    "@ParentName": getFactionParentName(faction.categoryTag),
    defName: faction.defName,
    label: faction.label,
    description: buildFactionDescription(faction.description, faction.culturalStyle),
    fixedName: faction.fixedName,
    pawnSingular: faction.pawnSingular,
    pawnsPlural: faction.pawnsPlural,
    categoryTag: faction.categoryTag,
    basicMemberKind: `${race.defName}_FactionMember`,
    leaderTitle: faction.leaderTitle,
    techLevel: faction.techLevel,
    canMakeRandomly: faction.canMakeRandomly,
    canSiege: faction.canSiege,
    canStageAttacks: faction.canStageAttacks,
    maxConfigurableAtWorldCreation: faction.maxConfigurableAtWorldCreation,
    requiredCountAtGameStart: faction.requiredCountAtGameStart,
    configurationListOrderPriority: 30,
    listOrderPriority: 30,
    colorSpectrum: {
      li: ["(0.55, 0.50, 0.42)", "(0.70, 0.65, 0.55)"]
    },
    backstoryFilters: {
      li: {
        categories: { li: faction.categoryTag === "Tribal" ? "Tribe" : "Outlander" },
        commonality: 1
      }
    },
    pawnGroupMakers: {
      li: [
        buildPawnGroupMaker("Combat", race),
        buildPawnGroupMaker("Settlement", race),
        buildPawnGroupMaker("Trader", race)
      ]
    }
  };

  if (shouldGenerateCustomXenotype(race)) {
    factionDef.xenotypeSet = {
      "@Inherit": "False",
      xenotypeChances: {
        [getXenotypeDefName(race)]: {
          "@MayRequire": BIOTECH_PACKAGE_ID,
          "#": 999
        }
      }
    };
  }

  if (faction.cultureDefName.trim()) {
    factionDef.allowedCultures = {
      "@MayRequire": "Ludeon.RimWorld.Ideology",
      li: faction.cultureDefName.trim()
    };
  }

  return createXml({ Defs: { FactionDef: factionDef } });
}

function getFactionParentName(categoryTag: CustomRaceData["faction"]["categoryTag"]): string {
  if (categoryTag === "Tribal") return "TribeBase";
  if (categoryTag === "Pirate") return "PirateBandBase";
  return "OutlanderFactionBase";
}

function buildFactionDescription(description: string, culturalStyle: string): string {
  const culture = culturalStyle.trim();
  if (!culture) return description;
  return `${description}\n\nCulture: ${culture}`;
}

function buildPawnGroupMaker(kindDef: "Combat" | "Settlement" | "Trader", race: CustomRaceData): Record<string, unknown> {
  const pawnKind = `${race.defName}_FactionMember`;
  const result: Record<string, unknown> = {
    kindDef,
    options: {
      [pawnKind]: 100
    }
  };

  if (kindDef === "Combat") result.commonality = 100;
  return result;
}


export function buildStorytellerDefXml(params: {
  race: CustomRaceData;
  portraitLargePath?: string;
  portraitTinyPath?: string;
}): string {
  const storyteller = params.race.storyteller;
  const profile = getStorytellerProfile(storyteller.baseProfile);

  // IMPORTANT for RimWorld 1.6:
  // ParentName must point to an XML inheritance Name, not a StorytellerDef defName.
  // Vanilla Cassandra/Phoebe/Randy defs are normal defs, so ParentName="CassandraClassic" fails.
  // BaseStoryteller is the abstract XML parent that carries population/adaptation curves.
  // We inherit it, then provide a complete, conservative comp list so world generation
  // has a valid storyteller when it generates faction leaders and settlements.
  const storytellerDef: Record<string, unknown> = {
    "@ParentName": "BaseStoryteller",
    defName: storyteller.defName,
    label: storyteller.label,
    description: storyteller.description,
    listOrder: storyteller.listOrder,
    portraitLarge: params.portraitLargePath || profile.portraitLarge,
    portraitTiny: params.portraitTinyPath || profile.portraitTiny,
    comps: {
      li: buildStorytellerComps(profile)
    }
  };

  return createXml({ Defs: { StorytellerDef: storytellerDef } });
}

type StorytellerProfile = {
  baseProfile: "Cassandra" | "Phoebe" | "Randy";
  portraitLarge: string;
  portraitTiny: string;
  mainMtbDays: number;
  maxThreatBigIntervalDays: number;
  threatBigOnDays: number;
  threatBigOffDays: number;
  threatBigMinSpacingDays: number;
  threatSmallOnDays: number;
  threatSmallOffDays: number;
  miscMtbDays: number;
  randomThreatBigWeight: number;
  randomMiscWeight: number;
  minIncChancePopulationIntentFactor: number;
};

function getStorytellerProfile(baseProfile: CustomRaceData["storyteller"]["baseProfile"]): StorytellerProfile {
  if (baseProfile === "Phoebe") {
    return {
      baseProfile: "Phoebe",
      portraitLarge: "UI/HeroArt/Storytellers/PhoebeFriendly",
      portraitTiny: "UI/HeroArt/Storytellers/PhoebeFriendlyTiny",
      mainMtbDays: 2.0,
      maxThreatBigIntervalDays: 30,
      threatBigOnDays: 6.0,
      threatBigOffDays: 12.0,
      threatBigMinSpacingDays: 4.0,
      threatSmallOnDays: 4.0,
      threatSmallOffDays: 9.0,
      miscMtbDays: 6.0,
      randomThreatBigWeight: 0.8,
      randomMiscWeight: 4.0,
      minIncChancePopulationIntentFactor: 0.05
    };
  }
  if (baseProfile === "Randy") {
    return {
      baseProfile: "Randy",
      portraitLarge: "UI/HeroArt/Storytellers/RandyRandom",
      portraitTiny: "UI/HeroArt/Storytellers/RandyRandomTiny",
      mainMtbDays: 1.13,
      maxThreatBigIntervalDays: 13,
      threatBigOnDays: 6.0,
      threatBigOffDays: 6.0,
      threatBigMinSpacingDays: 1.0,
      threatSmallOnDays: 4.0,
      threatSmallOffDays: 6.0,
      miscMtbDays: 5.0,
      randomThreatBigWeight: 1.0,
      randomMiscWeight: 5.5,
      minIncChancePopulationIntentFactor: 0.2
    };
  }
  return {
    baseProfile: "Cassandra",
    portraitLarge: "UI/HeroArt/Storytellers/CassandraClassic",
    portraitTiny: "UI/HeroArt/Storytellers/CassandraClassicTiny",
    mainMtbDays: 1.35,
    maxThreatBigIntervalDays: 15,
    threatBigOnDays: 6.0,
    threatBigOffDays: 6.0,
    threatBigMinSpacingDays: 1.9,
    threatSmallOnDays: 4.0,
    threatSmallOffDays: 6.0,
    miscMtbDays: 5.0,
    randomThreatBigWeight: 1.2,
    randomMiscWeight: 4.5,
    minIncChancePopulationIntentFactor: 0.05
  };
}

function buildStorytellerComps(profile: StorytellerProfile): Record<string, unknown>[] {
  // RimWorld 1.6 uses allowedTargetTags such as Map_PlayerHome / World / Caravan.
  // Keep this list intentionally conservative and vanilla-only.
  return [
    {
      "@Class": "StorytellerCompProperties_OnOffCycle",
      category: "ThreatBig",
      minDaysPassed: 11,
      onDays: profile.threatBigOnDays,
      offDays: profile.threatBigOffDays,
      minSpacingDays: profile.threatBigMinSpacingDays,
      numIncidentsRange: "1~2",
      forceRaidEnemyBeforeDaysPassed: 20,
      disallowedTargetTags: { li: "Map_RaidBeacon" }
    },
    {
      "@Class": "StorytellerCompProperties_OnOffCycle",
      category: "ThreatSmall",
      minDaysPassed: 8,
      onDays: profile.threatSmallOnDays,
      offDays: profile.threatSmallOffDays,
      numIncidentsRange: "0.2~1"
    },
    {
      "@Class": "StorytellerCompProperties_RandomMain",
      allowedTargetTags: { li: "Map_PlayerHome" },
      minDaysPassed: 1,
      mtbDays: profile.mainMtbDays,
      maxThreatBigIntervalDays: profile.maxThreatBigIntervalDays,
      minIncChancePopulationIntentFactor: profile.minIncChancePopulationIntentFactor,
      randomPointsFactorRange: profile.baseProfile === "Randy" ? "0.35~1.65" : "0.8~1.2",
      skipThreatBigIfRaidBeacon: false,
      categoryWeights: {
        Misc: profile.randomMiscWeight,
        ThreatBig: profile.randomThreatBigWeight,
        ThreatSmall: 0.5,
        OrbitalVisitor: 1.0,
        FactionArrival: 1.0,
        ShipChunkDrop: 0.35
      }
    },
    {
      "@Class": "StorytellerCompProperties_CategoryMTB",
      category: "Misc",
      allowedTargetTags: { li: "Map_PlayerHome" },
      minDaysPassed: 5,
      mtbDays: profile.miscMtbDays
    },
    {
      "@Class": "StorytellerCompProperties_CategoryIndividualMTBByBiome",
      category: "Misc",
      allowedTargetTags: { li: ["Caravan", "Map_TempIncident"] }
    },
    {
      "@Class": "StorytellerCompProperties_CategoryIndividualMTBByBiome",
      category: "ThreatSmall",
      applyCaravanVisibility: true,
      allowedTargetTags: { li: ["Caravan", "Map_TempIncident"] }
    },
    {
      "@Class": "StorytellerCompProperties_CategoryIndividualMTBByBiome",
      category: "ThreatBig",
      applyCaravanVisibility: true,
      allowedTargetTags: { li: ["Caravan", "Map_TempIncident"] }
    },
    {
      "@Class": "StorytellerCompProperties_ShipChunkDrop"
    },
    {
      "@Class": "StorytellerCompProperties_Disease",
      category: "DiseaseHuman",
      minDaysPassed: 25
    },
    {
      "@Class": "StorytellerCompProperties_Disease",
      category: "DiseaseAnimal",
      minDaysPassed: 16
    },
    {
      "@Class": "StorytellerCompProperties_FactionInteraction",
      incident: "TraderCaravanArrival",
      minDaysPassed: 5,
      baseIncidentsPerYear: 8,
      minSpacingDays: 6,
      allowedTargetTags: { li: "Map_PlayerHome" }
    },
    {
      "@Class": "StorytellerCompProperties_FactionInteraction",
      incident: "VisitorGroup",
      minDaysPassed: 3,
      baseIncidentsPerYear: 8,
      minSpacingDays: 5,
      allowedTargetTags: { li: "Map_PlayerHome" }
    },
    {
      "@Class": "StorytellerCompProperties_RandomQuest",
      category: "GiveQuest",
      allowedTargetTags: { li: "World" },
      onDays: 10,
      numIncidentsRange: "1~2",
      minSpacingDays: 2
    }
  ];
}

export function buildScenarioDefXml(race: CustomRaceData): string {
  const scenario = race.scenario;
  const parts: Record<string, unknown>[] = [
    {
      "@Class": "ScenPart_ConfigPage_ConfigureStartingPawns",
      def: "ConfigPage_ConfigureStartingPawns",
      pawnCount: scenario.startingPawnCount,
      pawnChoiceCount: Math.max(scenario.startingPawnCount, scenario.chooseFromPawnCount)
    },
    {
      "@Class": "ScenPart_PlayerPawnsArriveMethod",
      def: "PlayerPawnsArriveMethod",
      method: "DropPods"
    },
    makeStartingThingPart("Silver", scenario.startWithSilver),
    makeStartingThingPart("MealSurvivalPack", scenario.startWithPackagedMeals),
    makeStartingThingPart("MedicineIndustrial", scenario.startWithMedicine),
    makeStartingThingPart("ComponentIndustrial", scenario.startWithComponents),
    makeStartingThingPart("Steel", scenario.startWithSteel)
  ].filter(Boolean) as Record<string, unknown>[];

  return createXml({
    Defs: {
      ScenarioDef: {
        "@ParentName": "ScenarioBase",
        defName: scenario.defName,
        label: scenario.label,
        description: scenario.description,
        scenario: {
          name: scenario.label,
          summary: scenario.summary,
          description: scenario.description,
          playerFaction: {
            def: "PlayerFaction",
            factionDef: scenario.playerFactionDef
          },
          surfaceLayer: {
            def: "SurfaceLayerFixed",
            layer: "Surface",
            settingsDef: "Surface",
            hide: true,
            tag: "Surface",
            connections: null
          },
          parts: { li: parts }
        }
      }
    }
  });
}

function makeStartingThingPart(thingDef: string, count: number): Record<string, unknown> | null {
  if (count <= 0) return null;
  return {
    "@Class": "ScenPart_StartingThing_Defined",
    def: "StartingThing_Defined",
    thingDef,
    count
  };
}

export function getHarPackageId(): string {
  return HAR_PACKAGE_ID;
}


export function buildAddItemXml(item: AddItemData, texturePath: string, directionalTexturePath?: string): string {
  if (item.kind === "hair") return buildHairDefXml(item, directionalTexturePath || texturePath);
  if (item.kind === "apparel") return buildApparelThingDefXml(item, texturePath, directionalTexturePath || texturePath);
  if (item.kind === "food") return buildFoodThingDefXml(item, texturePath);
  if (item.kind === "weapon") return buildWeaponThingDefXml(item, texturePath);
  return buildGenericThingDefXml(item, texturePath);
}

function buildHairDefXml(item: AddItemData, graphicPath: string): string {
  return createXml({
    Defs: {
      HairDef: {
        defName: item.defName,
        label: item.label,
        hairGender: item.hair.gender,
        graphicPath,
        hairTags: { li: item.hair.tags.length ? item.hair.tags : ["Urban"] }
      }
    }
  });
}

function buildFoodThingDefXml(item: AddItemData, texturePath: string): string {
  return createXml({
    Defs: {
      ThingDef: {
        "@ParentName": "ResourceBase",
        defName: item.defName,
        label: item.label,
        description: item.description,
        graphicData: {
          texPath: texturePath,
          graphicClass: "Graphic_Single"
        },
        thingCategories: { li: "Foods" },
        statBases: {
          MarketValue: item.common.marketValue,
          Mass: item.common.mass,
          Beauty: item.common.beauty,
          Nutrition: item.food.nutrition
        },
        stackLimit: item.common.stackLimit,
        ingestible: {
          foodType: item.food.foodType,
          preferability: item.food.preferability,
          nutrition: item.food.nutrition,
          tasteThought: "AteFineMeal"
        },
        comps: {
          li: {
            "@Class": "CompProperties_Rottable",
            daysToRotStart: item.food.rotDays,
            rotDestroys: true
          }
        }
      }
    }
  });
}

function buildGenericThingDefXml(item: AddItemData, texturePath: string): string {
  return createXml({
    Defs: {
      ThingDef: {
        "@ParentName": "ResourceBase",
        defName: item.defName,
        label: item.label,
        description: item.description,
        graphicData: {
          texPath: texturePath,
          graphicClass: "Graphic_Single"
        },
        thingCategories: { li: "ResourcesRaw" },
        statBases: {
          MarketValue: item.common.marketValue,
          Mass: item.common.mass,
          Beauty: item.common.beauty
        },
        stackLimit: item.common.stackLimit
      }
    }
  });
}

function buildApparelThingDefXml(item: AddItemData, groundTexturePath: string, wornGraphicPath: string): string {
  return createXml({
    Defs: {
      ThingDef: {
        "@ParentName": "ApparelBase",
        defName: item.defName,
        label: item.label,
        description: item.description,
        graphicData: {
          texPath: groundTexturePath,
          graphicClass: "Graphic_Single"
        },
        thingCategories: { li: "Apparel" },
        statBases: {
          MarketValue: item.common.marketValue,
          Mass: item.common.mass,
          Beauty: item.common.beauty,
          ArmorRating_Sharp: item.apparel.armorSharp,
          ArmorRating_Blunt: item.apparel.armorBlunt,
          ArmorRating_Heat: item.apparel.armorHeat,
          Insulation_Cold: item.apparel.insCold,
          Insulation_Heat: item.apparel.insHeat,
          EquipDelay: item.apparel.equipDelay
        },
        apparel: {
          bodyPartGroups: { li: item.apparel.bodyPartGroup },
          layers: { li: item.apparel.layer },
          wornGraphicPath
        }
      }
    }
  });
}

function buildWeaponThingDefXml(item: AddItemData, texturePath: string): string {
  if (item.weapon.kind === "ranged") return buildRangedWeaponThingDefXml(item, texturePath);
  return buildMeleeWeaponThingDefXml(item, texturePath);
}

function buildMeleeWeaponThingDefXml(item: AddItemData, texturePath: string): string {
  const thingDef: Record<string, unknown> = {
    "@ParentName": "BaseMeleeWeapon_Sharp",
    defName: item.defName,
    label: item.label,
    description: item.description,
    graphicData: {
      texPath: texturePath,
      graphicClass: "Graphic_Single",
      drawSize: "(1.2,1.2)"
    },
    statBases: {
      MarketValue: item.common.marketValue,
      Mass: item.common.mass,
      WorkToMake: item.crafting.workToMake
    },
    tools: {
      li: {
        label: `${item.label} blade`,
        capacities: { li: "Cut" },
        power: item.weapon.damage,
        cooldownTime: item.weapon.cooldown
      }
    },
    weaponTags: { li: "NeolithicMeleeBasic" }
  };

  if (item.crafting.enabled) thingDef.costList = buildWeaponCostList(item);

  return createXml({ Defs: { ThingDef: thingDef } });
}

function buildRangedWeaponThingDefXml(item: AddItemData, texturePath: string): string {
  const projectileDefName = `${item.defName}_Bullet`;
  const gunDef: Record<string, unknown> = {
    "@ParentName": "BaseHumanMakeableGun",
    defName: item.defName,
    label: item.label,
    description: item.description,
    graphicData: {
      texPath: texturePath,
      graphicClass: "Graphic_Single",
      drawSize: "(1.4,1.4)"
    },
    statBases: {
      MarketValue: item.common.marketValue,
      Mass: item.common.mass,
      WorkToMake: item.crafting.workToMake,
      AccuracyTouch: item.weapon.accuracyTouch,
      AccuracyShort: item.weapon.accuracyShort,
      AccuracyMedium: item.weapon.accuracyMedium,
      AccuracyLong: item.weapon.accuracyLong,
      RangedWeapon_Cooldown: item.weapon.cooldown
    },
    verbs: {
      li: {
        verbClass: "Verb_Shoot",
        hasStandardCommand: true,
        defaultProjectile: projectileDefName,
        warmupTime: 1,
        range: item.weapon.range,
        burstShotCount: item.weapon.burstShotCount,
        ticksBetweenBurstShots: item.weapon.ticksBetweenBurstShots,
        soundCast: "Shot_Revolver",
        soundCastTail: "GunTail_Light"
      }
    },
    tools: {
      li: {
        label: "stock",
        capacities: { li: "Blunt" },
        power: Math.max(2, Math.round(item.weapon.damage * 0.25)),
        cooldownTime: 2
      }
    },
    weaponTags: { li: "SimpleGun" }
  };

  if (item.crafting.enabled) gunDef.costList = buildWeaponCostList(item);

  return createXml({
    Defs: {
      ThingDef: [
        {
          "@ParentName": "BaseBullet",
          defName: projectileDefName,
          label: `${item.label} projectile`,
          graphicData: {
            texPath: "Things/Projectile/Bullet_Small",
            graphicClass: "Graphic_Single"
          },
          projectile: {
            damageDef: "Bullet",
            damageAmountBase: item.weapon.damage,
            speed: 55
          }
        },
        gunDef
      ]
    }
  });
}

function buildWeaponCostList(item: AddItemData): Record<string, number> {
  const costList: Record<string, number> = {};
  if (item.crafting.steelCost > 0) costList.Steel = item.crafting.steelCost;
  if (item.crafting.componentCost > 0) costList.ComponentIndustrial = item.crafting.componentCost;
  if (Object.keys(costList).length === 0) costList.Steel = item.weapon.kind === "ranged" ? 70 : 50;
  return costList;
}
