import Action from "./action.ts";
import AddPathAction from "./os/add_path.ts";
import CheckFileExists from "./check/check_file_exists.ts";
import CopyAction from "./os/copy.ts";
import ContextMenu from "./os/context_menu.ts";
import DefaultPackage from "./defaultPackage.ts";
import Extract from "./extract.ts";
import Inspect from "./inspect.ts";
import LevainShell from "./levainShell.ts";
import Mkdir from "./os/mkdir.ts";
import Noop from "./noop.ts";
import SetEnv from "./os/set_env.ts";
import Template from "./template.ts";
import AssertContainsAction from "./assert_contains_action.ts";
import Config from "../lib/config.ts";
import CheckChainDirExists from "./check/check_chain_dir_exists.ts";
import Echo from "./echo.ts";
import RemoveFromRegistry from './os/remove_from_registry.ts';
import SetVarAction from './set_var.ts';
import AddToStartupAction from './os/add_to_startup.ts';
import JsonGet from "./json/json_get.ts";
import JsonSet from "./json/json_set.ts";
import JsonRemove from "./json/json_remove.ts";
import PropertyGetAction from "./property/property_get.ts";
import BackupFile from "./backup_file.ts";
import PropertySetAction from "./property/property_set.ts";
import CheckPort from "./check/check_port.ts";
import ShellPath from "./shell_path.ts";
import CheckUrl from "./check/check_url.ts";
import AddToStartMenuAction from "./os/add-to-start-menu.ts";
import AddToDesktopAction from "./os/add-to-desktop.ts";
import KillProcessAction from "./os/killProcess.ts";
import GitCloneAction from "./git/clone.ts";

const actionMap = new Map<string, (config: Config) => Action>([
    ['addPath', (config: Config) => new AddPathAction(config)],
    ['addToDesktop', (config: Config) => new AddToDesktopAction(config)],
    ['addToStartup', (config: Config) => new AddToStartupAction(config)],
    ['addToStartMenu', (config: Config) => new AddToStartMenuAction(config)],
    ['assertContains', (config: Config) => new AssertContainsAction(config)],
    ['backupFile', (config: Config) => new BackupFile(config)],
    ['checkChainDirExists', (config: Config) => new CheckChainDirExists(config)],
    ['checkFileExists', (config: Config) => new CheckFileExists(config)],
    ['checkPort', (config: Config) => new CheckPort(config)],
    ['checkUrl', (config: Config) => new CheckUrl(config)],
    ['copy', (config: Config) => new CopyAction(config)],
    ['clone', () => new GitCloneAction()],
    ['contextMenu', (config: Config) => new ContextMenu(config)],
    ['defaultPackage', (config: Config) => new DefaultPackage(config)],
    ['echo', (config: Config) => new Echo(config)],
    ['extract', (config: Config) => new Extract(config)],
    ['inspect', (config: Config) => new Inspect(config)],
    ['jsonGet', (config: Config) => new JsonGet(config)],
    ['jsonSet', (config: Config) => new JsonSet(config)],
    ['jsonRemove', (config: Config) => new JsonRemove(config)],
    ['killProcess', () => new KillProcessAction()],
    ['levainShell', (config: Config) => new LevainShell(config)],
    ['mkdir', (config: Config) => new Mkdir(config)],
    ['propertyGet', (config: Config) => new PropertyGetAction(config)],
    ['propertySet', (config: Config) => new PropertySetAction(config)],
    ['saveConfig', (config: Config) => new Noop(config, 'saveConfig')],
    ['setEnv', (config: Config) => new SetEnv(config)],
    ['template', (config: Config) => new Template(config)],
    ['removeFromRegistry', (config: Config) => new RemoveFromRegistry(config.levainRegistry)],
    ['setVar', (config: Config) => new SetVarAction(config)],
    ['shellPath', (config: Config) => new ShellPath(config)],
])

export default class ActionFactory {

    list(): string[] {
        return [...actionMap.keys()];
    }

    get(action: string, config: Config): Action {
        const builder = actionMap.get(action)
        if (!builder) {
            throw new Error(`Action ${action} not found - Aborting...`);
        }
        return builder(config)
    }

    // private async loadActionDynamic(action: string): Promise<Action> {
    //     const module = await import(`../action/${action}.ts`);
    //     return new module.default(config);
    // }
}
