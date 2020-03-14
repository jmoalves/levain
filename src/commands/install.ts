import {Command} from '@oclif/command'

export default class InstallCommand extends Command {
  static strict = false;

  async run() {
    const {argv} = this.parse(InstallCommand)
    this.log('install', argv)
  }
}
