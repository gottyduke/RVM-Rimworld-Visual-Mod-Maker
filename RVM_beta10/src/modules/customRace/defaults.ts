import type { CustomRaceData } from "./schema";

export const defaultCustomRace: CustomRaceData = {
  enabled: false,
  defName: "TestUniqueIdentifierDefName",
  label: "TestRaceLabel",
  description: "TestRaceDescription",
  textureMode: "shared",
  texture: {
    body: {
      frontAssetId: "",
      sideAssetId: "",
      backAssetId: ""
    },
    head: {
      frontAssetId: "",
      sideAssetId: "",
      backAssetId: ""
    }
  },
  genderedTexture: {
    male: {
      body: { frontAssetId: "", sideAssetId: "", backAssetId: "" },
      head: { frontAssetId: "", sideAssetId: "", backAssetId: "" }
    },
    female: {
      body: { frontAssetId: "", sideAssetId: "", backAssetId: "" },
      head: { frontAssetId: "", sideAssetId: "", backAssetId: "" }
    }
  },
  stats: {
    healthScale: 1.35,
    moveSpeed: 4.1,
    meleeDamage: 8.5,
    baseBodySize: 1.0,
    lifeExpectancy: 120
  },
  genes: {
    mode: "har",
    selectedGeneDefs: [],
    metabolismOffset: 0
  },
  xenotype: {
    enabled: false,
    defName: "TestXenotypeDefName",
    label: "TestXenotypeLabel",
    description: "TestXenotypeDescription",
    descriptionShort: "TestXenotypeDescriptionShort",
    iconPath: "UI/Icons/Xenotypes/Baseliner",
    inheritable: true
  },

  storyteller: {
    enabled: false,
    defName: "TestStorytellerDefName",
    label: "TestStorytellerLabel",
    description: "TestStorytellerDescription",
    quotation: "TestStorytellerQuotation",
    baseProfile: "Cassandra",
    listOrder: 95,
    desiredPopulationMin: 4,
    desiredPopulationMax: 13,
    desiredPopulationCritical: 18,
    threatCycleLength: 9.2,
    minDaysBetweenThreatBigs: 1.9,
    randomEventMtbDays: 1,
    threatSmallMtbDays: 3.75,
    threatBigMtbDays: 1.25,
    portraitLargeAssetId: "",
    portraitTinyAssetId: ""
  },
  scenario: {
    enabled: false,
    defName: "TestScenarioDefName",
    label: "TestScenarioLabel",
    summary: "TestScenarioSummary",
    description: "TestScenarioDescription",
    playerFactionDef: "PlayerColony",
    startingPawnCount: 3,
    chooseFromPawnCount: 8,
    startWithSilver: 800,
    startWithPackagedMeals: 30,
    startWithMedicine: 20,
    startWithComponents: 30,
    startWithSteel: 450
  },
  faction: {
    enabled: false,
    defName: "TestFactionDefName",
    label: "TestFactionLabel",
    fixedName: "TestFactionFixedName",
    description: "TestFactionDescription",
    cultureDefName: "",
    culturalStyle: "TestFactionCulturalStyle",
    categoryTag: "Outlander",
    techLevel: "Industrial",
    leaderTitle: "TestLeaderTitle",
    pawnSingular: "TestPawnSingular",
    pawnsPlural: "TestPawnsPlural",
    startingGoodwill: 0,
    naturalColonyGoodwill: 0,
    maxConfigurableAtWorldCreation: 9999,
    requiredCountAtGameStart: 1,
    canMakeRandomly: true,
    canSiege: false,
    canStageAttacks: true
  },
  advanced: {
    raceBodyDef: "Human",
    intelligence: "Humanlike",
    foodType: "OmnivoreHuman"
  }
};
