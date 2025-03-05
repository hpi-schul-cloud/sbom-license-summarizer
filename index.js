import core from "@actions/core";
import loadSboms from "./src/loadSboms.js";
import MergedSbom from "./src/MergedSbom.js";

const filename = core.getInput("filename") ? core.getInput("filename") : "dependencies.sbom.json";
const reposString = core.getInput("repos");

export const run = async () => {
    try {
        core.info("=== 1. Loading SBOMs ===");
        core.info("filename: " + filename);
        core.info("repoString: " + reposString);
        const repos = reposString !== "" ? reposString.split(";") : ["hpi-schul-cloud/tldraw-server:999.6.6"];
        const sboms = await loadSboms(filename, repos);

        core.info("=== 2. Generating merged SBOM ===");
        const mergedSbom = new MergedSbom(sboms);
        if (mergedSbom.isEmpty()) {
            throw new Error("Merged SBOM is empty");
        }
        core.setOutput("json", mergedSbom.toString());
    } catch (error) {
        core.error(error);
        process.exit(1);
    }
};

run();
