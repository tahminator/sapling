import {
  GitHubClient,
  Utils,
  NPMClient,
  EnvClient,
  EnvClientStrategy,
  VersioningClient,
  VersioningStrategy,
} from "@tahminator/pipeline";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { sha, prId } = await yargs(hideBin(process.argv))
  .option("sha", {
    type: "string",
    demandOption: true,
  })
  .option("prId", {
    type: "number",
    demandOption: true,
  })
  .strict()
  .parse();

async function main() {
  const envClient = EnvClient.create(EnvClientStrategy.GIT_CRYPT);

  const { githubAppAppId, githubAppInstallationId, githubAppPrivateKeyB64 } =
    parseCiEnv(await envClient.readFromEnv(".env.ci"));

  const ghClient = await GitHubClient.createWithGithubAppToken({
    appId: githubAppAppId,
    installationId: githubAppInstallationId,
    privateKey: await Utils.decodeBase64EncodedString(githubAppPrivateKeyB64),
  });
  const npmClient = await NPMClient.create();
  const versioningClient = new VersioningClient(VersioningStrategy.JSTS);

  const shortSha = await getShortSha(sha);
  const lastTag = (await ghClient.getLatestTag()) ?? GitHubClient.BASE_VERSION;
  const betaVersion = `${lastTag}-beta.${shortSha}`;

  if (!Utils.SemVer.validate(betaVersion)) {
    throw new Error(`Generated invalid beta version: ${betaVersion}`);
  }

  await versioningClient.update(betaVersion);
  await npmClient.publish(false, true);

  console.log(`Uploaded ${betaVersion} to NPM.`);
  await ghClient.sendPrMessage({
    prId,
    owner: "tahminator",
    repository: "sapling",
    message: `
## Test Version Uploaded

Uploaded \`${betaVersion}\` to NPM. View version on NPM registry [here](https://www.npmjs.com/package/@tahminator/sapling/v/${betaVersion}).
`,
  });
}

async function getShortSha(sha: string) {
  const shortSha = sha.slice(0, 8).toString().trim();

  if (shortSha.length !== 8) {
    throw new Error("Could not parse git SHA");
  }

  return shortSha;
}

function parseCiEnv(ciEnv: Record<string, string>) {
  const githubAppAppId = (() => {
    const v = ciEnv["GITHUB_APP_APP_ID"];
    if (!v) {
      throw new Error("Missing GITHUB_APP_APP_ID from .env.ci");
    }
    return v;
  })();

  const githubAppInstallationId = (() => {
    const v = ciEnv["GITHUB_APP_INSTALLATION_ID"];
    if (!v) {
      throw new Error("Missing GITHUB_APP_INSTALLATION_ID from .env.ci");
    }
    return v;
  })();

  const githubAppPrivateKeyB64 = (() => {
    const v = ciEnv["GITHUB_APP_PRIVATE_KEY_B64"];
    if (!v) {
      throw new Error("Missing GITHUB_APP_PRIVATE_KEY_B64 from .env.ci");
    }
    return v;
  })();

  return { githubAppAppId, githubAppInstallationId, githubAppPrivateKeyB64 };
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
