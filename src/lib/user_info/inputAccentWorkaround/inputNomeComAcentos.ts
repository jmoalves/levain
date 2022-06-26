import StringUtils from "../../utils/string_utils.ts";
import * as path from "https://deno.land/std/path/mod.ts"
import {decode, encode,} from 'https://deno.land/std/encoding/utf8.ts';
import {Input} from "https://deno.land/x/cliffy/prompt/input.ts";

const myFolder = 'C:\\src\\dev-env\\levain\\src/lib/user_info'


// https://github.com/denoland/deno/issues/8239
const input = prompt('Insert your character');
console.log(`${input}===a => ${input === 'a'}`);  // When inserting the character 'a', returns true, as expected!
console.log(`${input}===ã => ${input === 'ã'}`);  // When inserting the character 'ã', returns false, not what we expected.

const textEncoder = new TextEncoder()
console.log(`a: ${textEncoder.encode('a')}`)
console.log(`ã: ${textEncoder.encode('ã')}`)
console.log(`ä: ${textEncoder.encode('ä')}`)
console.log(`input: ${textEncoder.encode(input || '')}`)

// const password: string = await prompt("Qual seu nome?")

const encodedValue = encode('wð𐍈lhå');
console.log(`encodedValue: ${encodedValue}`);

const decodedValue = decode(encodedValue);
console.log(`decodedValue: ${decodedValue}`);

const nameDeno: string = prompt(
    "What's your name ã? (press return to confirm default value) ",
) || ''
const nameDenoSemAcentos = StringUtils.removeAccentMarks(nameDeno)
// const decodedDenoName: string = new TextDecoder('iso-8859-1').decode(nameDeno)
// console.log(`Name: ${nameDeno} ${decodedDenoName}`)

const encodedDenoName: Uint8Array = new TextEncoder().encode(nameDeno)
console.log(`NameDeno: ${nameDeno} ${nameDenoSemAcentos} ${encodedDenoName}`)


const encodedA: Uint8Array = new TextEncoder().encode('ã')
console.log(`encoded ã: ${encodedA}`)

Deno.writeTextFileSync(path.join(myFolder, 'nome.deno.txt'), nameDeno)
Deno.writeFileSync(path.join(myFolder, 'nome.deno.encoded.txt'), encodedDenoName)

const nameCliffy: string = await Input.prompt("What's your github user name ã?", "abc")

const encodedCliffyName: Uint8Array = new TextEncoder().encode(nameCliffy)
console.log(`nameCliffy: ${nameCliffy} ${encodedCliffyName}`)

Deno.writeTextFileSync(path.join(myFolder, 'nome.cliffy.txt'), nameCliffy)
Deno.writeFileSync(path.join(myFolder, 'nome.cliffy.encoded.txt'), encodedCliffyName)
