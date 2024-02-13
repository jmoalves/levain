import {assertEquals,} from "https://deno.land/std/assert/mod.ts";

import YamlFileUtils from "./yaml_file_utils.ts";

Deno.test('should save and load an object', () => {
    const testObject = {
        myString: 'John Doe',
        myNumber: 123,
        myBoolean: true,
    }

    const tempFilePath = Deno.makeTempFileSync()
    YamlFileUtils.saveObjectAsFileSync(tempFilePath, testObject)
    const newObject = YamlFileUtils.loadFileAsObjectSync(tempFilePath)

    assertEquals(testObject, newObject)
})