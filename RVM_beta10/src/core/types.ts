export type RaceTextureGroup = "body" | "head";
export type RaceTextureDirection = "front" | "side" | "back";
export type RaceTextureVariant = "shared" | "male" | "female";
export type LegacyRaceTextureAssetRole = `race.${RaceTextureGroup}.${RaceTextureDirection}`;
export type GenderedRaceTextureAssetRole = `race.${RaceTextureVariant}.${RaceTextureGroup}.${RaceTextureDirection}`;
export type RaceTextureAssetRole = LegacyRaceTextureAssetRole | GenderedRaceTextureAssetRole;
export type ItemTextureDirection = "single" | "front" | "side" | "back";
export type ItemTextureAssetRole = `item.${string}.${ItemTextureDirection}`;
export type StorytellerPortraitRole = "storyteller.large" | "storyteller.tiny";
export type AssetRole = RaceTextureAssetRole | ItemTextureAssetRole | StorytellerPortraitRole | "generic";

export type ProjectAsset = {
  id: string;
  role: AssetRole;
  originalName: string;
  mimeType: string;
  sourceKind: "browser-file";
  file?: File;
  normalizedFileName: string;
  exportPath: string;
  /**
   * XML texture path is the shared Graphic_Multi base path without direction suffix and without .png.
   * Example file: Textures/foo/Races/Stonekin/Bodies/Stonekin_Body_south.png
   * XML path:     foo/Races/Stonekin/Bodies/Stonekin_Body
   */
  xmlTexturePath: string;
  previewUrl?: string;
};

export type Dependency = {
  packageId: string;
  displayName: string;
  required: boolean;
  enabledForCompiler?: string;
  steamWorkshopUrl?: string;
  downloadUrl?: string;
};

export type ModProject = {
  schemaVersion: string;
  targetGameVersion: string;
  mod: {
    name: string;
    packageId: string;
    author: string;
    description: string;
    supportedVersions: string[];
  };
  dependencies: Dependency[];
  assets: ProjectAsset[];
  content: ProjectContentItem[];
};

export type ProjectContentItem<TData = unknown> = {
  id: string;
  type: string;
  compiler: string;
  data: TData;
};

export type VirtualFile = {
  path: string;
  kind: "text" | "binary";
  content: string | Uint8Array;
};

export type CompileContext = {
  project: ModProject;
  getAssetById(id: string): ProjectAsset;
  readAssetBinary(asset: ProjectAsset): Promise<Uint8Array>;
};

export type ModuleCompiler<TData> = {
  id: string;
  compile(data: TData, ctx: CompileContext): Promise<VirtualFile[]>;
};

export type BuildIssue = {
  level: "error" | "warning" | "info";
  message: string;
};

export type BuildResult = {
  files: VirtualFile[];
  issues: BuildIssue[];
};
