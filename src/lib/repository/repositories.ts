import Repository from "./repository.ts";
import {ArrayUtils} from "../utils/array_utils.ts";

export default class Repositories {
    regular: Repository | undefined = undefined
    installed: Repository | undefined = undefined
    currentDir: Repository | undefined = undefined

    uniqueRepositories(): Repository[] {
        const nonNullrepositories = <Repository[]>[this.currentDir, this.installed, this.regular]
            .filter(repo => repo !== undefined)
        return ArrayUtils.removeRepetitions(nonNullrepositories, repo => repo.name)
    }

    describe(): string {
        let description = ''
        description += `currentDir: ${this.currentDir?.describe()}\n`
        description += `installed: ${this.installed?.describe()}\n`
        description += `regular: ${this.regular?.describe()}\n`
        return description
    }
}
