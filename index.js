import { getInput, info, setOutput } from "@actions/core";
import fs from "fs";
import loadSboms from "./src/loadSboms.js";
import MergedSbom from "./src/MergedSbom.js";

const filename = getInput("filename") ? getInput("filename") : "dependencies.sbom.json";
const outputFilename = getInput("output-filename") ? getInput("output-filename") : "summarized-licenses.json";
const reposString = getInput("repos");

export const run = async () => {
    try {
        info("=== 1. Loading SBOMs ===");
        info("filename: " + filename);
        info("repoString: " + reposString);
        const repos = reposString !== "" ? reposString.split(";") : ["hpi-schul-cloud/tldraw-server:999.6.6"];
        const sboms = await loadSboms(filename, repos);

        info("=== 2. Generating merged SBOM ===");
        const mergedSbom = new MergedSbom(sboms);
        if (mergedSbom.isEmpty()) {
            throw new Error("Merged SBOM is empty");
        }

        info("Writing merged SBOM to file: " + outputFilename);
        fs.writeFileSync(outputFilename, mergedSbom.toString());
        setOutput("output-filename", outputFilename);

        info("=== 3. Done ===");
    } catch (error) {
        error(error);
        process.exit(1);
    }
};

run();
