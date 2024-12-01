import {assertEquals} from "jsr:@std/assert";
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
Deno.test('ArrayUtils.makeUnique should make int[] unique', () => {
    assertEquals(ArrayUtils.removeRepetitions([1, 2, 2, 3]), [1, 2, 3])
})
Deno.test('ArrayUtils.makeUnique should make Object[] unique', () => {
    const oneObject = {age: 1}
    const anotherObject = {age: 2}
    const group = [oneObject, oneObject, anotherObject]
    const uniqueGroup = [oneObject, anotherObject]

    assertEquals(ArrayUtils.removeRepetitions(group), uniqueGroup)
})
Deno.test('ArrayUtils.makeUnique should make Object[] unique using a key', () => {
    const oneObject = {age: 1}
    const anotherObject = {age: 2}
    const repeatedKey = {age: 2}
    const group = [oneObject, anotherObject, repeatedKey]
    const uniqueGroup = [oneObject, anotherObject]

    assertEquals(ArrayUtils.removeRepetitions(group, getAge), uniqueGroup)
})
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

//
// awaitAndMerge
//
Deno.test('ArrayUtils.awaitAndMerge', async () => {
    const promise1 = Promise.resolve([1, 2, 3])
    const promise2 = Promise.resolve([4, 5, 6])

    const merged = [1, 2, 3, 4, 5, 6]

    assertEquals(await ArrayUtils.awaitAndMerge([promise1, promise2]), merged)
})
