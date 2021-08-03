import path from "path";
import fs from "fs";
import merge from "lodash.merge";

import { ApplicationError, printApplicationError } from "./errors.mjs";

const defaultOptions = {
  outputDirectory: "output",
  appendAxes: false,
  suffix: "",
  pyftsubset: true,
  varLibInstancer: true,
  verbose: true,
  flavors: ["woff2"],
  unicodes: "*",
  layoutFeatures: "*",
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

const enhanceYargs = ({
  args,
  _,
  config,
  verbose,
  pyftsubset,
  varlibinstancer,
  appendAxes,
  suffix,
  outputDirectory,
  flavors,
  layoutFeatures,
  unicodes,
  ...restArgs
}) => {
  const files = _.length > 0 ? _ : args.slice(1);

  try {
    if (files.length === 0)
      throw new ApplicationError(
        `Please provide a file argument. 
Maybe you have to use --, that marks the end of options, before the files?
For example: ftnode.mjs --unicodes AA FF -- ./file1.ttf ./file2.ttf\n`
      );
  } catch (error) {
    if (error instanceof ApplicationError) printApplicationError(error);
    else printError(error);
    process.exit(1);
  }

  const axisLoc = toAxisLoc(restArgs);

  // If we are on Windows and the paths are absolute starting with '/c/' or '/C/',
  // transform them to 'C:/'.
  const transformedFiles = files.map((file) => {
    if (process.platform === "win32" && /^\/[a-z]\//.test(file)) {
      return file.replace(/\/([a-z])\//, (match, offset, string) => {
        const result = `${offset.toUpperCase()}:/`;
        return result;
      });
    } else return file;
  });

  const parsedArgs = {
    files: transformedFiles,
    verbose,
    pyftsubset,
    varLibInstancer: varlibinstancer,
    appendAxes,
    suffix,
    outputDirectory,
    flavors,
    layoutFeatures,
    unicodes,
    axisLoc,
  };

  if (!config) {
    const finalSettings = merge({}, defaultOptions, parsedArgs);

    const resolvedOutputDirectory = path.resolve(finalSettings.outputDirectory);
    if (!fs.existsSync(resolvedOutputDirectory)) {
      fs.mkdirSync(resolvedOutputDirectory);
    }
    finalSettings.outputDirectory = resolvedOutputDirectory;

    return finalSettings;
  }

  const configPath = path.resolve(config);
  const data = fs.readFileSync(configPath, (error) => {
    if (error) throw new ApplicationError(error);
  });

  const {
    verbose: fileVerbose,
    pyftsubset: filePyftsubset,
    varLibInstancer: fileVarLibInstancer,
    appendAxes: fileAppendAxes,
    suffix: fileSuffix,
    outputDirectory: fileOutputDirectory,
    flavors: fileFlavors,
    layoutFeatures: fileLayoutFeatures,
    unicodes: fileUnicodes,
    axisLoc: fileAxisLoc,
    ...fileRest
  } = JSON.parse(data);

  if (fileRest && Object.keys(fileRest)) {
    printApplicationError(
      `The following keys from the configuration are ignored: ${Object.keys(
        fileRest
      ).join(", ")}. Type --help to see which fields you can use.\n`
    );
  }

  const finalSettings = merge(
    {},
    defaultOptions,
    {
      verbose: fileVerbose,
      pyftsubset: filePyftsubset,
      varLibInstancer: fileVarLibInstancer,
      appendAxes: fileAppendAxes,
      suffix: fileSuffix,
      outputDirectory: fileOutputDirectory,
      flavors: fileFlavors,
      layoutFeatures: fileLayoutFeatures,
      unicodes: fileUnicodes,
      axisLoc: fileAxisLoc,
    },
    parsedArgs
  );

  const resolvedOutputDirectory = path.resolve(finalSettings.outputDirectory);
  if (!fs.existsSync(resolvedOutputDirectory)) {
    fs.mkdirSync(resolvedOutputDirectory);
  }
  finalSettings.outputDirectory = resolvedOutputDirectory;

  return finalSettings;
};

export { enhanceYargs, defaultOptions };
