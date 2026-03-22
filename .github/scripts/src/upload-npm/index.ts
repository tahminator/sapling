import { NPMClient } from "@tahminator/pipeline";

async function main() {
  await using npmClient = await NPMClient.create();

  await npmClient.publish();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
