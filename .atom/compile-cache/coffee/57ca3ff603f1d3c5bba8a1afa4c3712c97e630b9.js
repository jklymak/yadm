(function() {
  var Dialog, Editor, FtpHost, Host, LocalFile, RemoteEditEditor, SftpHost, TextEditor, _, async, e, path, resourcePath,
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
        displayBuffer = TextEditor.deserialize(state.displayBuffer, atomEnvironment);
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi9tb2RlbC9yZW1vdGUtZWRpdC1lZGl0b3IuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSxpSEFBQTtJQUFBOzs7RUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsWUFBQSxHQUFlLElBQUksQ0FBQyxNQUFNLENBQUM7O0FBQzNCO0lBQ0UsTUFBQSxHQUFTLE9BQUEsQ0FBUSxJQUFJLENBQUMsT0FBTCxDQUFhLFlBQWIsRUFBMkIsS0FBM0IsRUFBa0MsUUFBbEMsQ0FBUixFQURYO0dBQUEsY0FBQTtJQUVNLFdBRk47OztFQUlBLFVBQUEsb0JBQWEsU0FBUyxPQUFBLENBQVEsSUFBSSxDQUFDLE9BQUwsQ0FBYSxZQUFiLEVBQTJCLEtBQTNCLEVBQWtDLGFBQWxDLENBQVI7O0VBR3RCLElBQUEsR0FBTzs7RUFDUCxPQUFBLEdBQVU7O0VBQ1YsUUFBQSxHQUFXOztFQUNYLFNBQUEsR0FBWTs7RUFDWixLQUFBLEdBQVE7O0VBQ1IsTUFBQSxHQUFTOztFQUNULENBQUEsR0FBSTs7RUFFSixNQUFNLENBQUMsT0FBUCxHQUNROzs7SUFDSixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQW5CLENBQXVCLGdCQUF2Qjs7SUFFYSwwQkFBQyxNQUFEOztRQUFDLFNBQVM7O01BQ3JCLGtEQUFNLE1BQU47TUFDQSxJQUFHLE1BQU0sQ0FBQyxJQUFWO1FBQ0UsSUFBQyxDQUFBLElBQUQsR0FBUSxNQUFNLENBQUMsS0FEakI7O01BRUEsSUFBRyxNQUFNLENBQUMsU0FBVjtRQUNFLElBQUMsQ0FBQSxTQUFELEdBQWEsTUFBTSxDQUFDLFVBRHRCOztJQUpXOzsrQkFPYixXQUFBLEdBQWEsU0FBQTthQUNYO0lBRFc7OytCQUdiLFFBQUEsR0FBVSxTQUFBO0FBQ1IsVUFBQTtNQUFBLElBQUcsc0JBQUg7ZUFD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LFNBQU4sR0FBa0IsZUFBZSxDQUFDO01BQ2xDLEtBQUssQ0FBQyxZQUFOLEdBQXFCLGVBQWUsQ0FBQztNQUNyQyxLQUFLLENBQUMsZUFBTixHQUF3QixlQUFlLENBQUM7TUFDeEMsS0FBSyxDQUFDLE9BQU4sR0FBZ0IsZUFBZSxDQUFDO01BQ2hDLEtBQUssQ0FBQyxNQUFOLEdBQWUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUF2QixDQUE0QixlQUE1QjtNQUNmLEtBQUssQ0FBQyxtQkFBTixHQUE0QixlQUFlLENBQUM7YUFDeEMsSUFBQSxJQUFBLENBQUssS0FBTDtJQTlCUTs7OztLQXJIZTtBQWxCakMiLCJzb3VyY2VzQ29udGVudCI6WyJwYXRoID0gcmVxdWlyZSAncGF0aCdcbnJlc291cmNlUGF0aCA9IGF0b20uY29uZmlnLnJlc291cmNlUGF0aFxudHJ5XG4gIEVkaXRvciA9IHJlcXVpcmUgcGF0aC5yZXNvbHZlIHJlc291cmNlUGF0aCwgJ3NyYycsICdlZGl0b3InXG5jYXRjaCBlXG4gICMgQ2F0Y2ggZXJyb3JcblRleHRFZGl0b3IgPSBFZGl0b3IgPyByZXF1aXJlIHBhdGgucmVzb2x2ZSByZXNvdXJjZVBhdGgsICdzcmMnLCAndGV4dC1lZGl0b3InXG5cbiMgRGVmZXIgcmVxdWlyaW5nXG5Ib3N0ID0gbnVsbFxuRnRwSG9zdCA9IG51bGxcblNmdHBIb3N0ID0gbnVsbFxuTG9jYWxGaWxlID0gbnVsbFxuYXN5bmMgPSBudWxsXG5EaWFsb2cgPSBudWxsXG5fID0gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIGNsYXNzIFJlbW90ZUVkaXRFZGl0b3IgZXh0ZW5kcyBUZXh0RWRpdG9yXG4gICAgYXRvbS5kZXNlcmlhbGl6ZXJzLmFkZCh0aGlzKVxuXG4gICAgY29uc3RydWN0b3I6IChwYXJhbXMgPSB7fSkgLT5cbiAgICAgIHN1cGVyKHBhcmFtcylcbiAgICAgIGlmIHBhcmFtcy5ob3N0XG4gICAgICAgIEBob3N0ID0gcGFyYW1zLmhvc3RcbiAgICAgIGlmIHBhcmFtcy5sb2NhbEZpbGVcbiAgICAgICAgQGxvY2FsRmlsZSA9IHBhcmFtcy5sb2NhbEZpbGVcblxuICAgIGdldEljb25OYW1lOiAtPlxuICAgICAgXCJnbG9iZVwiXG5cbiAgICBnZXRUaXRsZTogLT5cbiAgICAgIGlmIEBsb2NhbEZpbGU/XG4gICAgICAgIEBsb2NhbEZpbGUubmFtZVxuICAgICAgZWxzZSBpZiBzZXNzaW9uUGF0aCA9IEBnZXRQYXRoKClcbiAgICAgICAgcGF0aC5iYXNlbmFtZShzZXNzaW9uUGF0aClcbiAgICAgIGVsc2VcbiAgICAgICAgXCJ1bmRlZmluZWRcIlxuXG4gICAgZ2V0TG9uZ1RpdGxlOiAtPlxuICAgICAgSG9zdCA/PSByZXF1aXJlICcuL2hvc3QnXG4gICAgICBGdHBIb3N0ID89IHJlcXVpcmUgJy4vZnRwLWhvc3QnXG4gICAgICBTZnRwSG9zdCA/PSByZXF1aXJlICcuL3NmdHAtaG9zdCdcblxuICAgICAgaWYgaSA9IEBsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRoLmluZGV4T2YoQGhvc3QuZGlyZWN0b3J5KSA+IC0xXG4gICAgICAgIHJlbGF0aXZlUGF0aCA9IEBsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRoWyhpK0Bob3N0LmRpcmVjdG9yeS5sZW5ndGgpLi5dXG5cbiAgICAgIGZpbGVOYW1lID0gQGdldFRpdGxlKClcbiAgICAgIGlmIEBob3N0IGluc3RhbmNlb2YgU2Z0cEhvc3QgYW5kIEBob3N0PyBhbmQgQGxvY2FsRmlsZT9cbiAgICAgICAgZGlyZWN0b3J5ID0gaWYgcmVsYXRpdmVQYXRoPyB0aGVuIHJlbGF0aXZlUGF0aCBlbHNlIFwic2Z0cDovLyN7QGhvc3QudXNlcm5hbWV9QCN7QGhvc3QuaG9zdG5hbWV9OiN7QGhvc3QucG9ydH0je0Bsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRofVwiXG4gICAgICBlbHNlIGlmIEBob3N0IGluc3RhbmNlb2YgRnRwSG9zdCBhbmQgQGhvc3Q/IGFuZCBAbG9jYWxGaWxlP1xuICAgICAgICBkaXJlY3RvcnkgPSBpZiByZWxhdGl2ZVBhdGg/IHRoZW4gcmVsYXRpdmVQYXRoIGVsc2UgXCJmdHA6Ly8je0Bob3N0LnVzZXJuYW1lfUAje0Bob3N0Lmhvc3RuYW1lfToje0Bob3N0LnBvcnR9I3tAbG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIlxuICAgICAgZWxzZVxuICAgICAgICBkaXJlY3RvcnkgPSBhdG9tLnByb2plY3QucmVsYXRpdml6ZShwYXRoLmRpcm5hbWUoc2Vzc2lvblBhdGgpKVxuICAgICAgICBkaXJlY3RvcnkgPSBpZiBkaXJlY3RvcnkubGVuZ3RoID4gMCB0aGVuIGRpcmVjdG9yeSBlbHNlIHBhdGguYmFzZW5hbWUocGF0aC5kaXJuYW1lKHNlc3Npb25QYXRoKSlcblxuICAgICAgXCIje2ZpbGVOYW1lfSAtICN7ZGlyZWN0b3J5fVwiXG5cbiAgICBvbkRpZFNhdmVkOiAoY2FsbGJhY2spIC0+XG4gICAgICBAZW1pdHRlci5vbiAnZGlkLXNhdmVkJywgY2FsbGJhY2tcblxuICAgIHNhdmU6IC0+XG4gICAgICBAYnVmZmVyLnNhdmUoKVxuICAgICAgQGVtaXR0ZXIuZW1pdCAnc2F2ZWQnXG4gICAgICBAaW5pdGlhdGVVcGxvYWQoKVxuXG4gICAgc2F2ZUFzOiAoZmlsZVBhdGgpIC0+XG4gICAgICBAYnVmZmVyLnNhdmVBcyhmaWxlUGF0aClcbiAgICAgIEBsb2NhbEZpbGUucGF0aCA9IGZpbGVQYXRoXG4gICAgICBAZW1pdHRlci5lbWl0ICdzYXZlZCdcbiAgICAgIEBpbml0aWF0ZVVwbG9hZCgpXG5cbiAgICBpbml0aWF0ZVVwbG9hZDogLT5cbiAgICAgIGlmIGF0b20uY29uZmlnLmdldCAncmVtb3RlLWVkaXQudXBsb2FkT25TYXZlJ1xuICAgICAgICBAdXBsb2FkKClcbiAgICAgIGVsc2VcbiAgICAgICAgRGlhbG9nID89IHJlcXVpcmUgJy4uL3ZpZXcvZGlhbG9nJ1xuICAgICAgICBjaG9zZW4gPSBhdG9tLmNvbmZpcm1cbiAgICAgICAgICBtZXNzYWdlOiBcIkZpbGUgaGFzIGJlZW4gc2F2ZWQuIERvIHlvdSB3YW50IHRvIHVwbG9hZCBjaGFuZ2VzIHRvIHJlbW90ZSBob3N0P1wiXG4gICAgICAgICAgZGV0YWlsZWRNZXNzYWdlOiBcIlRoZSBjaGFuZ2VzIGV4aXN0cyBvbiBkaXNrIGFuZCBjYW4gYmUgdXBsb2FkZWQgbGF0ZXIuXCJcbiAgICAgICAgICBidXR0b25zOiBbXCJVcGxvYWRcIiwgXCJDYW5jZWxcIl1cbiAgICAgICAgc3dpdGNoIGNob3NlblxuICAgICAgICAgIHdoZW4gMCB0aGVuIEB1cGxvYWQoKVxuICAgICAgICAgIHdoZW4gMSB0aGVuIHJldHVyblxuXG4gICAgdXBsb2FkOiAoY29ubmVjdGlvbk9wdGlvbnMgPSB7fSkgLT5cbiAgICAgIGFzeW5jID89IHJlcXVpcmUgJ2FzeW5jJ1xuICAgICAgXyA/PSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG4gICAgICBpZiBAbG9jYWxGaWxlPyBhbmQgQGhvc3Q/XG4gICAgICAgIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgICAgaWYgQGhvc3QudXNlUGFzc3dvcmQgYW5kICFjb25uZWN0aW9uT3B0aW9ucy5wYXNzd29yZD9cbiAgICAgICAgICAgICAgaWYgQGhvc3QucGFzc3dvcmQgPT0gXCJcIiBvciBAaG9zdC5wYXNzd29yZCA9PSAnJyBvciAhQGhvc3QucGFzc3dvcmQ/XG4gICAgICAgICAgICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgICAgICAgICAgIChjYWxsYmFjaykgLT5cbiAgICAgICAgICAgICAgICAgICAgRGlhbG9nID89IHJlcXVpcmUgJy4uL3ZpZXcvZGlhbG9nJ1xuICAgICAgICAgICAgICAgICAgICBwYXNzd29yZERpYWxvZyA9IG5ldyBEaWFsb2coe3Byb21wdDogXCJFbnRlciBwYXNzd29yZFwifSlcbiAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmREaWFsb2cudG9nZ2xlKGNhbGxiYWNrKVxuICAgICAgICAgICAgICAgIF0sIChlcnIsIHJlc3VsdCkgPT5cbiAgICAgICAgICAgICAgICAgIGNvbm5lY3Rpb25PcHRpb25zID0gXy5leHRlbmQoe3Bhc3N3b3JkOiByZXN1bHR9LCBjb25uZWN0aW9uT3B0aW9ucylcbiAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgICBpZiAhQGhvc3QuaXNDb25uZWN0ZWQoKVxuICAgICAgICAgICAgICBAaG9zdC5jb25uZWN0KGNhbGxiYWNrLCBjb25uZWN0aW9uT3B0aW9ucylcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgICBAaG9zdC53cml0ZUZpbGUoQGxvY2FsRmlsZSwgY2FsbGJhY2spXG4gICAgICAgIF0sIChlcnIpID0+XG4gICAgICAgICAgaWYgZXJyPyBhbmQgQGhvc3QudXNlUGFzc3dvcmRcbiAgICAgICAgICAgIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICAgICAgICAgIChjYWxsYmFjaykgLT5cbiAgICAgICAgICAgICAgICBEaWFsb2cgPz0gcmVxdWlyZSAnLi4vdmlldy9kaWFsb2cnXG4gICAgICAgICAgICAgICAgcGFzc3dvcmREaWFsb2cgPSBuZXcgRGlhbG9nKHtwcm9tcHQ6IFwiRW50ZXIgcGFzc3dvcmRcIn0pXG4gICAgICAgICAgICAgICAgcGFzc3dvcmREaWFsb2cudG9nZ2xlKGNhbGxiYWNrKVxuICAgICAgICAgICAgXSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICAgICAgICBAdXBsb2FkKHtwYXNzd29yZDogcmVzdWx0fSlcbiAgICAgICAgICAgIClcbiAgICAgICAgKVxuICAgICAgZWxzZVxuICAgICAgICBjb25zb2xlLmVycm9yICdMb2NhbEZpbGUgYW5kIGhvc3Qgbm90IGRlZmluZWQuIENhbm5vdCB1cGxvYWQgZmlsZSEnXG5cbiAgICBzZXJpYWxpemU6IC0+XG4gICAgICBkYXRhID0gc3VwZXJcbiAgICAgIGRhdGEuZGVzZXJpYWxpemVyID0gJ1JlbW90ZUVkaXRFZGl0b3InXG4gICAgICBkYXRhLmxvY2FsRmlsZSA9IEBsb2NhbEZpbGU/LnNlcmlhbGl6ZSgpXG4gICAgICBkYXRhLmhvc3QgPSBAaG9zdD8uc2VyaWFsaXplKClcbiAgICAgIHJldHVybiBkYXRhXG5cbiAgICAjIG1vc3RseSBjb3BpZWQgZnJvbSBUZXh0RWRpdG9yLmRlc2VyaWFsaXplXG4gICAgQGRlc2VyaWFsaXplOiAoc3RhdGUsIGF0b21FbnZpcm9ubWVudCkgLT5cbiAgICAgIHRyeVxuICAgICAgICBkaXNwbGF5QnVmZmVyID0gVGV4dEVkaXRvci5kZXNlcmlhbGl6ZShzdGF0ZS5kaXNwbGF5QnVmZmVyLCBhdG9tRW52aXJvbm1lbnQpXG4gICAgICBjYXRjaCBlcnJvclxuICAgICAgICBpZiBlcnJvci5zeXNjYWxsIGlzICdyZWFkJ1xuICAgICAgICAgIHJldHVybiAjIGVycm9yIHJlYWRpbmcgdGhlIGZpbGUsIGRvbnQgZGVzZXJpYWxpemUgYW4gZWRpdG9yIGZvciBpdFxuICAgICAgICBlbHNlXG4gICAgICAgICAgdGhyb3cgZXJyb3JcblxuICAgICAgc3RhdGUuZGlzcGxheUJ1ZmZlciA9IGRpc3BsYXlCdWZmZXJcbiAgICAgIHN0YXRlLnJlZ2lzdGVyRWRpdG9yID0gdHJ1ZVxuICAgICAgaWYgc3RhdGUubG9jYWxGaWxlP1xuICAgICAgICBMb2NhbEZpbGUgPSByZXF1aXJlICcuLi9tb2RlbC9sb2NhbC1maWxlJ1xuICAgICAgICBzdGF0ZS5sb2NhbEZpbGUgPSBMb2NhbEZpbGUuZGVzZXJpYWxpemUoc3RhdGUubG9jYWxGaWxlKVxuICAgICAgaWYgc3RhdGUuaG9zdD9cbiAgICAgICAgSG9zdCA9IHJlcXVpcmUgJy4uL21vZGVsL2hvc3QnXG4gICAgICAgIEZ0cEhvc3QgPSByZXF1aXJlICcuLi9tb2RlbC9mdHAtaG9zdCdcbiAgICAgICAgU2Z0cEhvc3QgPSByZXF1aXJlICcuLi9tb2RlbC9zZnRwLWhvc3QnXG4gICAgICAgIHN0YXRlLmhvc3QgPSBIb3N0LmRlc2VyaWFsaXplKHN0YXRlLmhvc3QpXG4gICAgICAjIGRpc3BsYXlCdWZmZXIgaGFzIG5vIGdldE1hcmtlckxheWVyXG4gICAgICAjc3RhdGUuc2VsZWN0aW9uc01hcmtlckxheWVyID0gZGlzcGxheUJ1ZmZlci5nZXRNYXJrZXJMYXllcihzdGF0ZS5zZWxlY3Rpb25zTWFya2VyTGF5ZXJJZClcbiAgICAgIHN0YXRlLmNvbmZpZyA9IGF0b21FbnZpcm9ubWVudC5jb25maWdcbiAgICAgIHN0YXRlLm5vdGlmaWNhdGlvbk1hbmFnZXIgPSBhdG9tRW52aXJvbm1lbnQubm90aWZpY2F0aW9uc1xuICAgICAgc3RhdGUucGFja2FnZU1hbmFnZXIgPSBhdG9tRW52aXJvbm1lbnQucGFja2FnZXNcbiAgICAgIHN0YXRlLmNsaXBib2FyZCA9IGF0b21FbnZpcm9ubWVudC5jbGlwYm9hcmRcbiAgICAgIHN0YXRlLnZpZXdSZWdpc3RyeSA9IGF0b21FbnZpcm9ubWVudC52aWV3c1xuICAgICAgc3RhdGUuZ3JhbW1hclJlZ2lzdHJ5ID0gYXRvbUVudmlyb25tZW50LmdyYW1tYXJzXG4gICAgICBzdGF0ZS5wcm9qZWN0ID0gYXRvbUVudmlyb25tZW50LnByb2plY3RcbiAgICAgIHN0YXRlLmFzc2VydCA9IGF0b21FbnZpcm9ubWVudC5hc3NlcnQuYmluZChhdG9tRW52aXJvbm1lbnQpXG4gICAgICBzdGF0ZS5hcHBsaWNhdGlvbkRlbGVnYXRlID0gYXRvbUVudmlyb25tZW50LmFwcGxpY2F0aW9uRGVsZWdhdGVcbiAgICAgIG5ldyB0aGlzKHN0YXRlKVxuIl19
