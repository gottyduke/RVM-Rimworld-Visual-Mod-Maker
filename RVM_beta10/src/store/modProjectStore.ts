import { create } from "zustand";
import {
  createItemAsset,
  createRaceAsset,
  createStorytellerAsset,
  makeItemTextureAssetRole,
  makeRaceTextureAssetRole,
  parseItemTextureAssetRole,
  parseRaceTextureAssetRole,
  parseStorytellerPortraitRole,
  packageIdFromModName,
  isProbablyAutoPackageId,
  raceTextureDirections,
  raceTextureGroups,
  refreshItemAssetPath,
  refreshRaceAssetPath,
  refreshStorytellerAssetPath,
  sanitizeDefName,
  sanitizePackageId,
  sanitizeThingDefName
} from "../core/assets";
import type { ItemTextureAssetRole, ItemTextureDirection, ModProject, ProjectAsset, RaceTextureAssetRole, RaceTextureDirection, RaceTextureGroup, RaceTextureVariant, StorytellerPortraitRole } from "../core/types";
import { defaultCustomRace } from "../modules/customRace/defaults";
import { CUSTOM_RACE_MODULE_TYPE, HAR_RACE_COMPILER_ID, type CustomRaceData } from "../modules/customRace/schema";
import { createDefaultAddItem, textureRequirementForKind } from "../modules/addItem/defaults";
import { ADD_ITEM_COMPILER_ID, ADD_ITEM_MODULE_TYPE, type AddItemData } from "../modules/addItem/schema";

const DEFAULT_RACE_ID = "race_stonekin";

export type AppTab = "mod" | "race" | "faction" | "storyteller" | "scenario" | "items" | "assets" | "preview" | "export";

export type RaceTextureSetAssetMatrix = {
  body: Record<RaceTextureDirection, ProjectAsset | undefined>;
  head: Record<RaceTextureDirection, ProjectAsset | undefined>;
};

export type RaceAssetMatrix = Record<RaceTextureVariant, RaceTextureSetAssetMatrix>;

export type ItemAssetMatrix = {
  single?: ProjectAsset;
  front?: ProjectAsset;
  side?: ProjectAsset;
  back?: ProjectAsset;
};

export type StorytellerAssetSet = {
  large?: ProjectAsset;
  tiny?: ProjectAsset;
};

type StoreState = {
  activeTab: AppTab;
  project: ModProject;
  setActiveTab(tab: AppTab): void;
  setModField<K extends keyof ModProject["mod"]>(field: K, value: ModProject["mod"][K]): void;
  setTargetGameVersion(value: string): void;
  updateRace(updater: (race: CustomRaceData) => CustomRaceData): void;
  setRaceField<K extends keyof CustomRaceData>(field: K, value: CustomRaceData[K]): void;
  uploadRaceTexture(role: RaceTextureAssetRole, file: File): void;
  uploadStorytellerPortrait(role: StorytellerPortraitRole, file: File): void;
  addItem(): void;
  updateItem(itemId: string, updater: (item: AddItemData) => AddItemData): void;
  removeItem(itemId: string): void;
  uploadItemTexture(role: ItemTextureAssetRole, file: File): void;
  removeAsset(assetId: string): void;
};

export const useModProjectStore = create<StoreState>((set, get) => ({
  activeTab: "race",
  project: createDefaultProject(),

  setActiveTab(tab) {
    set({ activeTab: tab });
  },

  setModField(field, value) {
    set((state) => {
      const currentMod = state.project.mod;
      const sanitizedValue = field === "packageId" && typeof value === "string" ? sanitizePackageId(value) : value;
      const nextMod: ModProject["mod"] = {
        ...currentMod,
        [field]: sanitizedValue
      };

      // Most users edit the visible Mod name but forget that RimWorld uses packageId as the true unique ID.
      // If the packageId still looks auto-generated/default, keep it in sync so a new Storyteller-only mod
      // does not collide with an old Stonekin_Race export and disappear from the in-game mod list.
      const shouldAutoPackage =
        field !== "packageId"
        && typeof sanitizedValue === "string"
        && isProbablyAutoPackageId(currentMod.packageId, currentMod.name, currentMod.author);

      if (shouldAutoPackage) {
        nextMod.packageId = packageIdFromModName(
          field === "name" ? String(sanitizedValue) : nextMod.name,
          field === "author" ? String(sanitizedValue) : nextMod.author
        );
      }

      const nextProject: ModProject = {
        ...state.project,
        mod: nextMod
      };
      return { project: refreshAllStorytellerAssetPaths(refreshAllItemAssetPaths(refreshAllRaceAssetPaths(nextProject))) };
    });
  },

  setTargetGameVersion(value) {
    set((state) => ({
      project: {
        ...state.project,
        targetGameVersion: value,
        mod: {
          ...state.project.mod,
          supportedVersions: [value]
        }
      }
    }));
  },

  updateRace(updater) {
    set((state) => {
      const project = updateRaceInProject(state.project, updater);
      return { project: refreshAllStorytellerAssetPaths(refreshAllItemAssetPaths(refreshAllRaceAssetPaths(project))) };
    });
  },

  setRaceField(field, value) {
    get().updateRace((race) => ({ ...race, [field]: value }));
  },

  uploadRaceTexture(role, file) {
    if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
      alert("只支持 PNG 贴图。请选择 .png 文件。");
      return;
    }

    set((state) => {
      const parsed = parseRaceTextureAssetRole(role);
      if (!parsed) return state;

      const race = getRaceData(state.project);
      const newAsset = createRaceAsset({
        file,
        role,
        packageId: state.project.mod.packageId,
        defName: race.defName
      });

      const oldAssetId = getTextureAssetId(race, parsed.variant, parsed.group, parsed.direction);
      const retainedAssets = state.project.assets.filter((asset) => asset.id !== oldAssetId);

      const updatedProject = updateRaceInProject(
        {
          ...state.project,
          assets: [...retainedAssets, newAsset]
        },
        (currentRace) => setTextureAssetId(currentRace, parsed.variant, parsed.group, parsed.direction, newAsset.id)
      );

      return { project: updatedProject };
    });
  },

  uploadStorytellerPortrait(role, file) {
    if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
      alert("只支持 PNG 立绘。请选择 .png 文件。");
      return;
    }

    set((state) => {
      const kind = parseStorytellerPortraitRole(role);
      if (!kind) return state;
      const race = getRaceData(state.project);
      const newAsset = createStorytellerAsset({
        file,
        role,
        packageId: state.project.mod.packageId,
        defName: race.storyteller.defName
      });

      const oldAssetId = kind === "large" ? race.storyteller.portraitLargeAssetId : race.storyteller.portraitTinyAssetId;
      const retainedAssets = state.project.assets.filter((asset) => asset.id !== oldAssetId);
      const updatedProject = updateRaceInProject(
        { ...state.project, assets: [...retainedAssets, newAsset] },
        (currentRace) => ({
          ...currentRace,
          storyteller: {
            ...currentRace.storyteller,
            [kind === "large" ? "portraitLargeAssetId" : "portraitTinyAssetId"]: newAsset.id
          }
        })
      );
      return { project: updatedProject };
    });
  },

  addItem() {
    set((state) => {
      const nextIndex = getAddItems(state.project).length + 1;
      const item = createDefaultAddItem(nextIndex);
      const id = `item_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`;
      return {
        project: {
          ...state.project,
          content: [
            ...state.project.content,
            { id, type: ADD_ITEM_MODULE_TYPE, compiler: ADD_ITEM_COMPILER_ID, data: item }
          ]
        }
      };
    });
  },

  updateItem(itemId, updater) {
    set((state) => {
      const nextProject: ModProject = {
        ...state.project,
        content: state.project.content.map((content) => {
          if (content.id !== itemId || content.type !== ADD_ITEM_MODULE_TYPE) return content;
          const oldItem = content.data as AddItemData;
          const nextItem = updater(oldItem);
          const requirement = textureRequirementForKind(nextItem.kind);
          return {
            ...content,
            data: {
              ...nextItem,
              textureRequirement: requirement,
              texture: requirement === "single"
                ? { ...nextItem.texture, frontAssetId: "", sideAssetId: "", backAssetId: "" }
                : { ...nextItem.texture, singleAssetId: "" }
            }
          };
        })
      };
      return { project: refreshAllItemAssetPaths(nextProject) };
    });
  },

  removeItem(itemId) {
    set((state) => ({
      project: {
        ...state.project,
        content: state.project.content.filter((content) => content.id !== itemId),
        assets: state.project.assets.filter((asset) => parseItemTextureAssetRole(asset.role)?.itemId !== itemId)
      }
    }));
  },

  uploadItemTexture(role, file) {
    if (!file.name.toLowerCase().endsWith(".png") && file.type !== "image/png") {
      alert("只支持 PNG 贴图。请选择 .png 文件。");
      return;
    }

    set((state) => {
      const parsed = parseItemTextureAssetRole(role);
      if (!parsed) return state;
      const item = getAddItemById(state.project, parsed.itemId);
      if (!item) return state;

      const newAsset = createItemAsset({
        file,
        role,
        packageId: state.project.mod.packageId,
        defName: item.defName,
        itemKind: item.kind
      });

      const oldAssetId = getItemTextureAssetId(item, parsed.direction);
      const retainedAssets = state.project.assets.filter((asset) => asset.id !== oldAssetId);
      const updatedProject = updateItemInProject(
        {
          ...state.project,
          assets: [...retainedAssets, newAsset]
        },
        parsed.itemId,
        (current) => setItemTextureAssetId(current, parsed.direction, newAsset.id)
      );

      return { project: updatedProject };
    });
  },

  removeAsset(assetId) {
    set((state) => {
      const projectWithoutAsset: ModProject = {
        ...state.project,
        assets: state.project.assets.filter((asset) => asset.id !== assetId)
      };

      let project = updateRaceInProject(projectWithoutAsset, (race) => clearTextureAssetId(clearStorytellerAssetId(race, assetId), assetId));
      project = clearItemTextureAssetId(project, assetId);
      return { project };
    });
  }
}));

export function getRaceData(project: ModProject): CustomRaceData {
  const item = project.content.find((content) => content.id === DEFAULT_RACE_ID);
  return item?.data as CustomRaceData;
}

export function getRaceAssets(project: ModProject): RaceAssetMatrix {
  const race = getRaceData(project);

  function buildSet(textureSet: CustomRaceData["texture"]): RaceTextureSetAssetMatrix {
    return {
      body: {
        front: project.assets.find((asset) => asset.id === textureSet.body.frontAssetId),
        side: project.assets.find((asset) => asset.id === textureSet.body.sideAssetId),
        back: project.assets.find((asset) => asset.id === textureSet.body.backAssetId)
      },
      head: {
        front: project.assets.find((asset) => asset.id === textureSet.head.frontAssetId),
        side: project.assets.find((asset) => asset.id === textureSet.head.sideAssetId),
        back: project.assets.find((asset) => asset.id === textureSet.head.backAssetId)
      }
    };
  }

  return {
    shared: buildSet(race.texture),
    male: buildSet(race.genderedTexture.male),
    female: buildSet(race.genderedTexture.female)
  };
}


export function getStorytellerAssets(project: ModProject): StorytellerAssetSet {
  const race = getRaceData(project);
  return {
    large: project.assets.find((asset) => asset.id === race.storyteller.portraitLargeAssetId),
    tiny: project.assets.find((asset) => asset.id === race.storyteller.portraitTinyAssetId)
  };
}

export function getAddItems(project: ModProject): Array<{ id: string; data: AddItemData }> {
  return project.content
    .filter((content) => content.type === ADD_ITEM_MODULE_TYPE)
    .map((content) => ({ id: content.id, data: content.data as AddItemData }));
}

export function getAddItemById(project: ModProject, itemId: string): AddItemData | undefined {
  return getAddItems(project).find((item) => item.id === itemId)?.data;
}

export function getItemAssets(project: ModProject, itemId: string): ItemAssetMatrix {
  const item = getAddItemById(project, itemId);
  if (!item) return {};
  return {
    single: project.assets.find((asset) => asset.id === item.texture.singleAssetId),
    front: project.assets.find((asset) => asset.id === item.texture.frontAssetId),
    side: project.assets.find((asset) => asset.id === item.texture.sideAssetId),
    back: project.assets.find((asset) => asset.id === item.texture.backAssetId)
  };
}

export function countUploadedRaceTextures(assets: RaceAssetMatrix, textureMode: CustomRaceData["textureMode"] = "shared"): number {
  let count = 0;
  const variants: RaceTextureVariant[] = textureMode === "gendered" ? ["male", "female"] : ["shared"];
  for (const variant of variants) {
    for (const group of raceTextureGroups) {
      for (const direction of raceTextureDirections) {
        if (assets[variant][group][direction]) count += 1;
      }
    }
  }
  return count;
}

function getItemTextureAssetId(item: AddItemData, direction: ItemTextureDirection): string {
  if (direction === "single") return item.texture.singleAssetId || "";
  if (direction === "front") return item.texture.frontAssetId || "";
  if (direction === "side") return item.texture.sideAssetId || "";
  return item.texture.backAssetId || "";
}

function setItemTextureAssetId(item: AddItemData, direction: ItemTextureDirection, assetId: string): AddItemData {
  const field = direction === "single" ? "singleAssetId" : direction === "front" ? "frontAssetId" : direction === "side" ? "sideAssetId" : "backAssetId";
  return {
    ...item,
    texture: {
      ...item.texture,
      [field]: assetId
    }
  };
}

function updateItemInProject(project: ModProject, itemId: string, updater: (item: AddItemData) => AddItemData): ModProject {
  return {
    ...project,
    content: project.content.map((content) => {
      if (content.id !== itemId || content.type !== ADD_ITEM_MODULE_TYPE) return content;
      return { ...content, data: updater(content.data as AddItemData) };
    })
  };
}

function clearItemTextureAssetId(project: ModProject, assetId: string): ModProject {
  return {
    ...project,
    content: project.content.map((content) => {
      if (content.type !== ADD_ITEM_MODULE_TYPE) return content;
      let item = content.data as AddItemData;
      for (const direction of ["single", "front", "side", "back"] as ItemTextureDirection[]) {
        if (getItemTextureAssetId(item, direction) === assetId) {
          item = setItemTextureAssetId(item, direction, "");
        }
      }
      return { ...content, data: item };
    })
  };
}

function createDefaultProject(): ModProject {
  return {
    schemaVersion: "rimworld-mod-maker.project.v1",
    targetGameVersion: "1.6",
    mod: {
      name: "TestModName",
      packageId: "test.mod.packageid",
      author: "TestAuthor",
      description: "TestModDescription",
      supportedVersions: ["1.6"]
    },
    dependencies: [
      {
        packageId: "ludeon.rimworld",
        displayName: "RimWorld Core",
        required: true
      },
      {
        packageId: "erdelf.HumanoidAlienRaces",
        displayName: "Humanoid Alien Races",
        required: true,
        enabledForCompiler: "har",
        steamWorkshopUrl: "steam://url/CommunityFilePage/839005762"
      }
    ],
    assets: [],
    content: [
      {
        id: DEFAULT_RACE_ID,
        type: CUSTOM_RACE_MODULE_TYPE,
        compiler: HAR_RACE_COMPILER_ID,
        data: defaultCustomRace
      }
    ]
  };
}

function getTextureSet(race: CustomRaceData, variant: RaceTextureVariant): CustomRaceData["texture"] {
  if (variant === "male") return race.genderedTexture.male;
  if (variant === "female") return race.genderedTexture.female;
  return race.texture;
}

function getTextureAssetId(race: CustomRaceData, variant: RaceTextureVariant, group: RaceTextureGroup, direction: RaceTextureDirection): string {
  const bucket = getTextureSet(race, variant)[group];
  if (direction === "front") return bucket.frontAssetId;
  if (direction === "side") return bucket.sideAssetId;
  return bucket.backAssetId;
}

function setTextureAssetId(
  race: CustomRaceData,
  variant: RaceTextureVariant,
  group: RaceTextureGroup,
  direction: RaceTextureDirection,
  assetId: string
): CustomRaceData {
  const field = direction === "front" ? "frontAssetId" : direction === "side" ? "sideAssetId" : "backAssetId";
  if (variant === "shared") {
    return {
      ...race,
      texture: {
        ...race.texture,
        [group]: {
          ...race.texture[group],
          [field]: assetId
        }
      }
    };
  }

  return {
    ...race,
    genderedTexture: {
      ...race.genderedTexture,
      [variant]: {
        ...race.genderedTexture[variant],
        [group]: {
          ...race.genderedTexture[variant][group],
          [field]: assetId
        }
      }
    }
  };
}

function clearTextureAssetId(race: CustomRaceData, assetId: string): CustomRaceData {
  let next = race;
  for (const variant of ["shared", "male", "female"] as RaceTextureVariant[]) {
    for (const group of raceTextureGroups) {
      for (const direction of raceTextureDirections) {
        if (getTextureAssetId(next, variant, group, direction) === assetId) {
          next = setTextureAssetId(next, variant, group, direction, "");
        }
      }
    }
  }
  return next;
}


function clearStorytellerAssetId(race: CustomRaceData, assetId: string): CustomRaceData {
  return {
    ...race,
    storyteller: {
      ...race.storyteller,
      portraitLargeAssetId: race.storyteller.portraitLargeAssetId === assetId ? "" : race.storyteller.portraitLargeAssetId,
      portraitTinyAssetId: race.storyteller.portraitTinyAssetId === assetId ? "" : race.storyteller.portraitTinyAssetId
    }
  };
}

function updateRaceInProject(project: ModProject, updater: (race: CustomRaceData) => CustomRaceData): ModProject {
  return {
    ...project,
    content: project.content.map((item) => {
      if (item.id !== DEFAULT_RACE_ID) return item;
      return {
        ...item,
        data: updater(item.data as CustomRaceData)
      };
    })
  };
}

function refreshAllRaceAssetPaths(project: ModProject): ModProject {
  const race = getRaceData(project);
  const defName = sanitizeDefName(race.defName);
  const packageId = sanitizePackageId(project.mod.packageId);

  const normalizedProject = updateRaceInProject(
    {
      ...project,
      mod: {
        ...project.mod,
        packageId
      }
    },
    (currentRace) => ({
      ...currentRace,
      defName
    })
  );

  return {
    ...normalizedProject,
    assets: normalizedProject.assets.map((asset) =>
      refreshRaceAssetPath({ asset, packageId, defName })
    )
  };
}

function refreshAllItemAssetPaths(project: ModProject): ModProject {
  const packageId = sanitizePackageId(project.mod.packageId);
  return {
    ...project,
    mod: { ...project.mod, packageId },
    assets: project.assets.map((asset) => {
      const parsed = parseItemTextureAssetRole(asset.role);
      if (!parsed) return asset;
      const item = getAddItemById(project, parsed.itemId);
      if (!item) return asset;
      return refreshItemAssetPath({ asset, packageId, defName: sanitizeThingDefName(item.defName), itemKind: item.kind });
    })
  };
}


function refreshAllStorytellerAssetPaths(project: ModProject): ModProject {
  const packageId = sanitizePackageId(project.mod.packageId);
  const race = getRaceData(project);
  return {
    ...project,
    mod: { ...project.mod, packageId },
    assets: project.assets.map((asset) => refreshStorytellerAssetPath({
      asset,
      packageId,
      defName: race.storyteller.defName
    }))
  };
}

export { makeRaceTextureAssetRole, makeItemTextureAssetRole };
