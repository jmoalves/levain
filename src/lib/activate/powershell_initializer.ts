import * as log from "@std/log";
import t from "../i18n.ts";
import ProfileEditor from "./profile_editor.ts";
import OsUtils from "../os/os_utils.ts";


export default class PowershellInitializer {
  
  constructor(
    private levainCmdPath: string,
    private profile: string | undefined
  ) {}

  public async install() {
    if (!this.profile) {
      this.profile = await this.findProfile();
    }
    const editor = new ProfileEditor();
    log.info("")
    log.info(t("lib.activate.powershell_initializer.install"));
    await editor.insertBlock(this.profile, this.profileTemplate());
    log.info(t("lib.activate.powershell_initializer.installEnd"));
    console.log(`. "${this.profile}"`);
  }

  async findProfile(): Promise<string> {
    return (await OsUtils.runAndLog([
      "powershell",
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "$PROFILE.CurrentUserCurrentHost",
    ])).trim();
  }

  
  profileTemplate(): string {
    return `${ProfileEditor.BEGIN}
      if (Get-Variable PrePrompt -Scope Global -ErrorAction SilentlyContinue) {
        # Running under Cmder: prepend our prompt fragment.
        $existingPrePrompt = $global:PrePrompt

        [ScriptBlock]$global:PrePrompt = {
          if ($env:LEVAIN_CURRENT) {
            Write-Host -NoNewline "[$($env:LEVAIN_CURRENT)] "
          }

          & $existingPrePrompt
        }
      }
      elseif (-not (Get-Variable LevainOriginalPrompt -Scope Global -ErrorAction SilentlyContinue)) {
        # Regular PowerShell: wrap the prompt once.
        $global:LevainOriginalPrompt = $function:prompt

        function global:prompt {
          $basePrompt = & $global:LevainOriginalPrompt

          if ($env:LEVAIN_CURRENT) {
            "[{0}] {1}" -f $env:LEVAIN_CURRENT, $basePrompt
          }
          else {
            $basePrompt
          }
        }
      }

      function global:levain {
        . "${this.levainCmdPath}\\levain.ps1" @Args
      }
    ${ProfileEditor.END}`
  }
}