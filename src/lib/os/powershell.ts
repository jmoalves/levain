import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";

export class Powershell {

    static async run(
        script: string,
        stripCRLF = false,
        ignoreErrors = false,
        params?: string[]
    ): Promise<string> {

        let args = [
            'powershell.exe',
            '-ExecutionPolicy',
            'Bypass',
            '-NoLogo',
            '-NonInteractive',
            '-NoProfile',
        ]

        if (script.endsWith('.ps1')) {
            args.push('-File')
            const resolvedFile = path.resolve(script)
            args.push(resolvedFile)
        } else {
            args.push(script)
        }


        if (params) {
            params.forEach(param => {
                args.push(param);
            })
        }

        // const cmd = Deno.run({cmd:["extra-bin/windows/os-utils/addToDesktop.cmd", resolvedTargetFile]});
        // %PWS% -File %currentFileDir%createShortcut.ps1 "%TARGET_FILE%" "%SHORTCUT_DIR%"

        const process = Deno.run({
            cmd: args,
            stderr: 'piped',
            stdout: 'piped',
        })

        const [
            stderr,
            stdout,
            status
        ] = await Promise.all([
            process.stderrOutput(),
            process.output(),
            process.status()
        ]);

        process.close()

        if (!ignoreErrors && !status?.success) {
            let stderrOutput = this.decodeOutput(stderr)
            throw new Error(`Powershell.run(${script}) terminated with code ${status?.code}\n${stderrOutput}`);
        }

        let output = this.decodeOutput(stdout)
        log.debug(`stdout ${output}`)

        if (stripCRLF) {
            output = output
                .replace(/\r/g, '')
                .replace(/\n/g, '');
        }

        return output
    }

    private static decodeOutput(output: Uint8Array) {
        return new TextDecoder().decode(output);
    }
}
