// To run this script:
// deno run --allow-all hello_world.ts

// Import from local (Debugging and Development)
// import { WebUI } from "../../mod.ts";

// Import from deno.land (Production)
import { WebUI } from "@webui/deno-webui";

// deno-lint-ignore require-await
async function checkResult(e: WebUI.Event) {
  const a = e.arg.number(0); // First argument
  const b = e.arg.number(1); // Second argument
  const res = e.arg.number(2); // Third argument
  if ((a + b) == res) {
    return `Correct: ${a} + ${b} = ${res}`;
  } else {
    return `Incorrect: ${a} + ${b} != ${res}`;
  }
}

async function calculate(e: WebUI.Event) {
  // Run JavaScript and wait for response
  const getA = await e.window.scriptClient(e, "return get_A()").catch((error) => {
    console.error(`Error in the JavaScript: ${error}`);
    return "";
  });
  const getB = await e.window.scriptClient(e, "return get_B()").catch((error) => {
    console.error(`Error in the JavaScript: ${error}`);
    return "";
  });

  // Calculate
  const result = Number(getA) + Number(getB);

  // Run JavaScript without waiting for response (Quick)
  e.window.run(`set_result(${result});`);
}

// Create new window
const myWindow = new WebUI();

// Bind
myWindow.bind("calculate", calculate);
myWindow.bind("checkResult", checkResult);
myWindow.bind("exit", () => {
  // Close all windows and exit
  WebUI.exit();
});

// Show the window
myWindow.show("./install.html");

// Wait until all windows get closed
await WebUI.wait();

console.log("Thank you.");
