import { scriptName as applicationName } from "./globals.mjs";

class ApplicationError extends Error {}
class VarLibInstancerError extends Error {}
class PyftSubsetError extends Error {}

/**
 * @param {string} errorMessage
 * @param {string} errorName
 */
const errorToTemplate = (errorMessage, errorName) => {
  return `\n\n=== ${errorName} error.\n ${errorMessage}=== ${errorName} error end.\n`;
};

const printApplicationError = (error) => {
  console.error(
    `\n\n=== Application error (${applicationName}).\n ${error}=== Application error end.\n`
  );
};

const printVarLibInstancerError = (error) => {
  console.error(errorToTemplate(error, "varLib.instancer"));
};

const printPyftSubsetError = (error) => {
  console.error(errorToTemplate(error, "pyftsubset"));
};

const printError = (error) => {
  console.error(errorToTemplate(error, "Unknown"));
};

export {
  ApplicationError,
  VarLibInstancerError,
  PyftSubsetError,
  printApplicationError,
  printVarLibInstancerError,
  printPyftSubsetError,
  printError,
};
