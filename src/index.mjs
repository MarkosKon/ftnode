#!/usr/bin/env zx

import path from "path";
import ProgressBar from "progress";

import { parseMinimistArgs } from "./parseMinimistArgs.mjs";
import {
  ApplicationError,
  PyftSubsetError,
  VarLibInstancerError,
  printApplicationError,
  printPyftSubsetError,
  printVarLibInstancerError,
  printError,
} from "./errors.mjs";
import { toPOSIXPath } from "./toPOSIXPath.mjs";

const {
  files,
  verbose,
  noReplaceName,
  outputDirectory,
  flavors,
  layoutFeatures,
  unicodes,
  axisLoc,
} = parseMinimistArgs(argv);

$.verbose = false;

const varLibInstancerBar = new ProgressBar(
  "varLib.instancer: :bar :current/:total files done.",
  {
    total: files.length,
  }
);
const pyftsubsetBar = new ProgressBar(
  "pyftsubset: :bar :current/:total files done.",
  {
    total: files.length * flavors.length,
  }
);

console.log({
  files,
  verbose,
  noReplaceName,
  outputDirectory,
  flavors,
  layoutFeatures,
  unicodes,
  axisLoc,
});

if (axisLoc.length > 0) {
  console.log("varLib.instancer started working.");

  const axisLocToArgs = axisLoc.map((axis) => {
    const [key, value] = Object.entries(axis)[0];
    return `${key}=${value}`;
  });

  files.forEach(async (file) => {
    try {
      const baseName = path.basename(file, ".ttf");
      const fileName = noReplaceName
        ? `${baseName}.ttf`
        : `${baseName}[${axisLoc
            .map((axis) => Object.keys(axis)[0])
            .join(",")}].ttf`;
      const outputFile = toPOSIXPath(path.resolve(outputDirectory, fileName));

      const varLibInstancerData = await $`
        fonttools varLib.instancer \
        --output=${outputFile} \
        ${file} \
        ${axisLocToArgs};
      `
        // The catch doesn't catch those errors.
        // Test with ./src/index.mjs hh
        .catch((error) => {
          throw new VarLibInstancerError(error);
        });

      console.log(varLibInstancerData.stdout);

      if (varLibInstancerData.stderr)
        throw new VarLibInstancerError(varLibInstancerData.stderr);
    } catch (error) {
      if (error instanceof VarLibInstancerError)
        printVarLibInstancerError(error);
      else printError(error);
    } finally {
      varLibInstancerBar.tick();
    }
  });
}

console.log("pyftsubset started working.");
files.forEach((file) => {
  flavors.forEach(async (flavor) => {
    try {
      const outputFile = toPOSIXPath(
        path.resolve(
          outputDirectory,
          `${path.basename(file, ".ttf")}.${flavor}`
        )
      );

      const pyftsubsetData = await $`
        pyftsubset ${file} \
        --output-file=${outputFile} \
        --flavor=${flavor} \
        --layout-features=${layoutFeatures} \
        --unicodes=${unicodes}
      `
        // The catch doesn't catch those errors.
        // Test with ./src/index.mjs hh
        .catch((error) => {
          throw new PyftSubsetError(error);
        });

      console.log(pyftsubsetData.stdout);

      if (pyftsubsetData.stderr)
        throw new PyftSubsetError(pyftsubsetData.stderr);
    } catch (error) {
      if (error instanceof ApplicationError) printApplicationError(error);
      else if (error instanceof PyftSubsetError) printPyftSubsetError(error);
      else printError(error);
    } finally {
      pyftsubsetBar.tick();
    }
  });
});

// TODO Needs promise.all. Replace forEach with maps.
// if (verbose) await $`ls -lh ${outputDirectory}`;
