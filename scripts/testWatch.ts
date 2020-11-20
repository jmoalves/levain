const watcher = Deno.watchFs('./src/')

for await (const event of watcher) {
    // console.log('>>>> event', event);
    if (['create', 'modify'].indexOf(event.kind)) {
        event.paths.forEach((file) => {
            if (file.endsWith('.ts')) {
                Deno.run({ cmd: ['deno', 'test', '--unstable', '--allow-env']})
            }
        })
    }
}