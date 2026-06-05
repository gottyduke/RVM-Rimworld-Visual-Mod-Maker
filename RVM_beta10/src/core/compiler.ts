import JSZip from "jszip";
import { z } from "zod";
import { buildAboutXml, buildAddItemXml, buildPawnKindDefXml, buildRaceFactionDefXml, buildRaceThingDefXml, buildScenarioDefXml, buildStorytellerDefXml, getHarPackageId } from "./xml";
import { getGeneratedWestItemTexturePath, getGeneratedWestTexturePath, normalizeItemTexturePaths, normalizeStorytellerPortraitPaths, parseItemTextureAssetRole, sanitizeFolderName } from "./assets";
import type { BuildIssue, CompileContext, ModuleCompiler, ModProject, ProjectAsset, VirtualFile } from "./types";
import { CustomRaceSchema, HAR_RACE_COMPILER_ID, VANILLA_RACE_COMPILER_ID, type CustomRaceData } from "../modules/customRace/schema";
import { ADD_ITEM_COMPILER_ID, AddItemSchema, type AddItemData } from "../modules/addItem/schema";

function projectRequiresHar(project: ModProject): boolean {
  return project.content.some((content) => {
    if (content.compiler !== HAR_RACE_COMPILER_ID) return false;
    const race = content.data as Partial<CustomRaceData>;
    return Boolean(race.enabled);
  });
}

function withRuntimeDependencies(project: ModProject): ModProject {
  const needsHar = projectRequiresHar(project);
  return {
    ...project,
    dependencies: project.dependencies.map((dependency) =>
      dependency.packageId === getHarPackageId()
        ? { ...dependency, required: needsHar }
        : dependency
    )
  };
}

export const harCustomRaceCompiler: ModuleCompiler<unknown> = {
  id: HAR_RACE_COMPILER_ID,

  async compile(rawData: unknown, ctx: CompileContext): Promise<VirtualFile[]> {
    const race = CustomRaceSchema.parse(rawData);
    const files: VirtualFile[] = [];
    let textures: ProjectAsset[] | undefined;
    let texturePlan: RaceTexturePlan | undefined;
    let bodyTexturePath = "";
    let headTexturePath = "";

    if (race.enabled) {
      texturePlan = getRaceTexturePlan(race, ctx);
      textures = texturePlan.assets;

      for (const asset of textures) {
        if (!isPngAsset(asset)) {
          throw new Error(`${asset.role} must be a PNG file.`);
        }
      }

      bodyTexturePath = texturePlan.bodyTexturePath;
      headTexturePath = texturePlan.headTexturePath;

      files.push(
        {
          path: `Defs/ThingDefs/Races/${race.defName}.xml`,
          kind: "text",
          content: buildRaceThingDefXml({
            race,
            bodyTexturePath,
            headTexturePath,
            femaleBodyTexturePath: texturePlan?.femaleBodyTexturePath,
            femaleHeadTexturePath: texturePlan?.femaleHeadTexturePath
          })
        },
        {
          path: `Defs/PawnKindDefs/${race.defName}_PawnKind.xml`,
          kind: "text",
          content: buildPawnKindDefXml({ race, bodyTexturePath })
        }
      );

      if (race.faction.enabled) {
        files.push({
          path: `Defs/FactionDefs/${race.faction.defName}.xml`,
          kind: "text",
          content: buildRaceFactionDefXml(race)
        });
      }
    }

    if (race.storyteller.enabled) {
      const storyPaths = normalizeStorytellerPortraitPaths({ packageId: ctx.project.mod.packageId, defName: race.storyteller.defName });
      const largeAsset = race.storyteller.portraitLargeAssetId ? ctx.getAssetById(race.storyteller.portraitLargeAssetId) : undefined;
      const tinyAsset = race.storyteller.portraitTinyAssetId ? ctx.getAssetById(race.storyteller.portraitTinyAssetId) : undefined;

      files.push({
        path: `Defs/StorytellerDefs/${race.storyteller.defName}.xml`,
        kind: "text",
        content: buildStorytellerDefXml({
          race,
          portraitLargePath: largeAsset?.xmlTexturePath,
          portraitTinyPath: tinyAsset?.xmlTexturePath
        })
      });

      if (largeAsset) {
        if (!isPngAsset(largeAsset)) throw new Error(`${largeAsset.role} must be a PNG file.`);
        files.push({ path: storyPaths.large.exportPath, kind: "binary", content: await ctx.readAssetBinary(largeAsset) });
      }
      if (tinyAsset) {
        if (!isPngAsset(tinyAsset)) throw new Error(`${tinyAsset.role} must be a PNG file.`);
        files.push({ path: storyPaths.tiny.exportPath, kind: "binary", content: await ctx.readAssetBinary(tinyAsset) });
      }
    }

    if (race.scenario.enabled) {
      files.push({
        path: `Defs/ScenarioDefs/${race.scenario.defName}.xml`,
        kind: "text",
        content: buildScenarioDefXml(race)
      });
    }

    if (textures) {
      for (const asset of textures) {
        const bytes = await ctx.readAssetBinary(asset);
        files.push({ path: asset.exportPath, kind: "binary", content: bytes });

        // Users provide three directions: front / side / back.
        // RimWorld's Graphic_Multi also has a west-facing slot, so reuse the side PNG for west.
        const westPath = getGeneratedWestTexturePath(asset);
        if (westPath) {
          files.push({ path: westPath, kind: "binary", content: bytes });
        }
      }
    }

    return files;
  }
};

type RaceTexturePlan = {
  assets: ProjectAsset[];
  bodyTexturePath: string;
  headTexturePath: string;
  femaleBodyTexturePath?: string;
  femaleHeadTexturePath?: string;
};

function getRaceTexturePlan(race: CustomRaceData, ctx: CompileContext): RaceTexturePlan {
  function collect(textureSet: CustomRaceData["texture"]): { assets: ProjectAsset[]; bodyPath: string; headPath: string } {
    const bodyFront = ctx.getAssetById(textureSet.body.frontAssetId);
    const bodySide = ctx.getAssetById(textureSet.body.sideAssetId);
    const bodyBack = ctx.getAssetById(textureSet.body.backAssetId);
    const headFront = ctx.getAssetById(textureSet.head.frontAssetId);
    const headSide = ctx.getAssetById(textureSet.head.sideAssetId);
    const headBack = ctx.getAssetById(textureSet.head.backAssetId);
    return {
      assets: [bodyFront, bodySide, bodyBack, headFront, headSide, headBack],
      bodyPath: bodyFront.xmlTexturePath,
      headPath: headFront.xmlTexturePath
    };
  }

  if (race.textureMode === "gendered") {
    const male = collect(race.genderedTexture.male);
    const female = collect(race.genderedTexture.female);
    return {
      assets: [...male.assets, ...female.assets],
      bodyTexturePath: male.bodyPath,
      headTexturePath: male.headPath,
      femaleBodyTexturePath: female.bodyPath,
      femaleHeadTexturePath: female.headPath
    };
  }

  const shared = collect(race.texture);
  return {
    assets: shared.assets,
    bodyTexturePath: shared.bodyPath,
    headTexturePath: shared.headPath
  };
}


export const addItemCompiler: ModuleCompiler<unknown> = {
  id: ADD_ITEM_COMPILER_ID,

  async compile(rawData: unknown, ctx: CompileContext): Promise<VirtualFile[]> {
    const item = AddItemSchema.parse(rawData);
    const files: VirtualFile[] = [];

    const paths = normalizeItemTexturePaths({
      packageId: ctx.project.mod.packageId,
      defName: item.defName,
      itemKind: item.kind
    });

    const assets = getRequiredItemTextureAssets(item, ctx);
    for (const asset of assets) {
      if (!isPngAsset(asset)) throw new Error(`${asset.role} must be a PNG file.`);
    }

    let singleTexturePath = paths.single.xmlTexturePath;
    let directionalTexturePath = paths.front.xmlTexturePath;

    if (item.textureRequirement === "single") {
      const single = ctx.getAssetById(item.texture.singleAssetId || "");
      singleTexturePath = single.xmlTexturePath;
      directionalTexturePath = single.xmlTexturePath;
    } else {
      const front = ctx.getAssetById(item.texture.frontAssetId || "");
      singleTexturePath = paths.single.xmlTexturePath;
      directionalTexturePath = front.xmlTexturePath;
    }

    files.push({
      path: `Defs/AddItems/${item.kind}/${item.defName}.xml`,
      kind: "text",
      content: buildAddItemXml(item, singleTexturePath, directionalTexturePath)
    });

    for (const asset of assets) {
      const bytes = await ctx.readAssetBinary(asset);
      files.push({ path: asset.exportPath, kind: "binary", content: bytes });
      const westPath = getGeneratedWestItemTexturePath(asset);
      if (westPath) files.push({ path: westPath, kind: "binary", content: bytes });

      // Directional apparel also needs a simple ground/inventory texture. Reuse front for the ground graphic.
      const parsed = parseItemTextureAssetRole(asset.role);
      if (item.kind === "apparel" && parsed?.direction === "front") {
        files.push({ path: paths.single.exportPath, kind: "binary", content: bytes });
      }
    }

    return files;
  }
};

function getRequiredItemTextureAssets(item: AddItemData, ctx: CompileContext): ProjectAsset[] {
  if (item.textureRequirement === "single") {
    return [ctx.getAssetById(item.texture.singleAssetId || "")];
  }
  return [
    ctx.getAssetById(item.texture.frontAssetId || ""),
    ctx.getAssetById(item.texture.sideAssetId || ""),
    ctx.getAssetById(item.texture.backAssetId || "")
  ];
}

export const vanillaCustomRaceCompiler: ModuleCompiler<unknown> = {
  id: VANILLA_RACE_COMPILER_ID,
  async compile() {
    throw new Error("vanillaThingDef.v1 已停用：人形自定义种族现在必须通过 Humanoid Alien Races 编译器导出。请使用 harAlienRace.v1。");
  }
};

const compilerRegistry = new Map<string, ModuleCompiler<unknown>>([
  [harCustomRaceCompiler.id, harCustomRaceCompiler],
  [vanillaCustomRaceCompiler.id, vanillaCustomRaceCompiler],
  [addItemCompiler.id, addItemCompiler]
]);

export async function compileProject(project: ModProject): Promise<{ files: VirtualFile[]; issues: BuildIssue[] }> {
  const issues: BuildIssue[] = [];
  const files: VirtualFile[] = [
    {
      path: "About/About.xml",
      kind: "text",
      content: buildAboutXml(withRuntimeDependencies(project))
    }
  ];

  if (project.mod.packageId === "remux.stonekinrace" && !/stonekin/i.test(project.mod.name)) {
    issues.push({
      level: "error",
      message: "Package ID 仍然是 remux.stonekinrace，但当前 Mod 名称不是 Stonekin。请在 Mod 信息页点击“根据 Mod 名称自动生成唯一 Package ID”，否则 RimWorld 会把它当作旧 Stonekin_Race 的重复 Mod 并隐藏。"
    });
  }

  if (projectRequiresHar(project) && !project.dependencies.some((dependency) => dependency.packageId === getHarPackageId())) {
    issues.push({
      level: "warning",
      message: "自定义种族已启用，但项目依赖列表里没有 Humanoid Alien Races。"
    });
  }

  const ctx: CompileContext = {
    project,
    getAssetById(id: string) {
      const asset = project.assets.find((item) => item.id === id);
      if (!asset) throw new Error(`Asset not found: ${id || "empty id"}`);
      return asset;
    },
    async readAssetBinary(asset: ProjectAsset) {
      if (!asset.file) throw new Error(`Asset is missing File data: ${asset.originalName}`);
      return new Uint8Array(await asset.file.arrayBuffer());
    }
  };

  for (const item of project.content) {
    try {
      const compiler = compilerRegistry.get(item.compiler);
      if (!compiler) throw new Error(`Compiler not registered: ${item.compiler}`);
      const generatedFiles = await compiler.compile(item.data, ctx);
      files.push(...generatedFiles);
    } catch (error) {
      issues.push({ level: "error", message: formatError(error) });
    }
  }

  const duplicatePaths = findDuplicatePaths(files);
  for (const duplicatePath of duplicatePaths) {
    issues.push({ level: "warning", message: `Duplicate export path detected: ${duplicatePath}` });
  }

  return { files, issues };
}

export async function exportProjectZip(project: ModProject): Promise<Uint8Array> {
  const { files, issues } = await compileProject(project);
  const fatal = issues.find((issue) => issue.level === "error");
  if (fatal) throw new Error(fatal.message);

  const zip = new JSZip();
  const root = sanitizeFolderName(project.mod.name);

  for (const file of files) {
    const fullPath = `${root}/${file.path}`;
    zip.file(fullPath, file.content);
  }

  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

export function validateRaceForUi(rawRace: unknown): BuildIssue[] {
  const result = CustomRaceSchema.safeParse(rawRace);
  if (result.success) return [];

  return result.error.issues.map((issue) => ({
    level: "error" as const,
    message: `${issue.path.join(".")}: ${issue.message}`
  }));
}

export function getRacePreviewXml(project: ModProject, race: CustomRaceData): { aboutXml: string; thingDefXml: string; pawnKindXml: string; factionDefXml: string; storytellerDefXml: string; scenarioDefXml: string } {
  const body = project.assets.find((asset) => asset.id === race.texture.body.frontAssetId)
    || project.assets.find((asset) => asset.role.startsWith("race.body."));
  const head = project.assets.find((asset) => asset.id === race.texture.head.frontAssetId)
    || project.assets.find((asset) => asset.role.startsWith("race.head."));

  const bodyTexturePath = body?.xmlTexturePath || "missing/body/texture/base/path";
  const headTexturePath = head?.xmlTexturePath || "missing/head/texture/base/path";

  const storyLarge = project.assets.find((asset) => asset.id === race.storyteller.portraitLargeAssetId);
  const storyTiny = project.assets.find((asset) => asset.id === race.storyteller.portraitTinyAssetId);

  return {
    aboutXml: buildAboutXml(withRuntimeDependencies(project)),
    thingDefXml: race.enabled ? buildRaceThingDefXml({
      race,
      bodyTexturePath,
      headTexturePath
    }) : "<!-- 自定义种族未启用：不会生成 HAR RaceDef / ThingDef -->",
    pawnKindXml: race.enabled ? buildPawnKindDefXml({ race, bodyTexturePath }) : "<!-- 自定义种族未启用：不会生成 PawnKindDef -->",
    factionDefXml: race.enabled && race.faction.enabled ? buildRaceFactionDefXml(race) : "<!-- 派系系统未启用，或自定义种族未启用 -->",
    storytellerDefXml: race.storyteller.enabled
      ? buildStorytellerDefXml({ race, portraitLargePath: storyLarge?.xmlTexturePath, portraitTinyPath: storyTiny?.xmlTexturePath })
      : "<!-- 自定义 AI 叙述者未启用 -->",
    scenarioDefXml: race.scenario.enabled ? buildScenarioDefXml(race) : "<!-- 自定义剧本未启用 -->"
  };
}

function isPngAsset(asset: ProjectAsset): boolean {
  return asset.mimeType === "image/png" || asset.originalName.toLowerCase().endsWith(".png");
}

function findDuplicatePaths(files: VirtualFile[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const file of files) {
    if (seen.has(file.path)) duplicates.add(file.path);
    seen.add(file.path);
  }

  return Array.from(duplicates);
}

function formatError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
}
