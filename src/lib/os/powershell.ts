import * as log from "jsr:@std/log";
import * as path from "jsr:@std/path";

export class Powershell {

    static async run(
        script: string,
        stripCRLF = false,
        ignoreErrors = false,
        params?: string[]
    ): Promise<string> {

        const args = [
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


        const cmd = new Deno.Command('powershell.exe', {
            args: args,
            stderr: 'piped',
            stdout: 'piped',
        })

        return new Promise<string>((resolve, reject) => {
            const p = cmd.outputSync()

            if (!ignoreErrors && !p?.success) {
                const stderrOutput = this.decodeOutput(p.stderr)
                reject(`Powershell.run(${script}) terminated with code ${p?.code}\n${stderrOutput}`)
            }

            let output = this.decodeOutput(p.stdout)
            log.debug(`stdout ${output}`)

            if (stripCRLF) {
                output = output
                    .replace(/\r/g, '')
                    .replace(/\n/g, '');
            }

            resolve(output)
        })
    }

    private static decodeOutput(output: Uint8Array) {
        return new TextDecoder().decode(output);
    }
}
