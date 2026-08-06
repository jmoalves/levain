import * as log from "@std/log";
import { dirname } from "@std/path";
import t from "../i18n.ts";

export default class ProfileEditor {
  static BEGIN = "# >>> levain initialize >>>";
  static END = "# <<< levain initialize <<<";
  constructor() {}

  async insertBlock(profile: string, block: string) {
    await Deno.mkdir(dirname(profile), { recursive: true });

    let content = "";

    try {
      content = await Deno.readTextFile(profile);
      log.info(t("lib.activate.profile_editor.existingProfile", { profile }));
    } catch {
      log.info(t("lib.activate.profile_editor.newProfile", { profile }));
    }

    const regex =
      /# >>> levain initialize >>>[\s\S]*?# <<< levain initialize <<</gm;

    if (regex.test(content)) {
      content = content.replace(regex, block);
      log.info(t("lib.activate.profile_editor.replaceBlock"));
    } else {
      log.info(t("lib.activate.profile_editor.newBlock"));
      if (content.length) {
          content += "\n\n";
      }

      content += block + "\n";
    }

    await Deno.writeTextFile(profile, content);
  }
}