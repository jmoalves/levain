import {readLines} from "jsr:@std/io/bufio.ts";

async function prompt(
    message = "Prompt",
    {encoding}: { encoding?: string } = {}
) {
    await Deno.stdout.write(new TextEncoder().encode(`${message} `));
    const {value} = await readLines(Deno.stdin, {encoding}).next();
    return <string>value || null;
}

const input = await prompt("Insert your character:", {encoding: "latin1"})

const textEncoder = new TextEncoder()
console.log(`input: ${input} ${textEncoder.encode(input || '')}`)
console.log(`a: ${textEncoder.encode('a')}`)
console.log(`ã: ${textEncoder.encode('ã')}`)
console.log(`ä: ${textEncoder.encode('ä')}`)

