import path from "path";

/**
 * @param {string} _path
 * @returns {string}
 */
export const toPOSIXPath = (_path) =>
  _path.split(path.sep).join(path.posix.sep);
