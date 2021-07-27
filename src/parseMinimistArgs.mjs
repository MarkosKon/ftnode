import path from "path";
import fs from "fs";

import { ALL } from "./globals.mjs";
import { printError } from "./printError.mjs";

const defaultOptions = {
  OUTPUT_DIRECTORY: path.resolve(process.cwd(), "output"),
  pyftsubset: {
    // OUTPUT_FILE: "?",
    FLAVORS: ["woff", "woff2"],
    UNICODES: "*",
    LAYOUT_FEATURES: "*",
  },
  "varLib.instancer": {},
};

/**
 * Takes a minimist string, splits it on comma,
 * and returns an array with the items trimmed.
 * If the first item of the splitted array is "*",
 * it returns the string "*".
 * @param {string} string Minimist string
 * @returns {string | string[]}
 */
const minimistStringToArray = (string) => {
  const array = string.split(",");

  if (array[0] === ALL) return ALL;
  return array.map((item) => item.trim());
};

/**
 *
 * @param {import('minimist').ParsedArgs} argv
 * @returns
 */
const parseMinimistArgs = (argv) => {
  const files = argv._.slice(1);

  try {
    // if (files.length > 1) throw new Error("I want at max one file for now.");
    if (files.length === 0) throw new Error("Please provide a file argument.");
  } catch (error) {
    printError(error);
    process.exit(1);
  }

  const { outputDirectory, flavors, layoutFeatures, unicodes } = argv;

  const parsedOutputDirectory = outputDirectory
    ? path.resolve(process.cwd(), outputDirectory)
    : defaultOptions.OUTPUT_DIRECTORY;
  if (!fs.existsSync(parsedOutputDirectory)) {
    fs.mkdirSync(parsedOutputDirectory);
  }

  const parsedFlavors = flavors
    ? minimistStringToArray(flavors)
    : defaultOptions.pyftsubset.FLAVORS;

  const parsedLayoutFeatures = layoutFeatures
    ? minimistStringToArray(layoutFeatures)
    : defaultOptions.pyftsubset.LAYOUT_FEATURES;

  const parsedUnicodes = unicodes
    ? minimistStringToArray(unicodes)
    : defaultOptions.pyftsubset.UNICODES;

  return {
    files,
    outputDirectory: parsedOutputDirectory,
    flavors: parsedFlavors,
    layoutFeatures: parsedLayoutFeatures,
    unicodes: parsedUnicodes,
  };
};

export { parseMinimistArgs };
