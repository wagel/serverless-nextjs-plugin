const logger = require("../logger");

describe("logger", () => {
  beforeEach(() => {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe("log", () => {
    it("should call console.log with message", () => {
      const message = "foo";

      logger.log(message);

      expect(console.log).toBeCalledWith(expect.stringContaining(message));
    });
  });

  describe("error", () => {
    it("should call console.error with message", () => {
      const message = "foo";

      logger.error(message);

      expect(console.error).toBeCalledWith(expect.stringContaining(message));
    });
  });
});
