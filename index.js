import core from "@actions/core";
import loadSboms from "./src/loadSboms.js";
import MergedSbom from "./src/MergedSbom.js";
import fs from "fs";

const filename = core.getInput("filename") ? core.getInput("filename") : "dependencies.sbom.json";
const outputFilename = core.getInput("filename") ? core.getInput("output-filename") : "summarized-licenses.json";
// const reposString = core.getInput("repos");
const reposString =
    "hpi-schul-cloud/schulcloud-server:33.3.0;hpi-schul-cloud/schulcloud-client:33.3.0;hpi-schul-cloud/nuxt-client:33.3.0;hpi-schul-cloud/superhero-dashboard:33.3.0;hpi-schul-cloud/schulcloud-calendar:33.3.0;hpi-schul-cloud/antivirus_check_service:33.3.0;hpi-schul-cloud/version-aggregator:33.3.0;hpi-schul-cloud/h5p-staticfiles-server:33.3.0;hpi-schul-cloud/tldraw-client:33.3.0;hpi-schul-cloud/tldraw-server:33.3.0";

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

        core.info("Writing merged SBOM to file: " + outputFilename);
        fs.writeFileSync(outputFilename, mergedSbom.toString());
        core.setOutput("output-filename", outputFilename);

        core.info("=== 3. Done ===");
    } catch (error) {
        core.error(error);
        process.exit(1);
    }
};

run();
