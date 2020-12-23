import DateUtils from "./date_utils.ts";
import {assertArrayIncludes, assertEquals} from "https://deno.land/std/testing/asserts.ts";

Deno.test('DateUtils - should format date', () => {
    // Date month starts with zero!
    assertEquals(DateUtils.dateTag(new Date(2020, 0, 23)), "20200123");
    assertEquals(DateUtils.dateTag(new Date(2020, 1, 23)), "20200223");
    assertEquals(DateUtils.dateTag(new Date(2020, 2, 23)), "20200323");
    assertEquals(DateUtils.dateTag(new Date(2020, 3, 23)), "20200423");
    assertEquals(DateUtils.dateTag(new Date(2020, 4, 23)), "20200523");
    assertEquals(DateUtils.dateTag(new Date(2020, 5, 23)), "20200623");
    assertEquals(DateUtils.dateTag(new Date(2020, 6, 23)), "20200723");
    assertEquals(DateUtils.dateTag(new Date(2020, 7, 23)), "20200823");
    assertEquals(DateUtils.dateTag(new Date(2020, 8, 23)), "20200923");
    assertEquals(DateUtils.dateTag(new Date(2020, 9, 23)), "20201023");
    assertEquals(DateUtils.dateTag(new Date(2020, 10, 23)), "20201123");
    assertEquals(DateUtils.dateTag(new Date(2020, 11, 23)), "20201223");
})

Deno.test('DateUtils - should format time', () => {
    // Date month starts with zero!
    assertEquals(DateUtils.timeTag(new Date(2020, 11, 23, 12, 5, 25)), "120525");
})

Deno.test('DateUtils - should format time with millis', () => {
    // Date month starts with zero!
    assertEquals(DateUtils.timeTagWithMillis('', new Date(2020, 11, 23, 12, 5, 25, 9)), "120525009");
})
