import {exists} from "jsr:@std/fs"
import OsUtils from '../src/lib/os/os_utils.ts';

const watcher = Deno.watchFs('src/')

await runTest()

let lastRun: number, lastFile: string

for await (const event of watcher) {
    // console.log('>>>> event', event);
    if (['create', 'modify'].indexOf(event.kind)) {
        event.paths.forEach(async (file) => {
            if (file.endsWith('.ts') && (!file.match('\$deno\$'))) {
                if (!bouncing(file)) {
                    await runTest(file)
                }
            }
        })
    }
}

function bouncing(file: string): boolean {
    if (!lastFile || !lastRun) {
        lastFile = file
        lastRun = Date.now()
        return false
    }
    const timeDiff = Date.now() - lastRun
    if (lastFile === file && timeDiff < 1000) {
        lastRun = Date.now()
        console.log('debouncing')
        return true
    }
    lastFile = file
    lastRun = Date.now()
    return false
}

async function runTest(file?: string): Promise<void> {
    await OsUtils.clearConsole()
    const cmd = 'deno'
    const args = ['test', '--allow-all'];
    const testFile =
        file?.replace(/(?:.test)?.ts$/, '.test.ts')
        || 'all tests'

    if (file) {
        if (!exists(file)) {
            console.error`Cannot find ${file}`
            return
        }
        args.push(testFile)
    }
    console.log('RUNTEST', testFile, args)
    console.time('runtest')
    const command = new Deno.Command(cmd, { args })
    command.outputSync()
    console.timeEnd('runtest')
}

