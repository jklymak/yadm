(function() {
  var FtpHost, Host, LocalFile, Path, RemoteFile, Serializable, _, async, err, filesize, fs, ftp, keytar, moment,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Host = require('./host');

  RemoteFile = require('./remote-file');

  LocalFile = require('./local-file');

  async = require('async');

  filesize = require('file-size');

  moment = require('moment');

  ftp = require('ftp');

  Serializable = require('serializable');

  Path = require('path');

  _ = require('underscore-plus');

  fs = require('fs-plus');

  try {
    keytar = require('keytar');
  } catch (error) {
    err = error;
    console.debug('Keytar could not be loaded! Passwords will be stored in cleartext to remoteEdit.json!');
    keytar = void 0;
  }

  module.exports = FtpHost = (function(superClass) {
    extend(FtpHost, superClass);

    Serializable.includeInto(FtpHost);

    atom.deserializers.add(FtpHost);

    Host.registerDeserializers(FtpHost);

    FtpHost.prototype.connection = void 0;

    FtpHost.prototype.protocol = "ftp";

    function FtpHost(alias, hostname, directory, username, port, localFiles, usePassword, password, lastOpenDirectory) {
      this.alias = alias != null ? alias : null;
      this.hostname = hostname;
      this.directory = directory;
      this.username = username;
      this.port = port != null ? port : "21";
      this.localFiles = localFiles != null ? localFiles : [];
      this.usePassword = usePassword != null ? usePassword : true;
      this.password = password;
      this.lastOpenDirectory = lastOpenDirectory;
      FtpHost.__super__.constructor.call(this, this.alias, this.hostname, this.directory, this.username, this.port, this.localFiles, this.usePassword, this.lastOpenDirectory);
    }

    FtpHost.prototype.createRemoteFileFromListObj = function(name, item) {
      var remoteFile;
      if (!((item.name != null) && item.name !== '..' && item.name !== '.')) {
        return void 0;
      }
      remoteFile = new RemoteFile(Path.normalize(name + '/' + item.name).split(Path.sep).join('/'), false, false, false, filesize(item.size).human(), null, null);
      if (item.type === "d") {
        remoteFile.isDir = true;
      } else if (item.type === "-") {
        remoteFile.isFile = true;
      } else if (item.type === 'l') {
        remoteFile.isLink = true;
      }
      if (item.rights != null) {
        remoteFile.permissions = this.convertRWXToNumber(item.rights.user) + this.convertRWXToNumber(item.rights.group) + this.convertRWXToNumber(item.rights.other);
      }
      if (item.date != null) {
        remoteFile.lastModified = moment(item.date).format("HH:mm:ss DD/MM/YYYY");
      }
      return remoteFile;
    };

    FtpHost.prototype.convertRWXToNumber = function(str) {
      var i, j, len, toreturn;
      toreturn = 0;
      for (j = 0, len = str.length; j < len; j++) {
        i = str[j];
        if (i === 'r') {
          toreturn += 4;
        } else if (i === 'w') {
          toreturn += 2;
        } else if (i === 'x') {
          toreturn += 1;
        }
      }
      return toreturn.toString();
    };

    FtpHost.prototype.getServiceNamePassword = function() {
      return "atom.remote-edit.ftp.password";
    };

    FtpHost.prototype.getConnectionString = function(connectionOptions) {
      var keytarPassword;
      if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (keytar != null)) {
        keytarPassword = keytar.getPassword(this.getServiceNamePassword(), this.getServiceAccount());
        return _.extend({
          host: this.hostname,
          port: this.port,
          user: this.username,
          password: keytarPassword
        }, connectionOptions);
      } else {
        return _.extend({
          host: this.hostname,
          port: this.port,
          user: this.username,
          password: this.password
        }, connectionOptions);
      }
    };

    FtpHost.prototype.close = function(callback) {
      var ref;
      if ((ref = this.connection) != null) {
        ref.end();
      }
      return typeof callback === "function" ? callback(null) : void 0;
    };

    FtpHost.prototype.connect = function(callback, connectionOptions) {
      if (connectionOptions == null) {
        connectionOptions = {};
      }
      this.emitter.emit('info', {
        message: "Connecting to ftp://" + this.username + "@" + this.hostname + ":" + this.port,
        type: 'info'
      });
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            _this.connection = new ftp();
            _this.connection.on('error', function(err) {
              _this.connection.end();
              _this.emitter.emit('info', {
                message: "Error occured when connecting to ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port,
                type: 'error'
              });
              return typeof callback === "function" ? callback(err) : void 0;
            });
            _this.connection.on('ready', function() {
              _this.emitter.emit('info', {
                message: "Successfully connected to ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port,
                type: 'success'
              });
              return callback(null);
            });
            return _this.connection.connect(_this.getConnectionString(connectionOptions));
          };
        })(this)
      ], function(err) {
        return typeof callback === "function" ? callback(err) : void 0;
      });
    };

    FtpHost.prototype.isConnected = function() {
      return (this.connection != null) && this.connection.connected;
    };

    FtpHost.prototype.getFilesMetadata = function(path, callback) {
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.connection.list(path, callback);
          };
        })(this), (function(_this) {
          return function(files, callback) {
            return async.map(files, (function(item, callback) {
              return callback(null, _this.createRemoteFileFromListObj(path, item));
            }), callback);
          };
        })(this), function(objects, callback) {
          return async.filter(objects, (function(item, callback) {
            return callback(item != null);
          }), (function(result) {
            return callback(null, result);
          }));
        }, function(objects, callback) {
          objects.push(new RemoteFile(path + "/..", false, true, false, null, null, null));
          if (atom.config.get('remote-edit.showHiddenFiles')) {
            return callback(null, objects);
          } else {
            return async.filter(objects, (function(item, callback) {
              return item.isHidden(callback);
            }), (function(result) {
              return callback(null, result);
            }));
          }
        }
      ], (function(_this) {
        return function(err, result) {
          if (err != null) {
            _this.emitter.emit('info', {
              message: "Error occured when reading remote directory ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + ":" + path,
              type: 'error'
            });
            if (err != null) {
              console.error(err);
            }
            return typeof callback === "function" ? callback(err) : void 0;
          } else {
            return typeof callback === "function" ? callback(err, result.sort(function(a, b) {
              if (a.name.toLowerCase() >= b.name.toLowerCase()) {
                return 1;
              } else {
                return -1;
              }
            })) : void 0;
          }
        };
      })(this));
    };

    FtpHost.prototype.getFile = function(localFile, callback) {
      this.emitter.emit('info', {
        message: "Getting remote file ftp://" + this.username + "@" + this.hostname + ":" + this.port + localFile.remoteFile.path,
        type: 'info'
      });
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.connection.get(localFile.remoteFile.path, callback);
          };
        })(this), function(readableStream, callback) {
          var writableStream;
          writableStream = fs.createWriteStream(localFile.path);
          readableStream.pipe(writableStream);
          return readableStream.on('end', function() {
            return callback(null);
          });
        }
      ], (function(_this) {
        return function(err) {
          if (err != null) {
            _this.emitter.emit('info', {
              message: "Error when reading remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'error'
            });
            return typeof callback === "function" ? callback(err, localFile) : void 0;
          } else {
            _this.emitter.emit('info', {
              message: "Successfully read remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'success'
            });
            return typeof callback === "function" ? callback(null, localFile) : void 0;
          }
        };
      })(this));
    };

    FtpHost.prototype.writeFile = function(localFile, callback) {
      this.emitter.emit('info', {
        message: "Writing remote file ftp://" + this.username + "@" + this.hostname + ":" + this.port + localFile.remoteFile.path,
        type: 'info'
      });
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.connection.put(localFile.path, localFile.remoteFile.path, callback);
          };
        })(this)
      ], (function(_this) {
        return function(err) {
          if (err != null) {
            _this.emitter.emit('info', {
              message: "Error occured when writing remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'error'
            });
            if (err != null) {
              console.error(err);
            }
          } else {
            _this.emitter.emit('info', {
              message: "Successfully wrote remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'success'
            });
          }
          _this.close();
          return typeof callback === "function" ? callback(err) : void 0;
        };
      })(this));
    };

    FtpHost.prototype.serializeParams = function() {
      var localFile;
      return {
        alias: this.alias,
        hostname: this.hostname,
        directory: this.directory,
        username: this.username,
        port: this.port,
        localFiles: (function() {
          var j, len, ref, results;
          ref = this.localFiles;
          results = [];
          for (j = 0, len = ref.length; j < len; j++) {
            localFile = ref[j];
            results.push(localFile.serialize());
          }
          return results;
        }).call(this),
        usePassword: this.usePassword,
        password: this.password,
        lastOpenDirectory: this.lastOpenDirectory
      };
    };

    FtpHost.prototype.deserializeParams = function(params) {
      var j, len, localFile, ref, tmpArray;
      tmpArray = [];
      ref = params.localFiles;
      for (j = 0, len = ref.length; j < len; j++) {
        localFile = ref[j];
        tmpArray.push(LocalFile.deserialize(localFile, {
          host: this
        }));
      }
      params.localFiles = tmpArray;
      return params;
    };

    FtpHost.prototype.createFolder = function(folderpath, callback) {
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.connection.mkdir(folderpath, callback);
          };
        })(this)
      ], (function(_this) {
        return function(err) {
          if (err != null) {
            _this.emitter.emit('info', {
              message: "Error occurred when creating remote folder ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + folderpath,
              type: 'error'
            });
            if (err != null) {
              console.error(err);
            }
          } else {
            _this.emitter.emit('info', {
              message: "Successfully created remote folder ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + folderpath,
              type: 'success'
            });
          }
          return typeof callback === "function" ? callback(err) : void 0;
        };
      })(this));
    };

    FtpHost.prototype.createFile = function(filepath, callback) {
      if (filepath.indexOf(".") === -1) {
        return this.emitter.emit('info', {
          message: "Invalid file name",
          type: 'error'
        });
      } else {
        return this.connection.get(filepath, (function(_this) {
          return function(err, result) {
            if (result) {
              return _this.emitter.emit('info', {
                message: "File already exists",
                type: 'error'
              });
            } else {
              return async.waterfall([
                function(callback) {
                  return _this.connection.put(new Buffer(''), filepath, callback);
                }
              ], function(err) {
                if (err != null) {
                  _this.emitter.emit('info', {
                    message: "Error occurred when writing remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + filepath,
                    type: 'error'
                  });
                  if (err != null) {
                    console.error(err);
                  }
                } else {
                  _this.emitter.emit('info', {
                    message: "Successfully wrote remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + filepath,
                    type: 'success'
                  });
                }
                return typeof callback === "function" ? callback(err) : void 0;
              });
            }
          };
        })(this));
      }
    };

    FtpHost.prototype.renameFolderFile = function(path, oldName, newName, isFolder, callback) {
      var newPath, oldPath;
      if (oldName === newName) {
        return this.emitter.emit('info', {
          message: "The new name is same as the old",
          type: 'error'
        });
      } else {
        oldPath = path + "/" + oldName;
        newPath = path + "/" + newName;
        return async.waterfall([
          (function(_this) {
            return function(callback) {
              if (isFolder) {
                return _this.connection.list(newPath, callback);
              } else {
                return _this.connection.get(newPath, callback);
              }
            };
          })(this)
        ], (function(_this) {
          return function(err, result) {
            if ((isFolder && result.length > 0) || (!isFolder && result)) {
              return _this.emitter.emit('info', {
                message: (isFolder ? 'Folder' : 'File') + " already exists",
                type: 'error'
              });
            } else {
              return async.waterfall([
                function(callback) {
                  return _this.connection.rename(oldPath, newPath, callback);
                }
              ], function(err) {
                if (err != null) {
                  _this.emitter.emit('info', {
                    message: "Error occurred when renaming remote folder/file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + oldPath,
                    type: 'error'
                  });
                  if (err != null) {
                    console.error(err);
                  }
                } else {
                  _this.emitter.emit('info', {
                    message: "Successfully renamed remote folder/file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + oldPath,
                    type: 'success'
                  });
                }
                return typeof callback === "function" ? callback(err) : void 0;
              });
            }
          };
        })(this));
      }
    };

    FtpHost.prototype.deleteFolderFile = function(deletepath, isFolder, callback) {
      if (isFolder) {
        return this.connection.rmdir(deletepath, (function(_this) {
          return function(err) {
            if (err != null) {
              _this.emitter.emit('info', {
                message: "Error occurred when deleting remote folder ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + deletepath,
                type: 'error'
              });
              if (err != null) {
                console.error(err);
              }
            } else {
              _this.emitter.emit('info', {
                message: "Successfully deleted remote folder ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + deletepath,
                type: 'success'
              });
            }
            return typeof callback === "function" ? callback(err) : void 0;
          };
        })(this));
      } else {
        return this.connection["delete"](deletepath, (function(_this) {
          return function(err) {
            if (err != null) {
              _this.emitter.emit('info', {
                message: "Error occurred when deleting remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + deletepath,
                type: 'error'
              });
              if (err != null) {
                console.error(err);
              }
            } else {
              _this.emitter.emit('info', {
                message: "Successfully deleted remote file ftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + deletepath,
                type: 'success'
              });
            }
            return typeof callback === "function" ? callback(err) : void 0;
          };
        })(this));
      }
    };

    return FtpHost;

  })(Host);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi9tb2RlbC9mdHAtaG9zdC5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLDBHQUFBO0lBQUE7OztFQUFBLElBQUEsR0FBTyxPQUFBLENBQVEsUUFBUjs7RUFFUCxVQUFBLEdBQWEsT0FBQSxDQUFRLGVBQVI7O0VBQ2IsU0FBQSxHQUFZLE9BQUEsQ0FBUSxjQUFSOztFQUVaLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUixRQUFBLEdBQVcsT0FBQSxDQUFRLFdBQVI7O0VBQ1gsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSOztFQUNULEdBQUEsR0FBTSxPQUFBLENBQVEsS0FBUjs7RUFDTixZQUFBLEdBQWUsT0FBQSxDQUFRLGNBQVI7O0VBQ2YsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLENBQUEsR0FBSSxPQUFBLENBQVEsaUJBQVI7O0VBQ0osRUFBQSxHQUFLLE9BQUEsQ0FBUSxTQUFSOztBQUVMO0lBQ0UsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSLEVBRFg7R0FBQSxhQUFBO0lBRU07SUFDSixPQUFPLENBQUMsS0FBUixDQUFjLHVGQUFkO0lBQ0EsTUFBQSxHQUFTLE9BSlg7OztFQU1BLE1BQU0sQ0FBQyxPQUFQLEdBQ1E7OztJQUNKLFlBQVksQ0FBQyxXQUFiLENBQXlCLE9BQXpCOztJQUNBLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBbkIsQ0FBdUIsT0FBdkI7O0lBRUEsSUFBSSxDQUFDLHFCQUFMLENBQTJCLE9BQTNCOztzQkFFQSxVQUFBLEdBQVk7O3NCQUNaLFFBQUEsR0FBVTs7SUFFRyxpQkFBQyxLQUFELEVBQWdCLFFBQWhCLEVBQTJCLFNBQTNCLEVBQXVDLFFBQXZDLEVBQWtELElBQWxELEVBQWdFLFVBQWhFLEVBQWtGLFdBQWxGLEVBQXdHLFFBQXhHLEVBQW1I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QUFTLHlDQUFBLEdBQTBDLEtBQUMsQ0FBQSxRQUEzQyxHQUFvRCxHQUFwRCxHQUF1RCxLQUFDLENBQUEsUUFBeEQsR0FBaUUsR0FBakUsR0FBb0UsS0FBQyxDQUFBLElBQXJFLEdBQTRFLFVBQXRGO2dCQUFvRyxJQUFBLEVBQU0sU0FBMUc7ZUFBdEIsRUFKRjs7b0RBS0EsU0FBVTtVQU5tQjtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBL0IsRUFWRjs7SUFEZ0I7Ozs7S0EzTkU7QUFyQnhCIiwic291cmNlc0NvbnRlbnQiOlsiSG9zdCA9IHJlcXVpcmUgJy4vaG9zdCdcblxuUmVtb3RlRmlsZSA9IHJlcXVpcmUgJy4vcmVtb3RlLWZpbGUnXG5Mb2NhbEZpbGUgPSByZXF1aXJlICcuL2xvY2FsLWZpbGUnXG5cbmFzeW5jID0gcmVxdWlyZSAnYXN5bmMnXG5maWxlc2l6ZSA9IHJlcXVpcmUgJ2ZpbGUtc2l6ZSdcbm1vbWVudCA9IHJlcXVpcmUgJ21vbWVudCdcbmZ0cCA9IHJlcXVpcmUgJ2Z0cCdcblNlcmlhbGl6YWJsZSA9IHJlcXVpcmUgJ3NlcmlhbGl6YWJsZSdcblBhdGggPSByZXF1aXJlICdwYXRoJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbmZzID0gcmVxdWlyZSAnZnMtcGx1cydcblxudHJ5XG4gIGtleXRhciA9IHJlcXVpcmUgJ2tleXRhcidcbmNhdGNoIGVyclxuICBjb25zb2xlLmRlYnVnICdLZXl0YXIgY291bGQgbm90IGJlIGxvYWRlZCEgUGFzc3dvcmRzIHdpbGwgYmUgc3RvcmVkIGluIGNsZWFydGV4dCB0byByZW1vdGVFZGl0Lmpzb24hJ1xuICBrZXl0YXIgPSB1bmRlZmluZWRcblxubW9kdWxlLmV4cG9ydHMgPVxuICBjbGFzcyBGdHBIb3N0IGV4dGVuZHMgSG9zdFxuICAgIFNlcmlhbGl6YWJsZS5pbmNsdWRlSW50byh0aGlzKVxuICAgIGF0b20uZGVzZXJpYWxpemVycy5hZGQodGhpcylcblxuICAgIEhvc3QucmVnaXN0ZXJEZXNlcmlhbGl6ZXJzKEZ0cEhvc3QpXG5cbiAgICBjb25uZWN0aW9uOiB1bmRlZmluZWRcbiAgICBwcm90b2NvbDogXCJmdHBcIlxuXG4gICAgY29uc3RydWN0b3I6IChAYWxpYXMgPSBudWxsLCBAaG9zdG5hbWUsIEBkaXJlY3RvcnksIEB1c2VybmFtZSwgQHBvcnQgPSBcIjIxXCIsIEBsb2NhbEZpbGVzID0gW10sIEB1c2VQYXNzd29yZCA9IHRydWUsICBAcGFzc3dvcmQsIEBsYXN0T3BlbkRpcmVjdG9yeSkgLT5cbiAgICAgIHN1cGVyKCBAYWxpYXMsIEBob3N0bmFtZSwgQGRpcmVjdG9yeSwgQHVzZXJuYW1lLCBAcG9ydCwgQGxvY2FsRmlsZXMsIEB1c2VQYXNzd29yZCwgQGxhc3RPcGVuRGlyZWN0b3J5IClcblxuICAgIGNyZWF0ZVJlbW90ZUZpbGVGcm9tTGlzdE9iajogKG5hbWUsIGl0ZW0pIC0+XG4gICAgICB1bmxlc3MgaXRlbS5uYW1lPyBhbmQgaXRlbS5uYW1lIGlzbnQgJy4uJyBhbmQgaXRlbS5uYW1lIGlzbnQgJy4nXG4gICAgICAgIHJldHVybiB1bmRlZmluZWRcblxuICAgICAgcmVtb3RlRmlsZSA9IG5ldyBSZW1vdGVGaWxlKFBhdGgubm9ybWFsaXplKChuYW1lICsgJy8nICsgaXRlbS5uYW1lKSkuc3BsaXQoUGF0aC5zZXApLmpvaW4oJy8nKSwgZmFsc2UsIGZhbHNlLCBmYWxzZSwgZmlsZXNpemUoaXRlbS5zaXplKS5odW1hbigpLCBudWxsLCBudWxsKVxuXG4gICAgICBpZiBpdGVtLnR5cGUgPT0gXCJkXCJcbiAgICAgICAgcmVtb3RlRmlsZS5pc0RpciA9IHRydWVcbiAgICAgIGVsc2UgaWYgaXRlbS50eXBlID09IFwiLVwiXG4gICAgICAgIHJlbW90ZUZpbGUuaXNGaWxlID0gdHJ1ZVxuICAgICAgZWxzZSBpZiBpdGVtLnR5cGUgPT0gJ2wnXG4gICAgICAgIHJlbW90ZUZpbGUuaXNMaW5rID0gdHJ1ZVxuXG4gICAgICBpZiBpdGVtLnJpZ2h0cz9cbiAgICAgICAgcmVtb3RlRmlsZS5wZXJtaXNzaW9ucyA9IChAY29udmVydFJXWFRvTnVtYmVyKGl0ZW0ucmlnaHRzLnVzZXIpICsgQGNvbnZlcnRSV1hUb051bWJlcihpdGVtLnJpZ2h0cy5ncm91cCkgKyBAY29udmVydFJXWFRvTnVtYmVyKGl0ZW0ucmlnaHRzLm90aGVyKSlcblxuICAgICAgaWYgaXRlbS5kYXRlP1xuICAgICAgICByZW1vdGVGaWxlLmxhc3RNb2RpZmllZCA9IG1vbWVudChpdGVtLmRhdGUpLmZvcm1hdChcIkhIOm1tOnNzIEREL01NL1lZWVlcIilcblxuICAgICAgcmV0dXJuIHJlbW90ZUZpbGVcblxuICAgIGNvbnZlcnRSV1hUb051bWJlcjogKHN0cikgLT5cbiAgICAgIHRvcmV0dXJuID0gMFxuICAgICAgZm9yIGkgaW4gc3RyXG4gICAgICAgIGlmIGkgPT0gJ3InXG4gICAgICAgICAgdG9yZXR1cm4gKz0gNFxuICAgICAgICBlbHNlIGlmIGkgPT0gJ3cnXG4gICAgICAgICAgdG9yZXR1cm4gKz0gMlxuICAgICAgICBlbHNlIGlmIGkgPT0gJ3gnXG4gICAgICAgICAgdG9yZXR1cm4gKz0gMVxuICAgICAgcmV0dXJuIHRvcmV0dXJuLnRvU3RyaW5nKClcblxuICAgIGdldFNlcnZpY2VOYW1lUGFzc3dvcmQ6IC0+XG4gICAgICBcImF0b20ucmVtb3RlLWVkaXQuZnRwLnBhc3N3b3JkXCJcblxuICAgICMjIyMjIyMjIyMjIyMjIyMjIyMjXG4gICAgIyBPdmVycmlkZGVuIG1ldGhvZHNcbiAgICBnZXRDb25uZWN0aW9uU3RyaW5nOiAoY29ubmVjdGlvbk9wdGlvbnMpIC0+XG4gICAgICBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXInKSBhbmQgKGtleXRhcj8pXG4gICAgICAgIGtleXRhclBhc3N3b3JkID0ga2V5dGFyLmdldFBhc3N3b3JkKEBnZXRTZXJ2aWNlTmFtZVBhc3N3b3JkKCksIEBnZXRTZXJ2aWNlQWNjb3VudCgpKVxuICAgICAgICBfLmV4dGVuZCh7aG9zdDogQGhvc3RuYW1lLCBwb3J0OiBAcG9ydCwgdXNlcjogQHVzZXJuYW1lLCBwYXNzd29yZDoga2V5dGFyUGFzc3dvcmR9LCBjb25uZWN0aW9uT3B0aW9ucylcbiAgICAgIGVsc2VcbiAgICAgICAgXy5leHRlbmQoe2hvc3Q6IEBob3N0bmFtZSwgcG9ydDogQHBvcnQsIHVzZXI6IEB1c2VybmFtZSwgcGFzc3dvcmQ6IEBwYXNzd29yZH0sIGNvbm5lY3Rpb25PcHRpb25zKVxuXG5cbiAgICBjbG9zZTogKGNhbGxiYWNrKSAtPlxuICAgICAgQGNvbm5lY3Rpb24/LmVuZCgpXG4gICAgICBjYWxsYmFjaz8obnVsbClcblxuICAgIGNvbm5lY3Q6IChjYWxsYmFjaywgY29ubmVjdGlvbk9wdGlvbnMgPSB7fSkgLT5cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2luZm8nLCB7bWVzc2FnZTogXCJDb25uZWN0aW5nIHRvIGZ0cDovLyN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH1cIiwgdHlwZTogJ2luZm8nfVxuICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIEBjb25uZWN0aW9uID0gbmV3IGZ0cCgpXG4gICAgICAgICAgQGNvbm5lY3Rpb24ub24gJ2Vycm9yJywgKGVycikgPT5cbiAgICAgICAgICAgIEBjb25uZWN0aW9uLmVuZCgpXG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0ICdpbmZvJywge21lc3NhZ2U6IFwiRXJyb3Igb2NjdXJlZCB3aGVuIGNvbm5lY3RpbmcgdG8gZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fVwiLCB0eXBlOiAnZXJyb3InfVxuICAgICAgICAgICAgY2FsbGJhY2s/KGVycilcbiAgICAgICAgICBAY29ubmVjdGlvbi5vbiAncmVhZHknLCA9PlxuICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCAnaW5mbycsIHttZXNzYWdlOiBcIlN1Y2Nlc3NmdWxseSBjb25uZWN0ZWQgdG8gZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fVwiLCB0eXBlOiAnc3VjY2Vzcyd9XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKVxuICAgICAgICAgIEBjb25uZWN0aW9uLmNvbm5lY3QoQGdldENvbm5lY3Rpb25TdHJpbmcoY29ubmVjdGlvbk9wdGlvbnMpKVxuICAgICAgXSwgKGVycikgLT5cbiAgICAgICAgY2FsbGJhY2s/KGVycilcbiAgICAgIClcblxuICAgIGlzQ29ubmVjdGVkOiAtPlxuICAgICAgQGNvbm5lY3Rpb24/IGFuZCBAY29ubmVjdGlvbi5jb25uZWN0ZWRcblxuICAgIGdldEZpbGVzTWV0YWRhdGE6IChwYXRoLCBjYWxsYmFjaykgLT5cbiAgICAgIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICAgIChjYWxsYmFjaykgPT5cbiAgICAgICAgICBAY29ubmVjdGlvbi5saXN0KHBhdGgsIGNhbGxiYWNrKVxuICAgICAgICAoZmlsZXMsIGNhbGxiYWNrKSA9PlxuICAgICAgICAgIGFzeW5jLm1hcChmaWxlcywgKChpdGVtLCBjYWxsYmFjaykgPT4gY2FsbGJhY2sobnVsbCwgQGNyZWF0ZVJlbW90ZUZpbGVGcm9tTGlzdE9iaihwYXRoLCBpdGVtKSkpLCBjYWxsYmFjaylcbiAgICAgICAgKG9iamVjdHMsIGNhbGxiYWNrKSAtPlxuICAgICAgICAgIGFzeW5jLmZpbHRlcihvYmplY3RzLCAoKGl0ZW0sIGNhbGxiYWNrKSAtPiBjYWxsYmFjayhpdGVtPykpLCAoKHJlc3VsdCkgLT4gY2FsbGJhY2sobnVsbCwgcmVzdWx0KSkpXG4gICAgICAgIChvYmplY3RzLCBjYWxsYmFjaykgLT5cbiAgICAgICAgICBvYmplY3RzLnB1c2gobmV3IFJlbW90ZUZpbGUoKHBhdGggKyBcIi8uLlwiKSwgZmFsc2UsIHRydWUsIGZhbHNlLCBudWxsLCBudWxsLCBudWxsKSlcbiAgICAgICAgICBpZiBhdG9tLmNvbmZpZy5nZXQgJ3JlbW90ZS1lZGl0LnNob3dIaWRkZW5GaWxlcydcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIG9iamVjdHMpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXN5bmMuZmlsdGVyKG9iamVjdHMsICgoaXRlbSwgY2FsbGJhY2spIC0+IGl0ZW0uaXNIaWRkZW4oY2FsbGJhY2spKSwgKChyZXN1bHQpIC0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkpKVxuICAgICAgXSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIkVycm9yIG9jY3VyZWQgd2hlbiByZWFkaW5nIHJlbW90ZSBkaXJlY3RvcnkgZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fToje3BhdGh9XCIsIHR5cGU6ICdlcnJvcid9IClcbiAgICAgICAgICBjb25zb2xlLmVycm9yIGVyciBpZiBlcnI/XG4gICAgICAgICAgY2FsbGJhY2s/KGVycilcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGNhbGxiYWNrPyhlcnIsIChyZXN1bHQuc29ydCAoYSwgYikgLT4gcmV0dXJuIGlmIGEubmFtZS50b0xvd2VyQ2FzZSgpID49IGIubmFtZS50b0xvd2VyQ2FzZSgpIHRoZW4gMSBlbHNlIC0xKSlcbiAgICAgIClcblxuICAgIGdldEZpbGU6IChsb2NhbEZpbGUsIGNhbGxiYWNrKSAtPlxuICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIkdldHRpbmcgcmVtb3RlIGZpbGUgZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7bG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIiwgdHlwZTogJ2luZm8nfSlcbiAgICAgIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICAgIChjYWxsYmFjaykgPT5cbiAgICAgICAgICBAY29ubmVjdGlvbi5nZXQobG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aCwgY2FsbGJhY2spXG4gICAgICAgIChyZWFkYWJsZVN0cmVhbSwgY2FsbGJhY2spIC0+XG4gICAgICAgICAgd3JpdGFibGVTdHJlYW0gPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShsb2NhbEZpbGUucGF0aClcbiAgICAgICAgICByZWFkYWJsZVN0cmVhbS5waXBlKHdyaXRhYmxlU3RyZWFtKVxuICAgICAgICAgIHJlYWRhYmxlU3RyZWFtLm9uICdlbmQnLCAtPiBjYWxsYmFjayhudWxsKVxuICAgICAgXSwgKGVycikgPT5cbiAgICAgICAgaWYgZXJyP1xuICAgICAgICAgIEBlbWl0dGVyLmVtaXQoJ2luZm8nLCB7bWVzc2FnZTogXCJFcnJvciB3aGVuIHJlYWRpbmcgcmVtb3RlIGZpbGUgZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7bG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIiwgdHlwZTogJ2Vycm9yJ30pXG4gICAgICAgICAgY2FsbGJhY2s/KGVyciwgbG9jYWxGaWxlKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIlN1Y2Nlc3NmdWxseSByZWFkIHJlbW90ZSBmaWxlIGZ0cDovLyN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH0je2xvY2FsRmlsZS5yZW1vdGVGaWxlLnBhdGh9XCIsIHR5cGU6ICdzdWNjZXNzJ30pXG4gICAgICAgICAgY2FsbGJhY2s/KG51bGwsIGxvY2FsRmlsZSlcbiAgICAgIClcblxuICAgIHdyaXRlRmlsZTogKGxvY2FsRmlsZSwgY2FsbGJhY2spIC0+XG4gICAgICBAZW1pdHRlci5lbWl0ICdpbmZvJywge21lc3NhZ2U6IFwiV3JpdGluZyByZW1vdGUgZmlsZSBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRofVwiLCB0eXBlOiAnaW5mbyd9XG4gICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgQGNvbm5lY3Rpb24ucHV0KGxvY2FsRmlsZS5wYXRoLCBsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRoLCBjYWxsYmFjaylcbiAgICAgIF0sIChlcnIpID0+XG4gICAgICAgIGlmIGVycj9cbiAgICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiRXJyb3Igb2NjdXJlZCB3aGVuIHdyaXRpbmcgcmVtb3RlIGZpbGUgZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7bG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIiwgdHlwZTogJ2Vycm9yJ30pXG4gICAgICAgICAgY29uc29sZS5lcnJvciBlcnIgaWYgZXJyP1xuICAgICAgICBlbHNlXG4gICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIlN1Y2Nlc3NmdWxseSB3cm90ZSByZW1vdGUgZmlsZSBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRofVwiLCB0eXBlOiAnc3VjY2Vzcyd9KVxuICAgICAgICBAY2xvc2UoKVxuICAgICAgICBjYWxsYmFjaz8oZXJyKVxuICAgICAgKVxuXG4gICAgc2VyaWFsaXplUGFyYW1zOiAtPlxuICAgICAge1xuICAgICAgICBAYWxpYXNcbiAgICAgICAgQGhvc3RuYW1lXG4gICAgICAgIEBkaXJlY3RvcnlcbiAgICAgICAgQHVzZXJuYW1lXG4gICAgICAgIEBwb3J0XG4gICAgICAgIGxvY2FsRmlsZXM6IGxvY2FsRmlsZS5zZXJpYWxpemUoKSBmb3IgbG9jYWxGaWxlIGluIEBsb2NhbEZpbGVzXG4gICAgICAgIEB1c2VQYXNzd29yZFxuICAgICAgICBAcGFzc3dvcmRcbiAgICAgICAgQGxhc3RPcGVuRGlyZWN0b3J5XG4gICAgICB9XG5cbiAgICBkZXNlcmlhbGl6ZVBhcmFtczogKHBhcmFtcykgLT5cbiAgICAgIHRtcEFycmF5ID0gW11cbiAgICAgIHRtcEFycmF5LnB1c2goTG9jYWxGaWxlLmRlc2VyaWFsaXplKGxvY2FsRmlsZSwgaG9zdDogdGhpcykpIGZvciBsb2NhbEZpbGUgaW4gcGFyYW1zLmxvY2FsRmlsZXNcbiAgICAgIHBhcmFtcy5sb2NhbEZpbGVzID0gdG1wQXJyYXlcbiAgICAgIHBhcmFtc1xuXG4gICAgY3JlYXRlRm9sZGVyOiAoZm9sZGVycGF0aCwgY2FsbGJhY2spIC0+XG4gICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgQGNvbm5lY3Rpb24ubWtkaXIoZm9sZGVycGF0aCwgY2FsbGJhY2spXG4gICAgICBdLCAoZXJyKSA9PlxuICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIkVycm9yIG9jY3VycmVkIHdoZW4gY3JlYXRpbmcgcmVtb3RlIGZvbGRlciBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tmb2xkZXJwYXRofVwiLCB0eXBlOiAnZXJyb3InfSlcbiAgICAgICAgICBjb25zb2xlLmVycm9yIGVyciBpZiBlcnI/XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiU3VjY2Vzc2Z1bGx5IGNyZWF0ZWQgcmVtb3RlIGZvbGRlciBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tmb2xkZXJwYXRofVwiLCB0eXBlOiAnc3VjY2Vzcyd9KVxuICAgICAgICBjYWxsYmFjaz8oZXJyKVxuICAgICAgKVxuXG4gICAgY3JlYXRlRmlsZTogKGZpbGVwYXRoLCBjYWxsYmFjaykgLT5cbiAgICAgIGlmIGZpbGVwYXRoLmluZGV4T2YoXCIuXCIpID09IC0xXG4gICAgICAgIEBlbWl0dGVyLmVtaXQoJ2luZm8nLCB7bWVzc2FnZTogXCJJbnZhbGlkIGZpbGUgbmFtZVwiLCB0eXBlOiAnZXJyb3InfSlcbiAgICAgIGVsc2VcbiAgICAgICAgQGNvbm5lY3Rpb24uZ2V0KGZpbGVwYXRoLCAoZXJyLCByZXN1bHQpID0+XG4gICAgICAgICAgaWYgcmVzdWx0XG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiRmlsZSBhbHJlYWR5IGV4aXN0c1wiLCB0eXBlOiAnZXJyb3InfSlcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgICAgICAgQGNvbm5lY3Rpb24ucHV0KG5ldyBCdWZmZXIoJycpLCBmaWxlcGF0aCwgY2FsbGJhY2spXG4gICAgICAgICAgICBdLCAoZXJyKSA9PlxuICAgICAgICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIkVycm9yIG9jY3VycmVkIHdoZW4gd3JpdGluZyByZW1vdGUgZmlsZSBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tmaWxlcGF0aH1cIiwgdHlwZTogJ2Vycm9yJ30pXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciBlcnIgaWYgZXJyP1xuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIlN1Y2Nlc3NmdWxseSB3cm90ZSByZW1vdGUgZmlsZSBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tmaWxlcGF0aH1cIiwgdHlwZTogJ3N1Y2Nlc3MnfSlcbiAgICAgICAgICAgICAgY2FsbGJhY2s/KGVycilcbiAgICAgICAgICAgIClcbiAgICAgICAgKVxuXG4gICAgcmVuYW1lRm9sZGVyRmlsZTogKHBhdGgsIG9sZE5hbWUsIG5ld05hbWUsIGlzRm9sZGVyLCBjYWxsYmFjaykgLT5cbiAgICAgIGlmIG9sZE5hbWUgPT0gbmV3TmFtZVxuICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiVGhlIG5ldyBuYW1lIGlzIHNhbWUgYXMgdGhlIG9sZFwiLCB0eXBlOiAnZXJyb3InfSlcbiAgICAgIGVsc2VcbiAgICAgICAgb2xkUGF0aCA9IHBhdGggKyBcIi9cIiArIG9sZE5hbWVcbiAgICAgICAgbmV3UGF0aCA9IHBhdGggKyBcIi9cIiArIG5ld05hbWVcbiAgICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgICBpZihpc0ZvbGRlcilcbiAgICAgICAgICAgICAgQGNvbm5lY3Rpb24ubGlzdChuZXdQYXRoLCBjYWxsYmFjaylcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgQGNvbm5lY3Rpb24uZ2V0KG5ld1BhdGgsIGNhbGxiYWNrKVxuICAgICAgICBdLCAoZXJyLCByZXN1bHQpID0+XG4gICAgICAgICAgaWYgKGlzRm9sZGVyIGFuZCByZXN1bHQubGVuZ3RoID4gMCkgb3IgKCFpc0ZvbGRlciBhbmQgcmVzdWx0KVxuICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIiN7aWYgaXNGb2xkZXIgdGhlbiAnRm9sZGVyJyBlbHNlICdGaWxlJ30gYWxyZWFkeSBleGlzdHNcIiwgdHlwZTogJ2Vycm9yJ30pXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgICAgICAgIEBjb25uZWN0aW9uLnJlbmFtZShvbGRQYXRoLCBuZXdQYXRoLCBjYWxsYmFjaylcbiAgICAgICAgICAgIF0sIChlcnIpID0+XG4gICAgICAgICAgICAgIGlmIGVycj9cbiAgICAgICAgICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiRXJyb3Igb2NjdXJyZWQgd2hlbiByZW5hbWluZyByZW1vdGUgZm9sZGVyL2ZpbGUgZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7b2xkUGF0aH1cIiwgdHlwZTogJ2Vycm9yJ30pXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvciBlcnIgaWYgZXJyP1xuICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIlN1Y2Nlc3NmdWxseSByZW5hbWVkIHJlbW90ZSBmb2xkZXIvZmlsZSBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tvbGRQYXRofVwiLCB0eXBlOiAnc3VjY2Vzcyd9KVxuICAgICAgICAgICAgICBjYWxsYmFjaz8oZXJyKVxuICAgICAgICAgICAgKVxuICAgICAgICApXG5cbiAgICBkZWxldGVGb2xkZXJGaWxlOiAoZGVsZXRlcGF0aCwgaXNGb2xkZXIsIGNhbGxiYWNrKSAtPlxuICAgICAgaWYgaXNGb2xkZXJcbiAgICAgICAgQGNvbm5lY3Rpb24ucm1kaXIoZGVsZXRlcGF0aCwgKGVycikgPT5cbiAgICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiRXJyb3Igb2NjdXJyZWQgd2hlbiBkZWxldGluZyByZW1vdGUgZm9sZGVyIGZ0cDovLyN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH0je2RlbGV0ZXBhdGh9XCIsIHR5cGU6ICdlcnJvcid9KVxuICAgICAgICAgICAgY29uc29sZS5lcnJvciBlcnIgaWYgZXJyP1xuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBlbWl0dGVyLmVtaXQoJ2luZm8nLCB7bWVzc2FnZTogXCJTdWNjZXNzZnVsbHkgZGVsZXRlZCByZW1vdGUgZm9sZGVyIGZ0cDovLyN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH0je2RlbGV0ZXBhdGh9XCIsIHR5cGU6ICdzdWNjZXNzJ30pXG4gICAgICAgICAgY2FsbGJhY2s/KGVycilcbiAgICAgICAgKVxuICAgICAgZWxzZVxuICAgICAgICBAY29ubmVjdGlvbi5kZWxldGUoZGVsZXRlcGF0aCwgKGVycikgPT5cbiAgICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiRXJyb3Igb2NjdXJyZWQgd2hlbiBkZWxldGluZyByZW1vdGUgZmlsZSBmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tkZWxldGVwYXRofVwiLCB0eXBlOiAnZXJyb3InfSlcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IgZXJyIGlmIGVycj9cbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiU3VjY2Vzc2Z1bGx5IGRlbGV0ZWQgcmVtb3RlIGZpbGUgZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7ZGVsZXRlcGF0aH1cIiwgdHlwZTogJ3N1Y2Nlc3MnfSlcbiAgICAgICAgICBjYWxsYmFjaz8oZXJyKVxuICAgICAgICApXG4iXX0=
