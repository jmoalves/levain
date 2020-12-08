import Loader from "./loader.ts";
import Config from "./config.ts";

function getLoader() {
    const loader = new Loader(new Config([]))
    return loader;
}
