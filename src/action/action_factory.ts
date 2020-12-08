import Action from "./action.ts";
import AddPath from "./addpath.ts";
import Copy from "./copy.ts";
import ContextMenu from "./context_menu.ts";
import DefaultPackage from "./defaultPackage.ts";
import Extract from "./extract.ts";
import Inspect from "./inspect.ts";
import LevainShell from "./levainShell.ts";
import Mkdir from "./mkdir.ts";
import Noop from "./noop.ts";
import SetEnv from "./set_env.ts";
import Template from "./template.ts";
import AssertContainsAction from "./assert_contains_action.ts";
import Config from "../lib/config.ts";

export default class ActionFactory {

    get(action: string, config: Config): Action {
        switch (action) {
            case 'addPath':
                return new AddPath(config);

            case 'copy':
                return new Copy(config);

            case 'contextMenu':
                return new ContextMenu(config);

            case 'defaultPackage':
                return new DefaultPackage(config);

            case 'extract':
                return new Extract(config);

            case 'inspect':
                return new Inspect(config);

            case 'levainShell':
                return new LevainShell(config);

            case 'mkdir':
                return new Mkdir(config);

            case 'saveConfig':
                return new Noop(config, action);

            case 'setEnv':
                return new SetEnv(config);

            case 'template':
                return new Template(config);

            case 'assertContains':
                return new AssertContainsAction(config);

            default:
                throw new Error(`Action ${action} not found - Aborting...`);
        }
    }

    // private async loadActionDynamic(action: string): Promise<Action> {
    //     const module = await import(`../action/${action}.ts`);
    //     return new module.default(config);
    // }

}