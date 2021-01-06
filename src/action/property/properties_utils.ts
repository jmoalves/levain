import FileUtils from "../../lib/file_utils.ts";

export default class PropertiesUtils {

    static load(filePath: any): Map<string, string> {
        const propertiesMap = new Map<string, string>()
        const text = Deno.readTextFileSync(filePath)
        const lines = text.split('\n')
        lines
            .map(line => line?.toString()?.trim())
            .filter(line => line)
            .map(line => line.split('='))
            .forEach(kv => {
                const kvString = kv as Array<string | undefined>
                const key = kvString[0]?.trim() as string
                const value = kvString[1]?.trim() || ''
                if (value === undefined) {
                    propertiesMap.delete(key)
                } else {
                    propertiesMap.set(key, value || '')
                }
            })

        return propertiesMap
    }

    static stringify(properties: Map<string, string>): string {
        return [...properties.entries()]
            .map(entry => `${entry[0]?.trim()}=${entry[1]?.trim() || ''}`)
            .join('\r\n')
    }

    static get(filePath: string, attribute: string, defaultValue: string | undefined = undefined): string | undefined {
        const propertiesMap = PropertiesUtils.load(filePath)
        return propertiesMap.get(attribute) || defaultValue
    }

    static set(filePath: string, attribute: string, value: string, ifNotExists: boolean = false): void {
        let propertiesMap = new Map<string, string>()
        if (FileUtils.exists(filePath)) {
            propertiesMap = PropertiesUtils.load(filePath)
        }
        const oldValue = propertiesMap.get(attribute)
        if (ifNotExists && oldValue) {
            return
        }
        propertiesMap.set(attribute, value)
        PropertiesUtils.save(filePath, propertiesMap)
    }

    static save(filePath: string, content: Map<string, string>) {
        const stringContent = PropertiesUtils.stringify(content)
        Deno.writeTextFileSync(filePath, stringContent)
    }
}
