#!/usr/bin/env zx

import path from "path";
import ProgressBar from "progress";
import { hideBin } from "yargs/helpers";
const yargs = require("yargs/yargs");

import { enhanceYargs, defaultOptions } from "./enhanceYargs.mjs";
import {
  PyftSubsetError,
  VarLibInstancerError,
  printApplicationError,
  printPyftSubsetError,
  printVarLibInstancerError,
  printError,
} from "./errors.mjs";
import { scriptName } from "./globals.mjs";
import { toPOSIXPath } from "./toPOSIXPath.mjs";

$.verbose = false;

async function main(args) {
  const {
    files,
    verbose,
    pyftsubset,
    varLibInstancer,
    appendAxes,
    suffix,
    outputDirectory,
    flavors,
    layoutFeatures,
    unicodes,
    axisLoc,
    // ...rest
  } = enhanceYargs(args);

  if (verbose) {
    console.log({
      files,
      verbose,
      pyftsubset,
      varLibInstancer,
      appendAxes,
      suffix,
      outputDirectory,
      flavors,
      layoutFeatures,
      unicodes,
      axisLoc,
    });
  }

  const varLibInstancerBar = new ProgressBar(
    "varLib.instancer: :bar :current/:total files done.",
    { total: files.length }
  );
  const ttLibWoff2Bar = new ProgressBar(
    "ttLib.woff2: :bar :current/:total files compressed.",
    { total: files.length }
  );
  const pyftsubsetBar = new ProgressBar(
    "pyftsubset: :bar :current/:total files done.",
    { total: files.length * flavors.length }
  );

  const createVarLibInstancerFile = async (file) => {
    try {
      const baseName = path.basename(file, ".ttf");
      const fileName = !appendAxes
        ? `${baseName}.ttf`
        : `${baseName}[${axisLoc
            .map((axis) => Object.keys(axis)[0])
            .join(",")}].ttf`;
      const outputFile = toPOSIXPath(path.resolve(outputDirectory, fileName));

      const { stdout } = await $`
        fonttools varLib.instancer \
        --quiet \
        --output=${outputFile} \
        ${file} \
        ${axisLocToArgs};
      `
        // Want to throw a specific error (VarLibInstancerError).
        .catch((error) => {
          throw new VarLibInstancerError(error);
        });

      console.log(stdout);

      return outputFile;
    } catch (error) {
      if (error instanceof VarLibInstancerError)
        printVarLibInstancerError(error);
      else printError(error);
      return error;
    } finally {
      varLibInstancerBar.tick();
    }
  };

  const createPyftsubsetFile = (file) => async (flavor) => {
    try {
      const fileName = `${path.basename(file, ".ttf")}${
        suffix ? `-${suffix}` : ""
      }.${flavor}`;
      const outputFile = toPOSIXPath(path.resolve(outputDirectory, fileName));

      const { stdout } = await $`
        pyftsubset ${file} \
        --output-file=${outputFile} \
        --flavor=${flavor} \
        --layout-features=${
          Array.isArray(layoutFeatures)
            ? layoutFeatures.join(", ")
            : layoutFeatures
        } \
        --unicodes=${Array.isArray(unicodes) ? unicodes.join(", ") : unicodes}
      `
        // Want to throw a specific error (PyftSubsetError).
        .catch((error) => {
          throw new PyftSubsetError(error);
        });

      console.log(stdout);
    } catch (error) {
      if (error instanceof PyftSubsetError) printPyftSubsetError(error);
      else printError(error);
    } finally {
      pyftsubsetBar.tick();
    }
  };

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
        const varLibFile = await createVarLibInstancerFile(file);

        if (typeof varLibFile !== "string") return;

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

      const filesToDelete = await Promise.all(varLibInstancerPromises)
        .then((files) => files.filter(Boolean))
        .then((files) => {
          console.log("varLib.instancer completed the work.");

          return files;
        });

      Promise.all(pyftsubsetPromises).then(() => {
        console.log("pyftsubset completed the work.");

        if (filesToDelete.length > 0)
          $`rm ${filesToDelete}`
            .then(() =>
              console.log("Deleted the intermediate varLib.instancer files.")
            )
            .catch((error) => printError(error));
      });
    } else printApplicationError(messageNoAxes);
  } else if (varLibInstancer) {
    if (axisLoc.length > 0) {
      console.log("varLib.instancer started working.");

      varLibInstancerPromises = files.map(async (file) => {
        const varLibFile = await createVarLibInstancerFile(file);

        if (typeof varLibFile !== "string") return;

        try {
          const ttLibWoff2Data =
            await $`fonttools ttLib.woff2 compress ${varLibFile}`;

          if (ttLibWoff2Data.stdout) console.log(ttLibWoff2Data.stdout);

          await $`rm ${varLibFile}`;

          ttLibWoff2Bar.tick();
        } catch (error) {
          printApplicationError(error);
        }
      });

      Promise.all(varLibInstancerPromises).then(() => {
        console.log("varLib.instancer completed the work.");
      });
    } else printApplicationError(messageNoAxes);
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

        const lsResult = await $`ls -lh ${outputDirectorySafe} 2>/dev/null`;

        console.log(`ls -lh on ${outputDirectorySafe}\n${lsResult.stdout}`);
      } catch (error) {
        printError(error);
      }
    }
    console.log("Program exits.");
  });
}

yargs(hideBin(process.argv))
  .scriptName(scriptName)
  .command({
    command: `$0 [options] <args..>`,
    description:
      "A script that runs a list of font files through varLib.instancer and or pyftsubset. The mentioned tools are from the python package fonttools, and you need to install with pip install fonttools. Tip: For each boolean option, you can pass --no-option-name to disable it if it's enabled by default (e.g. --no-pyftsubset).",
    builder: (yargs) => {
      return yargs
        .positional("args", {
          describe:
            "The font files you want to transform. Tip: If the last option is an array, for example: --layout-features, --flavors, or --unicodes, you have to denote the end of options with --, just before the files. See the examples below.",
          type: "string",
        })
        .example(
          "$0 --wght 400:700 Literata[opsz,wght].ttf",
          "Limit the wght axis from 400 to 700, and create 2 files (woff, woff2) with all the layout features and characters."
        )
        .example("$0 --no-varlibinstancer *ttf", "Only subset files.")
        .example(
          "$0 --config settings.json .Piazzolla*ttf",
          "Use a config file in JSON format (recommended). You can pass arguments to override the config."
        )
        .example(
          "$0 --no-varlibinstancer --unicodes AA FF DD -- *ttf",
          "Only subset files. Because --unicodes is an array and the last option before the files, you have to denote the end of options with --. Alternatively, you can pass a non-array option last."
        )
        .epilog("Made by Markos Konstantopoulos https://markoskon.com.");
    },
    handler: (argv) => main(argv),
  })
  .option("V", {
    alias: "verbose",
    description: `Include extra info about the conversions. 
[default: ${defaultOptions.verbose}]`,
    type: "boolean",
  })
  .option("p", {
    alias: "pyftsubset",
    description: `If the program should use pyftsubset.
[default: ${defaultOptions.pyftsubset}]`,
    type: "boolean",
  })
  .option("i", {
    alias: "varlibinstancer",
    description: `If the program should use varLib.instancer.
You have to pass at least one variable axis (as a regular option) if the varlibinstancer option is true. For example, if you want to limit the variable font's weight axis, you can pass --wght 400:700. If you want to drop the opsz axis, you pass --opsz drop. If you want to instantiate the wdth axis to 125, pass --wdth 125. For custom axes, pass --CUSTOM 0:100 (uppercase). If the variable font supports an axis and you don't pass an option to limit it, varLib.instancer will keep that axis intact and will not limit it. If you don't use pyftsubset (--no-pyftsubset), the program will compress the font with ttLib.woff2. 
[default: ${defaultOptions.varLibInstancer}]`,
    type: "boolean",
  })
  .option("a", {
    alias: "append-axes",
    description: `If the program should append the variable fonts axes in the output filenames. For example, the filename.ttf will become filename[wght,opsz,CUSTOM].ttf. That is assuming you used the options --wght, --opsz, and --CUSTOM (the program does not analyze the font file for available axes).
[default: ${defaultOptions.appendAxes}]`,
    type: "boolean",
  })
  .option("s", {
    alias: "suffix",
    description: `A string to append to the filename if you use pyftsubset. For example, the filename.ttf with suffix 'english' will become filename-english.woff2.
[default: "${defaultOptions.suffix}"]`,
    type: "string",
  })
  .option("o", {
    alias: "output-directory",
    description: `The directory to store the fonts.
[default: ./${defaultOptions.outputDirectory}]`,
    type: "string",
  })
  .option("f", {
    alias: "flavors",
    description: `The file formats that pyftsubset will create. Type 'pyftsubset --help | grep -i flavor' for the available options. 
[default: ${defaultOptions.flavors}]`,
    type: "array",
  })
  .option("l", {
    alias: "layout-features",
    description: `The layout-features from pyftsubset.
[default: "${defaultOptions.layoutFeatures}"]`,
    type: "array",
  })
  .option("u", {
    alias: "unicodes",
    description: `The unicode characters from pyftsubset.
[default: "${defaultOptions.unicodes}"]`,
    type: "array",
  })
  .describe("help", "Show this help menu.")
  .describe("version", "Show version number.").argv;
