/**
 * Cliffy Test Helper Stub
 * Minimal implementation for testing without Cliffy
 */

export class CliffyTestHelper {
  static async mockInput(value: string): Promise<void> {
    // Mock implementation
    console.log(`Mocked input: ${value}`);
  }

  static restore(): void {
    // Mock implementation
    console.log("Input restored");
  }
}
