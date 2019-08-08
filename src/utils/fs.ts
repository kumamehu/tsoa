import * as fs from 'fs';
import {promisify} from 'util';

export const fsExists = promisify(fs.exists);
export const fsMkDir = promisify(fs.mkdir);
export const fsWriteFile = promisify(fs.writeFile);
export const fsReadFile = promisify(fs.readFile);

function isPathAbsolute(path: string) {
  return /^(?:\/|[a-z]+:\/\/)/.test(path);
}
function getAbsolutePath(entryFile: string) {
  if (isPathAbsolute(entryFile)) {
    return entryFile;
  } else {
    return process.cwd() + '/' + entryFile;
  }
}
export const fsGetFilesFromPath = (entryFile: string): string[] => {
  const absPath = getAbsolutePath(entryFile);
  if (fs.lstatSync(absPath).isDirectory() ) {
    return fs.readdirSync(absPath).map(file => {
      return entryFile + file;
    });
  } else {
    return [entryFile];
  }
};
