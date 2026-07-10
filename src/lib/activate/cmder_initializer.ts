

import * as log from "@std/log";
import { join } from "@std/path";
import t from "../i18n.ts";
import OsUtils from "../os/os_utils.ts";
import ProfileEditor from "./profile_editor.ts";
import PowershellInitializer from "./powershell_initializer.ts";

export default class CmderInitializer {
  
  constructor(
    private levainCmdPath: string,
    private cmderConfigPath: string,
  ) {}

  public async install() {
    log.info("")
    log.info(t("lib.activate.cmder_initializer.install"));
    const configPath = await this.findConfigPath();
    if (!configPath) {
      throw new Error("Could not locate the Cmder config directory.");
    }
    const editor = new ProfileEditor();

    const levainPromptPath = join(configPath, "levain_prompt.lua");
    await editor.insertBlock(levainPromptPath, this.profileTemplate());
    const cmderUserProfile = join(configPath, "user_profile.ps1");
    const powershellInitializer = new PowershellInitializer(this.levainCmdPath, cmderUserProfile);
    powershellInitializer.install();
    log.info(t("lib.activate.cmder_initializer.installEnd"));
  }

  async findConfigPath(): Promise<string | undefined> {
    if (this.cmderConfigPath) {
      return this.cmderConfigPath;
    }
    const candidates: string[] = [];

    // Prefer CMDER_ROOT if available.
    const cmderRoot = Deno.env.get("CMDER_ROOT");
    if (cmderRoot) {
      candidates.push(join(cmderRoot, "config"));
    }
    const programFiles = Deno.env.get("ProgramFiles");
    if (programFiles) {
      candidates.push(join(programFiles, "Cmder", "config"));
    }
    const programFilesX86 = Deno.env.get("ProgramFiles(x86)");
    if (programFilesX86) {
      candidates.push(join(programFilesX86, "Cmder", "config"));
    }
    const localAppData = Deno.env.get("LOCALAPPDATA");
    if (localAppData) {
      candidates.push(join(localAppData, "Cmder", "config"));
    }
    
    for (const candidate of candidates) {
      if (await OsUtils.exists(candidate)) {
        return candidate;
      }
    }

    return undefined;
  }

  profileTemplate(): string {
    return `-- ${ProfileEditor.BEGIN}
      local levain_prompt = clink.promptfilter(1)

      os.setenv("LEVAIN_LUA_LOADED", "1")

      function levain_prompt:filter(prompt)
          local current = os.getenv("LEVAIN_CURRENT")
          if current and current ~= "" then
              return "[" .. current .. "] " .. prompt
          end
          return prompt
      end
    -- ${ProfileEditor.END}`
  }
}