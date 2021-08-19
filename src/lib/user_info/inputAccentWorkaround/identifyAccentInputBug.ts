// https://github.com/denoland/deno/issues/8239
const input = prompt('Insert your character');
console.log(`${input}===a => ${input === 'a'}`);  // When inserting the character 'a', returns true, as expected!
console.log(`${input}===ã => ${input === 'ã'}`);  // When inserting the character 'ã', returns false, not what we expected.

const textEncoder = new TextEncoder()
console.log(`a: ${textEncoder.encode('a')}`)
console.log(`ã: ${textEncoder.encode('ã')}`)
console.log(`ä: ${textEncoder.encode('ä')}`)
console.log(`input: ${textEncoder.encode(input || '')}`)
