import {exists} from "https://deno.land/std/fs/mod.ts"
import OsUtils from '../src/lib/os/os_utils.ts';

const watcher = Deno.watchFs('src/')

runTest()

for await (const event of watcher) {
    // console.log('>>>> event', event);
    if (['create', 'modify'].indexOf(event.kind)) {
        event.paths.forEach((file) => {
            if (file.endsWith('.ts') && (!file.match('\$deno\$'))) {
                runTest(file)
            }
        })
    }
}

async function runTest(file?: string): Promise<void> {
    OsUtils.clearConsole()
    let cmd = ['deno', 'test', '--unstable', '--allow-all'];
    const testFile =
        file?.replace(/(?:.test)?.ts$/, '.test.ts')
        || 'all tests'

    if (file) {
        if (!exists(file)) {
            console.error`Cannot find ${file}`
            return
        }
        cmd.push(testFile)
    }
    console.log('RUNTEST', testFile, cmd)
    console.time('runtest')
    await Deno.run({cmd})
    console.timeEnd('runtest')
}

