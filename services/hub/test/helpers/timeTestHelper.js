export function useFixedTime(isoString) {
  const fixedTime = new Date(isoString).getTime();
  if (!Number.isFinite(fixedTime)) {
    throw new Error("useFixedTime requires a valid date string");
  }
  const OriginalDate = globalThis.Date;

  class MockDate extends OriginalDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedTime);
      } else {
        super(...args);
      }
    }

    static now() {
      return fixedTime;
    }
  }

  MockDate.UTC = OriginalDate.UTC;
  MockDate.parse = OriginalDate.parse;

  globalThis.Date = MockDate;

  return () => {
    globalThis.Date = OriginalDate;
  };
}
