import * as log from "https://deno.land/std/log/mod.ts";

import Repository from './repository.ts'
import Package from '../package/package.ts'
import Config from '../config.ts';

import NullRepository from './null_repository.ts';
import GitRepository from './git_repository.ts';
import FileSystemRepository from './file_system_repository.ts';

export default class RepositoryFactory {
    constructor(private config: Config) {
    }

    create(repoURI: string): Repository {
        log.debug(`RepoFactory - create repo for uri - ${repoURI}`);

        if (!repoURI) {
            throw "RepoFactory with no repoURI";
        }

        if (repoURI.endsWith(".git")) {
            return new GitRepository(this.config, repoURI);
        }

        return new FileSystemRepository(this.config, repoURI);
    }
}
