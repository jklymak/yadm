(function() {
  var Dialog, DisplayBuffer, Editor, FtpHost, Host, LocalFile, RemoteEditEditor, SftpHost, TextEditor, _, async, e, path, resourcePath,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  path = require('path');

  resourcePath = atom.config.resourcePath;

  try {
    Editor = require(path.resolve(resourcePath, 'src', 'editor'));
  } catch (error1) {
    e = error1;
  }

  TextEditor = Editor != null ? Editor : require(path.resolve(resourcePath, 'src', 'text-editor'));

  DisplayBuffer = require(path.resolve(resourcePath, 'src', 'display-buffer'));

  Host = null;

  FtpHost = null;

  SftpHost = null;

  LocalFile = null;

  async = null;

  Dialog = null;

  _ = null;

  module.exports = RemoteEditEditor = (function(superClass) {
    extend(RemoteEditEditor, superClass);

    atom.deserializers.add(RemoteEditEditor);

    function RemoteEditEditor(params) {
      if (params == null) {
        params = {};
      }
      RemoteEditEditor.__super__.constructor.call(this, params);
      if (params.host) {
        this.host = params.host;
      }
      if (params.localFile) {
        this.localFile = params.localFile;
      }
    }

    RemoteEditEditor.prototype.getIconName = function() {
      return "globe";
    };

    RemoteEditEditor.prototype.getTitle = function() {
      var sessionPath;
      if (this.localFile != null) {
        return this.localFile.name;
      } else if (sessionPath = this.getPath()) {
        return path.basename(sessionPath);
      } else {
        return "undefined";
      }
    };

    RemoteEditEditor.prototype.getLongTitle = function() {
      var directory, fileName, i, relativePath;
      if (Host == null) {
        Host = require('./host');
      }
      if (FtpHost == null) {
        FtpHost = require('./ftp-host');
      }
      if (SftpHost == null) {
        SftpHost = require('./sftp-host');
      }
      if (i = this.localFile.remoteFile.path.indexOf(this.host.directory) > -1) {
        relativePath = this.localFile.remoteFile.path.slice(i + this.host.directory.length);
      }
      fileName = this.getTitle();
      if (this.host instanceof SftpHost && (this.host != null) && (this.localFile != null)) {
        directory = relativePath != null ? relativePath : "sftp://" + this.host.username + "@" + this.host.hostname + ":" + this.host.port + this.localFile.remoteFile.path;
      } else if (this.host instanceof FtpHost && (this.host != null) && (this.localFile != null)) {
        directory = relativePath != null ? relativePath : "ftp://" + this.host.username + "@" + this.host.hostname + ":" + this.host.port + this.localFile.remoteFile.path;
      } else {
        directory = atom.project.relativize(path.dirname(sessionPath));
        directory = directory.length > 0 ? directory : path.basename(path.dirname(sessionPath));
      }
      return fileName + " - " + directory;
    };

    RemoteEditEditor.prototype.onDidSaved = function(callback) {
      return this.emitter.on('did-saved', callback);
    };

    RemoteEditEditor.prototype.save = function() {
      this.buffer.save();
      this.emitter.emit('saved');
      return this.initiateUpload();
    };

    RemoteEditEditor.prototype.saveAs = function(filePath) {
      this.buffer.saveAs(filePath);
      this.localFile.path = filePath;
      this.emitter.emit('saved');
      return this.initiateUpload();
    };

    RemoteEditEditor.prototype.initiateUpload = function() {
      var chosen;
      if (atom.config.get('remote-edit.uploadOnSave')) {
        return this.upload();
      } else {
        if (Dialog == null) {
          Dialog = require('../view/dialog');
        }
        chosen = atom.confirm({
          message: "File has been saved. Do you want to upload changes to remote host?",
          detailedMessage: "The changes exists on disk and can be uploaded later.",
          buttons: ["Upload", "Cancel"]
        });
        switch (chosen) {
          case 0:
            return this.upload();
          case 1:
        }
      }
    };

    RemoteEditEditor.prototype.upload = function(connectionOptions) {
      if (connectionOptions == null) {
        connectionOptions = {};
      }
      if (async == null) {
        async = require('async');
      }
      if (_ == null) {
        _ = require('underscore-plus');
      }
      if ((this.localFile != null) && (this.host != null)) {
        return async.waterfall([
          (function(_this) {
            return function(callback) {
              if (_this.host.usePassword && (connectionOptions.password == null)) {
                if (_this.host.password === "" || _this.host.password === '' || (_this.host.password == null)) {
                  return async.waterfall([
                    function(callback) {
                      var passwordDialog;
                      if (Dialog == null) {
                        Dialog = require('../view/dialog');
                      }
                      passwordDialog = new Dialog({
                        prompt: "Enter password"
                      });
                      return passwordDialog.toggle(callback);
                    }
                  ], function(err, result) {
                    connectionOptions = _.extend({
                      password: result
                    }, connectionOptions);
                    return callback(null);
                  });
                } else {
                  return callback(null);
                }
              } else {
                return callback(null);
              }
            };
          })(this), (function(_this) {
            return function(callback) {
              if (!_this.host.isConnected()) {
                return _this.host.connect(callback, connectionOptions);
              } else {
                return callback(null);
              }
            };
          })(this), (function(_this) {
            return function(callback) {
              return _this.host.writeFile(_this.localFile, callback);
            };
          })(this)
        ], (function(_this) {
          return function(err) {
            if ((err != null) && _this.host.usePassword) {
              return async.waterfall([
                function(callback) {
                  var passwordDialog;
                  if (Dialog == null) {
                    Dialog = require('../view/dialog');
                  }
                  passwordDialog = new Dialog({
                    prompt: "Enter password"
                  });
                  return passwordDialog.toggle(callback);
                }
              ], function(err, result) {
                return _this.upload({
                  password: result
                });
              });
            }
          };
        })(this));
      } else {
        return console.error('LocalFile and host not defined. Cannot upload file!');
      }
    };

    RemoteEditEditor.prototype.serialize = function() {
      var data, ref, ref1;
      data = RemoteEditEditor.__super__.serialize.apply(this, arguments);
      data.deserializer = 'RemoteEditEditor';
      data.localFile = (ref = this.localFile) != null ? ref.serialize() : void 0;
      data.host = (ref1 = this.host) != null ? ref1.serialize() : void 0;
      return data;
    };

    RemoteEditEditor.deserialize = function(state, atomEnvironment) {
      var displayBuffer, error;
      try {
        displayBuffer = DisplayBuffer.deserialize(state.displayBuffer, atomEnvironment);
      } catch (error1) {
        error = error1;
        if (error.syscall === 'read') {
          return;
        } else {
          throw error;
        }
      }
      state.displayBuffer = displayBuffer;
      state.registerEditor = true;
      if (state.localFile != null) {
        LocalFile = require('../model/local-file');
        state.localFile = LocalFile.deserialize(state.localFile);
      }
      if (state.host != null) {
        Host = require('../model/host');
        FtpHost = require('../model/ftp-host');
        SftpHost = require('../model/sftp-host');
        state.host = Host.deserialize(state.host);
      }
      state.config = atomEnvironment.config;
      state.notificationManager = atomEnvironment.notifications;
      state.packageManager = atomEnvironment.packages;
      state.clipboard = atomEnvironment.clipboard;
      state.viewRegistry = atomEnvironment.views;
      state.grammarRegistry = atomEnvironment.grammars;
      state.project = atomEnvironment.project;
      state.assert = atomEnvironment.assert.bind(atomEnvironment);
      state.applicationDelegate = atomEnvironment.applicationDelegate;
      return new this(state);
    };

    return RemoteEditEditor;

  })(TextEditor);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQvbGliL21vZGVsL3JlbW90ZS1lZGl0LWVkaXRvci5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLGdJQUFBO0lBQUE7OztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsTUFBUjs7RUFDUCxZQUFBLEdBQWUsSUFBSSxDQUFDLE1BQU0sQ0FBQzs7QUFDM0I7SUFDRSxNQUFBLEdBQVMsT0FBQSxDQUFRLElBQUksQ0FBQyxPQUFMLENBQWEsWUFBYixFQUEyQixLQUEzQixFQUFrQyxRQUFsQyxDQUFSLEVBRFg7R0FBQSxjQUFBO0lBRU0sV0FGTjs7O0VBSUEsVUFBQSxvQkFBYSxTQUFTLE9BQUEsQ0FBUSxJQUFJLENBQUMsT0FBTCxDQUFhLFlBQWIsRUFBMkIsS0FBM0IsRUFBa0MsYUFBbEMsQ0FBUjs7RUFFdEIsYUFBQSxHQUFnQixPQUFBLENBQVEsSUFBSSxDQUFDLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLEtBQTNCLEVBQWtDLGdCQUFsQyxDQUFSOztFQUdoQixJQUFBLEdBQU87O0VBQ1AsT0FBQSxHQUFVOztFQUNWLFFBQUEsR0FBVzs7RUFDWCxTQUFBLEdBQVk7O0VBQ1osS0FBQSxHQUFROztFQUNSLE1BQUEsR0FBUzs7RUFDVCxDQUFBLEdBQUk7O0VBRUosTUFBTSxDQUFDLE9BQVAsR0FDUTs7O0lBQ0osSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFuQixDQUF1QixnQkFBdkI7O0lBRWEsMEJBQUMsTUFBRDs7UUFBQyxTQUFTOztNQUNyQixrREFBTSxNQUFOO01BQ0EsSUFBRyxNQUFNLENBQUMsSUFBVjtRQUNFLElBQUMsQ0FBQSxJQUFELEdBQVEsTUFBTSxDQUFDLEtBRGpCOztNQUVBLElBQUcsTUFBTSxDQUFDLFNBQVY7UUFDRSxJQUFDLENBQUEsU0FBRCxHQUFhLE1BQU0sQ0FBQyxVQUR0Qjs7SUFKVzs7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QUssQ0FBQyxtQkFBTixHQUE0QixlQUFlLENBQUM7TUFDNUMsS0FBSyxDQUFDLGNBQU4sR0FBdUIsZUFBZSxDQUFDO01BQ3ZDLEtBQUssQ0FBQyxTQUFOLEdBQWtCLGVBQWUsQ0FBQztNQUNsQyxLQUFLLENBQUMsWUFBTixHQUFxQixlQUFlLENBQUM7TUFDckMsS0FBSyxDQUFDLGVBQU4sR0FBd0IsZUFBZSxDQUFDO01BQ3hDLEtBQUssQ0FBQyxPQUFOLEdBQWdCLGVBQWUsQ0FBQztNQUNoQyxLQUFLLENBQUMsTUFBTixHQUFlLGVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBdkIsQ0FBNEIsZUFBNUI7TUFDZixLQUFLLENBQUMsbUJBQU4sR0FBNEIsZUFBZSxDQUFDO2FBQ3hDLElBQUEsSUFBQSxDQUFLLEtBQUw7SUE5QlE7Ozs7S0FySGU7QUFwQmpDIiwic291cmNlc0NvbnRlbnQiOlsicGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5yZXNvdXJjZVBhdGggPSBhdG9tLmNvbmZpZy5yZXNvdXJjZVBhdGhcbnRyeVxuICBFZGl0b3IgPSByZXF1aXJlIHBhdGgucmVzb2x2ZSByZXNvdXJjZVBhdGgsICdzcmMnLCAnZWRpdG9yJ1xuY2F0Y2ggZVxuICAjIENhdGNoIGVycm9yXG5UZXh0RWRpdG9yID0gRWRpdG9yID8gcmVxdWlyZSBwYXRoLnJlc29sdmUgcmVzb3VyY2VQYXRoLCAnc3JjJywgJ3RleHQtZWRpdG9yJ1xuXG5EaXNwbGF5QnVmZmVyID0gcmVxdWlyZSBwYXRoLnJlc29sdmUgcmVzb3VyY2VQYXRoLCAnc3JjJywgJ2Rpc3BsYXktYnVmZmVyJ1xuXG4jIERlZmVyIHJlcXVpcmluZ1xuSG9zdCA9IG51bGxcbkZ0cEhvc3QgPSBudWxsXG5TZnRwSG9zdCA9IG51bGxcbkxvY2FsRmlsZSA9IG51bGxcbmFzeW5jID0gbnVsbFxuRGlhbG9nID0gbnVsbFxuXyA9IG51bGxcblxubW9kdWxlLmV4cG9ydHMgPVxuICBjbGFzcyBSZW1vdGVFZGl0RWRpdG9yIGV4dGVuZHMgVGV4dEVkaXRvclxuICAgIGF0b20uZGVzZXJpYWxpemVycy5hZGQodGhpcylcblxuICAgIGNvbnN0cnVjdG9yOiAocGFyYW1zID0ge30pIC0+XG4gICAgICBzdXBlcihwYXJhbXMpXG4gICAgICBpZiBwYXJhbXMuaG9zdFxuICAgICAgICBAaG9zdCA9IHBhcmFtcy5ob3N0XG4gICAgICBpZiBwYXJhbXMubG9jYWxGaWxlXG4gICAgICAgIEBsb2NhbEZpbGUgPSBwYXJhbXMubG9jYWxGaWxlXG5cbiAgICBnZXRJY29uTmFtZTogLT5cbiAgICAgIFwiZ2xvYmVcIlxuXG4gICAgZ2V0VGl0bGU6IC0+XG4gICAgICBpZiBAbG9jYWxGaWxlP1xuICAgICAgICBAbG9jYWxGaWxlLm5hbWVcbiAgICAgIGVsc2UgaWYgc2Vzc2lvblBhdGggPSBAZ2V0UGF0aCgpXG4gICAgICAgIHBhdGguYmFzZW5hbWUoc2Vzc2lvblBhdGgpXG4gICAgICBlbHNlXG4gICAgICAgIFwidW5kZWZpbmVkXCJcblxuICAgIGdldExvbmdUaXRsZTogLT5cbiAgICAgIEhvc3QgPz0gcmVxdWlyZSAnLi9ob3N0J1xuICAgICAgRnRwSG9zdCA/PSByZXF1aXJlICcuL2Z0cC1ob3N0J1xuICAgICAgU2Z0cEhvc3QgPz0gcmVxdWlyZSAnLi9zZnRwLWhvc3QnXG5cbiAgICAgIGlmIGkgPSBAbG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aC5pbmRleE9mKEBob3N0LmRpcmVjdG9yeSkgPiAtMVxuICAgICAgICByZWxhdGl2ZVBhdGggPSBAbG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aFsoaStAaG9zdC5kaXJlY3RvcnkubGVuZ3RoKS4uXVxuXG4gICAgICBmaWxlTmFtZSA9IEBnZXRUaXRsZSgpXG4gICAgICBpZiBAaG9zdCBpbnN0YW5jZW9mIFNmdHBIb3N0IGFuZCBAaG9zdD8gYW5kIEBsb2NhbEZpbGU/XG4gICAgICAgIGRpcmVjdG9yeSA9IGlmIHJlbGF0aXZlUGF0aD8gdGhlbiByZWxhdGl2ZVBhdGggZWxzZSBcInNmdHA6Ly8je0Bob3N0LnVzZXJuYW1lfUAje0Bob3N0Lmhvc3RuYW1lfToje0Bob3N0LnBvcnR9I3tAbG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIlxuICAgICAgZWxzZSBpZiBAaG9zdCBpbnN0YW5jZW9mIEZ0cEhvc3QgYW5kIEBob3N0PyBhbmQgQGxvY2FsRmlsZT9cbiAgICAgICAgZGlyZWN0b3J5ID0gaWYgcmVsYXRpdmVQYXRoPyB0aGVuIHJlbGF0aXZlUGF0aCBlbHNlIFwiZnRwOi8vI3tAaG9zdC51c2VybmFtZX1AI3tAaG9zdC5ob3N0bmFtZX06I3tAaG9zdC5wb3J0fSN7QGxvY2FsRmlsZS5yZW1vdGVGaWxlLnBhdGh9XCJcbiAgICAgIGVsc2VcbiAgICAgICAgZGlyZWN0b3J5ID0gYXRvbS5wcm9qZWN0LnJlbGF0aXZpemUocGF0aC5kaXJuYW1lKHNlc3Npb25QYXRoKSlcbiAgICAgICAgZGlyZWN0b3J5ID0gaWYgZGlyZWN0b3J5Lmxlbmd0aCA+IDAgdGhlbiBkaXJlY3RvcnkgZWxzZSBwYXRoLmJhc2VuYW1lKHBhdGguZGlybmFtZShzZXNzaW9uUGF0aCkpXG5cbiAgICAgIFwiI3tmaWxlTmFtZX0gLSAje2RpcmVjdG9yeX1cIlxuXG4gICAgb25EaWRTYXZlZDogKGNhbGxiYWNrKSAtPlxuICAgICAgQGVtaXR0ZXIub24gJ2RpZC1zYXZlZCcsIGNhbGxiYWNrXG5cbiAgICBzYXZlOiAtPlxuICAgICAgQGJ1ZmZlci5zYXZlKClcbiAgICAgIEBlbWl0dGVyLmVtaXQgJ3NhdmVkJ1xuICAgICAgQGluaXRpYXRlVXBsb2FkKClcblxuICAgIHNhdmVBczogKGZpbGVQYXRoKSAtPlxuICAgICAgQGJ1ZmZlci5zYXZlQXMoZmlsZVBhdGgpXG4gICAgICBAbG9jYWxGaWxlLnBhdGggPSBmaWxlUGF0aFxuICAgICAgQGVtaXR0ZXIuZW1pdCAnc2F2ZWQnXG4gICAgICBAaW5pdGlhdGVVcGxvYWQoKVxuXG4gICAgaW5pdGlhdGVVcGxvYWQ6IC0+XG4gICAgICBpZiBhdG9tLmNvbmZpZy5nZXQgJ3JlbW90ZS1lZGl0LnVwbG9hZE9uU2F2ZSdcbiAgICAgICAgQHVwbG9hZCgpXG4gICAgICBlbHNlXG4gICAgICAgIERpYWxvZyA/PSByZXF1aXJlICcuLi92aWV3L2RpYWxvZydcbiAgICAgICAgY2hvc2VuID0gYXRvbS5jb25maXJtXG4gICAgICAgICAgbWVzc2FnZTogXCJGaWxlIGhhcyBiZWVuIHNhdmVkLiBEbyB5b3Ugd2FudCB0byB1cGxvYWQgY2hhbmdlcyB0byByZW1vdGUgaG9zdD9cIlxuICAgICAgICAgIGRldGFpbGVkTWVzc2FnZTogXCJUaGUgY2hhbmdlcyBleGlzdHMgb24gZGlzayBhbmQgY2FuIGJlIHVwbG9hZGVkIGxhdGVyLlwiXG4gICAgICAgICAgYnV0dG9uczogW1wiVXBsb2FkXCIsIFwiQ2FuY2VsXCJdXG4gICAgICAgIHN3aXRjaCBjaG9zZW5cbiAgICAgICAgICB3aGVuIDAgdGhlbiBAdXBsb2FkKClcbiAgICAgICAgICB3aGVuIDEgdGhlbiByZXR1cm5cblxuICAgIHVwbG9hZDogKGNvbm5lY3Rpb25PcHRpb25zID0ge30pIC0+XG4gICAgICBhc3luYyA/PSByZXF1aXJlICdhc3luYydcbiAgICAgIF8gPz0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuICAgICAgaWYgQGxvY2FsRmlsZT8gYW5kIEBob3N0P1xuICAgICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAgIChjYWxsYmFjaykgPT5cbiAgICAgICAgICAgIGlmIEBob3N0LnVzZVBhc3N3b3JkIGFuZCAhY29ubmVjdGlvbk9wdGlvbnMucGFzc3dvcmQ/XG4gICAgICAgICAgICAgIGlmIEBob3N0LnBhc3N3b3JkID09IFwiXCIgb3IgQGhvc3QucGFzc3dvcmQgPT0gJycgb3IgIUBob3N0LnBhc3N3b3JkP1xuICAgICAgICAgICAgICAgIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICAgICAgICAgICAgICAoY2FsbGJhY2spIC0+XG4gICAgICAgICAgICAgICAgICAgIERpYWxvZyA/PSByZXF1aXJlICcuLi92aWV3L2RpYWxvZydcbiAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmREaWFsb2cgPSBuZXcgRGlhbG9nKHtwcm9tcHQ6IFwiRW50ZXIgcGFzc3dvcmRcIn0pXG4gICAgICAgICAgICAgICAgICAgIHBhc3N3b3JkRGlhbG9nLnRvZ2dsZShjYWxsYmFjaylcbiAgICAgICAgICAgICAgICBdLCAoZXJyLCByZXN1bHQpID0+XG4gICAgICAgICAgICAgICAgICBjb25uZWN0aW9uT3B0aW9ucyA9IF8uZXh0ZW5kKHtwYXNzd29yZDogcmVzdWx0fSwgY29ubmVjdGlvbk9wdGlvbnMpXG4gICAgICAgICAgICAgICAgICBjYWxsYmFjayhudWxsKVxuICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgICAgaWYgIUBob3N0LmlzQ29ubmVjdGVkKClcbiAgICAgICAgICAgICAgQGhvc3QuY29ubmVjdChjYWxsYmFjaywgY29ubmVjdGlvbk9wdGlvbnMpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgICAgQGhvc3Qud3JpdGVGaWxlKEBsb2NhbEZpbGUsIGNhbGxiYWNrKVxuICAgICAgICBdLCAoZXJyKSA9PlxuICAgICAgICAgIGlmIGVycj8gYW5kIEBob3N0LnVzZVBhc3N3b3JkXG4gICAgICAgICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAgICAgICAoY2FsbGJhY2spIC0+XG4gICAgICAgICAgICAgICAgRGlhbG9nID89IHJlcXVpcmUgJy4uL3ZpZXcvZGlhbG9nJ1xuICAgICAgICAgICAgICAgIHBhc3N3b3JkRGlhbG9nID0gbmV3IERpYWxvZyh7cHJvbXB0OiBcIkVudGVyIHBhc3N3b3JkXCJ9KVxuICAgICAgICAgICAgICAgIHBhc3N3b3JkRGlhbG9nLnRvZ2dsZShjYWxsYmFjaylcbiAgICAgICAgICAgIF0sIChlcnIsIHJlc3VsdCkgPT5cbiAgICAgICAgICAgICAgQHVwbG9hZCh7cGFzc3dvcmQ6IHJlc3VsdH0pXG4gICAgICAgICAgICApXG4gICAgICAgIClcbiAgICAgIGVsc2VcbiAgICAgICAgY29uc29sZS5lcnJvciAnTG9jYWxGaWxlIGFuZCBob3N0IG5vdCBkZWZpbmVkLiBDYW5ub3QgdXBsb2FkIGZpbGUhJ1xuXG4gICAgc2VyaWFsaXplOiAtPlxuICAgICAgZGF0YSA9IHN1cGVyXG4gICAgICBkYXRhLmRlc2VyaWFsaXplciA9ICdSZW1vdGVFZGl0RWRpdG9yJ1xuICAgICAgZGF0YS5sb2NhbEZpbGUgPSBAbG9jYWxGaWxlPy5zZXJpYWxpemUoKVxuICAgICAgZGF0YS5ob3N0ID0gQGhvc3Q/LnNlcmlhbGl6ZSgpXG4gICAgICByZXR1cm4gZGF0YVxuXG4gICAgIyBtb3N0bHkgY29waWVkIGZyb20gVGV4dEVkaXRvci5kZXNlcmlhbGl6ZVxuICAgIEBkZXNlcmlhbGl6ZTogKHN0YXRlLCBhdG9tRW52aXJvbm1lbnQpIC0+XG4gICAgICB0cnlcbiAgICAgICAgZGlzcGxheUJ1ZmZlciA9IERpc3BsYXlCdWZmZXIuZGVzZXJpYWxpemUoc3RhdGUuZGlzcGxheUJ1ZmZlciwgYXRvbUVudmlyb25tZW50KVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgaWYgZXJyb3Iuc3lzY2FsbCBpcyAncmVhZCdcbiAgICAgICAgICByZXR1cm4gIyBlcnJvciByZWFkaW5nIHRoZSBmaWxlLCBkb250IGRlc2VyaWFsaXplIGFuIGVkaXRvciBmb3IgaXRcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHRocm93IGVycm9yXG5cbiAgICAgIHN0YXRlLmRpc3BsYXlCdWZmZXIgPSBkaXNwbGF5QnVmZmVyXG4gICAgICBzdGF0ZS5yZWdpc3RlckVkaXRvciA9IHRydWVcbiAgICAgIGlmIHN0YXRlLmxvY2FsRmlsZT9cbiAgICAgICAgTG9jYWxGaWxlID0gcmVxdWlyZSAnLi4vbW9kZWwvbG9jYWwtZmlsZSdcbiAgICAgICAgc3RhdGUubG9jYWxGaWxlID0gTG9jYWxGaWxlLmRlc2VyaWFsaXplKHN0YXRlLmxvY2FsRmlsZSlcbiAgICAgIGlmIHN0YXRlLmhvc3Q/XG4gICAgICAgIEhvc3QgPSByZXF1aXJlICcuLi9tb2RlbC9ob3N0J1xuICAgICAgICBGdHBIb3N0ID0gcmVxdWlyZSAnLi4vbW9kZWwvZnRwLWhvc3QnXG4gICAgICAgIFNmdHBIb3N0ID0gcmVxdWlyZSAnLi4vbW9kZWwvc2Z0cC1ob3N0J1xuICAgICAgICBzdGF0ZS5ob3N0ID0gSG9zdC5kZXNlcmlhbGl6ZShzdGF0ZS5ob3N0KVxuICAgICAgIyBkaXNwbGF5QnVmZmVyIGhhcyBubyBnZXRNYXJrZXJMYXllclxuICAgICAgI3N0YXRlLnNlbGVjdGlvbnNNYXJrZXJMYXllciA9IGRpc3BsYXlCdWZmZXIuZ2V0TWFya2VyTGF5ZXIoc3RhdGUuc2VsZWN0aW9uc01hcmtlckxheWVySWQpXG4gICAgICBzdGF0ZS5jb25maWcgPSBhdG9tRW52aXJvbm1lbnQuY29uZmlnXG4gICAgICBzdGF0ZS5ub3RpZmljYXRpb25NYW5hZ2VyID0gYXRvbUVudmlyb25tZW50Lm5vdGlmaWNhdGlvbnNcbiAgICAgIHN0YXRlLnBhY2thZ2VNYW5hZ2VyID0gYXRvbUVudmlyb25tZW50LnBhY2thZ2VzXG4gICAgICBzdGF0ZS5jbGlwYm9hcmQgPSBhdG9tRW52aXJvbm1lbnQuY2xpcGJvYXJkXG4gICAgICBzdGF0ZS52aWV3UmVnaXN0cnkgPSBhdG9tRW52aXJvbm1lbnQudmlld3NcbiAgICAgIHN0YXRlLmdyYW1tYXJSZWdpc3RyeSA9IGF0b21FbnZpcm9ubWVudC5ncmFtbWFyc1xuICAgICAgc3RhdGUucHJvamVjdCA9IGF0b21FbnZpcm9ubWVudC5wcm9qZWN0XG4gICAgICBzdGF0ZS5hc3NlcnQgPSBhdG9tRW52aXJvbm1lbnQuYXNzZXJ0LmJpbmQoYXRvbUVudmlyb25tZW50KVxuICAgICAgc3RhdGUuYXBwbGljYXRpb25EZWxlZ2F0ZSA9IGF0b21FbnZpcm9ubWVudC5hcHBsaWNhdGlvbkRlbGVnYXRlXG4gICAgICBuZXcgdGhpcyhzdGF0ZSlcblxuIl19
