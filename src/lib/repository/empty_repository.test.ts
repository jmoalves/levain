import {assertEquals} from 'jsr:@std/assert';
import Repository from "./repository.ts";
import {EmptyRepository} from "./empty_repository.ts";

Deno.test('EmptyRepository should have a name', async () => {
    const repo = await getRepo()

    assertEquals(repo.name, 'EmptyRepo')
})
Deno.test('EmptyRepository should have a description', async () => {
    const repo = await getRepo()

    assertEquals(repo.describe(), 'EmptyRepo')
})
Deno.test('EmptyRepository should init', async () => {
    const repo = await getRepo()

    await repo.init()
})
Deno.test('EmptyRepository should have no packages', async () => {
    const repo = await getRepo()

    assertEquals(repo.listPackages(), [])
})
Deno.test('EmptyRepository should have size 0', async () => {
    const repo = await getRepo()

    assertEquals(repo.size(), 0)
})
Deno.test('EmptyRepository should resolvePackage packages to undefined', async () => {
    const repo = await getRepo()

    assertEquals(repo.resolvePackage('abc'), undefined)
})

async function getRepo(): Promise<Repository> {
    return new EmptyRepository()
}
