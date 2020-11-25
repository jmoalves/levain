import {envChain, promptSecret} from './utils.ts';
import Config from './config.ts';

export function askEmail(config: Config): void {
    let email = prompt("   Email: ", config.email || "");

    if (!email) {
        throw new Error(`Unable to collect email`);
    }

    config.email = email;
}

export function askUsername(config: Config): void {
    let username: string | null = prompt("Username: ", envChain("user", "username") || "");

    if (!username) {
        throw new Error(`Unable to collect username`);
    }

    config.username = username;
}

export function askFullName(config: Config): void {
    let fullname: string | null = prompt("Whats your full name? ", envChain("user", "fullname") || "");

    if (!fullname) {
        throw new Error(`Unable to collect full name`);
    }

    config.fullname = fullname;
}

export async function askPassword(config: Config) {
    let tries = 0;
    do {
        tries++;
        let password = await promptSecret("Password: ");
        console.log("");
        let pw2 = await promptSecret(" Confirm: ");
        console.log("");

        if (password == pw2) {
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
