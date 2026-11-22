import { Input } from '@cliffy/prompt';

export class CliffyTestHelper {
  static inputResponse(value: string = '') {
    Input.inject(value)
  }
}
