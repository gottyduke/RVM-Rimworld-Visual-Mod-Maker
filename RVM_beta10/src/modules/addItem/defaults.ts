import type { AddItemData } from "./schema";

const itemNameWords = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta", "Iota", "Kappa"];

export function createDefaultAddItem(index: number): AddItemData {
  const word = itemNameWords[index - 1] || `Extra${index}Item`;
  return {
    defName: `TestAddItemDefName${word}`,
    label: `TestAddItemLabel${word}`,
    description: "TestAddItemDescription",
    kind: "generic",
    textureRequirement: "single",
    texture: {
      singleAssetId: "",
      frontAssetId: "",
      sideAssetId: "",
      backAssetId: ""
    },
    common: {
      marketValue: 50,
      mass: 0.5,
      stackLimit: 75,
      beauty: 0
    },
    food: {
      nutrition: 0.25,
      preferability: "RawTasty",
      foodType: "VegetableOrFruit",
      rotDays: 14
    },
    apparel: {
      layer: "Overhead",
      bodyPartGroup: "FullHead",
      armorSharp: 0.06,
      armorBlunt: 0.02,
      armorHeat: 0.10,
      insCold: 8,
      insHeat: 2,
      equipDelay: 1
    },
    crafting: {
      enabled: true,
      workToMake: 12000,
      steelCost: 50,
      componentCost: 0
    },
    weapon: {
      kind: "melee",
      damage: 12,
      cooldown: 2,
      accuracyTouch: 0.70,
      accuracyShort: 0.60,
      accuracyMedium: 0.45,
      accuracyLong: 0.30,
      range: 24,
      burstShotCount: 1,
      ticksBetweenBurstShots: 10
    },
    hair: {
      gender: "Any",
      tags: ["Urban"]
    }
  };
}

export function textureRequirementForKind(kind: AddItemData["kind"]): AddItemData["textureRequirement"] {
  return kind === "hair" || kind === "apparel" ? "directional3" : "single";
}
