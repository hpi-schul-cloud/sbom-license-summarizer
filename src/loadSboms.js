import axios from "axios";
import core from "@actions/core";

const axiosInstance = axios.create();
axiosInstance.defaults.maxRedirects = 0; // Set to 0 to prevent automatic redirects
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response && [301, 302].includes(error.response.status)) {
            const redirectUrl = error.response.headers.location;
            const response = await axiosInstance.get(redirectUrl);
            return response;
        }
        return error;
    }
);

export default async function loadSboms(filename, repos = []) {
    const repoInfo = repos.map((line) => {
        if (/[^:]*:\d+\.\d+\.\d+$/.test(line) === false) {
            throw new Error(`Invalid repository version format: ${line}`);
        }
        const [name, version] = line.split(":");
        return { name, version };
    });
    const promises = repoInfo.map((repo) => {
        return loadSbom(repo.name, repo.version, filename);
    });
    const results = await Promise.allSettled(promises);
    const sboms = processResults(results);
    return sboms;
}

async function loadSbom(repository, repositoryVersion, filename) {
    const sbomUrl = `https://github.com/${repository}/releases/download/${repositoryVersion}/${filename}`;
    const response = await axiosInstance.get(sbomUrl);
    if (response.status !== 200) {
        core.error(`Failed to load SBOM for "${repository}@${repositoryVersion}" (status: ${response.status})`);
        return;
    }
    const sbom = {
        repository,
        repositoryVersion,
        ...response.data.sbom,
    };
    if (sbom) {
        core.info(
            `Loaded SBOM for ${repository}@${repositoryVersion} (containing ${
                sbom?.packages?.length ?? "---"
            } packages))`
        );
    }
    return sbom;
}

function processResults(results) {
    const sboms = [];
    for (const result of results) {
        if (result.status === "rejected") {
            core.warning(result.reason);
        } else {
            if (result.value !== undefined) {
                sboms.push(result.value);
            }
        }
    }
    return sboms;
}
