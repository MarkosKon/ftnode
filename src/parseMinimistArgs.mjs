import path from "path";
import fs from "fs";

import { ALL } from "./globals.mjs";
import {
  ApplicationError,
  printApplicationError,
  printError,
} from "./errors.mjs";

const defaultOptions = {
  OUTPUT_DIRECTORY: path.resolve(process.cwd(), "output"),
  REPLACE_NAME: true,
  PYFTSUBSET: true,
  VAR_LIB_INSTANCER: true,
  VERBOSE: true,
  // OUTPUT_FILE: "?",
  FLAVORS: ["woff", "woff2"],
  UNICODES: "*",
  LAYOUT_FEATURES: "*",
};

const getUserSettings = (config) => {
  if (config) {
    try {
      const configPath = path.resolve(config);
      const data = fs.readFileSync(configPath, (error) => {
        if (error) throw new ApplicationError(error);
      });

      const temp = JSON.parse(data);
      const {
        verbose,
        pyftsubset,
        varLibInstancer,
        replaceName,
        outputDirectory,
        flavors,
        layoutFeatures,
        unicodes,
        axisLoc,
        ...rest
      } = temp;

      if (rest && Object.keys(rest)) {
        printApplicationError(
          `The following keys from the configuration are ignored: ${Object.keys(
            rest
          ).join(", ")}. Type --help to see which fields you can use.\n`
        );
      }

      // console.log({ rest });
      return {
        verbose,
        pyftsubset,
        varLibInstancer,
        replaceName,
        outputDirectory,
        flavors,
        layoutFeatures,
        unicodes,
        axisLoc,
      };
    } catch (error) {
      if (error instanceof ApplicationError) printApplicationError(error);
      else printError(error);
      console.error(
        "=== Ignoring the config file you provided due to the error(s) above."
      );
    }
  }

  // Return this object on failure of when there is no config
  // to avoid property access errors.
  return {};
};

const toAxisLoc = (object) =>
  Object.entries(object)
    .filter(
      ([key, value]) =>
        key.length === 4 &&
        ![true, false, undefined, null, ""].includes(value) &&
        /^((drop)|([0-9]+)|([0-9]+\:[0-9]+))$/.test(value)
    )
    .map(([key, value]) => ({ [key]: value }));

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
    config,
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

  const userSettings = getUserSettings(config);
  // console.log({ userSettings });

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
    : userSettings.outputDirectory || defaultOptions.OUTPUT_DIRECTORY;
  if (!fs.existsSync(parsedOutputDirectory)) {
    fs.mkdirSync(parsedOutputDirectory);
  }

  const parsedVerbose =
    verbose === undefined
      ? userSettings.verbose === undefined
        ? defaultOptions.VERBOSE
        : userSettings.verbose
      : verbose;

  const parsedReplaceName =
    replaceName === undefined
      ? userSettings.replaceName === undefined
        ? defaultOptions.REPLACE_NAME
        : userSettings.replaceName
      : replaceName;

  const parsedPyftsubset =
    pyftsubset === undefined
      ? userSettings.pyftsubset === undefined
        ? defaultOptions.PYFTSUBSET
        : userSettings.pyftsubset
      : pyftsubset;

  const parsedVarLibInstancer =
    varLibInstancer === undefined
      ? userSettings.varLibInstancer === undefined
        ? defaultOptions.VAR_LIB_INSTANCER
        : userSettings.varLibInstancer
      : varLibInstancer;

  const parsedFlavors = flavors
    ? minimistStringToArray(flavors)
    : userSettings.flavors || defaultOptions.FLAVORS;

  const parsedLayoutFeatures = layoutFeatures
    ? minimistStringToArray(layoutFeatures)
    : userSettings.layoutFeatures || defaultOptions.LAYOUT_FEATURES;

  const parsedUnicodes = unicodes
    ? minimistStringToArray(unicodes)
    : userSettings.unicodes || defaultOptions.UNICODES;

  const parsedAxisLoc = toAxisLoc(
    userSettings.axisLoc
      .concat(toAxisLoc(rest))
      .reduce((res, next) => ({ ...res, ...next }), {})
  );

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
