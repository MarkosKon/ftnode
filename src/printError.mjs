const applicationName = argv._[0];

const printError = (error) => {
  console.error(`Application error (${applicationName}): ${error}`);
};

export { printError };
