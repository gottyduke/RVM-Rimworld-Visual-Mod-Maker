import { z } from "zod";

export const ADD_ITEM_MODULE_TYPE = "rimworld.addItem";
export const ADD_ITEM_COMPILER_ID = "rimworldAddItem.v1";

export const ItemKindSchema = z.enum(["hair", "food", "apparel", "weapon", "generic"]);
export type ItemKind = z.infer<typeof ItemKindSchema>;

export const WeaponKindSchema = z.enum(["melee", "ranged"]);
export type WeaponKind = z.infer<typeof WeaponKindSchema>;

export const TextureRequirementSchema = z.enum(["single", "directional3"]);
export type TextureRequirement = z.infer<typeof TextureRequirementSchema>;

export const AddItemSchema = z.object({
  defName: z.string().regex(/^[A-Za-z][A-Za-z0-9_]*[A-Za-z_]$/, "defName 只能包含英文字母、数字和下划线，必须以字母开头，且不能以数字结尾"),
  label: z.string().min(1, "Label 不能为空"),
  description: z.string().min(1, "Description 不能为空"),
  kind: ItemKindSchema,
  textureRequirement: TextureRequirementSchema,
  texture: z.object({
    singleAssetId: z.string().optional().default(""),
    frontAssetId: z.string().optional().default(""),
    sideAssetId: z.string().optional().default(""),
    backAssetId: z.string().optional().default("")
  }),
  common: z.object({
    marketValue: z.number().min(0).max(100000),
    mass: z.number().min(0).max(1000),
    stackLimit: z.number().int().min(1).max(75000),
    beauty: z.number().min(-100).max(100)
  }),
  food: z.object({
    nutrition: z.number().min(0).max(10),
    preferability: z.enum(["RawBad", "RawTasty", "MealAwful", "MealSimple", "MealFine", "MealLavish"]),
    foodType: z.string().min(1),
    rotDays: z.number().min(0).max(10000)
  }),
  apparel: z.object({
    layer: z.enum(["Overhead", "OnSkin", "Middle", "Shell", "Belt"]),
    bodyPartGroup: z.enum(["FullHead", "UpperHead", "Torso", "Legs", "Shoulders", "Waist"]),
    armorSharp: z.number().min(0).max(10),
    armorBlunt: z.number().min(0).max(10),
    armorHeat: z.number().min(0).max(10),
    insCold: z.number().min(-200).max(200),
    insHeat: z.number().min(-200).max(200),
    equipDelay: z.number().min(0).max(100)
  }),
  crafting: z.object({
    enabled: z.boolean(),
    workToMake: z.number().min(0).max(100000),
    steelCost: z.number().int().min(0).max(10000),
    componentCost: z.number().int().min(0).max(1000)
  }),
  weapon: z.object({
    kind: WeaponKindSchema,
    damage: z.number().min(0).max(500),
    cooldown: z.number().min(0.01).max(60),
    accuracyTouch: z.number().min(0).max(1),
    accuracyShort: z.number().min(0).max(1),
    accuracyMedium: z.number().min(0).max(1),
    accuracyLong: z.number().min(0).max(1),
    range: z.number().min(1).max(100),
    burstShotCount: z.number().int().min(1).max(20),
    ticksBetweenBurstShots: z.number().int().min(1).max(300)
  }),
  hair: z.object({
    gender: z.enum(["Any", "MaleUsually", "FemaleUsually"]),
    tags: z.array(z.string()).default(["Urban"])
  })
});

export type AddItemData = z.infer<typeof AddItemSchema>;
