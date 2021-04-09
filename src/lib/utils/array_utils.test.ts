import { assertEquals } from "https://deno.land/std/testing/asserts.ts";
import { ArrayUtils } from "./array_utils.ts";

Deno.test('ArrayUtils should remove the number from an array', () => { 
    //Given an array of numbers
    const arr = [1, 2, 3];
    //When I call the remove method
    const arrRemoved = ArrayUtils.remove(arr, 2);
    //Then it should have removed the item
    assertEquals(arrRemoved, [1, 3]);
})