const fs = require("fs");
const walkDir = require("klaw");
const stream = require("stream");
const path = require("path");
const getNextPagesFromBuildDir = require("../getNextPagesFromBuildDir");
const logger = require("../../utils/logger");
const PluginBuildDir = require("../../classes/PluginBuildDir");

jest.mock("fs");
jest.mock("klaw");
jest.mock("../../utils/logger");

describe("getNextPagesFromBuildDir", () => {
  let mockedStream;

  beforeEach(() => {
    mockedStream = new stream.Readable();
    mockedStream._read = () => {};
    walkDir.mockReturnValueOnce(mockedStream);
    fs.lstatSync.mockReturnValue({ isDirectory: () => false });
  });

  it("returns an empty array when there are no pages", () => {
    expect.assertions(1);

    const buildDir = path.normalize(`path/to/${PluginBuildDir.BUILD_DIR_NAME}`);

    const getPagesPromise = getNextPagesFromBuildDir(buildDir).then(
      nextPages => {
        expect(nextPages).toEqual([]);
      }
    );

    mockedStream.emit("end");

    return getPagesPromise;
  });

  it("returns two next pages", () => {
    expect.assertions(5);

    const buildDir = PluginBuildDir.BUILD_DIR_NAME;
    const resolvedBuildDir = path.resolve(buildDir);

    const promise = getNextPagesFromBuildDir(buildDir).then(nextPages => {
      expect(nextPages).toHaveLength(2);
      expect(nextPages[0].pageName).toEqual("index");
      expect(nextPages[0].pagePath).toEqual(path.join(buildDir, "index.js"));
      expect(nextPages[1].pageName).toEqual("about");
      expect(nextPages[1].pagePath).toEqual(path.join(buildDir, "about.js"));
    });

    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "index.js")
    });
    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "about.js")
    });
    mockedStream.emit("end");

    return promise;
  });

  it("returns next pages with page function config. overridden", () => {
    expect.assertions(2);

    const indexPageConfigOverride = { foo: "bar" };
    const aboutPageConfigOverride = { bar: "baz" };

    const pageConfig = {
      index: indexPageConfigOverride,
      about: aboutPageConfigOverride
    };

    const buildDir = path.normalize(
      `/path/to/${PluginBuildDir.BUILD_DIR_NAME}`
    );

    const promise = getNextPagesFromBuildDir(buildDir, { pageConfig }).then(
      nextPages => {
        expect(nextPages[0].serverlessFunctionOverrides).toEqual(
          indexPageConfigOverride
        );
        expect(nextPages[1].serverlessFunctionOverrides).toEqual(
          aboutPageConfigOverride
        );
      }
    );

    mockedStream.emit("data", { path: path.join(buildDir, "index.js") });
    mockedStream.emit("data", { path: path.join(buildDir, "about.js") });
    mockedStream.emit("end");

    return promise;
  });

  it("returns next pages with custom routes", () => {
    expect.assertions(4);

    const routes = [
      { src: "index", path: "home" },
      { src: "foo", path: "custom/foo" },
      { src: "foo/bar", path: "one/bar" },
      { src: "foo/bar", path: "two/bar" },
      { src: "baz/bar", path: "three/bar" }
    ];

    const buildDir = path.normalize(
      `/path/to/${PluginBuildDir.BUILD_DIR_NAME}`
    );

    const promise = getNextPagesFromBuildDir(buildDir, {
      pageConfig: undefined,
      routes
    }).then(nextPages => {
      const [indexPage, fooPage, fooBarPage, bazBarPage] = nextPages;

      expect(indexPage.routes).toEqual([{ path: "home" }]);
      expect(fooPage.routes).toEqual([{ path: "custom/foo" }]);
      expect(fooBarPage.routes).toEqual([
        { path: "one/bar" },
        { path: "two/bar" }
      ]);
      expect(bazBarPage.routes).toEqual([{ path: "three/bar" }]);
    });

    mockedStream.emit("data", { path: path.join(buildDir, "index.js") });
    mockedStream.emit("data", { path: path.join(buildDir, "foo.js") });
    mockedStream.emit("data", { path: path.join(buildDir, "foo/bar.js") });
    mockedStream.emit("data", { path: path.join(buildDir, "baz/bar.js") });
    mockedStream.emit("end");

    return promise;
  });

  it("passes asterisk pageConfig to all pages", () => {
    expect.assertions(2);

    const asteriskPageConfigOverride = { foo: "bar" };

    const pageConfig = {
      "*": asteriskPageConfigOverride
    };

    const buildDir = path.normalize(
      `/path/to/${PluginBuildDir.BUILD_DIR_NAME}`
    );

    const promise = getNextPagesFromBuildDir(buildDir, { pageConfig }).then(
      nextPages => {
        expect(nextPages[0].serverlessFunctionOverrides).toEqual(
          asteriskPageConfigOverride
        );
        expect(nextPages[1].serverlessFunctionOverrides).toEqual(
          asteriskPageConfigOverride
        );
      }
    );

    mockedStream.emit("data", { path: path.join(buildDir, "index.js") });
    mockedStream.emit("data", { path: path.join(buildDir, "about.js") });
    mockedStream.emit("end");

    return promise;
  });

  it("logs pages found", () => {
    expect.assertions(1);

    const buildDir = path.normalize("/path/to/build");

    const promise = getNextPagesFromBuildDir(buildDir).then(() => {
      expect(logger.log).toBeCalledWith(`Found 1 next page(s)`);
    });

    mockedStream.emit("data", { path: path.join(buildDir, "about.js") });
    mockedStream.emit("end");

    return promise;
  });

  it("skips _app and _document pages", () => {
    expect.assertions(2);

    const buildDir = path.normalize(`./${PluginBuildDir.BUILD_DIR_NAME}`);
    const resolvedBuildDir = path.resolve(buildDir);

    const promise = getNextPagesFromBuildDir(buildDir).then(nextPages => {
      expect(nextPages).toHaveLength(1);
      expect(nextPages[0].pageName).toEqual("_error");
    });

    mockedStream.emit("data", { path: path.join(resolvedBuildDir, "_app.js") });
    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "_document.js")
    });
    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "_error.js")
    });
    mockedStream.emit("end");

    return promise;
  });

  it("skips compatLayer file", () => {
    expect.assertions(2);

    const buildDir = path.normalize(
      `/path/to/${PluginBuildDir.BUILD_DIR_NAME}`
    );

    const promise = getNextPagesFromBuildDir(buildDir).then(nextPages => {
      expect(nextPages).toHaveLength(1);
      expect(nextPages[0].pageName).toEqual("home");
    });

    mockedStream.emit("data", { path: path.join(buildDir, "compatLayer.js") });
    mockedStream.emit("data", { path: path.join(buildDir, "home.js") });
    mockedStream.emit("end");

    return promise;
  });

  it("skips sourcemap files", () => {
    expect.assertions(2);

    const buildDir = path.normalize(
      `/path/to/${PluginBuildDir.BUILD_DIR_NAME}`
    );

    const promise = getNextPagesFromBuildDir(buildDir).then(nextPages => {
      expect(nextPages).toHaveLength(1);
      expect(nextPages[0].pageName).toEqual("home");
    });

    mockedStream.emit("data", { path: path.join(buildDir, "home.js.map") });
    mockedStream.emit("data", { path: path.join(buildDir, "home.js") });
    mockedStream.emit("end");

    return promise;
  });

  it("handles nested pages", () => {
    expect.assertions(5);

    const buildDir = path.normalize(`./${PluginBuildDir.BUILD_DIR_NAME}`);
    const resolvedBuildDir = path.resolve(buildDir);

    const promise = getNextPagesFromBuildDir(buildDir).then(nextPages => {
      expect(nextPages).toHaveLength(2);
      expect(nextPages[0].pageName).toEqual("hello-world");
      expect(nextPages[0].pagePath).toEqual(
        path.join(buildDir, "one", "hello-world.js")
      );
      expect(nextPages[1].pageName).toEqual("hello-world");
      expect(nextPages[1].pagePath).toEqual(
        path.join(buildDir, "one", "two", "hello-world.js")
      );
    });

    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "one", "hello-world.js")
    });
    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "one", "two", "hello-world.js")
    });
    mockedStream.emit("end");

    return promise;
  });

  it("skips page directories", () => {
    expect.assertions(1);

    const buildDir = path.normalize(`./${PluginBuildDir.BUILD_DIR_NAME}`);
    const resolvedBuildDir = path.resolve(buildDir);
    fs.lstatSync.mockReturnValue({ isDirectory: () => true });

    const promise = getNextPagesFromBuildDir(buildDir).then(nextPages => {
      expect(nextPages).toHaveLength(0);
    });

    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "one")
    });
    mockedStream.emit("data", {
      path: path.join(resolvedBuildDir, "one", "two")
    });
    mockedStream.emit("end");

    return promise;
  });
});
