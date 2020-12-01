import * as log from "https://deno.land/std/log/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts"

import {envChain, promptSecret} from '../utils.ts';
import Config from '../config.ts';
import StringUtils from '../string_utils.ts';
import OsUtils from "../os_utils.ts";
import FileUtils from "../file_utils.ts";
import {Credentials} from "./credentials.ts";

export default class CredentialsUtil {

    credentials: Credentials = new Credentials()

    constructor(
        public readonly credentialsFileUri: string = `${OsUtils.homeFolder}/.levain.yaml`
    ) {
    }

    load() {
        log.debug(`loading user info from ${this.credentialsFileUri}`)
        if (!existsSync(this.credentialsFileUri)) {
            log.debug(`User info will be saved in ${this.credentialsFileUri}`)
            this.credentials = new Credentials()
            return
        }
        const loadedCredentials = FileUtils.loadYamlAsObjectSync<Credentials>(this.credentialsFileUri)
        log.debug(`credentials: ${JSON.stringify(loadedCredentials)}`)
        this.credentials = loadedCredentials
    }

    save() {
        FileUtils.saveObjectAsYamlSync(this.credentialsFileUri, this.credentials)
    }

    askEmail(config: Config, emailDomain: string | undefined = undefined): string {
        log.debug(`Asking for email`)
        this.load()
        const loadedEmail = this.credentials.email !== ""
            ? this.credentials.email
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

        if (this.credentials.email != email) {
            this.credentials.email = email
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
            this.credentials.login || envChain("user", "username")?.toLowerCase()
        );
        if (!login) {
            throw new Error(`Unable to collect login`);
        }

        if (this.credentials.login != login) {
            this.credentials.login = login
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
            this.credentials.fullName || envChain("user", "fullname") || "");
        if (!fullName) {
            throw new Error(`Unable to collect full name`);
        }

        if (this.credentials.fullName != fullName) {
            this.credentials.fullName = fullName
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
