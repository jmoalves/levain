import LevainCli from './levain_cli.ts';

Deno.test('should be able to list packages', () => {
    const levainCli = new LevainCli()
    const myArgs = {
        _: ['list']
    }

    levainCli.execute(myArgs)
})
