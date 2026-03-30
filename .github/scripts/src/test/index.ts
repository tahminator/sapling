import { SonarScannerClient, Utils } from "@tahminator/pipeline";
import { $ } from "bun";

import { exclusions } from "../../../../exclusions";

async function main() {
  const { sonarToken } = parseCiEnv(await Utils.getEnvVariables(["ci"]));

  const sonarClient = new SonarScannerClient({
    auth: {
      token: sonarToken,
    },
    scan: {
      additionalArgs: {
        "javascript.lcov.reportPaths": "coverage/lcov.info",
        exclusions: `${exclusions}`,
      },
      organization: "tahminator",
      sourceCodeDir: "src/",
      projectKey: "tahminator_sapling",
    },
    run: {
      runTestsCmd: $`pnpm run test`,
    },
  });

  await sonarClient.runTests();
  await sonarClient.uploadTestCoverage();
}

function parseCiEnv(ciEnv: Record<string, string>) {
  const sonarToken = (() => {
    const v = ciEnv["SONAR_TOKEN"];
    if (!v) {
      throw new Error("Missing SONAR_TOKEN from .env.ci");
    }
    return v;
  })();

  return { sonarToken };
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
