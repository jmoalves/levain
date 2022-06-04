import * as log from "https://deno.land/std/log/mod.ts";

import t from '../lib/i18n.ts'

import Config from "../lib/config.ts";
import StringUtils from "../lib/utils/string_utils.ts";

import Command from "./command.ts";

import {distance} from 'https://deno.land/x/fastest_levenshtein/mod.ts'

export default class ListCommand implements Command {
    constructor(private config: Config) {
    }

    execute(args?: string[]): void {
        const repo = this.config.repositoryManager.repository
        log.info("");
        log.info("==================================");
        const searchText = args?.join(' ') || '';
        log.info(`list "${searchText}"`);
        log.info(t("cmd.list_command.repo"))
        log.info(`  ${repo.describe()}`)

        const packages = repo.listPackages()
        const filteredPackages = args
            ? packages?.filter(it => it.name.includes(searchText))
            : packages

        const packageCount = packages?.length;
        if (!packageCount) {
            log.info(`  ${t("cmd.list_command.noPackages")}`)
        } else {
            const filteredPackageCount = filteredPackages.length;
            if (filteredPackageCount > 0) {
                log.info(`  ${t("cmd.list_command.packagesFound", { pkg: filteredPackageCount, count: packageCount })}`)
                log.info("");
                const filteredPluralChar = filteredPackageCount > 1 ? 's' : ''
                log.info(`== ${t("cmd.list_command.packages", { count: filteredPackageCount })}`);
                // TODO: Inform if package is already installed.
                filteredPackages.forEach(pkg => {
                    log.info(`   ${StringUtils.padEnd(pkg?.name, 30)}`)
                })
            }else{
                log.info(``)
                log.info(`${searchText} - ${t("cmd.list_command.unableToList")}`)
        
                const similarPackages = packages?.filter(it => this.similarNames(it.name, searchText))
                log.info(``)
                if( !similarPackages || similarPackages.length == 0){
                    log.info(`${searchText} - ${t("cmd.list_command.unableToSimilar")}`)
                }else{
                    log.info(`${searchText} - ${t("cmd.list_command.similarPackages")}`)
                    for( let a of similarPackages){
                        log.info(a.name)
                    }
                }
                log.info("")
            }
        }
    }


    // TODO Use the same function that exists in packageManager
    similarNames(name1: string, name2: string): boolean {
        if (name1.toLowerCase().includes(name2.toLowerCase())
         || name2.toLowerCase().includes(name1.toLowerCase())) {
            return true;
        }

        let d = distance(name1.toLowerCase(), name2.toLowerCase())
        if (d <= 2) {
            return true;
        }
        return false;
    }


    readonly oneLineExample = t("cmd.list_command.example")
}
