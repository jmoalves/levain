import * as log from "https://deno.land/std/log/mod.ts";

export class Powershell {

    static async run(script: string, stripCRLF = true): Promise<string> {
        const args = [
            'powershell.exe',
            '-ExecutionPolicy',
            'Bypass',
            '-NoLogo',
            '-NonInteractive',
            '-NoProfile',
            'return "hello world"'
        ]

        // const cmd = Deno.run({cmd:["extra-bin/windows/os-utils/addToDesktop.cmd", resolvedTargetFile]});
        // %PWS% -File %currentFileDir%createShortcut.ps1 "%TARGET_FILE%" "%SHORTCUT_DIR%"

        const process = Deno.run({
            cmd: ["powershell.exe", script],
            stdout: 'piped',
        })

        const [
            // stderr,
            stdout,
            status
        ] = await Promise.all([
            // proc.stderrOutput(),
            process.output(),
            process.status()
        ]);

        process.close()

        let output = new TextDecoder().decode(stdout)
        log.debug(`stdout ${output}`)

        if (stripCRLF) {
            output = output
                .replace(/\r\n$/, '')
                .replace(/\r$/, '')
                .replace(/\n$/, '');
        }

        return output
    }
}
