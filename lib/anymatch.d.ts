type AnymatchFn = (testString: string) => boolean;
type AnymatchPattern = string|RegExp|AnymatchFn;
type AnymatchMatcher = AnymatchPattern|AnymatchPattern[]
type AnymatchTester = {
  (testString: string|any[], returnIndex: true): number;
  (testString: string|any[]): boolean;
}

export function anymatch(pattern : string) : AnymatchMatcher;
export function anymatch(matchers : AnymatchMatcher, filePath : string) : boolean;
