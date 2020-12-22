export default class PropertiesUtils {

    static load(filePath: any): Map<string, string> {
        const propertiesMap = new Map<string, string>()
        const text = Deno.readTextFileSync(filePath)
        const lines = text.split('\n')
        lines
            .filter(line => line?.trim())
            .map(line => line.split('='))
            .forEach(kv => {
                const key = kv[0]?.trim()
                const value = kv[1]?.trim() || ''
                propertiesMap.set(key, value)
            })

        return propertiesMap
    }

    static stringify(properties: Map<string, string>): string {
        return [...properties.entries()]
            .map(entry => `${entry[0]?.trim()}=${entry[1]?.trim() || ''}`)
            .join('\r\n')
    }
}