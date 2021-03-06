"use strict";

var debug = require("debug")("pipes:fittings");
var path = require("path");
var util = require("util");
var assert = require("assert");

module.exports = function createFitting(pipes, fittingDef) {
  assert(
    fittingDef.name,
    util.format("name is required on fitting: %j", fittingDef)
  );

  // If there is pre-initialized fittings modules available, return these
  if (pipes.config.fittings && pipes.config.fittings[fittingDef.name]) {
    debug(
      "loaded user fitting %s from pre-initialized modules",
      fittingDef.name
    );
    return pipes.config.fittings[fittingDef.name](fittingDef, pipes);
  }

  if (!pipes.config.userFittingsDirs) {
    return null;
  }

  for (var i = 0; i < pipes.config.userFittingsDirs.length; i++) {
    var dir = pipes.config.userFittingsDirs[i];

    var modulePath = path.resolve(dir, fittingDef.name);
    try {
      var module = require(modulePath);
      if (module.default && typeof module.default === "function") {
        module = module.default;
      }

      var fitting = module(fittingDef, pipes);
      debug("loaded user fitting %s from %s", fittingDef.name, dir);
      return fitting;
    } catch (err) {
      if (err.code !== "MODULE_NOT_FOUND") {
        throw err;
      }
      var pathFromError = err.message.match(/'.*?'/)[0];
      // Check Node.js version to switch up error handler logic.
      var version = 0;
      try {
        version = Number.parseInt(
          process.version.substring(1, process.version.indexOf("."))
        );
      } catch (err) {
        debug(
          "could not correctly parse Node.js version string: %s",
          process.version
        );
      }
      var split;
      if (version > 10) {
        split = err.message.split("\n")[0].split(path.sep);
      } else {
        split = pathFromError.split(path.sep);
      }
      if (split[split.length - 1] === fittingDef.name + "'") {
        debug("no user fitting %s in %s", fittingDef.name, dir);
      } else {
        throw err;
      }
    }
  }

  if (fittingDef.type !== "user") {
    return null;
  }

  throw new Error(
    "user fitting %s not found in %s",
    fittingDef,
    pipes.config.userFittingsDirs
  );
};
