'use strict';

var child_process = require('child_process');
var fs = require('fs');
var fse = require('fs-extra');
var glob = require('glob');
var path = require('path');
var yaml = require('js-yaml');

var src = 'src/azure-sdk-for-node';
var dest = 'docs-ref-autogen';
var doc = 'Documentation';
var configPath = 'node2docfx.json';
var tempConfigPath = '_node2docfx_temp.json';

function itemsByType(type) {
  return packageNames.filter(function (value) {
    return value.indexOf(type) > -1;
  });
}

function buildTocItems(keys, relativePathToRootFolder) {
  return keys.sort().map(function (key) {
    var packageToc = path.join(dest, key, 'toc.yml');
    var href, topicHref;
    if (fs.existsSync(packageToc)) {
      href = path.join(relativePathToRootFolder, key, 'toc.yml');
    } else {
      href = key + '/';
    }
    var packageIndex = path.join(dest, key, 'index.md');
    if (fs.existsSync(packageIndex)) {
      topicHref = path.join(relativePathToRootFolder, key, 'index.md');
    } else {
      topicHref = undefined;
    }
    return {
      name: key,
      href: href,
      topicHref: topicHref
    };
  });
}

function generatePackageDoc(packagePath, configPath, dest, resetInclude) {
  var config = fse.readJsonSync(configPath);
  var dir = path.dirname(packagePath);
  var packageName = fse.readJsonSync(packagePath).name;
  if (resetInclude) {
    config.source.include = [dir];
  }  
  config.package = packagePath;
  config.readme = path.join(dir, 'README.md');
  config.destination = path.join(dest, packageName);
  fse.writeJsonSync(tempConfigPath, config);
  child_process.execFileSync('node', ['node_modules/node2docfx/node2docfx.js', tempConfigPath]);
  console.log('Finish generating YAML files for ' + packageName);
}

// 1. prepare
fse.removeSync(dest);

// 2. generate yml and copy readme.md for azure.js
var rootConfig = fse.readJsonSync(configPath);
generatePackageDoc(rootConfig.package, configPath, rootConfig.destination, false);

// 3. generate yml and copy readme.md for all sub packages
var packageJsons = glob.sync(path.join(src, 'lib/**/package.json'));
packageJsons.forEach(function (packagePath) {
  generatePackageDoc(packagePath, configPath, dest, true);
});
fs.unlink(tempConfigPath);

// 4. copy documentation
fse.copySync(path.join(src, doc), path.join(dest, doc));
console.log('Finish copying documentation');
