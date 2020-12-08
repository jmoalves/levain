import {assert, assertThrows,} from "https://deno.land/std/testing/asserts.ts";
import Loader from "./loader.ts";
import Config from "./config.ts";
import ListCommand from "../cmd/list_command.ts";


//
// Commands
//
Deno.test('loadCommand should know the list command', () => {
    const loader = getLoader()

    const command = loader.loadCommandStatic('list')

    assert(command instanceof ListCommand)
})


Deno.test('should throw exception when command was not found', () => {
    const loader = getLoader()

    assertThrows(
        () => {
            loader.loadCommandStatic('thisCommandDoesNotExist')
        },
        Error,
        'Command thisCommandDoesNotExist not found - Aborting...'
    )
})


//

function getLoader() {
    const loader = new Loader(new Config([]))
    return loader;
}
