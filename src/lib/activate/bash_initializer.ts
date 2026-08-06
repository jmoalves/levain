

import * as log from "@std/log";
import { join } from "@std/path";
import t from "../i18n.ts";
import { homedir } from "../utils/utils.ts";
import OsUtils from "../os/os_utils.ts";
import ProfileEditor from "./profile_editor.ts";

export default class BashInitializer {
  
  constructor(
    private levainCmdPath: string,
    private profile: string | undefined=undefined
  ) {}

  public async install() {
    if (!this.profile) {
      this.profile = await this.findProfile(homedir());
    }
    const editor = new ProfileEditor();
    log.info("")
    log.info(t("lib.activate.bash_initializer.install"));
    await editor.insertBlock(this.profile, this.profileTemplate());
    log.info(t("lib.activate.bash_initializer.installEnd"));
    log.info(`source "${this.profile}"`);
  }

  async findProfile(home: string): Promise<string> {
    const candidates = [
      join(home, ".bashrc"),
      join(home, ".bash_profile"),
      join(home, ".profile"),
    ];

    for (const candidate of candidates) {
      if (await OsUtils.exists(candidate)) {
        return candidate;
      }
    }

    return candidates[1]; // Preference for .bash_profile if none exists
  }

  profileTemplate(): string {
    return `${ProfileEditor.BEGIN}
      # The prompt without the Levain prefix.
      _LEVAIN_BASE_PS1=""

      __levain_strip_prefix() {
          local prompt="$1"

          # Strip a leading "[...]" prefix added by Levain.
          if [[ "$prompt" =~ ^\\[[^]]+\\]\\ (.*)$ ]]; then
              printf '%s' "\${BASH_REMATCH[1]}"
          else
              printf '%s' "$prompt"
          fi
      }

      __levain_update_prompt() {
          local current base

          current="$PS1"
          base="$(__levain_strip_prefix "$current")"

          # If another prompt framework changed the prompt,
          # remember the new base prompt.
          if [[ "$base" != "$_LEVAIN_BASE_PS1" ]]; then
              _LEVAIN_BASE_PS1="$base"
          fi

          if [[ -n \${LEVAIN_CURRENT:-} ]]; then
              PS1="[\${LEVAIN_CURRENT}] \${_LEVAIN_BASE_PS1}"
          else
              PS1="\${_LEVAIN_BASE_PS1}"
          fi
      }

      case ";\${PROMPT_COMMAND:-};" in
          *";__levain_update_prompt;"*)
              ;;
          "")
              PROMPT_COMMAND="__levain_update_prompt"
              ;;
          *)
              PROMPT_COMMAND="__levain_update_prompt;\${PROMPT_COMMAND}"
              ;;
      esac

      # Initialize the base prompt.
      _LEVAIN_BASE_PS1="$(__levain_strip_prefix "$PS1")"

      levain() {
        source ${OsUtils.windowsToBashPath(this.levainCmdPath)}/levain.sh
      }
    ${ProfileEditor.END}`
  }
}