import * as log from "https://deno.land/std/log/mod.ts";
import {envChain, promptSecret} from './utils.ts';
import Config from './config.ts';
import StringUtils from './string_utils.ts';
import OsUtils from "./os_utils.ts";

export default class Credentials {

    email: string = '';
    login: string = '';
    fullName: string = '';

    readonly credentialsFileUri = `${OsUtils.homeFolder}/.levain.yaml`

    constructor() {
        // this.load(credentialsFileUri);
    }

    load() {
        // TODO
    }

    save() {
        // TODO
    }

    askEmail(config: Config, emailDomain: string | undefined = undefined): void {
        log.debug(`Asking for email`)

        let defaultEmail = config.email;
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

        config.email = email;
    }

    askLogin(config: Config): void {
        log.debug(`Asking for username`)

        let login: string | null = prompt("    Login: ", envChain("user", "username")?.toLowerCase());
        if (!login) {
            throw new Error(`Unable to collect login`);
        }

        config.login = login;
    }

    askFullName(config: Config): void {
        log.debug(`Asking for full name`)

        console.log("What's your full name?");
        let fullname: string | null = prompt("Full name: ", envChain("user", "fullname") || "");
        if (!fullname) {
            throw new Error(`Unable to collect full name`);
        }

        config.fullname = fullname;
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
