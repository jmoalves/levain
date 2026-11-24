import { FileUtils } from "../../lib/fs/file_utils.ts";

export default class PropertiesUtils {
  static load(filePath: any): Map<string, string> {
    const propertiesMap = new Map<string, string>();
    const text = FileUtils.readTextFileSync(filePath);
    const lines = text.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine?.toString()?.trim();
      if (!line || line.startsWith("#") || line.startsWith("!")) {
        continue;
      }

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) {
        propertiesMap.set(line, "");
      } else {
        const key = line.slice(0, eqIndex).trim();
        const value = line.slice(eqIndex + 1).trim();
        if (key) {
          propertiesMap.set(key, value);
        }
      }
    }

    return propertiesMap;
  }

  static stringify(properties: Map<string, string>): string {
    return [...properties.entries()]
      .map((entry) => `${entry[0]?.trim()}=${entry[1]?.trim() || ""}`)
      .join("\r\n");
  }

  static get(filePath: string, attribute: string, defaultValue: string | undefined = undefined): string | undefined {
    const propertiesMap = PropertiesUtils.load(filePath);
    const val = propertiesMap.get(attribute);
    return val !== undefined ? val : defaultValue;
  }

  static set(filePath: string, attribute: string, value: string, ifNotExists: boolean = false): void {
    let propertiesMap = new Map<string, string>();
    if (FileUtils.exists(filePath)) {
      propertiesMap = PropertiesUtils.load(filePath);
    }
    const oldValue = propertiesMap.get(attribute);
    if (ifNotExists && oldValue) {
      return;
    }
    propertiesMap.set(attribute, value);
    PropertiesUtils.save(filePath, propertiesMap);
  }

  static save(filePath: string, content: Map<string, string>) {
    const stringContent = PropertiesUtils.stringify(content);
    FileUtils.writeTextFileSync(filePath, stringContent);
  }
}
