#!/usr/bin/env zx

import path from "path";

import { parseMinimistArgs } from "./parseMinimistArgs.mjs";
import { printError } from "./printError.mjs";
import { toPOSIXPath } from "./toPOSIXPath.mjs";

// $.verbose = false;

const { files, outputDirectory, flavors, layoutFeatures, unicodes } =
  parseMinimistArgs(argv);

console.log({ files, outputDirectory, flavors, layoutFeatures, unicodes });

files.forEach((file) => {
  flavors.forEach(async (flavor) => {
    try {
      const outputFile = toPOSIXPath(
        path.resolve(
          outputDirectory,
          `${path.basename(file, ".ttf")}.${flavor}`
        )
      );

      const data = await $`
        pyftsubset ${file} \
        --output-file=${outputFile} \
        --flavor=${flavors[0]} \
        --layout-features=${layoutFeatures} \
        --unicodes=${unicodes}
      `;
    } catch (error) {
      printError(error);
    }
  });
});
