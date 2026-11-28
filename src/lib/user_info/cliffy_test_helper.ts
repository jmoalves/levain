import { Input } from "@cliffy/prompt";
import { injectLinePrompt } from "./line_prompt.ts";

export class CliffyTestHelper {
  static inputResponse(value: string = "") {
    Input.inject(value);
    injectLinePrompt(value);
  }
}
