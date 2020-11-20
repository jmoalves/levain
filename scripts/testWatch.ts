const watcher = Deno.watchFs('./src/')

runTest()

for await (const event of watcher) {
    // console.log('>>>> event', event);
    if (['create', 'modify'].indexOf(event.kind)) {
        event.paths.forEach((file) => {
            if (file.endsWith('.ts') && (!file.indexOf('$deno$'))) {
                runTest(file)
            }
        })
    }
}

function runTest(file?: string): void {
    let cmd = ['deno', 'test', '--unstable', '--allow-env'];
    console.log('runTest', file)
    if (file) {
        cmd.push(file)
    }
    Deno.run({cmd})
}
