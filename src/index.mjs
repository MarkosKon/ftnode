#!/usr/bin/env zx

import path from "path";
import ProgressBar from "progress";

import { parseMinimistArgs } from "./parseMinimistArgs.mjs";
import {
  ApplicationError,
  PyftSubsetError,
  printApplicationError,
  printPyftSubsetError,
  printError,
} from "./errors.mjs";
import { toPOSIXPath } from "./toPOSIXPath.mjs";

$.verbose = false;

const { files, outputDirectory, flavors, layoutFeatures, unicodes } =
  parseMinimistArgs(argv);

const bar = new ProgressBar(":bar :current/:total", {
  total: files.length * flavors.length,
});

// console.log({ files, outputDirectory, flavors, layoutFeatures, unicodes });

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
        --flavor=${flavor} \
        --layout-features=${layoutFeatures} \
        --unicodes=${unicodes}
      `;

      console.log(data.stdout);
      if (data.stderr) throw new PyftSubsetError(data.stderr);
    } catch (error) {
      if (error instanceof ApplicationError) printApplicationError(error);
      else if (error instanceof PyftSubsetError) printPyftSubsetError(error);
      else printError(error);
    } finally {
      bar.tick();
    }
  });
});
