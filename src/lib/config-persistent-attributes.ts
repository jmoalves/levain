export default class ConfigPersistentAttributes {
    repos?: Set<string>
    defaultPackage?: string
    cacheDir?: string
    shellPath?: string
    lastKnownVersion?: string
    lastUpdateQuestion?: string
    autoUpdate?: boolean
    shellCheckForUpdate?: boolean
}
