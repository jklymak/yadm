(function() {
  var BufferedProcess, CompositeDisposable, File, FortranProvider, fs, path, ref;

  ref = require('atom'), BufferedProcess = ref.BufferedProcess, CompositeDisposable = ref.CompositeDisposable, File = ref.File;

  fs = require('fs');

  path = require('path');

  module.exports = FortranProvider = (function() {
    FortranProvider.prototype.selector = '.source.fortran';

    FortranProvider.prototype.disableForSelector = '.source.fortran .comment, .source.fortran .string.quoted';

    FortranProvider.prototype.inclusionPriority = 1;

    FortranProvider.prototype.suggestionPriority = 2;

    FortranProvider.prototype.workspaceWatcher = void 0;

    FortranProvider.prototype.saveWatchers = void 0;

    FortranProvider.prototype.pythonPath = '';

    FortranProvider.prototype.pythonValid = -1;

    FortranProvider.prototype.parserPath = '';

    FortranProvider.prototype.minPrefix = 2;

    FortranProvider.prototype.preserveCase = true;

    FortranProvider.prototype.useSnippets = true;

    FortranProvider.prototype.firstRun = true;

    FortranProvider.prototype.indexReady = false;

    FortranProvider.prototype.globalUpToDate = true;

    FortranProvider.prototype.lastFile = '';

    FortranProvider.prototype.lastRow = -1;

    FortranProvider.prototype.fileObjInd = {};

    FortranProvider.prototype.fileObjLists = {};

    FortranProvider.prototype.globalObjInd = [];

    FortranProvider.prototype.projectObjList = {};

    FortranProvider.prototype.exclPaths = [];

    FortranProvider.prototype.modDirs = [];

    FortranProvider.prototype.modFiles = [];

    FortranProvider.prototype.fileIndexed = [];

    FortranProvider.prototype.descList = [];

    function FortranProvider() {
      this.pythonPath = atom.config.get('autocomplete-fortran.pythonPath');
      this.parserPath = path.join(__dirname, "..", "python", "parse_fortran.py");
      this.minPrefix = atom.config.get('autocomplete-fortran.minPrefix');
      this.preserveCase = atom.config.get('autocomplete-fortran.preserveCase');
      this.useSnippets = atom.config.get('autocomplete-fortran.useSnippets');
      this.saveWatchers = new CompositeDisposable;
      this.workspaceWatcher = atom.workspace.observeTextEditors((function(_this) {
        return function(editor) {
          return _this.setupEditors(editor);
        };
      })(this));
      this.checkPythonPath();
    }

    FortranProvider.prototype.destructor = function() {
      if (this.workspaceWatcher != null) {
        this.workspaceWatcher.dispose();
      }
      if (this.saveWatchers != null) {
        return this.saveWatchers.dispose();
      }
    };

    FortranProvider.prototype.checkPythonPath = function() {
      var args, bufferedProcess, command, errOutput, exit, stdOutput, stderr, stdout;
      command = this.pythonPath;
      stdOutput = "";
      errOutput = "";
      args = ["-V"];
      stdout = (function(_this) {
        return function(output) {
          return stdOutput = output;
        };
      })(this);
      stderr = (function(_this) {
        return function(output) {
          return errOutput = output;
        };
      })(this);
      exit = (function(_this) {
        return function(code) {
          if (_this.pythonValid === -1) {
            if (code !== 0) {
              _this.pythonValid = 0;
            }
            if (errOutput.indexOf('is not recognized as an internal or external') > -1) {
              _this.pythonValid = 0;
            }
          }
          if (_this.pythonValid === -1) {
            return _this.pythonValid = 1;
          } else {
            console.log('[ac-fortran] Python check failed');
            return console.log('[ac-fortran]', errOutput);
          }
        };
      })(this);
      bufferedProcess = new BufferedProcess({
        command: command,
        args: args,
        stdout: stdout,
        stderr: stderr,
        exit: exit
      });
      return bufferedProcess.onWillThrowError((function(_this) {
        return function(arg1) {
          var error, handle;
          error = arg1.error, handle = arg1.handle;
          if (error.code === 'ENOENT' && error.syscall.indexOf('spawn') === 0) {
            _this.pythonValid = 0;
            console.log('[ac-fortran] Python check failed');
            console.log('[ac-fortran]', error);
            return handle();
          } else {
            throw error;
          }
        };
      })(this));
    };

    FortranProvider.prototype.setupEditors = function(editor) {
      var ref1, scopeDesc;
      scopeDesc = editor.getRootScopeDescriptor().getScopesArray();
      if (((ref1 = scopeDesc[0]) != null ? ref1.indexOf('fortran') : void 0) > -1) {
        return this.saveWatchers.add(editor.onDidSave((function(_this) {
          return function(event) {
            return _this.fileUpdateSave(event);
          };
        })(this)));
      }
    };

    FortranProvider.prototype.fileUpdateSave = function(event) {
      var fileRef;
      if (this.pythonValid < 1) {
        if (this.pythonValid === 0) {
          this.addError("Python path error", "Disabling FORTRAN autocompletion");
          this.pythonValid = -2;
        }
        return;
      }
      fileRef = this.modFiles.indexOf(event.path);
      if (fileRef > -1) {
        return this.fileUpdate(event.path, true);
      }
    };

    FortranProvider.prototype.rebuildIndex = function() {
      this.indexReady = false;
      this.globalUpToDate = true;
      this.lastFile = '';
      this.lastRow = -1;
      this.modDirs = [];
      this.modFiles = [];
      this.fileIndexed = [];
      this.fileObjInd = {};
      this.fileObjLists = {};
      this.globalObjInd = [];
      this.projectObjList = {};
      this.descList = [];
      this.findModFiles();
      return this.filesUpdate(this.modFiles);
    };

    FortranProvider.prototype.checkIndex = function() {
      var isIndexed, j, len, ref1;
      if (this.indexReady) {
        return true;
      }
      ref1 = this.fileIndexed;
      for (j = 0, len = ref1.length; j < len; j++) {
        isIndexed = ref1[j];
        if (!isIndexed) {
          return false;
        }
      }
      this.indexReady = true;
      return true;
    };

    FortranProvider.prototype.addInfo = function(info, detail) {
      var ref1, ref2;
      if (detail == null) {
        detail = null;
      }
      if (detail != null) {
        return (ref1 = atom.notifications) != null ? ref1.addInfo("ac-fortran: " + info, {
          detail: detail
        }) : void 0;
      } else {
        return (ref2 = atom.notifications) != null ? ref2.addInfo("ac-fortran: " + info) : void 0;
      }
    };

    FortranProvider.prototype.addError = function(info, detail) {
      var ref1, ref2;
      if (detail == null) {
        detail = null;
      }
      if (detail != null) {
        return (ref1 = atom.notifications) != null ? ref1.addError("ac-fortran: " + info, {
          detail: detail
        }) : void 0;
      } else {
        return (ref2 = atom.notifications) != null ? ref2.addError("ac-fortran: " + info) : void 0;
      }
    };

    FortranProvider.prototype.notifyIndexPending = function(operation) {
      var ref1;
      return (ref1 = atom.notifications) != null ? ref1.addWarning("Could not complete operation: " + operation, {
        detail: 'Indexing pending',
        dismissable: true
      }) : void 0;
    };

    FortranProvider.prototype.findModFiles = function() {
      var configOptions, descInd, descIndex, descListing, descStr, exclPath, extIndex, extPaths, file, filePath, files, fixedRegex, freeRegex, indexPath, j, k, key, l, len, len1, len2, len3, len4, m, modDir, n, obj, objListing, projDir, projectDirs, ref1, ref2, ref3, ref4, ref5, relPath, result, results1, settingPath;
      freeRegex = /[a-z0-9_]*\.F(90|95|03|08)$/i;
      fixedRegex = /[a-z0-9_]*\.F(77|OR|PP)?$/i;
      projectDirs = atom.project.getPaths();
      this.modDirs = projectDirs;
      this.exclPaths = [];
      extPaths = [];
      for (j = 0, len = projectDirs.length; j < len; j++) {
        projDir = projectDirs[j];
        settingPath = path.join(projDir, '.ac_fortran');
        try {
          fs.accessSync(settingPath, fs.R_OK);
          fs.openSync(settingPath, 'r+');
          result = fs.readFileSync(settingPath);
          try {
            configOptions = JSON.parse(result);
          } catch (error1) {
            this.addError("Error reading project settings", "path " + settingPath);
            continue;
          }
          if ('excl_paths' in configOptions) {
            ref1 = configOptions['excl_paths'];
            for (k = 0, len1 = ref1.length; k < len1; k++) {
              exclPath = ref1[k];
              this.exclPaths.push(path.join(projDir, exclPath));
            }
          }
          if ('mod_dirs' in configOptions) {
            this.modDirs = [];
            ref2 = configOptions['mod_dirs'];
            for (l = 0, len2 = ref2.length; l < len2; l++) {
              modDir = ref2[l];
              this.modDirs.push(path.join(projDir, modDir));
            }
          }
          if ('ext_index' in configOptions) {
            ref3 = configOptions['ext_index'];
            for (m = 0, len3 = ref3.length; m < len3; m++) {
              relPath = ref3[m];
              indexPath = path.join(projDir, relPath);
              try {
                fs.accessSync(indexPath, fs.R_OK);
                fs.openSync(indexPath, 'r+');
                result = fs.readFileSync(indexPath);
                extIndex = JSON.parse(result);
                objListing = extIndex['obj'];
                descListing = extIndex['descs'];
                for (key in objListing) {
                  this.projectObjList[key] = objListing[key];
                  obj = this.projectObjList[key];
                  descInd = obj['desc'];
                  descStr = descListing[descInd];
                  if (descStr != null) {
                    descIndex = this.descList.indexOf(descStr);
                    if (descIndex === -1) {
                      this.descList.push(descStr);
                      obj['desc'] = this.descList.length - 1;
                    } else {
                      obj['desc'] = descIndex;
                    }
                  }
                }
                extPaths.push("" + relPath);
              } catch (error1) {
                this.addError("Cannot read external index file", "path " + relPath);
              }
            }
          }
        } catch (error1) {}
      }
      if (extPaths.length > 0) {
        this.addInfo("Added external index files", extPaths.join('\n'));
      }
      ref4 = this.modDirs;
      results1 = [];
      for (n = 0, len4 = ref4.length; n < len4; n++) {
        modDir = ref4[n];
        try {
          files = fs.readdirSync(modDir);
        } catch (error1) {
          if ((ref5 = atom.notifications) != null) {
            ref5.addWarning("Warning: During indexing specified module directory cannot be read", {
              detail: "Directory '" + modDir + "' will be skipped",
              dismissable: true
            });
          }
          continue;
        }
        results1.push((function() {
          var len5, o, results2;
          results2 = [];
          for (o = 0, len5 = files.length; o < len5; o++) {
            file = files[o];
            if (file.match(freeRegex) || file.match(fixedRegex)) {
              filePath = path.join(modDir, file);
              if (this.exclPaths.indexOf(filePath) === -1) {
                this.modFiles.push(filePath);
                results2.push(this.fileIndexed.push(false));
              } else {
                results2.push(void 0);
              }
            } else {
              results2.push(void 0);
            }
          }
          return results2;
        }).call(this));
      }
      return results1;
    };

    FortranProvider.prototype.filesUpdate = function(filePaths, closeScopes) {
      var command, filePath, fixedBatch, fixedFilePaths, fixedRegex, freeBatch, freeFilePaths, j, len;
      if (closeScopes == null) {
        closeScopes = false;
      }
      fixedRegex = /[a-z0-9_]*\.F(77|OR|PP)?$/i;
      command = this.pythonPath;
      fixedBatch = [];
      freeBatch = [];
      for (j = 0, len = filePaths.length; j < len; j++) {
        filePath = filePaths[j];
        if (filePath.match(fixedRegex)) {
          fixedBatch.push(filePath);
        } else {
          freeBatch.push(filePath);
        }
      }
      if (fixedBatch.length > 0) {
        fixedFilePaths = fixedBatch.join(',');
        new Promise((function(_this) {
          return function(resolve) {
            var allOutput, args, exit, fixedBufferedProcess, stderr, stdout;
            allOutput = [];
            args = [_this.parserPath, "--files=" + fixedFilePaths, "--fixed"];
            if (closeScopes) {
              args.push("--close_scopes");
            }
            stdout = function(output) {
              return allOutput.push(output);
            };
            stderr = function(output) {
              return console.log(output);
            };
            exit = function(code) {
              return resolve(_this.handleParserResults(allOutput.join(''), code, fixedBatch));
            };
            return fixedBufferedProcess = new BufferedProcess({
              command: command,
              args: args,
              stdout: stdout,
              stderr: stderr,
              exit: exit
            });
          };
        })(this));
      }
      if (freeBatch.length > 0) {
        freeFilePaths = freeBatch.join(',');
        return new Promise((function(_this) {
          return function(resolve) {
            var allOutput, args, exit, freeBufferedProcess, stderr, stdout;
            allOutput = [];
            args = [_this.parserPath, "--files=" + freeFilePaths];
            if (closeScopes) {
              args.push("--close_scopes");
            }
            stdout = function(output) {
              return allOutput.push(output);
            };
            stderr = function(output) {
              return console.log(output);
            };
            exit = function(code) {
              return resolve(_this.handleParserResults(allOutput.join(''), code, freeBatch));
            };
            return freeBufferedProcess = new BufferedProcess({
              command: command,
              args: args,
              stdout: stdout,
              stderr: stderr,
              exit: exit
            });
          };
        })(this));
      }
    };

    FortranProvider.prototype.fileUpdate = function(filePath, closeScopes) {
      var args, command, fixedRegex;
      if (closeScopes == null) {
        closeScopes = false;
      }
      fixedRegex = /[a-z0-9_]*\.F(77|OR|PP)?$/i;
      command = this.pythonPath;
      args = [this.parserPath, "--files=" + filePath];
      if (filePath.match(fixedRegex)) {
        args.push("--fixed");
      }
      if (closeScopes) {
        args.push("--close_scopes");
      }
      return new Promise((function(_this) {
        return function(resolve) {
          var allOutput, bufferedProcess, exit, stderr, stdout;
          allOutput = [];
          stdout = function(output) {
            return allOutput.push(output);
          };
          stderr = function(output) {
            return console.log(output);
          };
          exit = function(code) {
            return resolve(_this.handleParserResult(allOutput.join('\n'), code, filePath));
          };
          return bufferedProcess = new BufferedProcess({
            command: command,
            args: args,
            stdout: stdout,
            stderr: stderr,
            exit: exit
          });
        };
      })(this));
    };

    FortranProvider.prototype.localUpdate = function(editor, row) {
      var args, command, filePath, fixedRegex;
      fixedRegex = /[a-z0-9_]*\.F(77|OR|PP)?$/i;
      filePath = editor.getPath();
      command = this.pythonPath;
      args = [this.parserPath, "-s"];
      if (filePath.match(fixedRegex)) {
        args.push("--fixed");
      }
      return new Promise((function(_this) {
        return function(resolve) {
          var allOutput, bufferedProcess, exit, stderr, stdout;
          allOutput = [];
          stdout = function(output) {
            return allOutput.push(output);
          };
          stderr = function(output) {
            return console.log(output);
          };
          exit = function(code) {
            return resolve(_this.handleParserResult(allOutput.join('\n'), code, filePath));
          };
          bufferedProcess = new BufferedProcess({
            command: command,
            args: args,
            stdout: stdout,
            stderr: stderr,
            exit: exit
          });
          bufferedProcess.process.stdin.setEncoding = 'utf-8';
          bufferedProcess.process.stdin.write(editor.getText());
          return bufferedProcess.process.stdin.end();
        };
      })(this));
    };

    FortranProvider.prototype.handleParserResults = function(results, returnCode, filePaths) {
      var i, j, nFiles, nResults, ref1, results1, resultsSplit;
      if (returnCode === !0) {
        return;
      }
      resultsSplit = results.split('\n');
      nResults = resultsSplit.length - 1;
      nFiles = filePaths.length;
      if (nResults !== nFiles) {
        console.log('Error parsing files: # of files and results does not match', nResults, nFiles);
        return;
      }
      results1 = [];
      for (i = j = 0, ref1 = nFiles - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; i = 0 <= ref1 ? ++j : --j) {
        results1.push(this.handleParserResult(resultsSplit[i], returnCode, filePaths[i]));
      }
      return results1;
    };

    FortranProvider.prototype.handleParserResult = function(result, returnCode, filePath) {
      var descIndex, fileAST, fileRef, j, key, len, oldObjList, ref1, ref2;
      if (returnCode === !0) {
        return;
      }
      try {
        fileAST = JSON.parse(result);
      } catch (error1) {
        console.log('Error parsing file:', filePath);
        if ((ref1 = atom.notifications) != null) {
          ref1.addError("Error parsing file '" + filePath + "'", {
            detail: 'Script failed',
            dismissable: true
          });
        }
        return;
      }
      if ('error' in fileAST) {
        console.log('Error parsing file:', filePath);
        if ((ref2 = atom.notifications) != null) {
          ref2.addError("Error parsing file '" + filePath + "'", {
            detail: fileAST['error'],
            dismissable: true
          });
        }
        return;
      }
      fileRef = this.modFiles.indexOf(filePath);
      if (fileRef === -1) {
        this.modFiles.push(filePath);
        fileRef = this.modFiles.indexOf(filePath);
      }
      oldObjList = this.fileObjLists[filePath];
      this.fileObjLists[filePath] = [];
      for (key in fileAST['objs']) {
        this.fileObjLists[filePath].push(key);
        if (key in this.projectObjList) {
          this.resetInherit(this.projectObjList[key]);
        }
        this.projectObjList[key] = fileAST['objs'][key];
        this.projectObjList[key]['file'] = fileRef;
        if ('desc' in this.projectObjList[key]) {
          descIndex = this.descList.indexOf(this.projectObjList[key]['desc']);
          if (descIndex === -1) {
            this.descList.push(this.projectObjList[key]['desc']);
            this.projectObjList[key]['desc'] = this.descList.length - 1;
          } else {
            this.projectObjList[key]['desc'] = descIndex;
          }
        }
      }
      if (oldObjList != null) {
        for (j = 0, len = oldObjList.length; j < len; j++) {
          key = oldObjList[j];
          if (!(key in fileAST['objs'])) {
            delete this.projectObjList[key];
          }
        }
      }
      this.fileObjInd[filePath] = fileAST['scopes'];
      this.fileIndexed[fileRef] = true;
      return this.globalUpToDate = false;
    };

    FortranProvider.prototype.updateGlobalIndex = function() {
      var key, results1;
      if (this.globalUpToDate) {
        return;
      }
      this.globalObjInd = [];
      results1 = [];
      for (key in this.projectObjList) {
        if (!key.match(/::/)) {
          results1.push(this.globalObjInd.push(key));
        } else {
          results1.push(void 0);
        }
      }
      return results1;
    };

    FortranProvider.prototype.getSuggestions = function(arg1) {
      var activatedManually, bufferPosition, editor, prefix;
      editor = arg1.editor, bufferPosition = arg1.bufferPosition, prefix = arg1.prefix, activatedManually = arg1.activatedManually;
      if (this.pythonValid < 1) {
        if (this.pythonValid === 0) {
          this.addError("Python path error", "Disabling FORTRAN autocompletion");
          this.pythonValid = -2;
        }
        return;
      }
      if (this.exclPaths.indexOf(editor.getPath()) !== -1) {
        return [];
      }
      if (this.firstRun) {
        this.rebuildIndex();
        this.firstRun = false;
      }
      return new Promise((function(_this) {
        return function(resolve) {
          var parseBuffer;
          parseBuffer = false;
          if (_this.lastFile !== editor.getPath()) {
            parseBuffer = true;
            _this.lastFile = editor.getPath();
          }
          if (_this.lastRow !== bufferPosition.row) {
            parseBuffer = true;
            _this.lastRow = bufferPosition.row;
          }
          if (parseBuffer) {
            return _this.localUpdate(editor, bufferPosition.row).then(function() {
              return resolve(_this.filterSuggestions(prefix, editor, bufferPosition, activatedManually));
            });
          } else {
            return resolve(_this.filterSuggestions(prefix, editor, bufferPosition, activatedManually));
          }
        };
      })(this));
    };

    FortranProvider.prototype.filterSuggestions = function(prefix, editor, bufferPosition, activatedManually) {
      var completions, cursorScope, fullLine, j, k, key, len, len1, line, lineContext, lineScope, lineScopes, prefixLower, ref1, suggestions, useMod, usedMod;
      completions = [];
      suggestions = [];
      this.updateGlobalIndex();
      if (prefix) {
        prefixLower = prefix.toLowerCase();
        fullLine = this.getFullLine(editor, bufferPosition);
        lineContext = this.getLineContext(fullLine);
        if (lineContext === 2) {
          return completions;
        }
        if (lineContext === 1) {
          suggestions = this.getUseSuggestion(fullLine, prefixLower);
          return this.buildCompletionList(suggestions, lineContext);
        }
        lineScopes = this.getLineScopes(editor, bufferPosition);
        cursorScope = this.getClassScope(fullLine, lineScopes);
        if (cursorScope != null) {
          suggestions = this.addChildren(cursorScope, suggestions, prefixLower, []);
          return this.buildCompletionList(suggestions, lineContext);
        }
        if (prefix.length < this.minPrefix && !activatedManually) {
          return completions;
        }
        ref1 = this.globalObjInd;
        for (j = 0, len = ref1.length; j < len; j++) {
          key = ref1[j];
          if (!(this.projectObjList[key]['name'].toLowerCase().startsWith(prefixLower))) {
            continue;
          }
          if (this.projectObjList[key]['type'] === 1) {
            continue;
          }
          suggestions.push(key);
        }
        usedMod = {};
        for (k = 0, len1 = lineScopes.length; k < len1; k++) {
          lineScope = lineScopes[k];
          suggestions = this.addChildren(lineScope, suggestions, prefixLower, []);
          usedMod = this.getUseSearches(lineScope, usedMod, []);
        }
        for (useMod in usedMod) {
          suggestions = this.addPublicChildren(useMod, suggestions, prefixLower, usedMod[useMod]);
        }
        completions = this.buildCompletionList(suggestions, lineContext);
      } else {
        line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
        if (!line.endsWith('%')) {
          return completions;
        }
        fullLine = this.getFullLine(editor, bufferPosition);
        lineContext = this.getLineContext(fullLine);
        lineScopes = this.getLineScopes(editor, bufferPosition);
        cursorScope = this.getClassScope(fullLine, lineScopes);
        if (cursorScope != null) {
          suggestions = this.addChildren(cursorScope, suggestions, prefixLower, []);
          return this.buildCompletionList(suggestions, lineContext);
        }
      }
      return completions;
    };

    FortranProvider.prototype.saveIndex = function() {
      var desInd, descIndex, fd, j, k, key, len, len1, memList, member, newDescList, newDescs, obj, outObj, outputPath, projectDirs, removalList, type;
      if (this.firstRun) {
        this.rebuildIndex();
        this.firstRun = false;
      }
      if (!this.checkIndex()) {
        this.notifyIndexPending('Save Index');
        return;
      }
      removalList = [];
      for (key in this.projectObjList) {
        obj = this.projectObjList[key];
        type = obj['type'];
        if (type === 2 || type === 3) {
          memList = obj['mem'];
          if (memList != null) {
            for (j = 0, len = memList.length; j < len; j++) {
              member = memList[j];
              removalList.push(key + '::' + member.toLowerCase());
            }
          }
          delete obj['mem'];
        }
      }
      for (k = 0, len1 = removalList.length; k < len1; k++) {
        key = removalList[k];
        delete this.projectObjList[key];
      }
      newDescList = [];
      newDescs = [];
      for (key in this.projectObjList) {
        obj = this.projectObjList[key];
        if (obj['type'] === 7) {
          this.resolveInterface(key);
        }
        this.resolveIherited(key);
        delete obj['fdef'];
        delete obj['file'];
        delete obj['fbound'];
        desInd = obj['desc'];
        descIndex = newDescList.indexOf(desInd);
        if (descIndex === -1) {
          newDescList.push(desInd);
          newDescs.push(this.descList[desInd]);
          obj['desc'] = newDescList.length - 1;
        } else {
          obj['desc'] = descIndex;
        }
      }
      outObj = {
        'obj': this.projectObjList,
        'descs': newDescs
      };
      projectDirs = atom.project.getPaths();
      outputPath = path.join(projectDirs[0], 'ac_fortran_index.json');
      fd = fs.openSync(outputPath, 'w+');
      fs.writeSync(fd, JSON.stringify(outObj));
      fs.closeSync(fd);
      return this.rebuildIndex();
    };

    FortranProvider.prototype.goToDef = function(word, editor, bufferPosition) {
      var FQN, containingScope, cursorScope, fullLine, j, len, lineScope, lineScopes, wordLower;
      if (this.firstRun) {
        this.rebuildIndex();
        this.firstRun = false;
      }
      this.localUpdate(editor, bufferPosition.row);
      if (!this.checkIndex()) {
        this.notifyIndexPending('Go To Definition');
        return;
      }
      this.updateGlobalIndex();
      wordLower = word.toLowerCase();
      lineScopes = this.getLineScopes(editor, bufferPosition);
      fullLine = this.getFullLine(editor, bufferPosition);
      cursorScope = this.getClassScope(fullLine, lineScopes);
      if (cursorScope != null) {
        this.resolveIherited(cursorScope);
        containingScope = this.findInScope(cursorScope, wordLower);
        if (containingScope != null) {
          FQN = containingScope + "::" + wordLower;
          return this.getDefLoc(this.projectObjList[FQN]);
        }
      }
      if (this.globalObjInd.indexOf(wordLower) !== -1) {
        return this.getDefLoc(this.projectObjList[wordLower]);
      }
      for (j = 0, len = lineScopes.length; j < len; j++) {
        lineScope = lineScopes[j];
        containingScope = this.findInScope(lineScope, wordLower);
        if (containingScope != null) {
          FQN = containingScope + "::" + wordLower;
          return this.getDefLoc(this.projectObjList[FQN]);
        }
      }
      return null;
    };

    FortranProvider.prototype.getDefLoc = function(varObj) {
      var fileRef, lineRef;
      fileRef = varObj['file'];
      lineRef = null;
      if ('fdef' in varObj) {
        lineRef = varObj['fdef'];
      }
      if ('fbound' in varObj) {
        lineRef = varObj['fbound'][0];
      }
      if (lineRef != null) {
        return this.modFiles[fileRef] + ":" + lineRef.toString();
      }
      return null;
    };

    FortranProvider.prototype.getUseSuggestion = function(line, prefixLower) {
      var j, k, key, len, len1, matches, modName, ref1, ref2, suggestions, useRegex, wordRegex;
      useRegex = /^[ \t]*use[ \t]+/i;
      wordRegex = /[a-z0-9_]+/gi;
      suggestions = [];
      if (line.match(useRegex) != null) {
        if (prefixLower.match(wordRegex) == null) {
          prefixLower = "";
        }
        matches = line.match(wordRegex);
        if (matches.length === 2) {
          if (prefixLower != null) {
            ref1 = this.globalObjInd;
            for (j = 0, len = ref1.length; j < len; j++) {
              key = ref1[j];
              if (!(this.projectObjList[key]['name'].toLowerCase().startsWith(prefixLower))) {
                continue;
              }
              if (this.projectObjList[key]['type'] !== 1) {
                continue;
              }
              suggestions.push(key);
            }
          } else {
            ref2 = this.globalObjInd;
            for (k = 0, len1 = ref2.length; k < len1; k++) {
              key = ref2[k];
              suggestions.push(key);
            }
          }
        } else if (matches.length > 2) {
          modName = matches[1];
          suggestions = this.addPublicChildren(modName, suggestions, prefixLower, []);
        }
      }
      return suggestions;
    };

    FortranProvider.prototype.getFullLine = function(editor, bufferPosition) {
      var fixedCommRegex, fixedForm, fixedRegex, freeCommRegex, line, pLine, pRow;
      fixedRegex = /[a-z0-9_]*\.F(77|OR|PP)?$/i;
      fixedCommRegex = /^     [\S]/i;
      freeCommRegex = /&[ \t]*$/i;
      line = editor.getTextInRange([[bufferPosition.row, 0], bufferPosition]);
      fixedForm = false;
      if (editor.getPath().match(fixedRegex)) {
        fixedForm = true;
      }
      pRow = bufferPosition.row - 1;
      while (pRow >= 0) {
        pLine = editor.lineTextForBufferRow(pRow);
        pLine = pLine.split('!')[0];
        if (fixedForm) {
          if (!line.match(fixedCommRegex)) {
            break;
          }
        } else {
          if (!pLine.match(freeCommRegex)) {
            break;
          }
        }
        line = pLine.split('&')[0] + line;
        pRow = pRow - 1;
      }
      return line;
    };

    FortranProvider.prototype.getLineContext = function(line) {
      var callRegex, deallocRegex, nullifyRegex, subDefRegex, typeDefRegex, useRegex;
      useRegex = /^[ \t]*USE[ \t]/i;
      subDefRegex = /^[ \t]*(PURE|ELEMENTAL|RECURSIVE)*[ \t]*(MODULE|PROGRAM|SUBROUTINE|FUNCTION)[ \t]/i;
      typeDefRegex = /^[ \t]*(CLASS|TYPE)[ \t]*(IS)?[ \t]*\(/i;
      callRegex = /^[ \t]*CALL[ \t]+[a-z0-9_%]*$/i;
      deallocRegex = /^[ \t]*DEALLOCATE[ \t]*\(/i;
      nullifyRegex = /^[ \t]*NULLIFY[ \t]*\(/i;
      if (line.match(callRegex) != null) {
        return 4;
      }
      if (line.match(deallocRegex) != null) {
        return 5;
      }
      if (line.match(nullifyRegex) != null) {
        return 6;
      }
      if (line.match(useRegex) != null) {
        return 1;
      }
      if (line.match(useRegex) != null) {
        return 2;
      }
      if (line.match(typeDefRegex) != null) {
        return 3;
      }
      return 0;
    };

    FortranProvider.prototype.getLineScopes = function(editor, bufferPosition) {
      var filePath, j, key, len, ref1, scopes;
      filePath = editor.getPath();
      scopes = [];
      if (this.fileObjInd[filePath] == null) {
        return [];
      }
      ref1 = this.fileObjInd[filePath];
      for (j = 0, len = ref1.length; j < len; j++) {
        key = ref1[j];
        if (key in this.projectObjList) {
          if (bufferPosition.row + 1 < this.projectObjList[key]['fbound'][0]) {
            continue;
          }
          if (bufferPosition.row + 1 > this.projectObjList[key]['fbound'][1]) {
            continue;
          }
          scopes.push(key);
        }
      }
      return scopes;
    };

    FortranProvider.prototype.findInScope = function(scope, name) {
      var FQN, childKey, childName, childScopes, endOfScope, j, len, newScope, ref1, result, scopeObj, useMod, usedMod;
      FQN = scope + '::' + name;
      if (FQN in this.projectObjList) {
        return scope;
      }
      scopeObj = this.projectObjList[scope];
      if (scopeObj == null) {
        return null;
      }
      if ('in_mem' in scopeObj) {
        ref1 = scopeObj['in_mem'];
        for (j = 0, len = ref1.length; j < len; j++) {
          childKey = ref1[j];
          childScopes = childKey.split('::');
          childName = childScopes.pop();
          if (childName === name) {
            return childScopes.join('::');
          }
        }
      }
      result = null;
      usedMod = this.getUseSearches(scope, {}, []);
      for (useMod in usedMod) {
        if (usedMod[useMod].length > 0) {
          if (usedMod[useMod].indexOf(name) === -1) {
            continue;
          }
        }
        result = this.findInScope(useMod, name);
        if (result != null) {
          return result;
        }
      }
      if (result == null) {
        endOfScope = scope.lastIndexOf('::');
        if (endOfScope >= 0) {
          newScope = scope.substring(0, endOfScope);
          result = this.findInScope(newScope, name);
        }
      }
      return result;
    };

    FortranProvider.prototype.getVarType = function(varKey) {
      var i1, i2, typeDef, varDesc;
      varDesc = this.descList[this.projectObjList[varKey]['desc']];
      typeDef = varDesc.toLowerCase();
      i1 = typeDef.indexOf('(');
      i2 = typeDef.indexOf(')');
      return typeDef.substring(i1 + 1, i2);
    };

    FortranProvider.prototype.getClassScope = function(line, currScopes) {
      var containingScope, currChar, currScope, i, iLast, j, k, l, lastSpace, len, len1, lineCommBreak, lineCopy, lineNoParen, lineNoParen1, objBreakReg, parenCount, parenRepReg, prefixVar, ref1, searchScope, splitLine, typeDerefCheck, typeScope, varDefName, varKey, varName, varNameLower;
      typeDerefCheck = /%/i;
      objBreakReg = /[\/\-(.,+*<>=$:]/ig;
      parenRepReg = /\((.+)\)/ig;
      if (line.match(typeDerefCheck) == null) {
        return null;
      }
      parenCount = 0;
      lineCopy = line;
      for (i = j = 0, ref1 = lineCopy.length - 1; 0 <= ref1 ? j <= ref1 : j >= ref1; i = 0 <= ref1 ? ++j : --j) {
        currChar = lineCopy[lineCopy.length - i - 1];
        if (parenCount === 0 && currChar.match(objBreakReg)) {
          line = lineCopy.substring(lineCopy.length - i);
          break;
        }
        if (currChar === '(') {
          parenCount -= 1;
        }
        if (currChar === ')') {
          parenCount += 1;
        }
      }
      searchScope = null;
      if (line.match(typeDerefCheck) != null) {
        lineNoParen1 = line.replace(parenRepReg, '$');
        lineNoParen = lineNoParen1.replace(/\$%/i, '%');
        lineCommBreak = lineNoParen.replace(objBreakReg, ' ');
        lastSpace = lineCommBreak.lastIndexOf(' ');
        if (lastSpace >= 0) {
          lineNoParen = lineCommBreak.substring(lastSpace + 1);
        }
        splitLine = lineNoParen.split('%');
        prefixVar = splitLine.pop();
        for (k = 0, len = splitLine.length; k < len; k++) {
          varName = splitLine[k];
          varNameLower = varName.toLowerCase();
          if (searchScope != null) {
            this.resolveIherited(searchScope);
            containingScope = this.findInScope(searchScope, varNameLower);
            if (containingScope != null) {
              varKey = containingScope + "::" + varNameLower;
              if (this.projectObjList[varKey]['type'] === 6) {
                varDefName = this.getVarType(varKey);
                iLast = containingScope.lastIndexOf("::");
                typeScope = containingScope;
                if (iLast > -1) {
                  typeScope = containingScope.substring(0, iLast);
                }
                containingScope = this.findInScope(typeScope, varDefName);
                searchScope = containingScope + '::' + varDefName;
              }
            } else {
              return null;
            }
          } else {
            for (l = 0, len1 = currScopes.length; l < len1; l++) {
              currScope = currScopes[l];
              this.resolveIherited(currScope);
              containingScope = this.findInScope(currScope, varNameLower);
              if (containingScope != null) {
                varKey = containingScope + "::" + varNameLower;
                if (this.projectObjList[varKey]['type'] === 6) {
                  varDefName = this.getVarType(varKey);
                  iLast = containingScope.lastIndexOf("::");
                  typeScope = containingScope;
                  if (iLast > -1) {
                    typeScope = containingScope.substring(0, iLast);
                  }
                  containingScope = this.findInScope(typeScope, varDefName);
                  searchScope = containingScope + '::' + varDefName;
                }
                break;
              }
            }
          }
        }
      }
      return searchScope;
    };

    FortranProvider.prototype.addChildren = function(scope, completions, prefix, onlyList) {
      var child, childKey, childLower, children, j, k, len, len1, ref1, scopeObj;
      scopeObj = this.projectObjList[scope];
      if (scopeObj == null) {
        return completions;
      }
      children = scopeObj['mem'];
      if (children == null) {
        return;
      }
      for (j = 0, len = children.length; j < len; j++) {
        child = children[j];
        childLower = child.toLowerCase();
        if (prefix != null) {
          if (!childLower.startsWith(prefix)) {
            continue;
          }
        }
        if (onlyList.length > 0) {
          if (onlyList.indexOf(childLower) === -1) {
            continue;
          }
        }
        childKey = scope + '::' + childLower;
        if (childKey in this.projectObjList) {
          completions.push(childKey);
        }
      }
      this.resolveIherited(scope);
      if ('in_mem' in scopeObj) {
        ref1 = scopeObj['in_mem'];
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          childKey = ref1[k];
          completions.push(childKey);
        }
      }
      return completions;
    };

    FortranProvider.prototype.getUseSearches = function(scope, modDict, onlyList) {
      var j, k, len, len1, mergedOnly, only, useList, useMod;
      useList = this.projectObjList[scope]['use'];
      if (useList != null) {
        for (j = 0, len = useList.length; j < len; j++) {
          useMod = useList[j];
          if (useMod[0] in this.projectObjList) {
            mergedOnly = this.getOnlyOverlap(onlyList, useMod[1]);
            if (mergedOnly == null) {
              continue;
            }
            if (useMod[0] in modDict) {
              if (modDict[useMod[0]].length > 0) {
                if (mergedOnly.length === 0) {
                  modDict[useMod[0]] = [];
                } else {
                  for (k = 0, len1 = mergedOnly.length; k < len1; k++) {
                    only = mergedOnly[k];
                    if (modDict[useMod[0]].indexOf(only) === -1) {
                      modDict[useMod[0]].push(only);
                    }
                  }
                }
              }
            } else {
              modDict[useMod[0]] = mergedOnly;
            }
            modDict = this.getUseSearches(useMod[0], modDict, mergedOnly);
          }
        }
      }
      return modDict;
    };

    FortranProvider.prototype.getOnlyOverlap = function(currList, newList) {
      var elem, hasOverlap, j, len, mergeList;
      if (currList.length === 0) {
        return newList;
      }
      if (newList.length === 0) {
        return currList;
      }
      mergeList = [];
      hasOverlap = false;
      for (j = 0, len = newList.length; j < len; j++) {
        elem = newList[j];
        if (currList.indexOf(elem) !== -1) {
          mergeList.push(elem);
          hasOverlap = true;
        }
      }
      if (hasOverlap) {
        return mergeList;
      } else {
        return null;
      }
    };

    FortranProvider.prototype.addPublicChildren = function(scope, completions, prefix, onlyList) {
      var child, childKey, childLower, childObj, children, currVis, j, k, len, len1, ref1, scopeObj;
      scopeObj = this.projectObjList[scope];
      if (scopeObj == null) {
        return completions;
      }
      children = scopeObj['mem'];
      if (children == null) {
        return;
      }
      currVis = 1;
      if ('vis' in scopeObj) {
        currVis = parseInt(scopeObj['vis']);
      }
      for (j = 0, len = children.length; j < len; j++) {
        child = children[j];
        childLower = child.toLowerCase();
        if (prefix != null) {
          if (!childLower.startsWith(prefix)) {
            continue;
          }
        }
        if (onlyList.length > 0) {
          if (onlyList.indexOf(childLower) === -1) {
            continue;
          }
        }
        childKey = scope + '::' + childLower;
        childObj = this.projectObjList[childKey];
        if (childObj != null) {
          if ('vis' in childObj) {
            if (parseInt(childObj['vis']) + currVis < 0) {
              continue;
            }
          } else {
            if (currVis < 0) {
              continue;
            }
          }
          completions.push(childKey);
        }
      }
      this.resolveIherited(scope);
      if ('in_mem' in scopeObj) {
        ref1 = scopeObj['in_mem'];
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          childKey = ref1[k];
          completions.push(childKey);
        }
      }
      return completions;
    };

    FortranProvider.prototype.resolveInterface = function(intObjKey) {
      var children, copyKey, enclosingScope, intObj, j, len, resolvedChildren, resolvedScope;
      intObj = this.projectObjList[intObjKey];
      if ('res_mem' in intObj) {
        return;
      }
      enclosingScope = this.getEnclosingScope(intObjKey);
      if (enclosingScope == null) {
        return;
      }
      resolvedChildren = [];
      children = intObj['mem'];
      for (j = 0, len = children.length; j < len; j++) {
        copyKey = children[j];
        resolvedScope = this.findInScope(enclosingScope, copyKey);
        if (resolvedScope != null) {
          resolvedChildren.push(resolvedScope + "::" + copyKey);
        }
      }
      return intObj['res_mem'] = resolvedChildren;
    };

    FortranProvider.prototype.resolveLink = function(objKey) {
      var enclosingScope, linkKey, resolvedScope, varObj;
      varObj = this.projectObjList[objKey];
      linkKey = varObj['link'];
      if (linkKey == null) {
        return;
      }
      if ('res_link' in varObj) {
        return;
      }
      enclosingScope = this.getEnclosingScope(objKey);
      if (enclosingScope == null) {
        return;
      }
      resolvedScope = this.findInScope(enclosingScope, linkKey);
      if (resolvedScope != null) {
        return varObj['res_link'] = resolvedScope + "::" + linkKey;
      }
    };

    FortranProvider.prototype.addChild = function(scopeKey, childKey) {
      if ('chld' in this.projectObjList[scopeKey]) {
        if (this.projectObjList[scopeKey]['chld'].indexOf(childKey) === -1) {
          return this.projectObjList[scopeKey]['chld'].push(childKey);
        }
      } else {
        return this.projectObjList[scopeKey]['chld'] = [childKey];
      }
    };

    FortranProvider.prototype.resetInherit = function(classObj) {
      var childKey, childObj, results1;
      if ('in_mem' in classObj) {
        delete classObj['in_mem'];
      }
      if ('res_parent' in classObj) {
        delete classObj['res_parent'];
      }
      if ('chld' in classObj) {
        results1 = [];
        for (childKey in classObj['chld']) {
          childObj = this.projectObjList[childKey];
          if (childObj != null) {
            results1.push(this.resetInherit(childObj));
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }
    };

    FortranProvider.prototype.resolveIherited = function(scope) {
      var childKey, childName, classChildren, classObj, j, k, len, len1, parentKey, parentName, parentObj, ref1, ref2, resolvedScope;
      classObj = this.projectObjList[scope];
      if ('in_mem' in classObj) {
        return;
      }
      if (!('parent' in classObj)) {
        return;
      }
      if (!('res_parent' in classObj)) {
        parentName = classObj['parent'];
        resolvedScope = this.findInScope(scope, parentName);
        if (resolvedScope != null) {
          classObj['res_parent'] = resolvedScope + "::" + parentName;
        } else {
          return;
        }
      }
      parentKey = classObj['res_parent'];
      parentObj = this.projectObjList[parentKey];
      if (parentObj != null) {
        this.addChild(parentKey, scope);
        this.resolveIherited(parentKey);
        classObj['in_mem'] = [];
        if ('mem' in classObj) {
          classChildren = classObj['mem'];
        } else {
          classChildren = [];
        }
        if ('mem' in parentObj) {
          ref1 = parentObj['mem'];
          for (j = 0, len = ref1.length; j < len; j++) {
            childKey = ref1[j];
            if (classChildren.indexOf(childKey) === -1) {
              classObj['in_mem'].push(parentKey + '::' + childKey);
            }
          }
        }
        if ('in_mem' in parentObj) {
          ref2 = parentObj['in_mem'];
          for (k = 0, len1 = ref2.length; k < len1; k++) {
            childKey = ref2[k];
            childName = childKey.split('::').pop();
            if (classChildren.indexOf(childName) === -1) {
              classObj['in_mem'].push(childKey);
            }
          }
        }
      }
    };

    FortranProvider.prototype.getEnclosingScope = function(objKey) {
      var finalSep;
      finalSep = objKey.lastIndexOf('::');
      if (finalSep === -1) {
        return null;
      }
      return objKey.substring(0, finalSep);
    };

    FortranProvider.prototype.buildCompletionList = function(suggestions, contextFilter) {
      var compObj, completion, completions, copyKey, doPass, isAlloc, isPoint, isType, j, k, l, len, len1, len2, modList, ref1, repName, subTestRegex, suggestion, typRegex;
      if (contextFilter == null) {
        contextFilter = 0;
      }
      subTestRegex = /^(TYP|CLA|PRO)/i;
      typRegex = /^(TYP|CLA)/i;
      completions = [];
      for (j = 0, len = suggestions.length; j < len; j++) {
        suggestion = suggestions[j];
        compObj = this.projectObjList[suggestion];
        if (contextFilter === 3 && compObj['type'] !== 4) {
          continue;
        }
        if (contextFilter === 4) {
          if (compObj['type'] === 3 || compObj['type'] === 4) {
            continue;
          }
          if (compObj['type'] === 6) {
            if (this.descList[compObj['desc']].match(subTestRegex) == null) {
              continue;
            }
          }
        }
        if (contextFilter === 5 || contextFilter === 6) {
          if (compObj['type'] === 6) {
            modList = compObj['mods'];
            isPoint = false;
            isAlloc = false;
            if (modList != null) {
              isPoint = modList.indexOf(1) > -1;
              if (contextFilter === 5) {
                isAlloc = modList.indexOf(2) > -1;
              }
            }
            isType = this.descList[compObj['desc']].match(typRegex) != null;
            if (!(isPoint || isAlloc || isType)) {
              continue;
            }
          } else {
            continue;
          }
        }
        if (compObj['type'] === 7) {
          this.resolveInterface(suggestion);
          repName = compObj['name'];
          ref1 = compObj['res_mem'];
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            copyKey = ref1[k];
            completions.push(this.buildCompletion(this.projectObjList[copyKey], repName));
          }
        } else {
          if ('link' in compObj) {
            this.resolveLink(suggestion);
            repName = compObj['name'];
            copyKey = compObj['res_link'];
            if (copyKey != null) {
              doPass = this.testPass(compObj);
              completions.push(this.buildCompletion(this.projectObjList[copyKey], repName, doPass));
            } else {
              completions.push(this.buildCompletion(compObj));
            }
          } else {
            completions.push(this.buildCompletion(compObj));
          }
        }
      }
      if (contextFilter === 1) {
        for (l = 0, len2 = completions.length; l < len2; l++) {
          completion = completions[l];
          if ('snippet' in completion) {
            completion['snippet'] = completion['snippet'].split('(')[0];
          }
        }
      }
      return completions;
    };

    FortranProvider.prototype.buildCompletion = function(suggestion, repName, stripArg) {
      var arg, argList, argListFinal, argName, argStr, compObj, i, i1, j, len, mods, name;
      if (repName == null) {
        repName = null;
      }
      if (stripArg == null) {
        stripArg = false;
      }
      name = suggestion['name'];
      if (repName != null) {
        name = repName;
      }
      mods = this.getModifiers(suggestion);
      compObj = {};
      compObj.type = this.mapType(suggestion['type']);
      compObj.leftLabel = this.descList[suggestion['desc']];
      if (!this.preserveCase) {
        name = name.toLowerCase();
      }
      if ('args' in suggestion) {
        argStr = suggestion['args'];
        if (this.useSnippets) {
          argList = argStr.split(',');
          argListFinal = [];
          i = 0;
          for (j = 0, len = argList.length; j < len; j++) {
            arg = argList[j];
            i += 1;
            if (stripArg && i === 1) {
              continue;
            }
            i1 = arg.indexOf("=");
            if (i1 === -1) {
              argListFinal.push("${" + i + ":" + arg + "}");
            } else {
              argName = arg.substring(0, i1);
              argListFinal.push(argName + "=${" + i + ":" + argName + "}");
            }
          }
          argStr = argListFinal.join(',');
        } else {
          if (stripArg) {
            i1 = argStr.indexOf(',');
            if (i1 > -1) {
              argStr = argStr.substring(i1 + 1).trim();
            } else {
              argStr = '';
            }
          }
        }
        if (!this.preserveCase) {
          argStr = argStr.toLowerCase();
        }
        compObj.snippet = name + "(" + argStr + ")";
      } else {
        compObj.text = name;
      }
      if (mods !== '') {
        compObj.description = mods;
      }
      return compObj;
    };

    FortranProvider.prototype.mapType = function(typeInd) {
      switch (typeInd) {
        case 1:
          return 'module';
        case 2:
          return 'method';
        case 3:
          return 'function';
        case 4:
          return 'class';
        case 5:
          return 'interface';
        case 6:
          return 'variable';
      }
      return 'unknown';
    };

    FortranProvider.prototype.getModifiers = function(suggestion) {
      var dimStr, i, j, k, len, mod, modList, ndims, ref1, ref2;
      modList = [];
      if ('mods' in suggestion) {
        ref1 = suggestion['mods'];
        for (j = 0, len = ref1.length; j < len; j++) {
          mod = ref1[j];
          if (mod > 20) {
            ndims = mod - 20;
            dimStr = "DIMENSION(:";
            if (ndims > 1) {
              for (i = k = 2, ref2 = ndims; 2 <= ref2 ? k <= ref2 : k >= ref2; i = 2 <= ref2 ? ++k : --k) {
                dimStr += ",:";
              }
            }
            dimStr += ")";
            modList.push(dimStr);
            continue;
          }
          switch (mod) {
            case 1:
              modList.push("POINTER");
              break;
            case 2:
              modList.push("ALLOCATABLE");
          }
        }
      }
      return modList.join(', ');
    };

    FortranProvider.prototype.testPass = function(obj) {
      var ind;
      if ('mods' in obj) {
        ind = obj['mods'].indexOf(6);
        if (ind !== -1) {
          return false;
        }
      }
      return true;
    };

    return FortranProvider;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvYXV0b2NvbXBsZXRlLWZvcnRyYW4vbGliL2ZvcnRyYW4tcHJvdmlkZXIuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxNQUErQyxPQUFBLENBQVEsTUFBUixDQUEvQyxFQUFDLHFDQUFELEVBQWtCLDZDQUFsQixFQUF1Qzs7RUFDdkMsRUFBQSxHQUFLLE9BQUEsQ0FBUSxJQUFSOztFQUNMLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFFUCxNQUFNLENBQUMsT0FBUCxHQUNNOzhCQUNKLFFBQUEsR0FBVTs7OEJBQ1Ysa0JBQUEsR0FBb0I7OzhCQUNwQixpQkFBQSxHQUFtQjs7OEJBQ25CLGtCQUFBLEdBQW9COzs4QkFFcEIsZ0JBQUEsR0FBa0I7OzhCQUNsQixZQUFBLEdBQWM7OzhCQUVkLFVBQUEsR0FBWTs7OEJBQ1osV0FBQSxHQUFhLENBQUM7OzhCQUNkLFVBQUEsR0FBWTs7OEJBQ1osU0FBQSxHQUFXOzs4QkFDWCxZQUFBLEdBQWM7OzhCQUNkLFdBQUEsR0FBYTs7OEJBQ2IsUUFBQSxHQUFVOzs4QkFDVixVQUFBLEdBQVk7OzhCQUNaLGNBQUEsR0FBZ0I7OzhCQUNoQixRQUFBLEdBQVU7OzhCQUNWLE9BQUEsR0FBUyxDQUFDOzs4QkFFVixVQUFBLEdBQVk7OzhCQUNaLFlBQUEsR0FBYzs7OEJBQ2QsWUFBQSxHQUFjOzs4QkFDZCxjQUFBLEdBQWdCOzs4QkFDaEIsU0FBQSxHQUFXOzs4QkFDWCxPQUFBLEdBQVM7OzhCQUNULFFBQUEsR0FBVTs7OEJBQ1YsV0FBQSxHQUFhOzs4QkFDYixRQUFBLEdBQVU7O0lBRUcseUJBQUE7TUFDWCxJQUFDLENBQUEsVUFBRCxHQUFjLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBWixDQUFnQixpQ0FBaEI7TUFDZCxJQUFDLENBQUEsVUFBRCxHQUFjLElBQUksQ0FBQyxJ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e0J1ZmZlcmVkUHJvY2VzcywgQ29tcG9zaXRlRGlzcG9zYWJsZSwgRmlsZX0gPSByZXF1aXJlICdhdG9tJ1xuZnMgPSByZXF1aXJlKCdmcycpXG5wYXRoID0gcmVxdWlyZSgncGF0aCcpXG5cbm1vZHVsZS5leHBvcnRzID1cbmNsYXNzIEZvcnRyYW5Qcm92aWRlclxuICBzZWxlY3RvcjogJy5zb3VyY2UuZm9ydHJhbidcbiAgZGlzYWJsZUZvclNlbGVjdG9yOiAnLnNvdXJjZS5mb3J0cmFuIC5jb21tZW50LCAuc291cmNlLmZvcnRyYW4gLnN0cmluZy5xdW90ZWQnXG4gIGluY2x1c2lvblByaW9yaXR5OiAxXG4gIHN1Z2dlc3Rpb25Qcmlvcml0eTogMlxuXG4gIHdvcmtzcGFjZVdhdGNoZXI6IHVuZGVmaW5lZFxuICBzYXZlV2F0Y2hlcnM6IHVuZGVmaW5lZFxuXG4gIHB5dGhvblBhdGg6ICcnXG4gIHB5dGhvblZhbGlkOiAtMVxuICBwYXJzZXJQYXRoOiAnJ1xuICBtaW5QcmVmaXg6IDJcbiAgcHJlc2VydmVDYXNlOiB0cnVlXG4gIHVzZVNuaXBwZXRzOiB0cnVlXG4gIGZpcnN0UnVuOiB0cnVlXG4gIGluZGV4UmVhZHk6IGZhbHNlXG4gIGdsb2JhbFVwVG9EYXRlOiB0cnVlXG4gIGxhc3RGaWxlOiAnJ1xuICBsYXN0Um93OiAtMVxuXG4gIGZpbGVPYmpJbmQ6IHsgfVxuICBmaWxlT2JqTGlzdHM6IHsgfVxuICBnbG9iYWxPYmpJbmQ6IFtdXG4gIHByb2plY3RPYmpMaXN0OiB7IH1cbiAgZXhjbFBhdGhzOiBbXVxuICBtb2REaXJzOiBbXVxuICBtb2RGaWxlczogW11cbiAgZmlsZUluZGV4ZWQ6IFtdXG4gIGRlc2NMaXN0OiBbXVxuXG4gIGNvbnN0cnVjdG9yOiAoKSAtPlxuICAgIEBweXRob25QYXRoID0gYXRvbS5jb25maWcuZ2V0KCdhdXRvY29tcGxldGUtZm9ydHJhbi5weXRob25QYXRoJylcbiAgICBAcGFyc2VyUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsIFwiLi5cIiwgXCJweXRob25cIiwgXCJwYXJzZV9mb3J0cmFuLnB5XCIpXG4gICAgQG1pblByZWZpeCA9IGF0b20uY29uZmlnLmdldCgnYXV0b2NvbXBsZXRlLWZvcnRyYW4ubWluUHJlZml4JylcbiAgICBAcHJlc2VydmVDYXNlID0gYXRvbS5jb25maWcuZ2V0KCdhdXRvY29tcGxldGUtZm9ydHJhbi5wcmVzZXJ2ZUNhc2UnKVxuICAgIEB1c2VTbmlwcGV0cyA9IGF0b20uY29uZmlnLmdldCgnYXV0b2NvbXBsZXRlLWZvcnRyYW4udXNlU25pcHBldHMnKVxuICAgIEBzYXZlV2F0Y2hlcnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIEB3b3Jrc3BhY2VXYXRjaGVyID0gYXRvbS53b3Jrc3BhY2Uub2JzZXJ2ZVRleHRFZGl0b3JzKChlZGl0b3IpID0+IEBzZXR1cEVkaXRvcnMoZWRpdG9yKSlcbiAgICBAY2hlY2tQeXRob25QYXRoKClcblxuICBkZXN0cnVjdG9yOiAoKSAtPlxuICAgIGlmIEB3b3Jrc3BhY2VXYXRjaGVyP1xuICAgICAgQHdvcmtzcGFjZVdhdGNoZXIuZGlzcG9zZSgpXG4gICAgaWYgQHNhdmVXYXRjaGVycz9cbiAgICAgIEBzYXZlV2F0Y2hlcnMuZGlzcG9zZSgpXG5cbiAgY2hlY2tQeXRob25QYXRoOiAoKSAtPlxuICAgIGNvbW1hbmQgPSBAcHl0aG9uUGF0aFxuICAgIHN0ZE91dHB1dCA9IFwiXCJcbiAgICBlcnJPdXRwdXQgPSBcIlwiXG4gICAgYXJncyA9IFtcIi1WXCJdXG4gICAgc3Rkb3V0ID0gKG91dHB1dCkgPT4gc3RkT3V0cHV0ID0gb3V0cHV0XG4gICAgc3RkZXJyID0gKG91dHB1dCkgPT4gZXJyT3V0cHV0ID0gb3V0cHV0XG4gICAgZXhpdCA9IChjb2RlKSA9PlxuICAgICAgaWYgQHB5dGhvblZhbGlkID09IC0xXG4gICAgICAgIHVubGVzcyBjb2RlID09IDBcbiAgICAgICAgICBAcHl0aG9uVmFsaWQgPSAwXG4gICAgICAgIGlmIGVyck91dHB1dC5pbmRleE9mKCdpcyBub3QgcmVjb2duaXplZCBhcyBhbiBpbnRlcm5hbCBvciBleHRlcm5hbCcpID4gLTFcbiAgICAgICAgICBAcHl0aG9uVmFsaWQgPSAwXG4gICAgICBpZiBAcHl0aG9uVmFsaWQgPT0gLTFcbiAgICAgICAgQHB5dGhvblZhbGlkID0gMVxuICAgICAgZWxzZVxuICAgICAgICBjb25zb2xlLmxvZyAnW2FjLWZvcnRyYW5dIFB5dGhvbiBjaGVjayBmYWlsZWQnXG4gICAgICAgIGNvbnNvbGUubG9nICdbYWMtZm9ydHJhbl0nLGVyck91dHB1dFxuICAgIGJ1ZmZlcmVkUHJvY2VzcyA9IG5ldyBCdWZmZXJlZFByb2Nlc3Moe2NvbW1hbmQsIGFyZ3MsIHN0ZG91dCwgc3RkZXJyLCBleGl0fSlcbiAgICBidWZmZXJlZFByb2Nlc3Mub25XaWxsVGhyb3dFcnJvciAoe2Vycm9yLCBoYW5kbGV9KSA9PlxuICAgICAgaWYgZXJyb3IuY29kZSBpcyAnRU5PRU5UJyBhbmQgZXJyb3Iuc3lzY2FsbC5pbmRleE9mKCdzcGF3bicpIGlzIDBcbiAgICAgICAgQHB5dGhvblZhbGlkID0gMFxuICAgICAgICBjb25zb2xlLmxvZyAnW2FjLWZvcnRyYW5dIFB5dGhvbiBjaGVjayBmYWlsZWQnXG4gICAgICAgIGNvbnNvbGUubG9nICdbYWMtZm9ydHJhbl0nLGVycm9yXG4gICAgICAgIGhhbmRsZSgpXG4gICAgICBlbHNlXG4gICAgICAgIHRocm93IGVycm9yXG5cbiAgc2V0dXBFZGl0b3JzOiAoZWRpdG9yKSAtPlxuICAgIHNjb3BlRGVzYyA9IGVkaXRvci5nZXRSb290U2NvcGVEZXNjcmlwdG9yKCkuZ2V0U2NvcGVzQXJyYXkoKVxuICAgIGlmIHNjb3BlRGVzY1swXT8uaW5kZXhPZignZm9ydHJhbicpID4gLTFcbiAgICAgIEBzYXZlV2F0Y2hlcnMuYWRkIGVkaXRvci5vbkRpZFNhdmUoKGV2ZW50KSA9PiBAZmlsZVVwZGF0ZVNhdmUoZXZlbnQpKVxuXG4gIGZpbGVVcGRhdGVTYXZlOiAoZXZlbnQpIC0+XG4gICAgaWYgQHB5dGhvblZhbGlkIDwgMVxuICAgICAgaWYgQHB5dGhvblZhbGlkID09IDBcbiAgICAgICAgQGFkZEVycm9yKFwiUHl0aG9uIHBhdGggZXJyb3JcIiwgXCJEaXNhYmxpbmcgRk9SVFJBTiBhdXRvY29tcGxldGlvblwiKVxuICAgICAgICBAcHl0aG9uVmFsaWQgPSAtMlxuICAgICAgcmV0dXJuXG4gICAgZmlsZVJlZiA9IEBtb2RGaWxlcy5pbmRleE9mKGV2ZW50LnBhdGgpXG4gICAgaWYgZmlsZVJlZiA+IC0xXG4gICAgICBAZmlsZVVwZGF0ZShldmVudC5wYXRoLCB0cnVlKVxuXG4gIHJlYnVpbGRJbmRleDogKCkgLT5cbiAgICAjIFJlc2V0IGluZGV4XG4gICAgQGluZGV4UmVhZHkgPSBmYWxzZVxuICAgIEBnbG9iYWxVcFRvRGF0ZSA9IHRydWVcbiAgICBAbGFzdEZpbGUgPSAnJ1xuICAgIEBsYXN0Um93ID0gLTFcbiAgICBAbW9kRGlycyA9IFtdXG4gICAgQG1vZEZpbGVzID0gW11cbiAgICBAZmlsZUluZGV4ZWQgPSBbXVxuICAgIEBmaWxlT2JqSW5kID0geyB9XG4gICAgQGZpbGVPYmpMaXN0cyA9IHsgfVxuICAgIEBnbG9iYWxPYmpJbmQgPSBbXVxuICAgIEBwcm9qZWN0T2JqTGlzdCA9IHsgfVxuICAgIEBkZXNjTGlzdCA9IFtdXG4gICAgIyBCdWlsZCBpbmRleFxuICAgIEBmaW5kTW9kRmlsZXMoKVxuICAgIEBmaWxlc1VwZGF0ZShAbW9kRmlsZXMpXG5cbiAgY2hlY2tJbmRleDogKCkgLT5cbiAgICBpZiBAaW5kZXhSZWFkeVxuICAgICAgcmV0dXJuIHRydWVcbiAgICBmb3IgaXNJbmRleGVkIGluIEBmaWxlSW5kZXhlZFxuICAgICAgdW5sZXNzIGlzSW5kZXhlZFxuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICBAaW5kZXhSZWFkeSA9IHRydWVcbiAgICByZXR1cm4gdHJ1ZVxuXG4gIGFkZEluZm86IChpbmZvLCBkZXRhaWw9bnVsbCkgLT5cbiAgICBpZiBkZXRhaWw/XG4gICAgICBhdG9tLm5vdGlmaWNhdGlvbnM/LmFkZEluZm8oXCJhYy1mb3J0cmFuOiAje2luZm99XCIsIHtkZXRhaWw6IGRldGFpbH0pXG4gICAgZWxzZVxuICAgICAgYXRvbS5ub3RpZmljYXRpb25zPy5hZGRJbmZvKFwiYWMtZm9ydHJhbjogI3tpbmZvfVwiKVxuXG4gIGFkZEVycm9yOiAoaW5mbywgZGV0YWlsPW51bGwpIC0+XG4gICAgaWYgZGV0YWlsP1xuICAgICAgYXRvbS5ub3RpZmljYXRpb25zPy5hZGRFcnJvcihcImFjLWZvcnRyYW46ICN7aW5mb31cIiwge2RldGFpbDogZGV0YWlsfSlcbiAgICBlbHNlXG4gICAgICBhdG9tLm5vdGlmaWNhdGlvbnM/LmFkZEVycm9yKFwiYWMtZm9ydHJhbjogI3tpbmZvfVwiKVxuXG4gIG5vdGlmeUluZGV4UGVuZGluZzogKG9wZXJhdGlvbikgLT5cbiAgICBhdG9tLm5vdGlmaWNhdGlvbnM/LmFkZFdhcm5pbmcoXCJDb3VsZCBub3QgY29tcGxldGUgb3BlcmF0aW9uOiAje29wZXJhdGlvbn1cIiwge1xuICAgICAgZGV0YWlsOiAnSW5kZXhpbmcgcGVuZGluZycsXG4gICAgICBkaXNtaXNzYWJsZTogdHJ1ZVxuICAgIH0pXG5cbiAgZmluZE1vZEZpbGVzOiAoKS0+XG4gICAgZnJlZVJlZ2V4ID0gL1thLXowLTlfXSpcXC5GKDkwfDk1fDAzfDA4KSQvaSAjIGY5MCxGOTAsZjk1LEY5NSxmMDMsRjAzLGYwOCxGMDhcbiAgICBmaXhlZFJlZ2V4ID0gL1thLXowLTlfXSpcXC5GKDc3fE9SfFBQKT8kL2kgIyBmLEYsZjc3LEY3Nyxmb3IsRk9SLGZwcCxGUFBcbiAgICBwcm9qZWN0RGlycyA9IGF0b20ucHJvamVjdC5nZXRQYXRocygpXG4gICAgQG1vZERpcnMgPSBwcm9qZWN0RGlyc1xuICAgIEBleGNsUGF0aHMgPSBbXVxuICAgIGV4dFBhdGhzID0gW11cbiAgICBmb3IgcHJvakRpciBpbiBwcm9qZWN0RGlyc1xuICAgICAgc2V0dGluZ1BhdGggPSBwYXRoLmpvaW4ocHJvakRpciwgJy5hY19mb3J0cmFuJylcbiAgICAgIHRyeVxuICAgICAgICBmcy5hY2Nlc3NTeW5jKHNldHRpbmdQYXRoLCBmcy5SX09LKVxuICAgICAgICBmcy5vcGVuU3luYyhzZXR0aW5nUGF0aCwgJ3IrJylcbiAgICAgICAgcmVzdWx0ID0gZnMucmVhZEZpbGVTeW5jKHNldHRpbmdQYXRoKVxuICAgICAgICB0cnlcbiAgICAgICAgICBjb25maWdPcHRpb25zID0gSlNPTi5wYXJzZShyZXN1bHQpXG4gICAgICAgIGNhdGNoXG4gICAgICAgICAgQGFkZEVycm9yKFwiRXJyb3IgcmVhZGluZyBwcm9qZWN0IHNldHRpbmdzXCIsIFwicGF0aCAje3NldHRpbmdQYXRofVwiKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIGlmICdleGNsX3BhdGhzJyBvZiBjb25maWdPcHRpb25zXG4gICAgICAgICAgZm9yIGV4Y2xQYXRoIGluIGNvbmZpZ09wdGlvbnNbJ2V4Y2xfcGF0aHMnXVxuICAgICAgICAgICAgQGV4Y2xQYXRocy5wdXNoKHBhdGguam9pbihwcm9qRGlyLCBleGNsUGF0aCkpXG4gICAgICAgIGlmICdtb2RfZGlycycgb2YgY29uZmlnT3B0aW9uc1xuICAgICAgICAgIEBtb2REaXJzID0gW11cbiAgICAgICAgICBmb3IgbW9kRGlyIGluIGNvbmZpZ09wdGlvbnNbJ21vZF9kaXJzJ11cbiAgICAgICAgICAgIEBtb2REaXJzLnB1c2gocGF0aC5qb2luKHByb2pEaXIsIG1vZERpcikpXG4gICAgICAgIGlmICdleHRfaW5kZXgnIG9mIGNvbmZpZ09wdGlvbnNcbiAgICAgICAgICBmb3IgcmVsUGF0aCBpbiBjb25maWdPcHRpb25zWydleHRfaW5kZXgnXVxuICAgICAgICAgICAgaW5kZXhQYXRoID0gcGF0aC5qb2luKHByb2pEaXIsIHJlbFBhdGgpXG4gICAgICAgICAgICB0cnlcbiAgICAgICAgICAgICAgZnMuYWNjZXNzU3luYyhpbmRleFBhdGgsIGZzLlJfT0spXG4gICAgICAgICAgICAgIGZzLm9wZW5TeW5jKGluZGV4UGF0aCwgJ3IrJylcbiAgICAgICAgICAgICAgcmVzdWx0ID0gZnMucmVhZEZpbGVTeW5jKGluZGV4UGF0aClcbiAgICAgICAgICAgICAgZXh0SW5kZXggPSBKU09OLnBhcnNlKHJlc3VsdClcbiAgICAgICAgICAgICAgb2JqTGlzdGluZyA9IGV4dEluZGV4WydvYmonXVxuICAgICAgICAgICAgICBkZXNjTGlzdGluZyA9IGV4dEluZGV4WydkZXNjcyddXG4gICAgICAgICAgICAgIGZvciBrZXkgb2Ygb2JqTGlzdGluZ1xuICAgICAgICAgICAgICAgIEBwcm9qZWN0T2JqTGlzdFtrZXldID0gb2JqTGlzdGluZ1trZXldXG4gICAgICAgICAgICAgICAgb2JqID0gQHByb2plY3RPYmpMaXN0W2tleV1cbiAgICAgICAgICAgICAgICBkZXNjSW5kID0gb2JqWydkZXNjJ11cbiAgICAgICAgICAgICAgICBkZXNjU3RyID0gZGVzY0xpc3RpbmdbZGVzY0luZF1cbiAgICAgICAgICAgICAgICBpZiBkZXNjU3RyP1xuICAgICAgICAgICAgICAgICAgZGVzY0luZGV4ID0gQGRlc2NMaXN0LmluZGV4T2YoZGVzY1N0cilcbiAgICAgICAgICAgICAgICAgIGlmIGRlc2NJbmRleCA9PSAtMVxuICAgICAgICAgICAgICAgICAgICBAZGVzY0xpc3QucHVzaChkZXNjU3RyKVxuICAgICAgICAgICAgICAgICAgICBvYmpbJ2Rlc2MnXSA9IEBkZXNjTGlzdC5sZW5ndGgtMVxuICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmpbJ2Rlc2MnXSA9IGRlc2NJbmRleFxuICAgICAgICAgICAgICBleHRQYXRocy5wdXNoKFwiI3tyZWxQYXRofVwiKVxuICAgICAgICAgICAgY2F0Y2hcbiAgICAgICAgICAgICAgQGFkZEVycm9yKFwiQ2Fubm90IHJlYWQgZXh0ZXJuYWwgaW5kZXggZmlsZVwiLCBcInBhdGggI3tyZWxQYXRofVwiKVxuICAgIGlmIGV4dFBhdGhzLmxlbmd0aCA+IDBcbiAgICAgIEBhZGRJbmZvKFwiQWRkZWQgZXh0ZXJuYWwgaW5kZXggZmlsZXNcIiwgZXh0UGF0aHMuam9pbignXFxuJykpXG4gICAgZm9yIG1vZERpciBpbiBAbW9kRGlyc1xuICAgICAgdHJ5XG4gICAgICAgIGZpbGVzID0gZnMucmVhZGRpclN5bmMobW9kRGlyKVxuICAgICAgY2F0Y2hcbiAgICAgICAgYXRvbS5ub3RpZmljYXRpb25zPy5hZGRXYXJuaW5nKFwiV2FybmluZzogRHVyaW5nIGluZGV4aW5nIHNwZWNpZmllZCBtb2R1bGUgZGlyZWN0b3J5IGNhbm5vdCBiZSByZWFkXCIsIHtcbiAgICAgICAgICBkZXRhaWw6IFwiRGlyZWN0b3J5ICcje21vZERpcn0nIHdpbGwgYmUgc2tpcHBlZFwiLFxuICAgICAgICAgIGRpc21pc3NhYmxlOiB0cnVlXG4gICAgICAgIH0pXG4gICAgICAgIGNvbnRpbnVlXG4gICAgICBmb3IgZmlsZSBpbiBmaWxlc1xuICAgICAgICBpZiBmaWxlLm1hdGNoKGZyZWVSZWdleCkgb3IgZmlsZS5tYXRjaChmaXhlZFJlZ2V4KVxuICAgICAgICAgIGZpbGVQYXRoID0gcGF0aC5qb2luKG1vZERpciwgZmlsZSlcbiAgICAgICAgICBpZiBAZXhjbFBhdGhzLmluZGV4T2YoZmlsZVBhdGgpID09IC0xXG4gICAgICAgICAgICBAbW9kRmlsZXMucHVzaChmaWxlUGF0aClcbiAgICAgICAgICAgIEBmaWxlSW5kZXhlZC5wdXNoKGZhbHNlKVxuXG4gIGZpbGVzVXBkYXRlOiAoZmlsZVBhdGhzLCBjbG9zZVNjb3Blcz1mYWxzZSktPlxuICAgIGZpeGVkUmVnZXggPSAvW2EtejAtOV9dKlxcLkYoNzd8T1J8UFApPyQvaSAjIGYsRixmNzcsRjc3LGZvcixGT1IsZnBwLEZQUFxuICAgIGNvbW1hbmQgPSBAcHl0aG9uUGF0aFxuICAgICNcbiAgICBmaXhlZEJhdGNoID0gW11cbiAgICBmcmVlQmF0Y2ggPSBbXVxuICAgIGZvciBmaWxlUGF0aCBpbiBmaWxlUGF0aHNcbiAgICAgIGlmIGZpbGVQYXRoLm1hdGNoKGZpeGVkUmVnZXgpXG4gICAgICAgIGZpeGVkQmF0Y2gucHVzaChmaWxlUGF0aClcbiAgICAgIGVsc2VcbiAgICAgICAgZnJlZUJhdGNoLnB1c2goZmlsZVBhdGgpXG4gICAgI1xuICAgIGlmIGZpeGVkQmF0Y2gubGVuZ3RoID4gMFxuICAgICAgZml4ZWRGaWxlUGF0aHMgPSBmaXhlZEJhdGNoLmpvaW4oJywnKVxuICAgICAgbmV3IFByb21pc2UgKHJlc29sdmUpID0+XG4gICAgICAgIGFsbE91dHB1dCA9IFtdXG4gICAgICAgIGFyZ3MgPSBbQHBhcnNlclBhdGgsIFwiLS1maWxlcz0je2ZpeGVkRmlsZVBhdGhzfVwiLCBcIi0tZml4ZWRcIl1cbiAgICAgICAgaWYgY2xvc2VTY29wZXNcbiAgICAgICAgICBhcmdzLnB1c2goXCItLWNsb3NlX3Njb3Blc1wiKVxuICAgICAgICBzdGRvdXQgPSAob3V0cHV0KSA9PiBhbGxPdXRwdXQucHVzaChvdXRwdXQpXG4gICAgICAgIHN0ZGVyciA9IChvdXRwdXQpID0+IGNvbnNvbGUubG9nIG91dHB1dFxuICAgICAgICBleGl0ID0gKGNvZGUpID0+IHJlc29sdmUoQGhhbmRsZVBhcnNlclJlc3VsdHMoYWxsT3V0cHV0LmpvaW4oJycpLCBjb2RlLCBmaXhlZEJhdGNoKSlcbiAgICAgICAgZml4ZWRCdWZmZXJlZFByb2Nlc3MgPSBuZXcgQnVmZmVyZWRQcm9jZXNzKHtjb21tYW5kLCBhcmdzLCBzdGRvdXQsIHN0ZGVyciwgZXhpdH0pXG4gICAgI1xuICAgIGlmIGZyZWVCYXRjaC5sZW5ndGggPiAwXG4gICAgICBmcmVlRmlsZVBhdGhzID0gZnJlZUJhdGNoLmpvaW4oJywnKVxuICAgICAgbmV3IFByb21pc2UgKHJlc29sdmUpID0+XG4gICAgICAgIGFsbE91dHB1dCA9IFtdXG4gICAgICAgIGFyZ3MgPSBbQHBhcnNlclBhdGgsIFwiLS1maWxlcz0je2ZyZWVGaWxlUGF0aHN9XCJdXG4gICAgICAgIGlmIGNsb3NlU2NvcGVzXG4gICAgICAgICAgYXJncy5wdXNoKFwiLS1jbG9zZV9zY29wZXNcIilcbiAgICAgICAgc3Rkb3V0ID0gKG91dHB1dCkgPT4gYWxsT3V0cHV0LnB1c2gob3V0cHV0KVxuICAgICAgICBzdGRlcnIgPSAob3V0cHV0KSA9PiBjb25zb2xlLmxvZyBvdXRwdXRcbiAgICAgICAgZXhpdCA9IChjb2RlKSA9PiByZXNvbHZlKEBoYW5kbGVQYXJzZXJSZXN1bHRzKGFsbE91dHB1dC5qb2luKCcnKSwgY29kZSwgZnJlZUJhdGNoKSlcbiAgICAgICAgZnJlZUJ1ZmZlcmVkUHJvY2VzcyA9IG5ldyBCdWZmZXJlZFByb2Nlc3Moe2NvbW1hbmQsIGFyZ3MsIHN0ZG91dCwgc3RkZXJyLCBleGl0fSlcblxuICBmaWxlVXBkYXRlOiAoZmlsZVBhdGgsIGNsb3NlU2NvcGVzPWZhbHNlKS0+XG4gICAgZml4ZWRSZWdleCA9IC9bYS16MC05X10qXFwuRig3N3xPUnxQUCk/JC9pICMgZixGLGY3NyxGNzcsZm9yLEZPUixmcHAsRlBQXG4gICAgY29tbWFuZCA9IEBweXRob25QYXRoXG4gICAgYXJncyA9IFtAcGFyc2VyUGF0aCxcIi0tZmlsZXM9I3tmaWxlUGF0aH1cIl1cbiAgICBpZiBmaWxlUGF0aC5tYXRjaChmaXhlZFJlZ2V4KVxuICAgICAgYXJncy5wdXNoKFwiLS1maXhlZFwiKVxuICAgIGlmIGNsb3NlU2NvcGVzXG4gICAgICBhcmdzLnB1c2goXCItLWNsb3NlX3Njb3Blc1wiKVxuICAgICNcbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIGFsbE91dHB1dCA9IFtdXG4gICAgICBzdGRvdXQgPSAob3V0cHV0KSA9PiBhbGxPdXRwdXQucHVzaChvdXRwdXQpXG4gICAgICBzdGRlcnIgPSAob3V0cHV0KSA9PiBjb25zb2xlLmxvZyBvdXRwdXRcbiAgICAgIGV4aXQgPSAoY29kZSkgPT4gcmVzb2x2ZShAaGFuZGxlUGFyc2VyUmVzdWx0KGFsbE91dHB1dC5qb2luKCdcXG4nKSwgY29kZSwgZmlsZVBhdGgpKVxuICAgICAgYnVmZmVyZWRQcm9jZXNzID0gbmV3IEJ1ZmZlcmVkUHJvY2Vzcyh7Y29tbWFuZCwgYXJncywgc3Rkb3V0LCBzdGRlcnIsIGV4aXR9KVxuXG4gIGxvY2FsVXBkYXRlOiAoZWRpdG9yLCByb3cpLT5cbiAgICBmaXhlZFJlZ2V4ID0gL1thLXowLTlfXSpcXC5GKDc3fE9SfFBQKT8kL2kgIyBmLEYsZjc3LEY3Nyxmb3IsRk9SLGZwcCxGUFBcbiAgICBmaWxlUGF0aCA9IGVkaXRvci5nZXRQYXRoKClcbiAgICBjb21tYW5kID0gQHB5dGhvblBhdGhcbiAgICBhcmdzID0gW0BwYXJzZXJQYXRoLFwiLXNcIl1cbiAgICBpZiBmaWxlUGF0aC5tYXRjaChmaXhlZFJlZ2V4KVxuICAgICAgYXJncy5wdXNoKFwiLS1maXhlZFwiKVxuICAgICNcbiAgICBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgPT5cbiAgICAgIGFsbE91dHB1dCA9IFtdXG4gICAgICBzdGRvdXQgPSAob3V0cHV0KSA9PiBhbGxPdXRwdXQucHVzaChvdXRwdXQpXG4gICAgICBzdGRlcnIgPSAob3V0cHV0KSA9PiBjb25zb2xlLmxvZyBvdXRwdXRcbiAgICAgIGV4aXQgPSAoY29kZSkgPT4gcmVzb2x2ZShAaGFuZGxlUGFyc2VyUmVzdWx0KGFsbE91dHB1dC5qb2luKCdcXG4nKSwgY29kZSwgZmlsZVBhdGgpKVxuICAgICAgYnVmZmVyZWRQcm9jZXNzID0gbmV3IEJ1ZmZlcmVkUHJvY2Vzcyh7Y29tbWFuZCwgYXJncywgc3Rkb3V0LCBzdGRlcnIsIGV4aXR9KVxuICAgICAgYnVmZmVyZWRQcm9jZXNzLnByb2Nlc3Muc3RkaW4uc2V0RW5jb2RpbmcgPSAndXRmLTgnO1xuICAgICAgYnVmZmVyZWRQcm9jZXNzLnByb2Nlc3Muc3RkaW4ud3JpdGUoZWRpdG9yLmdldFRleHQoKSlcbiAgICAgIGJ1ZmZlcmVkUHJvY2Vzcy5wcm9jZXNzLnN0ZGluLmVuZCgpXG5cbiAgaGFuZGxlUGFyc2VyUmVzdWx0czogKHJlc3VsdHMscmV0dXJuQ29kZSxmaWxlUGF0aHMpIC0+XG4gICAgaWYgcmV0dXJuQ29kZSBpcyBub3QgMFxuICAgICAgcmV0dXJuXG4gICAgcmVzdWx0c1NwbGl0ID0gcmVzdWx0cy5zcGxpdCgnXFxuJylcbiAgICBuUmVzdWx0cyA9IHJlc3VsdHNTcGxpdC5sZW5ndGggLSAxXG4gICAgbkZpbGVzID0gZmlsZVBhdGhzLmxlbmd0aFxuICAgIGlmIG5SZXN1bHRzICE9IG5GaWxlc1xuICAgICAgY29uc29sZS5sb2cgJ0Vycm9yIHBhcnNpbmcgZmlsZXM6ICMgb2YgZmlsZXMgYW5kIHJlc3VsdHMgZG9lcyBub3QgbWF0Y2gnLCBuUmVzdWx0cywgbkZpbGVzXG4gICAgICByZXR1cm5cbiAgICBmb3IgaSBpbiBbMC4ubkZpbGVzLTFdXG4gICAgICBAaGFuZGxlUGFyc2VyUmVzdWx0KHJlc3VsdHNTcGxpdFtpXSxyZXR1cm5Db2RlLGZpbGVQYXRoc1tpXSlcblxuICBoYW5kbGVQYXJzZXJSZXN1bHQ6IChyZXN1bHQscmV0dXJuQ29kZSxmaWxlUGF0aCkgLT5cbiAgICBpZiByZXR1cm5Db2RlIGlzIG5vdCAwXG4gICAgICByZXR1cm5cbiAgICB0cnlcbiAgICAgIGZpbGVBU1QgPSBKU09OLnBhcnNlKHJlc3VsdClcbiAgICBjYXRjaFxuICAgICAgY29uc29sZS5sb2cgJ0Vycm9yIHBhcnNpbmcgZmlsZTonLCBmaWxlUGF0aFxuICAgICAgYXRvbS5ub3RpZmljYXRpb25zPy5hZGRFcnJvcihcIkVycm9yIHBhcnNpbmcgZmlsZSAnI3tmaWxlUGF0aH0nXCIsIHtcbiAgICAgICAgZGV0YWlsOiAnU2NyaXB0IGZhaWxlZCcsXG4gICAgICAgIGRpc21pc3NhYmxlOiB0cnVlXG4gICAgICB9KVxuICAgICAgcmV0dXJuXG4gICAgI1xuICAgIGlmICdlcnJvcicgb2YgZmlsZUFTVFxuICAgICAgY29uc29sZS5sb2cgJ0Vycm9yIHBhcnNpbmcgZmlsZTonLCBmaWxlUGF0aFxuICAgICAgYXRvbS5ub3RpZmljYXRpb25zPy5hZGRFcnJvcihcIkVycm9yIHBhcnNpbmcgZmlsZSAnI3tmaWxlUGF0aH0nXCIsIHtcbiAgICAgICAgZGV0YWlsOiBmaWxlQVNUWydlcnJvciddLFxuICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZVxuICAgICAgfSlcbiAgICAgIHJldHVyblxuICAgICNcbiAgICBmaWxlUmVmID0gQG1vZEZpbGVzLmluZGV4T2YoZmlsZVBhdGgpXG4gICAgaWYgZmlsZVJlZiA9PSAtMVxuICAgICAgQG1vZEZpbGVzLnB1c2goZmlsZVBhdGgpXG4gICAgICBmaWxlUmVmID0gQG1vZEZpbGVzLmluZGV4T2YoZmlsZVBhdGgpXG4gICAgb2xkT2JqTGlzdCA9IEBmaWxlT2JqTGlzdHNbZmlsZVBhdGhdXG4gICAgQGZpbGVPYmpMaXN0c1tmaWxlUGF0aF0gPSBbXVxuICAgIGZvciBrZXkgb2YgZmlsZUFTVFsnb2JqcyddXG4gICAgICBAZmlsZU9iakxpc3RzW2ZpbGVQYXRoXS5wdXNoKGtleSlcbiAgICAgIGlmIGtleSBvZiBAcHJvamVjdE9iakxpc3RcbiAgICAgICAgQHJlc2V0SW5oZXJpdChAcHJvamVjdE9iakxpc3Rba2V5XSlcbiAgICAgIEBwcm9qZWN0T2JqTGlzdFtrZXldID0gZmlsZUFTVFsnb2JqcyddW2tleV1cbiAgICAgIEBwcm9qZWN0T2JqTGlzdFtrZXldWydmaWxlJ10gPSBmaWxlUmVmXG4gICAgICBpZiAnZGVzYycgb2YgQHByb2plY3RPYmpMaXN0W2tleV1cbiAgICAgICAgZGVzY0luZGV4ID0gQGRlc2NMaXN0LmluZGV4T2YoQHByb2plY3RPYmpMaXN0W2tleV1bJ2Rlc2MnXSlcbiAgICAgICAgaWYgZGVzY0luZGV4ID09IC0xXG4gICAgICAgICAgQGRlc2NMaXN0LnB1c2goQHByb2plY3RPYmpMaXN0W2tleV1bJ2Rlc2MnXSlcbiAgICAgICAgICBAcHJvamVjdE9iakxpc3Rba2V5XVsnZGVzYyddID0gQGRlc2NMaXN0Lmxlbmd0aC0xXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAcHJvamVjdE9iakxpc3Rba2V5XVsnZGVzYyddID0gZGVzY0luZGV4XG4gICAgIyBSZW1vdmUgb2xkIG9iamVjdHNcbiAgICBpZiBvbGRPYmpMaXN0P1xuICAgICAgZm9yIGtleSBpbiBvbGRPYmpMaXN0XG4gICAgICAgIHVubGVzcyBrZXkgb2YgZmlsZUFTVFsnb2JqcyddXG4gICAgICAgICAgZGVsZXRlIEBwcm9qZWN0T2JqTGlzdFtrZXldXG4gICAgQGZpbGVPYmpJbmRbZmlsZVBhdGhdID0gZmlsZUFTVFsnc2NvcGVzJ11cbiAgICBAZmlsZUluZGV4ZWRbZmlsZVJlZl0gPSB0cnVlXG4gICAgQGdsb2JhbFVwVG9EYXRlID0gZmFsc2VcblxuICB1cGRhdGVHbG9iYWxJbmRleDogKCkgLT5cbiAgICBpZiBAZ2xvYmFsVXBUb0RhdGVcbiAgICAgIHJldHVyblxuICAgIEBnbG9iYWxPYmpJbmQgPSBbXVxuICAgIGZvciBrZXkgb2YgQHByb2plY3RPYmpMaXN0XG4gICAgICBpZiBub3Qga2V5Lm1hdGNoKC86Oi8pXG4gICAgICAgIEBnbG9iYWxPYmpJbmQucHVzaChrZXkpXG5cbiAgZ2V0U3VnZ2VzdGlvbnM6ICh7ZWRpdG9yLCBidWZmZXJQb3NpdGlvbiwgcHJlZml4LCBhY3RpdmF0ZWRNYW51YWxseX0pIC0+XG4gICAgaWYgQHB5dGhvblZhbGlkIDwgMVxuICAgICAgaWYgQHB5dGhvblZhbGlkID09IDBcbiAgICAgICAgQGFkZEVycm9yKFwiUHl0aG9uIHBhdGggZXJyb3JcIiwgXCJEaXNhYmxpbmcgRk9SVFJBTiBhdXRvY29tcGxldGlvblwiKVxuICAgICAgICBAcHl0aG9uVmFsaWQgPSAtMlxuICAgICAgcmV0dXJuXG4gICAgdW5sZXNzIEBleGNsUGF0aHMuaW5kZXhPZihlZGl0b3IuZ2V0UGF0aCgpKSA9PSAtMVxuICAgICAgcmV0dXJuIFtdXG4gICAgIyBCdWlsZCBpbmRleCBvbiBmaXJzdCBydW5cbiAgICBpZiBAZmlyc3RSdW5cbiAgICAgIEByZWJ1aWxkSW5kZXgoKVxuICAgICAgQGZpcnN0UnVuID0gZmFsc2VcbiAgICByZXR1cm4gbmV3IFByb21pc2UgKHJlc29sdmUpID0+XG4gICAgICAjIENoZWNrIGlmIHVwZGF0ZSByZXF1cmVkXG4gICAgICBwYXJzZUJ1ZmZlciA9IGZhbHNlXG4gICAgICBpZiBAbGFzdEZpbGUgIT0gZWRpdG9yLmdldFBhdGgoKVxuICAgICAgICBwYXJzZUJ1ZmZlciA9IHRydWVcbiAgICAgICAgQGxhc3RGaWxlID0gZWRpdG9yLmdldFBhdGgoKVxuICAgICAgaWYgQGxhc3RSb3cgIT0gYnVmZmVyUG9zaXRpb24ucm93XG4gICAgICAgIHBhcnNlQnVmZmVyID0gdHJ1ZVxuICAgICAgICBAbGFzdFJvdyA9IGJ1ZmZlclBvc2l0aW9uLnJvd1xuICAgICAgIyBHZXQgc3VnZ2VzdGlvbnNcbiAgICAgIGlmIHBhcnNlQnVmZmVyXG4gICAgICAgIEBsb2NhbFVwZGF0ZShlZGl0b3IsIGJ1ZmZlclBvc2l0aW9uLnJvdykudGhlbiAoKSA9PlxuICAgICAgICAgIHJlc29sdmUoQGZpbHRlclN1Z2dlc3Rpb25zKHByZWZpeCwgZWRpdG9yLCBidWZmZXJQb3NpdGlvbiwgYWN0aXZhdGVkTWFudWFsbHkpKVxuICAgICAgZWxzZVxuICAgICAgICByZXNvbHZlKEBmaWx0ZXJTdWdnZXN0aW9ucyhwcmVmaXgsIGVkaXRvciwgYnVmZmVyUG9zaXRpb24sIGFjdGl2YXRlZE1hbnVhbGx5KSlcblxuICBmaWx0ZXJTdWdnZXN0aW9uczogKHByZWZpeCwgZWRpdG9yLCBidWZmZXJQb3NpdGlvbiwgYWN0aXZhdGVkTWFudWFsbHkpIC0+XG4gICAgY29tcGxldGlvbnMgPSBbXVxuICAgIHN1Z2dlc3Rpb25zID0gW11cbiAgICBAdXBkYXRlR2xvYmFsSW5kZXgoKVxuICAgIGlmIHByZWZpeFxuICAgICAgcHJlZml4TG93ZXIgPSBwcmVmaXgudG9Mb3dlckNhc2UoKVxuICAgICAgZnVsbExpbmUgPSBAZ2V0RnVsbExpbmUoZWRpdG9yLCBidWZmZXJQb3NpdGlvbilcbiAgICAgIGxpbmVDb250ZXh0ID0gQGdldExpbmVDb250ZXh0KGZ1bGxMaW5lKVxuICAgICAgaWYgbGluZUNvbnRleHQgPT0gMlxuICAgICAgICByZXR1cm4gY29tcGxldGlvbnNcbiAgICAgIGlmIGxpbmVDb250ZXh0ID09IDFcbiAgICAgICAgc3VnZ2VzdGlvbnMgPSBAZ2V0VXNlU3VnZ2VzdGlvbihmdWxsTGluZSwgcHJlZml4TG93ZXIpXG4gICAgICAgIHJldHVybiBAYnVpbGRDb21wbGV0aW9uTGlzdChzdWdnZXN0aW9ucywgbGluZUNvbnRleHQpXG4gICAgICBsaW5lU2NvcGVzID0gQGdldExpbmVTY29wZXMoZWRpdG9yLCBidWZmZXJQb3NpdGlvbilcbiAgICAgIGN1cnNvclNjb3BlID0gQGdldENsYXNzU2NvcGUoZnVsbExpbmUsIGxpbmVTY29wZXMpXG4gICAgICBpZiBjdXJzb3JTY29wZT9cbiAgICAgICAgc3VnZ2VzdGlvbnMgPSBAYWRkQ2hpbGRyZW4oY3Vyc29yU2NvcGUsIHN1Z2dlc3Rpb25zLCBwcmVmaXhMb3dlciwgW10pXG4gICAgICAgIHJldHVybiBAYnVpbGRDb21wbGV0aW9uTGlzdChzdWdnZXN0aW9ucywgbGluZUNvbnRleHQpXG4gICAgICBpZiBwcmVmaXgubGVuZ3RoIDwgQG1pblByZWZpeCBhbmQgbm90IGFjdGl2YXRlZE1hbnVhbGx5XG4gICAgICAgIHJldHVybiBjb21wbGV0aW9uc1xuICAgICAgZm9yIGtleSBpbiBAZ2xvYmFsT2JqSW5kIHdoZW4gKEBwcm9qZWN0T2JqTGlzdFtrZXldWyduYW1lJ10udG9Mb3dlckNhc2UoKS5zdGFydHNXaXRoKHByZWZpeExvd2VyKSlcbiAgICAgICAgaWYgQHByb2plY3RPYmpMaXN0W2tleV1bJ3R5cGUnXSA9PSAxXG4gICAgICAgICAgY29udGludWVcbiAgICAgICAgc3VnZ2VzdGlvbnMucHVzaChrZXkpXG4gICAgICAjXG4gICAgICB1c2VkTW9kID0geyB9XG4gICAgICBmb3IgbGluZVNjb3BlIGluIGxpbmVTY29wZXNcbiAgICAgICAgc3VnZ2VzdGlvbnMgPSBAYWRkQ2hpbGRyZW4obGluZVNjb3BlLCBzdWdnZXN0aW9ucywgcHJlZml4TG93ZXIsIFtdKVxuICAgICAgICB1c2VkTW9kID0gQGdldFVzZVNlYXJjaGVzKGxpbmVTY29wZSwgdXNlZE1vZCwgW10pXG4gICAgICBmb3IgdXNlTW9kIG9mIHVzZWRNb2RcbiAgICAgICAgc3VnZ2VzdGlvbnMgPSBAYWRkUHVibGljQ2hpbGRyZW4odXNlTW9kLCBzdWdnZXN0aW9ucywgcHJlZml4TG93ZXIsIHVzZWRNb2RbdXNlTW9kXSlcbiAgICAgIGNvbXBsZXRpb25zID0gQGJ1aWxkQ29tcGxldGlvbkxpc3Qoc3VnZ2VzdGlvbnMsIGxpbmVDb250ZXh0KVxuICAgIGVsc2VcbiAgICAgIGxpbmUgPSBlZGl0b3IuZ2V0VGV4dEluUmFuZ2UoW1tidWZmZXJQb3NpdGlvbi5yb3csIDBdLCBidWZmZXJQb3NpdGlvbl0pXG4gICAgICB1bmxlc3MgbGluZS5lbmRzV2l0aCgnJScpXG4gICAgICAgIHJldHVybiBjb21wbGV0aW9uc1xuICAgICAgZnVsbExpbmUgPSBAZ2V0RnVsbExpbmUoZWRpdG9yLCBidWZmZXJQb3NpdGlvbilcbiAgICAgIGxpbmVDb250ZXh0ID0gQGdldExpbmVDb250ZXh0KGZ1bGxMaW5lKVxuICAgICAgbGluZVNjb3BlcyA9IEBnZXRMaW5lU2NvcGVzKGVkaXRvciwgYnVmZmVyUG9zaXRpb24pXG4gICAgICBjdXJzb3JTY29wZSA9IEBnZXRDbGFzc1Njb3BlKGZ1bGxMaW5lLCBsaW5lU2NvcGVzKVxuICAgICAgaWYgY3Vyc29yU2NvcGU/XG4gICAgICAgIHN1Z2dlc3Rpb25zID0gQGFkZENoaWxkcmVuKGN1cnNvclNjb3BlLCBzdWdnZXN0aW9ucywgcHJlZml4TG93ZXIsIFtdKVxuICAgICAgICByZXR1cm4gQGJ1aWxkQ29tcGxldGlvbkxpc3Qoc3VnZ2VzdGlvbnMsbGluZUNvbnRleHQpXG4gICAgcmV0dXJuIGNvbXBsZXRpb25zXG5cbiAgc2F2ZUluZGV4OiAoKSAtPlxuICAgICMgQnVpbGQgaW5kZXggb24gZmlyc3QgcnVuXG4gICAgaWYgQGZpcnN0UnVuXG4gICAgICBAcmVidWlsZEluZGV4KClcbiAgICAgIEBmaXJzdFJ1biA9IGZhbHNlXG4gICAgdW5sZXNzIEBjaGVja0luZGV4KClcbiAgICAgIEBub3RpZnlJbmRleFBlbmRpbmcoJ1NhdmUgSW5kZXgnKVxuICAgICAgcmV0dXJuXG4gICAgcmVtb3ZhbExpc3QgPSBbXVxuICAgIGZvciBrZXkgb2YgQHByb2plY3RPYmpMaXN0XG4gICAgICBvYmogPSBAcHJvamVjdE9iakxpc3Rba2V5XVxuICAgICAgdHlwZSA9IG9ialsndHlwZSddXG4gICAgICBpZiB0eXBlID09IDIgb3IgdHlwZSA9PSAzXG4gICAgICAgIG1lbUxpc3QgPSBvYmpbJ21lbSddXG4gICAgICAgIGlmIG1lbUxpc3Q/XG4gICAgICAgICAgZm9yIG1lbWJlciBpbiBtZW1MaXN0XG4gICAgICAgICAgICByZW1vdmFsTGlzdC5wdXNoKGtleSsnOjonK21lbWJlci50b0xvd2VyQ2FzZSgpKVxuICAgICAgICBkZWxldGUgb2JqWydtZW0nXVxuICAgIGZvciBrZXkgaW4gcmVtb3ZhbExpc3RcbiAgICAgIGRlbGV0ZSBAcHJvamVjdE9iakxpc3Rba2V5XVxuICAgIG5ld0Rlc2NMaXN0ID0gW11cbiAgICBuZXdEZXNjcyA9IFtdXG4gICAgZm9yIGtleSBvZiBAcHJvamVjdE9iakxpc3RcbiAgICAgIG9iaiA9IEBwcm9qZWN0T2JqTGlzdFtrZXldXG4gICAgICBpZiBvYmpbJ3R5cGUnXSA9PSA3XG4gICAgICAgIEByZXNvbHZlSW50ZXJmYWNlKGtleSlcbiAgICAgIEByZXNvbHZlSWhlcml0ZWQoa2V5KVxuICAgICAgZGVsZXRlIG9ialsnZmRlZiddXG4gICAgICBkZWxldGUgb2JqWydmaWxlJ11cbiAgICAgIGRlbGV0ZSBvYmpbJ2Zib3VuZCddXG4gICAgICBkZXNJbmQgPSBvYmpbJ2Rlc2MnXVxuICAgICAgZGVzY0luZGV4ID0gbmV3RGVzY0xpc3QuaW5kZXhPZihkZXNJbmQpXG4gICAgICBpZiBkZXNjSW5kZXggPT0gLTFcbiAgICAgICAgbmV3RGVzY0xpc3QucHVzaChkZXNJbmQpXG4gICAgICAgIG5ld0Rlc2NzLnB1c2goQGRlc2NMaXN0W2Rlc0luZF0pXG4gICAgICAgIG9ialsnZGVzYyddID0gbmV3RGVzY0xpc3QubGVuZ3RoLTFcbiAgICAgIGVsc2VcbiAgICAgICAgb2JqWydkZXNjJ10gPSBkZXNjSW5kZXhcbiAgICBvdXRPYmogPSB7J29iaic6IEBwcm9qZWN0T2JqTGlzdCwgJ2Rlc2NzJzogbmV3RGVzY3N9XG4gICAgcHJvamVjdERpcnMgPSBhdG9tLnByb2plY3QuZ2V0UGF0aHMoKVxuICAgIG91dHB1dFBhdGggPSBwYXRoLmpvaW4ocHJvamVjdERpcnNbMF0sICdhY19mb3J0cmFuX2luZGV4Lmpzb24nKVxuICAgIGZkID0gZnMub3BlblN5bmMob3V0cHV0UGF0aCwgJ3crJylcbiAgICBmcy53cml0ZVN5bmMoZmQsIEpTT04uc3RyaW5naWZ5KG91dE9iaikpXG4gICAgZnMuY2xvc2VTeW5jKGZkKVxuICAgIEByZWJ1aWxkSW5kZXgoKVxuXG4gIGdvVG9EZWY6ICh3b3JkLCBlZGl0b3IsIGJ1ZmZlclBvc2l0aW9uKSAtPlxuICAgICMgQnVpbGQgaW5kZXggb24gZmlyc3QgcnVuXG4gICAgaWYgQGZpcnN0UnVuXG4gICAgICBAcmVidWlsZEluZGV4KClcbiAgICAgIEBmaXJzdFJ1biA9IGZhbHNlXG4gICAgQGxvY2FsVXBkYXRlKGVkaXRvciwgYnVmZmVyUG9zaXRpb24ucm93KVxuICAgIHVubGVzcyBAY2hlY2tJbmRleCgpXG4gICAgICBAbm90aWZ5SW5kZXhQZW5kaW5nKCdHbyBUbyBEZWZpbml0aW9uJylcbiAgICAgIHJldHVyblxuICAgIEB1cGRhdGVHbG9iYWxJbmRleCgpXG4gICAgd29yZExvd2VyID0gd29yZC50b0xvd2VyQ2FzZSgpXG4gICAgbGluZVNjb3BlcyA9IEBnZXRMaW5lU2NvcGVzKGVkaXRvciwgYnVmZmVyUG9zaXRpb24pXG4gICAgIyBMb29rIHVwIGNsYXNzIHRyZWVcbiAgICBmdWxsTGluZSA9IEBnZXRGdWxsTGluZShlZGl0b3IsIGJ1ZmZlclBvc2l0aW9uKVxuICAgIGN1cnNvclNjb3BlID0gQGdldENsYXNzU2NvcGUoZnVsbExpbmUsIGxpbmVTY29wZXMpXG4gICAgaWYgY3Vyc29yU2NvcGU/XG4gICAgICBAcmVzb2x2ZUloZXJpdGVkKGN1cnNvclNjb3BlKVxuICAgICAgY29udGFpbmluZ1Njb3BlID0gQGZpbmRJblNjb3BlKGN1cnNvclNjb3BlLCB3b3JkTG93ZXIpXG4gICAgICBpZiBjb250YWluaW5nU2NvcGU/XG4gICAgICAgIEZRTiA9IGNvbnRhaW5pbmdTY29wZStcIjo6XCIrd29yZExvd2VyXG4gICAgICAgIHJldHVybiBAZ2V0RGVmTG9jKEBwcm9qZWN0T2JqTGlzdFtGUU5dKVxuICAgICMgTG9vayBpbiBnbG9iYWwgY29udGV4dFxuICAgIGlmIEBnbG9iYWxPYmpJbmQuaW5kZXhPZih3b3JkTG93ZXIpICE9IC0xXG4gICAgICByZXR1cm4gQGdldERlZkxvYyhAcHJvamVjdE9iakxpc3Rbd29yZExvd2VyXSlcbiAgICAjIExvb2sgaW4gbG9jYWwgc2NvcGVzXG4gICAgZm9yIGxpbmVTY29wZSBpbiBsaW5lU2NvcGVzXG4gICAgICBjb250YWluaW5nU2NvcGUgPSBAZmluZEluU2NvcGUobGluZVNjb3BlLCB3b3JkTG93ZXIpXG4gICAgICBpZiBjb250YWluaW5nU2NvcGU/XG4gICAgICAgIEZRTiA9IGNvbnRhaW5pbmdTY29wZStcIjo6XCIrd29yZExvd2VyXG4gICAgICAgIHJldHVybiBAZ2V0RGVmTG9jKEBwcm9qZWN0T2JqTGlzdFtGUU5dKVxuICAgIHJldHVybiBudWxsXG5cbiAgZ2V0RGVmTG9jOiAodmFyT2JqKSAtPlxuICAgIGZpbGVSZWYgPSB2YXJPYmpbJ2ZpbGUnXVxuICAgIGxpbmVSZWYgPSBudWxsXG4gICAgaWYgJ2ZkZWYnIG9mIHZhck9ialxuICAgICAgbGluZVJlZiA9IHZhck9ialsnZmRlZiddXG4gICAgaWYgJ2Zib3VuZCcgb2YgdmFyT2JqXG4gICAgICBsaW5lUmVmID0gdmFyT2JqWydmYm91bmQnXVswXVxuICAgIGlmIGxpbmVSZWY/XG4gICAgICByZXR1cm4gQG1vZEZpbGVzW2ZpbGVSZWZdK1wiOlwiK2xpbmVSZWYudG9TdHJpbmcoKVxuICAgIHJldHVybiBudWxsXG5cbiAgZ2V0VXNlU3VnZ2VzdGlvbjogKGxpbmUsIHByZWZpeExvd2VyKSAtPlxuICAgIHVzZVJlZ2V4ID0gL15bIFxcdF0qdXNlWyBcXHRdKy9pXG4gICAgd29yZFJlZ2V4ID0gL1thLXowLTlfXSsvZ2lcbiAgICBzdWdnZXN0aW9ucyA9IFtdXG4gICAgaWYgbGluZS5tYXRjaCh1c2VSZWdleCk/XG4gICAgICB1bmxlc3MgcHJlZml4TG93ZXIubWF0Y2god29yZFJlZ2V4KT9cbiAgICAgICAgcHJlZml4TG93ZXIgPSBcIlwiXG4gICAgICBtYXRjaGVzID0gbGluZS5tYXRjaCh3b3JkUmVnZXgpXG4gICAgICBpZiBtYXRjaGVzLmxlbmd0aCA9PSAyXG4gICAgICAgIGlmIHByZWZpeExvd2VyP1xuICAgICAgICAgIGZvciBrZXkgaW4gQGdsb2JhbE9iakluZCB3aGVuIChAcHJvamVjdE9iakxpc3Rba2V5XVsnbmFtZSddLnRvTG93ZXJDYXNlKCkuc3RhcnRzV2l0aChwcmVmaXhMb3dlcikpXG4gICAgICAgICAgICBpZiBAcHJvamVjdE9iakxpc3Rba2V5XVsndHlwZSddICE9IDFcbiAgICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICAgIHN1Z2dlc3Rpb25zLnB1c2goa2V5KVxuICAgICAgICBlbHNlXG4gICAgICAgICAgZm9yIGtleSBpbiBAZ2xvYmFsT2JqSW5kXG4gICAgICAgICAgICBzdWdnZXN0aW9ucy5wdXNoKGtleSlcbiAgICAgIGVsc2UgaWYgbWF0Y2hlcy5sZW5ndGggPiAyXG4gICAgICAgIG1vZE5hbWUgPSBtYXRjaGVzWzFdXG4gICAgICAgIHN1Z2dlc3Rpb25zID0gQGFkZFB1YmxpY0NoaWxkcmVuKG1vZE5hbWUsIHN1Z2dlc3Rpb25zLCBwcmVmaXhMb3dlciwgW10pXG4gICAgcmV0dXJuIHN1Z2dlc3Rpb25zICMgVW5rbm93biBlbmFibGUgZXZlcnl0aGluZyEhISFcblxuICBnZXRGdWxsTGluZTogKGVkaXRvciwgYnVmZmVyUG9zaXRpb24pIC0+XG4gICAgZml4ZWRSZWdleCA9IC9bYS16MC05X10qXFwuRig3N3xPUnxQUCk/JC9pICMgZixGLGY3NyxGNzcsZm9yLEZPUixmcHAsRlBQXG4gICAgZml4ZWRDb21tUmVnZXggPSAvXiAgICAgW1xcU10vaVxuICAgIGZyZWVDb21tUmVnZXggPSAvJlsgXFx0XSokL2lcbiAgICBsaW5lID0gZWRpdG9yLmdldFRleHRJblJhbmdlKFtbYnVmZmVyUG9zaXRpb24ucm93LCAwXSwgYnVmZmVyUG9zaXRpb25dKVxuICAgICNcbiAgICBmaXhlZEZvcm0gPSBmYWxzZVxuICAgIGlmIGVkaXRvci5nZXRQYXRoKCkubWF0Y2goZml4ZWRSZWdleClcbiAgICAgIGZpeGVkRm9ybSA9IHRydWVcbiAgICBwUm93ID0gYnVmZmVyUG9zaXRpb24ucm93IC0gMVxuICAgIHdoaWxlIHBSb3cgPj0gMFxuICAgICAgcExpbmUgPSBlZGl0b3IubGluZVRleHRGb3JCdWZmZXJSb3cocFJvdylcbiAgICAgIHBMaW5lID0gcExpbmUuc3BsaXQoJyEnKVswXVxuICAgICAgaWYgZml4ZWRGb3JtXG4gICAgICAgIHVubGVzcyBsaW5lLm1hdGNoKGZpeGVkQ29tbVJlZ2V4KVxuICAgICAgICAgIGJyZWFrXG4gICAgICBlbHNlXG4gICAgICAgIHVubGVzcyBwTGluZS5tYXRjaChmcmVlQ29tbVJlZ2V4KVxuICAgICAgICAgIGJyZWFrXG4gICAgICBsaW5lID0gcExpbmUuc3BsaXQoJyYnKVswXSArIGxpbmVcbiAgICAgIHBSb3cgPSBwUm93IC0gMVxuICAgIHJldHVybiBsaW5lXG5cbiAgZ2V0TGluZUNvbnRleHQ6IChsaW5lKSAtPlxuICAgIHVzZVJlZ2V4ID0gL15bIFxcdF0qVVNFWyBcXHRdL2lcbiAgICBzdWJEZWZSZWdleCA9IC9eWyBcXHRdKihQVVJFfEVMRU1FTlRBTHxSRUNVUlNJVkUpKlsgXFx0XSooTU9EVUxFfFBST0dSQU18U1VCUk9VVElORXxGVU5DVElPTilbIFxcdF0vaVxuICAgIHR5cGVEZWZSZWdleCA9IC9eWyBcXHRdKihDTEFTU3xUWVBFKVsgXFx0XSooSVMpP1sgXFx0XSpcXCgvaVxuICAgIGNhbGxSZWdleCA9IC9eWyBcXHRdKkNBTExbIFxcdF0rW2EtejAtOV8lXSokL2lcbiAgICBkZWFsbG9jUmVnZXggPSAvXlsgXFx0XSpERUFMTE9DQVRFWyBcXHRdKlxcKC9pXG4gICAgbnVsbGlmeVJlZ2V4ID0gL15bIFxcdF0qTlVMTElGWVsgXFx0XSpcXCgvaVxuICAgIGlmIGxpbmUubWF0Y2goY2FsbFJlZ2V4KT9cbiAgICAgIHJldHVybiA0XG4gICAgaWYgbGluZS5tYXRjaChkZWFsbG9jUmVnZXgpP1xuICAgICAgcmV0dXJuIDVcbiAgICBpZiBsaW5lLm1hdGNoKG51bGxpZnlSZWdleCk/XG4gICAgICByZXR1cm4gNlxuICAgIGlmIGxpbmUubWF0Y2godXNlUmVnZXgpP1xuICAgICAgcmV0dXJuIDFcbiAgICBpZiBsaW5lLm1hdGNoKHVzZVJlZ2V4KT9cbiAgICAgIHJldHVybiAyXG4gICAgaWYgbGluZS5tYXRjaCh0eXBlRGVmUmVnZXgpP1xuICAgICAgcmV0dXJuIDNcbiAgICByZXR1cm4gMFxuXG4gIGdldExpbmVTY29wZXM6IChlZGl0b3IsIGJ1ZmZlclBvc2l0aW9uKSAtPlxuICAgIGZpbGVQYXRoID0gZWRpdG9yLmdldFBhdGgoKVxuICAgIHNjb3BlcyA9IFtdXG4gICAgdW5sZXNzIEBmaWxlT2JqSW5kW2ZpbGVQYXRoXT9cbiAgICAgIHJldHVybiBbXVxuICAgIGZvciBrZXkgaW4gQGZpbGVPYmpJbmRbZmlsZVBhdGhdICMgTG9vayBpbiBjdXJyZW50bHkgYWN0aXZlIGZpbGUgZm9yIGVuY2xvc2luZyBzY29wZXNcbiAgICAgIGlmIGtleSBvZiBAcHJvamVjdE9iakxpc3RcbiAgICAgICAgaWYgYnVmZmVyUG9zaXRpb24ucm93KzEgPCBAcHJvamVjdE9iakxpc3Rba2V5XVsnZmJvdW5kJ11bMF1cbiAgICAgICAgICBjb250aW51ZVxuICAgICAgICBpZiBidWZmZXJQb3NpdGlvbi5yb3crMSA+IEBwcm9qZWN0T2JqTGlzdFtrZXldWydmYm91bmQnXVsxXVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIHNjb3Blcy5wdXNoKGtleSlcbiAgICByZXR1cm4gc2NvcGVzXG5cbiAgZmluZEluU2NvcGU6IChzY29wZSwgbmFtZSkgLT5cbiAgICBGUU4gPSBzY29wZSArICc6OicgKyBuYW1lXG4gICAgaWYgRlFOIG9mIEBwcm9qZWN0T2JqTGlzdFxuICAgICAgcmV0dXJuIHNjb3BlXG4gICAgc2NvcGVPYmogPSBAcHJvamVjdE9iakxpc3Rbc2NvcGVdXG4gICAgdW5sZXNzIHNjb3BlT2JqP1xuICAgICAgcmV0dXJuIG51bGxcbiAgICAjIENoZWNrIGluaGVyaXRlZFxuICAgIGlmICdpbl9tZW0nIG9mIHNjb3BlT2JqXG4gICAgICBmb3IgY2hpbGRLZXkgaW4gc2NvcGVPYmpbJ2luX21lbSddXG4gICAgICAgIGNoaWxkU2NvcGVzID0gY2hpbGRLZXkuc3BsaXQoJzo6JylcbiAgICAgICAgY2hpbGROYW1lID0gY2hpbGRTY29wZXMucG9wKClcbiAgICAgICAgaWYgY2hpbGROYW1lID09IG5hbWVcbiAgICAgICAgICByZXR1cm4gY2hpbGRTY29wZXMuam9pbignOjonKVxuICAgICMgU2VhcmNoIGluIHVzZVxuICAgIHJlc3VsdCA9IG51bGxcbiAgICB1c2VkTW9kID0gQGdldFVzZVNlYXJjaGVzKHNjb3BlLCB7IH0sIFtdKVxuICAgIGZvciB1c2VNb2Qgb2YgdXNlZE1vZFxuICAgICAgaWYgdXNlZE1vZFt1c2VNb2RdLmxlbmd0aCA+IDBcbiAgICAgICAgaWYgdXNlZE1vZFt1c2VNb2RdLmluZGV4T2YobmFtZSkgPT0gLTFcbiAgICAgICAgICBjb250aW51ZVxuICAgICAgcmVzdWx0ID0gQGZpbmRJblNjb3BlKHVzZU1vZCwgbmFtZSlcbiAgICAgIGlmIHJlc3VsdD9cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgICMgU2VhcmNoIHBhcmVudFxuICAgIGlmIG5vdCByZXN1bHQ/XG4gICAgICBlbmRPZlNjb3BlID0gc2NvcGUubGFzdEluZGV4T2YoJzo6JylcbiAgICAgIGlmIGVuZE9mU2NvcGUgPj0wXG4gICAgICAgIG5ld1Njb3BlID0gc2NvcGUuc3Vic3RyaW5nKDAsZW5kT2ZTY29wZSlcbiAgICAgICAgcmVzdWx0ID0gQGZpbmRJblNjb3BlKG5ld1Njb3BlLCBuYW1lKVxuICAgIHJldHVybiByZXN1bHRcblxuICBnZXRWYXJUeXBlOiAodmFyS2V5KSAtPlxuICAgIHZhckRlc2MgPSBAZGVzY0xpc3RbQHByb2plY3RPYmpMaXN0W3ZhcktleV1bJ2Rlc2MnXV1cbiAgICB0eXBlRGVmID0gdmFyRGVzYy50b0xvd2VyQ2FzZSgpXG4gICAgaTEgPSB0eXBlRGVmLmluZGV4T2YoJygnKVxuICAgIGkyID0gdHlwZURlZi5pbmRleE9mKCcpJylcbiAgICByZXR1cm4gdHlwZURlZi5zdWJzdHJpbmcoaTErMSxpMilcblxuICBnZXRDbGFzc1Njb3BlOiAobGluZSwgY3VyclNjb3BlcykgLT5cbiAgICB0eXBlRGVyZWZDaGVjayA9IC8lL2lcbiAgICBvYmpCcmVha1JlZyA9IC9bXFwvXFwtKC4sKyo8Pj0kOl0vaWdcbiAgICBwYXJlblJlcFJlZyA9IC9cXCgoLispXFwpL2lnXG4gICAgI1xuICAgIHVubGVzcyBsaW5lLm1hdGNoKHR5cGVEZXJlZkNoZWNrKT9cbiAgICAgIHJldHVybiBudWxsXG4gICAgcGFyZW5Db3VudCA9IDBcbiAgICBsaW5lQ29weSA9IGxpbmVcbiAgICBmb3IgaSBpbiBbMC4ubGluZUNvcHkubGVuZ3RoLTFdXG4gICAgICBjdXJyQ2hhciA9IGxpbmVDb3B5W2xpbmVDb3B5Lmxlbmd0aC1pLTFdXG4gICAgICBpZiBwYXJlbkNvdW50ID09IDAgYW5kIGN1cnJDaGFyLm1hdGNoKG9iakJyZWFrUmVnKVxuICAgICAgICBsaW5lID0gbGluZUNvcHkuc3Vic3RyaW5nKGxpbmVDb3B5Lmxlbmd0aC1pKVxuICAgICAgICBicmVha1xuICAgICAgaWYgY3VyckNoYXIgPT0gJygnXG4gICAgICAgIHBhcmVuQ291bnQgLT0gMVxuICAgICAgaWYgY3VyckNoYXIgPT0gJyknXG4gICAgICAgIHBhcmVuQ291bnQgKz0gMVxuICAgIHNlYXJjaFNjb3BlID0gbnVsbFxuICAgIGlmIGxpbmUubWF0Y2godHlwZURlcmVmQ2hlY2spP1xuICAgICAgbGluZU5vUGFyZW4xID0gbGluZS5yZXBsYWNlKHBhcmVuUmVwUmVnLCckJylcbiAgICAgIGxpbmVOb1BhcmVuID0gbGluZU5vUGFyZW4xLnJlcGxhY2UoL1xcJCUvaSwnJScpXG4gICAgICBsaW5lQ29tbUJyZWFrID0gbGluZU5vUGFyZW4ucmVwbGFjZShvYmpCcmVha1JlZywgJyAnKVxuICAgICAgbGFzdFNwYWNlID0gbGluZUNvbW1CcmVhay5sYXN0SW5kZXhPZignICcpXG4gICAgICBpZiBsYXN0U3BhY2UgPj0wXG4gICAgICAgIGxpbmVOb1BhcmVuID0gbGluZUNvbW1CcmVhay5zdWJzdHJpbmcobGFzdFNwYWNlKzEpXG4gICAgICBzcGxpdExpbmUgPSBsaW5lTm9QYXJlbi5zcGxpdCgnJScpXG4gICAgICBwcmVmaXhWYXIgPSBzcGxpdExpbmUucG9wKClcbiAgICAgIGZvciB2YXJOYW1lIGluIHNwbGl0TGluZVxuICAgICAgICB2YXJOYW1lTG93ZXIgPSB2YXJOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICAgaWYgc2VhcmNoU2NvcGU/XG4gICAgICAgICAgQHJlc29sdmVJaGVyaXRlZChzZWFyY2hTY29wZSlcbiAgICAgICAgICBjb250YWluaW5nU2NvcGUgPSBAZmluZEluU2NvcGUoc2VhcmNoU2NvcGUsIHZhck5hbWVMb3dlcilcbiAgICAgICAgICBpZiBjb250YWluaW5nU2NvcGU/XG4gICAgICAgICAgICB2YXJLZXkgPSBjb250YWluaW5nU2NvcGUgKyBcIjo6XCIgKyB2YXJOYW1lTG93ZXJcbiAgICAgICAgICAgIGlmIEBwcm9qZWN0T2JqTGlzdFt2YXJLZXldWyd0eXBlJ10gPT0gNlxuICAgICAgICAgICAgICB2YXJEZWZOYW1lID0gQGdldFZhclR5cGUodmFyS2V5KVxuICAgICAgICAgICAgICBpTGFzdCA9IGNvbnRhaW5pbmdTY29wZS5sYXN0SW5kZXhPZihcIjo6XCIpXG4gICAgICAgICAgICAgIHR5cGVTY29wZSA9IGNvbnRhaW5pbmdTY29wZVxuICAgICAgICAgICAgICBpZiBpTGFzdCA+IC0xXG4gICAgICAgICAgICAgICAgdHlwZVNjb3BlID0gY29udGFpbmluZ1Njb3BlLnN1YnN0cmluZygwLGlMYXN0KVxuICAgICAgICAgICAgICBjb250YWluaW5nU2NvcGUgPSBAZmluZEluU2NvcGUodHlwZVNjb3BlLCB2YXJEZWZOYW1lKVxuICAgICAgICAgICAgICBzZWFyY2hTY29wZSA9IGNvbnRhaW5pbmdTY29wZSArICc6OicgKyB2YXJEZWZOYW1lXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGZvciBjdXJyU2NvcGUgaW4gY3VyclNjb3Blc1xuICAgICAgICAgICAgQHJlc29sdmVJaGVyaXRlZChjdXJyU2NvcGUpXG4gICAgICAgICAgICBjb250YWluaW5nU2NvcGUgPSBAZmluZEluU2NvcGUoY3VyclNjb3BlLCB2YXJOYW1lTG93ZXIpXG4gICAgICAgICAgICBpZiBjb250YWluaW5nU2NvcGU/XG4gICAgICAgICAgICAgIHZhcktleSA9IGNvbnRhaW5pbmdTY29wZSArIFwiOjpcIiArIHZhck5hbWVMb3dlclxuICAgICAgICAgICAgICBpZiBAcHJvamVjdE9iakxpc3RbdmFyS2V5XVsndHlwZSddID09IDZcbiAgICAgICAgICAgICAgICB2YXJEZWZOYW1lID0gQGdldFZhclR5cGUodmFyS2V5KVxuICAgICAgICAgICAgICAgIGlMYXN0ID0gY29udGFpbmluZ1Njb3BlLmxhc3RJbmRleE9mKFwiOjpcIilcbiAgICAgICAgICAgICAgICB0eXBlU2NvcGUgPSBjb250YWluaW5nU2NvcGVcbiAgICAgICAgICAgICAgICBpZiBpTGFzdCA+IC0xXG4gICAgICAgICAgICAgICAgICB0eXBlU2NvcGUgPSBjb250YWluaW5nU2NvcGUuc3Vic3RyaW5nKDAsaUxhc3QpXG4gICAgICAgICAgICAgICAgY29udGFpbmluZ1Njb3BlID0gQGZpbmRJblNjb3BlKHR5cGVTY29wZSwgdmFyRGVmTmFtZSlcbiAgICAgICAgICAgICAgICBzZWFyY2hTY29wZSA9IGNvbnRhaW5pbmdTY29wZSArICc6OicgKyB2YXJEZWZOYW1lXG4gICAgICAgICAgICAgIGJyZWFrXG4gICAgcmV0dXJuIHNlYXJjaFNjb3BlICMgVW5rbm93biBlbmFibGUgZXZlcnl0aGluZyEhISFcblxuICBhZGRDaGlsZHJlbjogKHNjb3BlLCBjb21wbGV0aW9ucywgcHJlZml4LCBvbmx5TGlzdCkgLT5cbiAgICBzY29wZU9iaiA9IEBwcm9qZWN0T2JqTGlzdFtzY29wZV1cbiAgICB1bmxlc3Mgc2NvcGVPYmo/XG4gICAgICByZXR1cm4gY29tcGxldGlvbnNcbiAgICBjaGlsZHJlbiA9IHNjb3BlT2JqWydtZW0nXVxuICAgIHVubGVzcyBjaGlsZHJlbj9cbiAgICAgIHJldHVyblxuICAgIGZvciBjaGlsZCBpbiBjaGlsZHJlblxuICAgICAgY2hpbGRMb3dlciA9IGNoaWxkLnRvTG93ZXJDYXNlKClcbiAgICAgIGlmIHByZWZpeD9cbiAgICAgICAgdW5sZXNzIGNoaWxkTG93ZXIuc3RhcnRzV2l0aChwcmVmaXgpXG4gICAgICAgICAgY29udGludWVcbiAgICAgIGlmIG9ubHlMaXN0Lmxlbmd0aCA+IDBcbiAgICAgICAgaWYgb25seUxpc3QuaW5kZXhPZihjaGlsZExvd2VyKSA9PSAtMVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICBjaGlsZEtleSA9IHNjb3BlKyc6OicrY2hpbGRMb3dlclxuICAgICAgaWYgY2hpbGRLZXkgb2YgQHByb2plY3RPYmpMaXN0XG4gICAgICAgIGNvbXBsZXRpb25zLnB1c2goY2hpbGRLZXkpXG4gICAgIyBBZGQgaW5oZXJpdGVkXG4gICAgQHJlc29sdmVJaGVyaXRlZChzY29wZSlcbiAgICBpZiAnaW5fbWVtJyBvZiBzY29wZU9ialxuICAgICAgZm9yIGNoaWxkS2V5IGluIHNjb3BlT2JqWydpbl9tZW0nXVxuICAgICAgICBjb21wbGV0aW9ucy5wdXNoKGNoaWxkS2V5KVxuICAgIHJldHVybiBjb21wbGV0aW9uc1xuXG4gIGdldFVzZVNlYXJjaGVzOiAoc2NvcGUsIG1vZERpY3QsIG9ubHlMaXN0KSAtPlxuICAgICMgUHJvY2VzcyBVU0UgU1RNVCAob25seSBpZiBubyBvbmx5TGlzdClcbiAgICB1c2VMaXN0ID0gQHByb2plY3RPYmpMaXN0W3Njb3BlXVsndXNlJ11cbiAgICBpZiB1c2VMaXN0P1xuICAgICAgZm9yIHVzZU1vZCBpbiB1c2VMaXN0XG4gICAgICAgIGlmIHVzZU1vZFswXSBvZiBAcHJvamVjdE9iakxpc3RcbiAgICAgICAgICBtZXJnZWRPbmx5ID0gQGdldE9ubHlPdmVybGFwKG9ubHlMaXN0LCB1c2VNb2RbMV0pXG4gICAgICAgICAgdW5sZXNzIG1lcmdlZE9ubHk/XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICAgIGlmIHVzZU1vZFswXSBvZiBtb2REaWN0XG4gICAgICAgICAgICBpZiBtb2REaWN0W3VzZU1vZFswXV0ubGVuZ3RoID4gMFxuICAgICAgICAgICAgICBpZiBtZXJnZWRPbmx5Lmxlbmd0aCA9PSAwXG4gICAgICAgICAgICAgICAgbW9kRGljdFt1c2VNb2RbMF1dID0gW11cbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGZvciBvbmx5IGluIG1lcmdlZE9ubHlcbiAgICAgICAgICAgICAgICAgIGlmIG1vZERpY3RbdXNlTW9kWzBdXS5pbmRleE9mKG9ubHkpID09IC0xXG4gICAgICAgICAgICAgICAgICAgIG1vZERpY3RbdXNlTW9kWzBdXS5wdXNoKG9ubHkpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgbW9kRGljdFt1c2VNb2RbMF1dID0gbWVyZ2VkT25seVxuICAgICAgICAgIG1vZERpY3QgPSBAZ2V0VXNlU2VhcmNoZXModXNlTW9kWzBdLCBtb2REaWN0LCBtZXJnZWRPbmx5KVxuICAgIHJldHVybiBtb2REaWN0XG5cbiAgZ2V0T25seU92ZXJsYXA6IChjdXJyTGlzdCwgbmV3TGlzdCkgLT5cbiAgICBpZiBjdXJyTGlzdC5sZW5ndGggPT0gMFxuICAgICAgcmV0dXJuIG5ld0xpc3RcbiAgICBpZiBuZXdMaXN0Lmxlbmd0aCA9PSAwXG4gICAgICByZXR1cm4gY3Vyckxpc3RcbiAgICBtZXJnZUxpc3QgPSBbXVxuICAgIGhhc092ZXJsYXAgPSBmYWxzZVxuICAgIGZvciBlbGVtIGluIG5ld0xpc3RcbiAgICAgIHVubGVzcyBjdXJyTGlzdC5pbmRleE9mKGVsZW0pID09IC0xXG4gICAgICAgIG1lcmdlTGlzdC5wdXNoKGVsZW0pXG4gICAgICAgIGhhc092ZXJsYXAgPSB0cnVlXG4gICAgaWYgaGFzT3ZlcmxhcFxuICAgICAgcmV0dXJuIG1lcmdlTGlzdFxuICAgIGVsc2VcbiAgICAgIHJldHVybiBudWxsXG5cbiAgYWRkUHVibGljQ2hpbGRyZW46IChzY29wZSwgY29tcGxldGlvbnMsIHByZWZpeCwgb25seUxpc3QpIC0+XG4gICAgc2NvcGVPYmogPSBAcHJvamVjdE9iakxpc3Rbc2NvcGVdXG4gICAgdW5sZXNzIHNjb3BlT2JqP1xuICAgICAgcmV0dXJuIGNvbXBsZXRpb25zXG4gICAgY2hpbGRyZW4gPSBzY29wZU9ialsnbWVtJ11cbiAgICB1bmxlc3MgY2hpbGRyZW4/XG4gICAgICByZXR1cm5cbiAgICBjdXJyVmlzID0gMVxuICAgIGlmICd2aXMnIG9mIHNjb3BlT2JqXG4gICAgICBjdXJyVmlzID0gcGFyc2VJbnQoc2NvcGVPYmpbJ3ZpcyddKVxuICAgIGZvciBjaGlsZCBpbiBjaGlsZHJlblxuICAgICAgY2hpbGRMb3dlciA9IGNoaWxkLnRvTG93ZXJDYXNlKClcbiAgICAgIGlmIHByZWZpeD9cbiAgICAgICAgdW5sZXNzIGNoaWxkTG93ZXIuc3RhcnRzV2l0aChwcmVmaXgpXG4gICAgICAgICAgY29udGludWVcbiAgICAgIGlmIG9ubHlMaXN0Lmxlbmd0aCA+IDBcbiAgICAgICAgaWYgb25seUxpc3QuaW5kZXhPZihjaGlsZExvd2VyKSA9PSAtMVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICBjaGlsZEtleSA9IHNjb3BlKyc6OicrY2hpbGRMb3dlclxuICAgICAgY2hpbGRPYmogPSBAcHJvamVjdE9iakxpc3RbY2hpbGRLZXldXG4gICAgICBpZiBjaGlsZE9iaj9cbiAgICAgICAgaWYgJ3Zpcycgb2YgY2hpbGRPYmpcbiAgICAgICAgICBpZiBwYXJzZUludChjaGlsZE9ialsndmlzJ10pICsgY3VyclZpcyA8IDBcbiAgICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpZiBjdXJyVmlzIDwgMFxuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgY29tcGxldGlvbnMucHVzaChjaGlsZEtleSlcbiAgICAjIEFkZCBpbmhlcml0ZWRcbiAgICBAcmVzb2x2ZUloZXJpdGVkKHNjb3BlKVxuICAgIGlmICdpbl9tZW0nIG9mIHNjb3BlT2JqXG4gICAgICBmb3IgY2hpbGRLZXkgaW4gc2NvcGVPYmpbJ2luX21lbSddXG4gICAgICAgIGNvbXBsZXRpb25zLnB1c2goY2hpbGRLZXkpXG4gICAgcmV0dXJuIGNvbXBsZXRpb25zXG5cbiAgcmVzb2x2ZUludGVyZmFjZTogKGludE9iaktleSkgLT5cbiAgICBpbnRPYmogPSBAcHJvamVjdE9iakxpc3RbaW50T2JqS2V5XVxuICAgIGlmICdyZXNfbWVtJyBvZiBpbnRPYmpcbiAgICAgIHJldHVyblxuICAgIGVuY2xvc2luZ1Njb3BlID0gQGdldEVuY2xvc2luZ1Njb3BlKGludE9iaktleSlcbiAgICB1bmxlc3MgZW5jbG9zaW5nU2NvcGU/XG4gICAgICByZXR1cm5cbiAgICByZXNvbHZlZENoaWxkcmVuID0gW11cbiAgICBjaGlsZHJlbiA9IGludE9ialsnbWVtJ11cbiAgICBmb3IgY29weUtleSBpbiBjaGlsZHJlblxuICAgICAgcmVzb2x2ZWRTY29wZSA9IEBmaW5kSW5TY29wZShlbmNsb3NpbmdTY29wZSwgY29weUtleSlcbiAgICAgIGlmIHJlc29sdmVkU2NvcGU/XG4gICAgICAgIHJlc29sdmVkQ2hpbGRyZW4ucHVzaChyZXNvbHZlZFNjb3BlK1wiOjpcIitjb3B5S2V5KVxuICAgIGludE9ialsncmVzX21lbSddID0gcmVzb2x2ZWRDaGlsZHJlblxuXG4gIHJlc29sdmVMaW5rOiAob2JqS2V5KSAtPlxuICAgIHZhck9iaiA9IEBwcm9qZWN0T2JqTGlzdFtvYmpLZXldXG4gICAgbGlua0tleSA9IHZhck9ialsnbGluayddXG4gICAgdW5sZXNzIGxpbmtLZXk/XG4gICAgICByZXR1cm5cbiAgICBpZiAncmVzX2xpbmsnIG9mIHZhck9ialxuICAgICAgcmV0dXJuXG4gICAgZW5jbG9zaW5nU2NvcGUgPSBAZ2V0RW5jbG9zaW5nU2NvcGUob2JqS2V5KVxuICAgIHVubGVzcyBlbmNsb3NpbmdTY29wZT9cbiAgICAgIHJldHVyblxuICAgIHJlc29sdmVkU2NvcGUgPSBAZmluZEluU2NvcGUoZW5jbG9zaW5nU2NvcGUsIGxpbmtLZXkpXG4gICAgaWYgcmVzb2x2ZWRTY29wZT9cbiAgICAgIHZhck9ialsncmVzX2xpbmsnXSA9IHJlc29sdmVkU2NvcGUrXCI6OlwiK2xpbmtLZXlcblxuICBhZGRDaGlsZDogKHNjb3BlS2V5LCBjaGlsZEtleSkgLT5cbiAgICBpZiAnY2hsZCcgb2YgQHByb2plY3RPYmpMaXN0W3Njb3BlS2V5XVxuICAgICAgaWYgQHByb2plY3RPYmpMaXN0W3Njb3BlS2V5XVsnY2hsZCddLmluZGV4T2YoY2hpbGRLZXkpID09IC0xXG4gICAgICAgIEBwcm9qZWN0T2JqTGlzdFtzY29wZUtleV1bJ2NobGQnXS5wdXNoKGNoaWxkS2V5KVxuICAgIGVsc2VcbiAgICAgIEBwcm9qZWN0T2JqTGlzdFtzY29wZUtleV1bJ2NobGQnXSA9IFtjaGlsZEtleV1cblxuICByZXNldEluaGVyaXQ6IChjbGFzc09iaikgLT5cbiAgICBpZiAnaW5fbWVtJyBvZiBjbGFzc09ialxuICAgICAgZGVsZXRlIGNsYXNzT2JqWydpbl9tZW0nXVxuICAgIGlmICdyZXNfcGFyZW50JyBvZiBjbGFzc09ialxuICAgICAgZGVsZXRlIGNsYXNzT2JqWydyZXNfcGFyZW50J11cbiAgICBpZiAnY2hsZCcgb2YgY2xhc3NPYmpcbiAgICAgIGZvciBjaGlsZEtleSBvZiBjbGFzc09ialsnY2hsZCddXG4gICAgICAgIGNoaWxkT2JqID0gIEBwcm9qZWN0T2JqTGlzdFtjaGlsZEtleV1cbiAgICAgICAgaWYgY2hpbGRPYmo/XG4gICAgICAgICAgQHJlc2V0SW5oZXJpdChjaGlsZE9iailcblxuICByZXNvbHZlSWhlcml0ZWQ6IChzY29wZSkgLT5cbiAgICBjbGFzc09iaiA9IEBwcm9qZWN0T2JqTGlzdFtzY29wZV1cbiAgICBpZiAnaW5fbWVtJyBvZiBjbGFzc09ialxuICAgICAgcmV0dXJuXG4gICAgdW5sZXNzICdwYXJlbnQnIG9mIGNsYXNzT2JqXG4gICAgICByZXR1cm5cbiAgICB1bmxlc3MgJ3Jlc19wYXJlbnQnIG9mIGNsYXNzT2JqXG4gICAgICBwYXJlbnROYW1lID0gY2xhc3NPYmpbJ3BhcmVudCddXG4gICAgICByZXNvbHZlZFNjb3BlID0gQGZpbmRJblNjb3BlKHNjb3BlLCBwYXJlbnROYW1lKVxuICAgICAgaWYgcmVzb2x2ZWRTY29wZT9cbiAgICAgICAgY2xhc3NPYmpbJ3Jlc19wYXJlbnQnXSA9IHJlc29sdmVkU2NvcGUrXCI6OlwiK3BhcmVudE5hbWVcbiAgICAgIGVsc2VcbiAgICAgICAgcmV0dXJuXG4gICAgIyBMb2FkIGZyb20gcGFyZW50IGNsYXNzXG4gICAgcGFyZW50S2V5ID0gY2xhc3NPYmpbJ3Jlc19wYXJlbnQnXVxuICAgIHBhcmVudE9iaiA9IEBwcm9qZWN0T2JqTGlzdFtwYXJlbnRLZXldXG4gICAgaWYgcGFyZW50T2JqP1xuICAgICAgQGFkZENoaWxkKHBhcmVudEtleSwgc2NvcGUpXG4gICAgICBAcmVzb2x2ZUloZXJpdGVkKHBhcmVudEtleSlcbiAgICAgICNcbiAgICAgIGNsYXNzT2JqWydpbl9tZW0nXSA9IFtdXG4gICAgICBpZiAnbWVtJyBvZiBjbGFzc09ialxuICAgICAgICBjbGFzc0NoaWxkcmVuID0gY2xhc3NPYmpbJ21lbSddXG4gICAgICBlbHNlXG4gICAgICAgIGNsYXNzQ2hpbGRyZW4gPSBbXVxuICAgICAgaWYgJ21lbScgb2YgcGFyZW50T2JqXG4gICAgICAgIGZvciBjaGlsZEtleSBpbiBwYXJlbnRPYmpbJ21lbSddXG4gICAgICAgICAgaWYgY2xhc3NDaGlsZHJlbi5pbmRleE9mKGNoaWxkS2V5KSA9PSAtMVxuICAgICAgICAgICAgY2xhc3NPYmpbJ2luX21lbSddLnB1c2gocGFyZW50S2V5Kyc6OicrY2hpbGRLZXkpXG4gICAgICBpZiAnaW5fbWVtJyBvZiBwYXJlbnRPYmpcbiAgICAgICAgZm9yIGNoaWxkS2V5IGluIHBhcmVudE9ialsnaW5fbWVtJ11cbiAgICAgICAgICBjaGlsZE5hbWUgPSBjaGlsZEtleS5zcGxpdCgnOjonKS5wb3AoKVxuICAgICAgICAgIGlmIGNsYXNzQ2hpbGRyZW4uaW5kZXhPZihjaGlsZE5hbWUpID09IC0xXG4gICAgICAgICAgICBjbGFzc09ialsnaW5fbWVtJ10ucHVzaChjaGlsZEtleSlcbiAgICByZXR1cm5cblxuICBnZXRFbmNsb3NpbmdTY29wZTogKG9iaktleSkgLT5cbiAgICBmaW5hbFNlcCA9IG9iaktleS5sYXN0SW5kZXhPZignOjonKVxuICAgIGlmIGZpbmFsU2VwID09IC0xXG4gICAgICByZXR1cm4gbnVsbFxuICAgIHJldHVybiBvYmpLZXkuc3Vic3RyaW5nKDAsZmluYWxTZXApXG5cbiAgYnVpbGRDb21wbGV0aW9uTGlzdDogKHN1Z2dlc3Rpb25zLCBjb250ZXh0RmlsdGVyPTApIC0+XG4gICAgc3ViVGVzdFJlZ2V4ID0gL14oVFlQfENMQXxQUk8pL2lcbiAgICB0eXBSZWdleCA9IC9eKFRZUHxDTEEpL2lcbiAgICBjb21wbGV0aW9ucyA9IFtdXG4gICAgZm9yIHN1Z2dlc3Rpb24gaW4gc3VnZ2VzdGlvbnNcbiAgICAgIGNvbXBPYmogPSBAcHJvamVjdE9iakxpc3Rbc3VnZ2VzdGlvbl1cbiAgICAgIGlmIGNvbnRleHRGaWx0ZXIgPT0gMyBhbmQgY29tcE9ialsndHlwZSddICE9IDRcbiAgICAgICAgY29udGludWVcbiAgICAgIGlmIGNvbnRleHRGaWx0ZXIgPT0gNFxuICAgICAgICBpZiBjb21wT2JqWyd0eXBlJ10gPT0gMyBvciBjb21wT2JqWyd0eXBlJ10gPT0gNFxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIGlmIGNvbXBPYmpbJ3R5cGUnXSA9PSA2XG4gICAgICAgICAgdW5sZXNzIEBkZXNjTGlzdFtjb21wT2JqWydkZXNjJ11dLm1hdGNoKHN1YlRlc3RSZWdleCk/XG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgaWYgY29udGV4dEZpbHRlciA9PSA1IG9yIGNvbnRleHRGaWx0ZXIgPT0gNlxuICAgICAgICBpZiBjb21wT2JqWyd0eXBlJ10gPT0gNlxuICAgICAgICAgIG1vZExpc3QgPSBjb21wT2JqWydtb2RzJ11cbiAgICAgICAgICBpc1BvaW50ID0gZmFsc2VcbiAgICAgICAgICBpc0FsbG9jID0gZmFsc2VcbiAgICAgICAgICBpZiBtb2RMaXN0P1xuICAgICAgICAgICAgaXNQb2ludCA9IChtb2RMaXN0LmluZGV4T2YoMSkgPiAtMSlcbiAgICAgICAgICAgIGlmIGNvbnRleHRGaWx0ZXIgPT0gNVxuICAgICAgICAgICAgICBpc0FsbG9jID0gKG1vZExpc3QuaW5kZXhPZigyKSA+IC0xKVxuICAgICAgICAgIGlzVHlwZSA9IEBkZXNjTGlzdFtjb21wT2JqWydkZXNjJ11dLm1hdGNoKHR5cFJlZ2V4KT9cbiAgICAgICAgICB1bmxlc3MgKGlzUG9pbnQgb3IgaXNBbGxvYyBvciBpc1R5cGUpXG4gICAgICAgICAgICBjb250aW51ZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgY29udGludWVcbiAgICAgIGlmIGNvbXBPYmpbJ3R5cGUnXSA9PSA3XG4gICAgICAgIEByZXNvbHZlSW50ZXJmYWNlKHN1Z2dlc3Rpb24pXG4gICAgICAgIHJlcE5hbWUgPSBjb21wT2JqWyduYW1lJ11cbiAgICAgICAgZm9yIGNvcHlLZXkgaW4gY29tcE9ialsncmVzX21lbSddXG4gICAgICAgICAgY29tcGxldGlvbnMucHVzaChAYnVpbGRDb21wbGV0aW9uKEBwcm9qZWN0T2JqTGlzdFtjb3B5S2V5XSwgcmVwTmFtZSkpXG4gICAgICBlbHNlXG4gICAgICAgIGlmICdsaW5rJyBvZiBjb21wT2JqXG4gICAgICAgICAgQHJlc29sdmVMaW5rKHN1Z2dlc3Rpb24pXG4gICAgICAgICAgcmVwTmFtZSA9IGNvbXBPYmpbJ25hbWUnXVxuICAgICAgICAgIGNvcHlLZXkgPSBjb21wT2JqWydyZXNfbGluayddXG4gICAgICAgICAgaWYgY29weUtleT9cbiAgICAgICAgICAgIGRvUGFzcyA9IEB0ZXN0UGFzcyhjb21wT2JqKVxuICAgICAgICAgICAgY29tcGxldGlvbnMucHVzaChAYnVpbGRDb21wbGV0aW9uKEBwcm9qZWN0T2JqTGlzdFtjb3B5S2V5XSwgcmVwTmFtZSwgZG9QYXNzKSlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBjb21wbGV0aW9ucy5wdXNoKEBidWlsZENvbXBsZXRpb24oY29tcE9iaikpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjb21wbGV0aW9ucy5wdXNoKEBidWlsZENvbXBsZXRpb24oY29tcE9iaikpXG4gICAgI1xuICAgIGlmIGNvbnRleHRGaWx0ZXIgPT0gMVxuICAgICAgZm9yIGNvbXBsZXRpb24gaW4gY29tcGxldGlvbnNcbiAgICAgICAgaWYgJ3NuaXBwZXQnIG9mIGNvbXBsZXRpb25cbiAgICAgICAgICBjb21wbGV0aW9uWydzbmlwcGV0J10gPSBjb21wbGV0aW9uWydzbmlwcGV0J10uc3BsaXQoJygnKVswXVxuICAgIHJldHVybiBjb21wbGV0aW9uc1xuXG4gIGJ1aWxkQ29tcGxldGlvbjogKHN1Z2dlc3Rpb24sIHJlcE5hbWU9bnVsbCwgc3RyaXBBcmc9ZmFsc2UpIC0+XG4gICAgbmFtZSA9IHN1Z2dlc3Rpb25bJ25hbWUnXVxuICAgIGlmIHJlcE5hbWU/XG4gICAgICBuYW1lID0gcmVwTmFtZVxuICAgIG1vZHMgPSBAZ2V0TW9kaWZpZXJzKHN1Z2dlc3Rpb24pXG4gICAgY29tcE9iaiA9IHt9XG4gICAgY29tcE9iai50eXBlID0gQG1hcFR5cGUoc3VnZ2VzdGlvblsndHlwZSddKVxuICAgIGNvbXBPYmoubGVmdExhYmVsID0gQGRlc2NMaXN0W3N1Z2dlc3Rpb25bJ2Rlc2MnXV1cbiAgICB1bmxlc3MgQHByZXNlcnZlQ2FzZVxuICAgICAgbmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKVxuICAgIGlmICdhcmdzJyBvZiBzdWdnZXN0aW9uXG4gICAgICBhcmdTdHIgPSBzdWdnZXN0aW9uWydhcmdzJ11cbiAgICAgIGlmIEB1c2VTbmlwcGV0c1xuICAgICAgICBhcmdMaXN0ID0gYXJnU3RyLnNwbGl0KCcsJylcbiAgICAgICAgYXJnTGlzdEZpbmFsID0gW11cbiAgICAgICAgaSA9IDBcbiAgICAgICAgZm9yIGFyZyBpbiBhcmdMaXN0XG4gICAgICAgICAgaSArPSAxXG4gICAgICAgICAgaWYgc3RyaXBBcmcgYW5kIGkgPT0gMVxuICAgICAgICAgICAgY29udGludWVcbiAgICAgICAgICBpMSA9IGFyZy5pbmRleE9mKFwiPVwiKVxuICAgICAgICAgIGlmIGkxID09IC0xXG4gICAgICAgICAgICBhcmdMaXN0RmluYWwucHVzaChcIiR7I3tpfToje2FyZ319XCIpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXJnTmFtZSA9IGFyZy5zdWJzdHJpbmcoMCxpMSlcbiAgICAgICAgICAgIGFyZ0xpc3RGaW5hbC5wdXNoKFwiI3thcmdOYW1lfT0keyN7aX06I3thcmdOYW1lfX1cIilcbiAgICAgICAgYXJnU3RyID0gYXJnTGlzdEZpbmFsLmpvaW4oJywnKVxuICAgICAgZWxzZVxuICAgICAgICBpZiBzdHJpcEFyZ1xuICAgICAgICAgIGkxID0gYXJnU3RyLmluZGV4T2YoJywnKVxuICAgICAgICAgIGlmIGkxID4gLTFcbiAgICAgICAgICAgIGFyZ1N0ciA9IGFyZ1N0ci5zdWJzdHJpbmcoaTErMSkudHJpbSgpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXJnU3RyID0gJydcbiAgICAgIHVubGVzcyBAcHJlc2VydmVDYXNlXG4gICAgICAgIGFyZ1N0ciA9IGFyZ1N0ci50b0xvd2VyQ2FzZSgpXG4gICAgICBjb21wT2JqLnNuaXBwZXQgPSBuYW1lICsgXCIoXCIgKyBhcmdTdHIgKyBcIilcIlxuICAgIGVsc2VcbiAgICAgIGNvbXBPYmoudGV4dCA9IG5hbWVcbiAgICBpZiBtb2RzICE9ICcnXG4gICAgICBjb21wT2JqLmRlc2NyaXB0aW9uID0gbW9kc1xuICAgIHJldHVybiBjb21wT2JqXG4gICAgI3JpZ2h0TGFiZWw6ICdNeSBQcm92aWRlcidcblxuICBtYXBUeXBlOiAodHlwZUluZCkgLT5cbiAgICBzd2l0Y2ggdHlwZUluZFxuICAgICAgd2hlbiAxIHRoZW4gcmV0dXJuICdtb2R1bGUnXG4gICAgICB3aGVuIDIgdGhlbiByZXR1cm4gJ21ldGhvZCdcbiAgICAgIHdoZW4gMyB0aGVuIHJldHVybiAnZnVuY3Rpb24nXG4gICAgICB3aGVuIDQgdGhlbiByZXR1cm4gJ2NsYXNzJ1xuICAgICAgd2hlbiA1IHRoZW4gcmV0dXJuICdpbnRlcmZhY2UnXG4gICAgICB3aGVuIDYgdGhlbiByZXR1cm4gJ3ZhcmlhYmxlJ1xuICAgIHJldHVybiAndW5rbm93bidcblxuICBnZXRNb2RpZmllcnM6IChzdWdnZXN0aW9uKSAtPlxuICAgIG1vZExpc3QgPSBbXVxuICAgIGlmICdtb2RzJyBvZiBzdWdnZXN0aW9uXG4gICAgICBmb3IgbW9kIGluIHN1Z2dlc3Rpb25bJ21vZHMnXVxuICAgICAgICBpZiBtb2QgPiAyMFxuICAgICAgICAgIG5kaW1zID0gbW9kLTIwXG4gICAgICAgICAgZGltU3RyID0gXCJESU1FTlNJT04oOlwiXG4gICAgICAgICAgaWYgbmRpbXMgPiAxXG4gICAgICAgICAgICBmb3IgaSBpbiBbMi4ubmRpbXNdXG4gICAgICAgICAgICAgIGRpbVN0ciArPSBcIiw6XCJcbiAgICAgICAgICBkaW1TdHIgKz0gXCIpXCJcbiAgICAgICAgICBtb2RMaXN0LnB1c2goZGltU3RyKVxuICAgICAgICAgIGNvbnRpbnVlXG4gICAgICAgIHN3aXRjaCBtb2RcbiAgICAgICAgICB3aGVuIDEgdGhlbiBtb2RMaXN0LnB1c2goXCJQT0lOVEVSXCIpXG4gICAgICAgICAgd2hlbiAyIHRoZW4gbW9kTGlzdC5wdXNoKFwiQUxMT0NBVEFCTEVcIilcbiAgICByZXR1cm4gbW9kTGlzdC5qb2luKCcsICcpXG5cbiAgdGVzdFBhc3M6IChvYmopIC0+XG4gICAgaWYgJ21vZHMnIG9mIG9ialxuICAgICAgaW5kID0gb2JqWydtb2RzJ10uaW5kZXhPZig2KVxuICAgICAgaWYgaW5kICE9IC0xXG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIHJldHVybiB0cnVlXG4iXX0=
