import * as path from 'path';
import * as os from 'os';

// glob cannot use \\ as the separator in its patterns, so
// we need this function to switch \\ to /.
export function join(...segs : string[]) : string {
    let joinedPath = path.join(...segs);
    if (os.platform() === 'win32') {
        return joinedPath.replace('\\', '/');
    } else {
        return joinedPath;
    }
}
