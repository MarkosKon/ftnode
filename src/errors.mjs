class ApplicationError extends Error {}
class PyftSubsetError extends Error {}

const applicationName = argv._[0];

const printApplicationError = (error) => {
  console.error(`Application error (${applicationName}) => ${error}`);
};

const printPyftSubsetError = (error) => {
  console.error(`pyftsubset error => ${error}`);
};

const printError = (error) => {
  console.error(`Unknown Error => ${error}`);
};

export {
  ApplicationError,
  PyftSubsetError,
  printApplicationError,
  printPyftSubsetError,
  printError,
};
