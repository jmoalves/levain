export default class ConfigPersistentAttributes {
  repos?: Set<string>;
  defaultPackage?: string;
  cacheDir?: string;
  shellPath?: string;
  lastKnownVersion?: string;
  lastUpdateCheck?: string;
  lastUpdateQuestion?: string;
  lastAutoClean?: string;
  autoUpdate?: boolean;
  shellCheckForUpdate?: boolean;
  levainHome?: string;
}
