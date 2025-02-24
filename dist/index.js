/******/ var __webpack_modules__ = ({

/***/ 188:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 203:
/***/ ((module) => {

module.exports = eval("require")("axios");


/***/ }),

/***/ 446:
/***/ ((module) => {

module.exports = eval("require")("spdx-license-list/full.js");


/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __nccwpck_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	var threw = true;
/******/ 	try {
/******/ 		__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 		threw = false;
/******/ 	} finally {
/******/ 		if(threw) delete __webpack_module_cache__[moduleId];
/******/ 	}
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__nccwpck_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__nccwpck_require__.o(definition, key) && !__nccwpck_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__nccwpck_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/compat */
/******/ 
/******/ if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = new URL('.', import.meta.url).pathname.slice(import.meta.url.match(/^file:\/\/\/\w:/) ? 1 : 0, -1) + "/";
/******/ 
/************************************************************************/
var __webpack_exports__ = {};

// EXPORTS
__nccwpck_require__.d(__webpack_exports__, {
  e: () => (/* binding */ run)
});

// EXTERNAL MODULE: ../../.nvm/versions/node/v22.14.0/lib/node_modules/@vercel/ncc/dist/ncc/@@notfound.js?@actions/core
var core = __nccwpck_require__(188);
// EXTERNAL MODULE: ../../.nvm/versions/node/v22.14.0/lib/node_modules/@vercel/ncc/dist/ncc/@@notfound.js?axios
var _notfoundaxios = __nccwpck_require__(203);
;// CONCATENATED MODULE: ./src/loadSboms.js



const axiosInstance = _notfoundaxios.create();
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

async function loadSboms(filename, repos = []) {
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

// EXTERNAL MODULE: ../../.nvm/versions/node/v22.14.0/lib/node_modules/@vercel/ncc/dist/ncc/@@notfound.js?spdx-license-list/full.js
var full = __nccwpck_require__(446);
;// CONCATENATED MODULE: ./src/MergedSbom.js



const SEPARATOR = /(\s+OR\s+|\s+AND\s+|\/)/gim;
const ONLY_A_SEPARATOR = /^(\s+OR\s+|\s+AND\s+|\/)$/gim;

class MergedSbom {
    mergedSbom = new Map();

    constructor(bomList) {
        bomList.forEach((bom) => {
            this.addBom(bom);
        });
    }

    getLicenseNames() {
        return [...this.mergedSbom.keys()];
    }

    getLicenseData(licenseName) {
        return this.mergedSbom.get(licenseName);
    }

    addBom(bom) {
        const noGithubActions = (e) => !/^pkg:githubaction/.test(e.referenceLocator);
        const someValidRefs = (p) => p.externalRefs.filter(noGithubActions).length > 0;

        const packages = bom.packages?.filter(someValidRefs) ?? [];
        packages.forEach((p) => {
            if (p.licenseConcluded === undefined) {
                core.warning(`No license concluded for ${p.name}@${p.versionInfo}`);
                return;
            }
            this.addSbomEntry(p.licenseConcluded, p.name, p.versionInfo);
        });
    }

    toString() {
        const licenseList = this.getLicenseList();
        return JSON.stringify(licenseList, null, 2);
    }

    getLicenseList() {
        const licenseNames = this.getLicenseNames();
        licenseNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

        const result = {};
        for (const licenseName of licenseNames) {
            const licenseData = this.getLicenseData(licenseName);
            if (!licenseData) {
                continue;
            }
            const { licenseText, packages: components } = licenseData;
            const sortedComponents = [...components].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
            result[licenseName] = { licenseText, components: sortedComponents };
        }
        return result;
    }

    addSbomEntry(licenseKey, name, version) {
        const cleansedLicenseKey = this.cleanLicenseKey(licenseKey);

        if (ONLY_A_SEPARATOR.test(cleansedLicenseKey)) {
            return;
        }

        if (this.isSingleLicenseKey(cleansedLicenseKey)) {
            this.addPackageToLicense(cleansedLicenseKey, name, version);
            return;
        }

        const licenseParts = this.splitLicenseString(cleansedLicenseKey);

        licenseParts.forEach((licensePart) => {
            if (licenseKey !== licensePart) {
                this.addSbomEntry(licensePart, name, version);
            }
        });
        return;
    }

    isSingleLicenseKey(licenseKey) {
        return !SEPARATOR.test(licenseKey);
    }

    addPackageToLicense(licenseKey, name, version) {
        const license = full[licenseKey];
        if (license === undefined) {
            core.warning(`License not found: '${licenseKey}' for ${name}@${version}`);
            return;
        }
        const content = this.mergedSbom.get(license.name) ?? {
            licenseName: license.name,
            licenseText: license.licenseText,
            packages: new Set(),
        };
        content.packages.add(`${name}@${version}`);
        this.mergedSbom.set(license.name, content);
    }

    cleanLicenseKey(licenseKey) {
        const cleansedLicenseKey = licenseKey
            .replace(/[()]+/gim, "")
            .replace(/^Apache2$/, "Apache-2.0")
            .replace(/^X-11$/, "X11")
            .replace(/^Public-Domain$/, "Public Domain");
        return cleansedLicenseKey;
    }

    splitLicenseString(licenseKey) {
        const licenseParts = licenseKey.split(SEPARATOR);
        return licenseParts;
    }
}

;// CONCATENATED MODULE: ./index.js




const filename = core.getInput("filename") ? core.getInput("filename") : "dependencies.sbom.json";
const reposString = core.getInput("repos");

const run = async () => {
    try {
        core.info("=== 1. Loading SBOMs ===");
        core.info("filename: " + filename);
        core.info("repoString: " + reposString);
        const repos = reposString !== "" ? reposString.split(";") : ["hpi-schul-cloud/tldraw-server:999.6.6"];
        const sboms = await loadSboms(filename, repos);

        core.info("=== 2. Generating merged SBOM ===");
        const mergedSbom = new MergedSbom(sboms);
        core.setOutput("json", mergedSbom.toString());
    } catch (error) {
        const message = "message" in error ? error.nessage : error;
        core.error(message);
    }
};

run();

var __webpack_exports__run = __webpack_exports__.e;
export { __webpack_exports__run as run };
