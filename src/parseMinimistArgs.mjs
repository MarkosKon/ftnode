import path from "path";
import fs from "fs";

import { ALL } from "./globals.mjs";
import { ApplicationError, printApplicationError } from "./errors.mjs";

const defaultOptions = {
  OUTPUT_DIRECTORY: path.resolve(process.cwd(), "output"),
  REPLACE_NAME: true,
  PYFTSUBSET: true,
  VAR_LIB_INSTANCER: true,
  VERBOSE: true,
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
    if (files.length === 0)
      throw new ApplicationError("Please provide a file argument.\n");
  } catch (error) {
    if (error instanceof ApplicationError) printApplicationError(error);
    else printError(error);
    process.exit(1);
  }

  const {
    outputDirectory,
    verbose,
    "replace-name": replaceName,
    pyftsubset,
    varlibinstancer: varLibInstancer,
    flavors,
    layoutFeatures,
    unicodes,
    ...rest
  } = argv;

  // console.log({ rest });

  const parsedFiles = files.map((file) => {
    if (process.platform === "win32" && /^\/[a-z]\//.test(file)) {
      return file.replace(/\/([a-z])\//, (match, offset, string) => {
        const result = `${offset.toUpperCase()}:/`;
        return result;
      });
    } else return file;
  });

  const parsedOutputDirectory = outputDirectory
    ? path.resolve(process.cwd(), outputDirectory)
    : defaultOptions.OUTPUT_DIRECTORY;
  if (!fs.existsSync(parsedOutputDirectory)) {
    fs.mkdirSync(parsedOutputDirectory);
  }

  const parsedVerbose =
    verbose === undefined ? defaultOptions.VERBOSE : verbose;
  const parsedReplaceName =
    replaceName === undefined ? defaultOptions.REPLACE_NAME : replaceName;
  const parsedPyftsubset =
    pyftsubset === undefined ? defaultOptions.PYFTSUBSET : pyftsubset;
  const parsedVarLibInstancer =
    varLibInstancer === undefined
      ? defaultOptions.VAR_LIB_INSTANCER
      : varLibInstancer;

  const parsedFlavors = flavors
    ? minimistStringToArray(flavors)
    : defaultOptions.pyftsubset.FLAVORS;

  const parsedLayoutFeatures = layoutFeatures
    ? minimistStringToArray(layoutFeatures)
    : defaultOptions.pyftsubset.LAYOUT_FEATURES;

  const parsedUnicodes = unicodes
    ? minimistStringToArray(unicodes)
    : defaultOptions.pyftsubset.UNICODES;

  const parsedAxisLoc = Object.entries(rest)
    .filter(
      ([key, value]) =>
        key.length === 4 &&
        ![true, false, undefined, null, ""].includes(value) &&
        /^((drop)|([0-9]+)|([0-9]+\:[0-9]+))$/.test(value)
    )
    .map(([key, value]) => ({
      [key]: value,
    }));

  return {
    files: parsedFiles,
    verbose: parsedVerbose,
    pyftsubset: parsedPyftsubset,
    varLibInstancer: parsedVarLibInstancer,
    replaceName: parsedReplaceName,
    outputDirectory: parsedOutputDirectory,
    flavors: parsedFlavors,
    layoutFeatures: parsedLayoutFeatures,
    unicodes: parsedUnicodes,
    axisLoc: parsedAxisLoc,
  };
};

export { parseMinimistArgs };
