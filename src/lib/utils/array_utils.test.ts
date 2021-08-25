import {assertEquals} from "https://deno.land/std/testing/asserts.ts";
import {ArrayUtils} from "./array_utils.ts";

Deno.test('ArrayUtils should remove the number from an array', () => {
    //Given an array of numbers
    const arr = [1, 2, 3];
    //When I call the remove method
    const arrRemoved = ArrayUtils.remove(arr, 2);
    //Then it should have removed the item
    assertEquals(arrRemoved, [1, 3]);
})
//
// makeUnique
//
// Deno.test('ArrayUtils.makeUnique should make int[] unique', () => {
//     assertEquals(ArrayUtils.makeUnique([1, 2, 2, 3]), [1, 2, 3])
// })
//
// addIfUnique
//
Deno.test('ArrayUtils.addIfUnique should add to array if new element is not there', () => {
    assertEquals(ArrayUtils.addIfUnique([1, 2, 3], 4), [1, 2, 3, 4])
})
Deno.test('ArrayUtils.addIfUnique should not change array if newArray element is aready there', () => {
    assertEquals(ArrayUtils.addIfUnique([1, 2, 3], 1), [1, 2, 3])
})
Deno.test('ArrayUtils.addIfUnique should add new object to array', () => {
    const group = [{age: 1}, {age: 2}]
    const newItem = {age: 3}
    const expectedGroup = [{age: 1}, {age: 2}, {age: 3}]

    const result = ArrayUtils.addIfUnique(group, newItem, getAge)

    assertEquals(result, expectedGroup)
})
Deno.test('ArrayUtils.addIfUnique should reject repeated object', () => {
    const group = [{age: 1}, {age: 2}]
    const newItem = {age: 2}
    const expectedGroup = [{age: 1}, {age: 2}]

    const result = ArrayUtils.addIfUnique(group, newItem, getAge)

    assertEquals(result, expectedGroup)
})

function getAge(obj: any): any {
    return obj['age']
}
