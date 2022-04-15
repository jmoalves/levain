import * as log from "https://deno.land/std/log/mod.ts";
import {existsSync} from "https://deno.land/std/fs/mod.ts"
import "https://deno.land/x/humanizer/ordinalize.ts"

import {ValidateResult} from "https://deno.land/x/cliffy/prompt/_generic_prompt.ts";

import {envChain, promptSecret} from '../utils/utils.ts';
import Config from '../config.ts';
import StringUtils from '../utils/string_utils.ts';
import OsUtils from "../os/os_utils.ts";
import YamlFileUtils from "../utils/yaml_file_utils.ts";

import {UserInfo} from "./user_info.ts"
import {NameValidator} from "./validators/validators.ts";
import {InputFullName} from "./input_name.ts";
import {InputEmail} from "./input_email.ts";
import {InputLogin} from "./input_login.ts";

export default class UserInfoUtil {

    userInfo: UserInfo = new UserInfo()

    constructor(
        public readonly userinfoFileUri: string = `${OsUtils.homeDir}/.levain.yaml`
    ) {
    }

    load() {
        log.debug(`loading user info from ${this.userinfoFileUri}`)
        if (!existsSync(this.userinfoFileUri)) {
            log.debug(`User info will be saved in ${this.userinfoFileUri}`)
            this.userInfo = new UserInfo()
            return
        }
        const userInfo = YamlFileUtils.loadFileAsObjectSync<UserInfo>(this.userinfoFileUri)
        log.debug(`User info: ${JSON.stringify(userInfo)}`)
        this.userInfo = userInfo || new UserInfo()
    }

    save() {
        YamlFileUtils.saveObjectAsFileSync(this.userinfoFileUri, this.userInfo)
    }

    async askUserInfo(config: Config, myArgs: any): Promise<UserInfo> {
        // Some nasty tricks... Should we refactor this?
        let separatorEnd: (() => void) | undefined = () => {
        };
        let separatorBegin: (() => void) | undefined = () => {
            if (separatorEnd) console.log("");
            log.info("==================================");
            log.info("");

            if (separatorBegin) {
                console.log("");
                console.log('Hello :-)')
            }

            separatorEnd = separatorBegin;
            separatorBegin = undefined;
        };
        //

        if (myArgs.askPassword) {
            (separatorBegin ? separatorBegin() : undefined);

            log.warning("--askPassword is Deprecated. Use --ask-login and --ask-password");
            myArgs["ask-login"] = true;
            myArgs["ask-password"] = true;
        }

        if (myArgs["ask-fullname"]) {
            (separatorBegin ? separatorBegin() : undefined);

            await this.askFullName(config);
        }

        if (myArgs["ask-login"]) {
            (separatorBegin ? separatorBegin() : undefined);

            await this.askLogin(config);
        }

        if (myArgs["ask-email"]) {
            (separatorBegin ? separatorBegin() : undefined);

            await this.askEmail(config, myArgs["email-domain"]);
        }

        if (myArgs["ask-password"]) {
            (separatorBegin ? separatorBegin() : undefined);

            await this.askPassword(config);
        }

        (separatorEnd ? separatorEnd() : undefined);

        return this.userInfo
    }

    async askFullName(config: Config, defaultValue?: string): Promise<string> {
        log.debug(`Asking for full name`)
        this.load()

        if (!defaultValue) {
            defaultValue = this?.userInfo?.fullName || envChain("user", "fullname") || ""
        }

        const newValue = await InputFullName.inputAndValidate(defaultValue);

        const validationResult: ValidateResult = NameValidator.validate(newValue)

        if (validationResult !== true) {
            throw new Error(`Invalid FULL NAME - ${validationResult}`);
        }

        if (this?.userInfo?.fullName != newValue) {
            this.userInfo.fullName = newValue
            this.save()
        }
        config.fullname = newValue;
        return newValue
    }

    async askEmail(config: Config, emailDomain: string | undefined = undefined, defaultValue?: string): Promise<string> {
        log.debug(`Asking for email`)
        this.load()
        const loadedEmail = this.userInfo.email !== ""
            ? this.userInfo.email
            : undefined

        if (!defaultValue) {
            defaultValue = config.email || loadedEmail;
        }
        if (!defaultValue) {
            if (config.login && emailDomain) {
                defaultValue = config.login + (emailDomain.startsWith("@") ? "" : "@") + emailDomain;
                log.debug(`defaultEmail = ${defaultValue}`);
            } else {
                if (!config.login) {
                    log.debug("No username for defaultEmail");
                }

                if (!emailDomain) {
                    log.debug("No emailDomain for defaultEmail");
                }
            }
        }

        const email = await InputEmail.inputAndValidate(defaultValue || '');

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

    async askLogin(config: Config, defaultValue?: string): Promise<string> {
        log.debug(`Asking for login`)
        this.load()

        if (!defaultValue) {
            defaultValue = this.userInfo.login || OsUtils.login?.toLowerCase() || ""
        }
        const newValue = await InputLogin.inputAndValidate(defaultValue)

        if (this.userInfo.login != newValue) {
            this.userInfo.login = newValue
            this.save()
        }
        config.login = newValue;
        return newValue
    }

    async askPassword(config: Config): Promise<string> {
        const forbiddenPasswordChars = '^&'
        // const allowedAndTestedPasswordChars = '#!@'

        let tries = 0
        let alertPasswordSize = false
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

            if (alertPasswordSize) {
                console.log("* Password must have at least 3 characters *")
                console.log("")
                alertPasswordSize = false
            }

            if (tries > 1) {
                console.log(`${tries.ordinalize()} attempt`)
            }

            // const password: string = await Secret.prompt("Please, inform your network password: ");
            const password: string | undefined = promptSecret("Please, inform your network password: ")
            console.log("");

            if (!password) {
                continue;
            }

            if (password.length < 3) {
                alertPasswordSize = true
                continue;
            }

            // const pw2 = await Secret.prompt("Confirm your password: ");
            const pw2 = promptSecret("Confirm your password: ");
            console.log("");

            if (password == pw2) {
                if (StringUtils.textContainsAtLeastOneChar(password || '', forbiddenPasswordChars)) {
                    throw '****** INVALID CHAR IN PASSWORD. Please change your password and try again.'
                }

                console.log("");
                console.log("Perfect, the typed passwords are the same.");
                console.log("");
                config.password = password;
                return password;
            }

            console.log("Password mismatch... Please, inform again.");
            console.log("");
        } while (tries < 3);

        throw new Error(`Unable to collect password after ${tries} attempts`);
    }
}
