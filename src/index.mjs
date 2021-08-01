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
  pyftsubset,
  varLibInstancer,
  replaceName,
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

const createVarLibInstancerFile = (axisLocToArgs) => async (file) => {
  try {
    const baseName = path.basename(file, ".ttf");
    const fileName = !replaceName
      ? `${baseName}.ttf`
      : `${baseName}[${axisLoc
          .map((axis) => Object.keys(axis)[0])
          .join(",")}].ttf`;
    const outputFile = toPOSIXPath(path.resolve(outputDirectory, fileName));

    const varLibInstancerData = await $`
      fonttools varLib.instancer \
      --quiet \
      --output=${outputFile} \
      ${file} \
      ${axisLocToArgs};
    `
      // The try/catch above doesn't catch those errors.
      // To test, run ./src/index.mjs hh and uncomment the Promise.catch.
      .catch((error) => {
        throw new VarLibInstancerError(error);
      });

    console.log(varLibInstancerData.stdout);

    if (varLibInstancerData.stderr)
      throw new VarLibInstancerError(varLibInstancerData.stderr);

    return outputFile;
  } catch (error) {
    if (error instanceof VarLibInstancerError) printVarLibInstancerError(error);
    else printError(error);
    return error;
  } finally {
    varLibInstancerBar.tick();
  }
};

const createPyftsubsetFile = (file) => async (flavor) => {
  try {
    const fileName = `${path.basename(file, ".ttf")}.${flavor}`;
    const outputFile = toPOSIXPath(path.resolve(outputDirectory, fileName));

    const pyftsubsetData = await $`
      pyftsubset ${file} \
      --output-file=${outputFile} \
      --flavor=${flavor} \
      --layout-features=${layoutFeatures} \
      --unicodes=${unicodes}
    `
      // The try/catch above doesn't catch those errors.
      // To test, run ./src/index.mjs hh and uncomment the Promise.catch.
      .catch((error) => {
        throw new PyftSubsetError(error);
      });

    console.log(pyftsubsetData.stdout);

    if (pyftsubsetData.stderr) throw new PyftSubsetError(pyftsubsetData.stderr);
  } catch (error) {
    if (error instanceof ApplicationError) printApplicationError(error);
    else if (error instanceof PyftSubsetError) printPyftSubsetError(error);
    else printError(error);
  } finally {
    pyftsubsetBar.tick();
  }
};

if (verbose)
  console.log({
    files,
    verbose,
    pyftsubset,
    varLibInstancer,
    replaceName,
    outputDirectory,
    flavors,
    layoutFeatures,
    unicodes,
    axisLoc,
  });

let pyftsubsetPromises = [];
let varLibInstancerPromises = [];

const runBothPrograms = pyftsubset & varLibInstancer;
const runEitherProgram = pyftsubset || varLibInstancer;

const axisLocToArgs = axisLoc.map((axis) => {
  const [key, value] = Object.entries(axis)[0];
  return `${key}=${value}`;
});
const messageNoAxes = `Please provide axes for varLib.instancer.
For example: --wght 400:700, --wght drop, and or --opsz 20.
Type fontools varLib.instancer --help for more details.\n`;

if (runBothPrograms) {
  let firstTime = true;

  if (axisLoc.length > 0) {
    console.log("varLib.instancer started working.");

    varLibInstancerPromises = files.map(async (file) => {
      const varLibFile = await createVarLibInstancerFile(axisLocToArgs)(file);

      if (firstTime) {
        firstTime = false;
        console.log("\npyftsubset started working.");
      }

      const flavorPromises = flavors.map(createPyftsubsetFile(varLibFile));
      pyftsubsetPromises = pyftsubsetPromises.concat(flavorPromises);

      // Return the intermediate file only to delete it when
      // pyftsubset completes the work.
      return varLibFile;
    });

    const filesToDelete = await Promise.all(varLibInstancerPromises).then(
      (files) => {
        console.log("varLib.instancer completed the work.");

        return files;
      }
    );

    Promise.all(pyftsubsetPromises).then(() => {
      console.log("pyftsubset completed the work.");

      $`rm ${filesToDelete}`
        .then(() =>
          console.log("Deleted the intermediate varLib.instancer files.")
        )
        .catch((error) => printError(error));
    });
  } else printVarLibInstancerError(messageNoAxes);
} else if (varLibInstancer) {
  if (axisLoc.length > 0) {
    console.log("varLib.instancer started working.");

    varLibInstancerPromises = files.map(
      createVarLibInstancerFile(axisLocToArgs)
    );

    Promise.all(varLibInstancerPromises).then(() => {
      console.log("varLib.instancer completed the work.");
    });
  } else printVarLibInstancerError(messageNoAxes);
} else if (pyftsubset) {
  console.log("pyftsubset started working.");

  pyftsubsetPromises = files.reduce((all, file) => {
    const flavorPromises = flavors.map(createPyftsubsetFile(file));

    return all.concat(flavorPromises);
  }, []);

  Promise.all(pyftsubsetPromises).then(() => {
    console.log("pyftsubset completed the work.");
  });
} else {
  printApplicationError("Nothing to do, exiting.\n");
}

const allPromises = pyftsubsetPromises.concat(varLibInstancerPromises);
Promise.all(allPromises).then(async () => {
  if (verbose && runEitherProgram) {
    try {
      const outputDirectorySafe = toPOSIXPath(path.resolve(outputDirectory));
      const lsResult = await $`ls -lh ${outputDirectorySafe}`;

      console.log(`ls -lh on ${outputDirectorySafe}\n${lsResult.stdout}`);
    } catch (error) {
      printError(error);
    }
  }
  console.log("Program exits.");
});
