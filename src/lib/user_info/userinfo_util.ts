import * as log from "https://deno.land/std/log/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts"

import {envChain, promptSecret} from '../utils.ts';
import Config from '../config.ts';
import StringUtils from '../string_utils.ts';
import OsUtils from "../os_utils.ts";
import FileUtils from "../file_utils.ts";
import {UserInfo} from "./user_info.ts";

export default class UserInfoUtil {

    userInfo: UserInfo = new UserInfo()

    constructor(
        public readonly userinfoFileUri: string = `${OsUtils.homeFolder}/.levain.yaml`
    ) {
    }

    load() {
        log.debug(`loading user info from ${this.userinfoFileUri}`)
        if (!existsSync(this.userinfoFileUri)) {
            log.debug(`User info will be saved in ${this.userinfoFileUri}`)
            this.userInfo = new UserInfo()
            return
        }
        const userInfo = FileUtils.loadYamlAsObjectSync<UserInfo>(this.userinfoFileUri)
        log.debug(`User info: ${JSON.stringify(userInfo)}`)
        this.userInfo = userInfo
    }

    save() {
        FileUtils.saveObjectAsYamlSync(this.userinfoFileUri, this.userInfo)
    }

    askEmail(config: Config, emailDomain: string | undefined = undefined): string {
        log.debug(`Asking for email`)
        this.load()
        const loadedEmail = this.userInfo.email !== ""
            ? this.userInfo.email
            : undefined


        let defaultEmail = config.email || loadedEmail;
        if (!defaultEmail) {
            if (config.login && emailDomain) {
                defaultEmail = config.login + (emailDomain.startsWith("@") ? "" : "@") + emailDomain;
                log.debug(`defaultEmail = ${defaultEmail}`);
            } else {
                if (!config.login) {
                    log.debug("No username for defaultEmail");
                }

                if (!emailDomain) {
                    log.debug("No emailDomain for defaultEmail");
                }
            }
        }

        let email = prompt("    Email: ", defaultEmail);
        if (!email) {
            throw new Error(`Unable to collect email`);
        }

        // TODO: Validate email

        if (this.userInfo.email != email) {
            this.userInfo.email = email
            this.save()
        }
        config.email = email;
        return email
    }

    askLogin(config: Config): string {
        log.debug(`Asking for username`)
        this.load()

        let login: string | null = prompt(
            "    Login: ",
            this.userInfo.login || envChain("user", "username")?.toLowerCase()
        );
        if (!login) {
            throw new Error(`Unable to collect login`);
        }

        if (this.userInfo.login != login) {
            this.userInfo.login = login
            this.save()
        }
        config.login = login;
        return login
    }

    askFullName(config: Config): string {
        log.debug(`Asking for full name`)
        this.load()

        console.log("What's your full name?");
        let fullName: string | null = prompt(
            "Full name: ",
            this.userInfo.fullName || envChain("user", "fullname") || "");
        if (!fullName) {
            throw new Error(`Unable to collect full name`);
        }

        if (this.userInfo.fullName != fullName) {
            this.userInfo.fullName = fullName
            this.save()
        }
        config.fullname = fullName;
        return fullName
    }

    async askPassword(config: Config) {
        const forbiddenPasswordChars = '^&'

        let tries = 0;
        do {
            tries++;
            log.debug(`Asking for password, try ${tries}`)

            console.log('')
            console.log(' ========================================================================================')
            console.log(' === ATTENTION PLEASE! The characters below are known to cause problems with passwords')
            console.log(' === If you use one of them, please change your password and come back.')
            console.log(' === Do not use:')
            console.log(` === ${forbiddenPasswordChars}`)
            console.log(' ========================================================================================')
            console.log('')

            const password = await promptSecret(" Password: ");
            console.log("");

            if (!password) {
                console.log("Please, inform your password.");
                console.log("");
                continue;
            }

            const pw2 = await promptSecret("  Confirm: ");
            console.log("");

            if (password == pw2) {
                if (StringUtils.textContainsAtLeastOneChar(password || '', forbiddenPasswordChars)) {
                    throw '****** INVALID CHAR IN PASSWORD. Please change your password and try again.'
                }

                console.log("");
                console.log("Double checked password, but we did NOT validate it with the server");
                console.log("");
                config.password = password;
                return;
            }

            console.log("Password mismatch... Please, inform again.");
            console.log("");
        } while (tries < 3);

        throw new Error(`Unable to collect password after ${tries} attempts`);
    }
}
