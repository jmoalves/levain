import t from "../lib/i18n.ts";

export interface ActionDoc {
  readonly name: string;
  readonly usage: string;
  readonly summaryKey: string;
}

const ACTION_DOCS_LIST: readonly ActionDoc[] = [
  {
    name: "activateCmd",
    usage: "activateCmd [--shell <cmd|bash|powershell>] [packages...]",
    summaryKey: "action.docs.activateCmd",
  },
  {
    name: "activateInit",
    usage: "activateInit [--cmd] [--bash] [--powershell] [--cmder] [--dev]",
    summaryKey: "action.docs.activateInit",
  },
  {
    name: "activatePre",
    usage: "activatePre [packages...]",
    summaryKey: "action.docs.activatePre",
  },
  {
    name: "addPath",
    usage: "addPath [--permanent] <dir>",
    summaryKey: "action.docs.addPath",
  },
  {
    name: "addToDesktop",
    usage: "addToDesktop <targetFile>",
    summaryKey: "action.docs.addToDesktop",
  },
  {
    name: "addToStartMenu",
    usage: "addToStartMenu <targetFile> [folderName]",
    summaryKey: "action.docs.addToStartMenu",
  },
  {
    name: "addToStartup",
    usage: "addToStartup <targetFile>",
    summaryKey: "action.docs.addToStartup",
  },
  {
    name: "assertContains",
    usage: 'assertContains [--message "..."] <text> <fullText>',
    summaryKey: "action.docs.assertContains",
  },
  {
    name: "backupFile",
    usage: "backupFile <file>",
    summaryKey: "action.docs.backupFile",
  },
  {
    name: "checkChainDirExists",
    usage: "checkChainDirExists [--saveVar <var>] [--default <dir>] <dir1> [dir2...]",
    summaryKey: "action.docs.checkChainDirExists",
  },
  {
    name: "checkEnvExists",
    usage: "checkEnvExists <env1> [env2...]",
    summaryKey: "action.docs.checkEnvExists",
  },
  {
    name: "checkFileExists",
    usage: "checkFileExists <file1> [file2...]",
    summaryKey: "action.docs.checkFileExists",
  },
  {
    name: "checkPathContains",
    usage: "checkPathContains <dir1> [dir2...]",
    summaryKey: "action.docs.checkPathContains",
  },
  {
    name: "checkPort",
    usage: "checkPort --port <number> [--transport <tcp|udp>] [--address <host>]",
    summaryKey: "action.docs.checkPort",
  },
  {
    name: "checkUrl",
    usage: "checkUrl <url>",
    summaryKey: "action.docs.checkUrl",
  },
  {
    name: "clone",
    usage: "clone <gitUrl>[#<branch>] <destDir>",
    summaryKey: "action.docs.clone",
  },
  {
    name: "contextMenu",
    usage: 'contextMenu folders --id <id> --name "<label>" --cmd "<command>" [--icon <icon>]',
    summaryKey: "action.docs.contextMenu",
  },
  {
    name: "contextMenuRemove",
    usage: "contextMenuRemove folders --id <id>",
    summaryKey: "action.docs.contextMenuRemove",
  },
  {
    name: "copy",
    usage: "copy [--verbose] [--strip] [--ifNotExists] <src...> <dst>",
    summaryKey: "action.docs.copy",
  },
  {
    name: "defaultPackage",
    usage: "defaultPackage <packageName>",
    summaryKey: "action.docs.defaultPackage",
  },
  {
    name: "echo",
    usage: "echo <message...>",
    summaryKey: "action.docs.echo",
  },
  {
    name: "extract",
    usage: "extract [--strip] [--type <zip|7z|tar.gz|tgz>] <srcArchive> <dstDir>",
    summaryKey: "action.docs.extract",
  },
  {
    name: "inspect",
    usage: "inspect --regExp /pattern/flags --saveVar <var> <file>",
    summaryKey: "action.docs.inspect",
  },
  {
    name: "jsonGet",
    usage: "jsonGet --setVar <var> [--default <value>] <file> <property>",
    summaryKey: "action.docs.jsonGet",
  },
  {
    name: "jsonRemove",
    usage: "jsonRemove <file> <property>",
    summaryKey: "action.docs.jsonRemove",
  },
  {
    name: "jsonSet",
    usage: "jsonSet [--ifNotExists] <file> <property> <value>",
    summaryKey: "action.docs.jsonSet",
  },
  {
    name: "killProcess",
    usage: "killProcess <processName>",
    summaryKey: "action.docs.killProcess",
  },
  {
    name: "levainShell",
    usage: "levainShell [--saveVar <var>] [--stripCRLF] [--ignoreErrors] <command...>",
    summaryKey: "action.docs.levainShell",
  },
  {
    name: "mavenCopy",
    usage: "mavenCopy [--ifNotExists] <group:artifact:version[:packaging[:classifier]]> <dstDir>",
    summaryKey: "action.docs.mavenCopy",
  },
  {
    name: "mkdir",
    usage: "mkdir [--compact] <dir>",
    summaryKey: "action.docs.mkdir",
  },
  {
    name: "propertyGet",
    usage: "propertyGet --setVar <var> [--default <value>] <file> <property>",
    summaryKey: "action.docs.propertyGet",
  },
  {
    name: "propertySet",
    usage: "propertySet [--ifNotExists] <file> <property> <value>",
    summaryKey: "action.docs.propertySet",
  },
  {
    name: "removeFromRegistry",
    usage: "removeFromRegistry <packageName...>",
    summaryKey: "action.docs.removeFromRegistry",
  },
  {
    name: "saveConfig",
    usage: "saveConfig",
    summaryKey: "action.docs.saveConfig",
  },
  {
    name: "setEnv",
    usage: "setEnv [--permanent] <varName> <value>",
    summaryKey: "action.docs.setEnv",
  },
  {
    name: "setVar",
    usage: "setVar <varName> <value>",
    summaryKey: "action.docs.setVar",
  },
  {
    name: "shellPath",
    usage: "shellPath <executablePath>",
    summaryKey: "action.docs.shellPath",
  },
  {
    name: "template",
    usage: 'template [--doubleBackslash] --replace <pattern> --with <value> <srcFile> <dstFile>',
    summaryKey: "action.docs.template",
  },
];

const ACTION_DOCS_MAP = new Map<string, ActionDoc>(
  ACTION_DOCS_LIST.map((doc) => [doc.name, doc]),
);

export class ActionDocs {
  static all(): ActionDoc[] {
    return [...ACTION_DOCS_LIST];
  }

  static get(name: string): ActionDoc | undefined {
    return ACTION_DOCS_MAP.get(name);
  }

  static summary(name: string): string {
    const doc = ACTION_DOCS_MAP.get(name);
    return doc ? t(doc.summaryKey) : "";
  }
}
