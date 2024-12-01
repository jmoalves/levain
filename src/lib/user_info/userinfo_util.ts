import * as log from "jsr:@std/log";
import {existsSync} from "jsr:@std/fs"

import {ValidateResult} from 'https://deno.land/x/cliffy/prompt/mod.ts'

import t from '../i18n.ts'

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

const passwordSizeMin = 3;

export default class UserInfoUtil {

    userInfo: UserInfo = new UserInfo()

    constructor(
        public readonly userinfoFileUri: string = `${OsUtils.homeDir}/.levain.yaml`
    ) {
    }

    load() {
        log.debug(t("lib.user_info.userinfo_util.loadingUserinfo", { uri: this.userinfoFileUri }))
        if (!existsSync(this.userinfoFileUri)) {
            log.debug(t("lib.user_info.userinfo_util.userinfoDest", { uri: this.userinfoFileUri }))
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
                console.log(t("lib.user_info.userinfo_util.hello"))
            }

            separatorEnd = separatorBegin;
            separatorBegin = undefined;
        };
        //

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

        const newValue = await InputFullName.askUser(defaultValue);

        const validationResult: ValidateResult = NameValidator.validate(newValue)

        if (validationResult !== true) {
            throw new Error(t("lib.user_info.userinfo_util.invalidFullName", { result: validationResult}));
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
                    log.debug(t("lib.user_info.userinfo_util.noUsername"));
                }

                if (!emailDomain) {
                    log.debug(t("lib.user_info.userinfo_util.noEmailDomain"));
                }
            }
        }

        const email = await InputEmail.inputAndValidate(defaultValue || '');

        if (!email) {
            throw new Error(t("lib.user_info.userinfo_util.unableEmail"));
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
        const newValue = await InputLogin.askUser(defaultValue)

        if (this.userInfo.login != newValue) {
            this.userInfo.login = newValue
            this.save()
        }
        config.login = newValue;
        return newValue
    }

    async askPassword(config: Config): Promise<string> {
        // const allowedAndTestedPasswordChars = '#!@$'
        const forbiddenPasswordChars = '^&'
        const forbiddenPasswordSequences = ['$$'].concat(forbiddenPasswordChars.split(''))

        let tries = 0
        let alertPasswordSize = false
        do {
            tries++;
            log.debug(t("lib.user_info.userinfo_util.askingPassword", { try: tries }))

            console.log('')
            console.log(' ========================================================================================')
            console.log(t("lib.user_info.userinfo_util.passwordWarning.1"))
            console.log(t("lib.user_info.userinfo_util.passwordWarning.2"))
            console.log(t("lib.user_info.userinfo_util.passwordWarning.3"))
            console.log(` === ${forbiddenPasswordSequences.join(' ')}`)
            console.log(' ========================================================================================')
            console.log('')

            if (alertPasswordSize) {
                console.log(t("lib.user_info.userinfo_util.passwordSize", { min: passwordSizeMin }))
                console.log("")
                alertPasswordSize = false
            }

            if (tries > 1) {
                console.log(t("lib.user_info.userinfo_util.attempt", { try: tries}))
            }

            // const password: string = await Secret.prompt(t("lib.user_info.userinfo_util.passwordPrompt"));
            const password: string | undefined = promptSecret(t("lib.user_info.userinfo_util.passwordPrompt"))
            console.log("");

            if (!password) {
                continue;
            }

            if (password.length < passwordSizeMin) {
                alertPasswordSize = true
                continue;
            }

            // const pw2 = await Secret.prompt(t("lib.user_info.userinfo_util.confirmPassword"));
            const pw2 = promptSecret(t("lib.user_info.userinfo_util.confirmPassword"));
            console.log("");

            if (password == pw2) {
                if (StringUtils.textContainsAtLeastOneSequence(password || '', forbiddenPasswordSequences)) {
                    throw t("lib.user_info.userinfo_util.invalidChar")
                }

                console.log("");
                console.log(t("lib.user_info.userinfo_util.match"));
                console.log("");
                config.password = password;
                return password;
            }

            console.log(t("lib.user_info.userinfo_util.mismatch"));
            console.log("");
        } while (tries < 3);

        throw new Error(t("lib.user_info.userinfo_util.unablePasswordAttempts", { tries: tries}));
    }
}
