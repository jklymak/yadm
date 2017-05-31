(function() {
  var Host, LocalFile, Path, RemoteFile, Serializable, SftpHost, _, async, err, filesize, fs, keytar, moment, osenv, ssh2, util,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Host = require('./host');

  RemoteFile = require('./remote-file');

  LocalFile = require('./local-file');

  fs = require('fs-plus');

  ssh2 = require('ssh2');

  async = require('async');

  util = require('util');

  filesize = require('file-size');

  moment = require('moment');

  Serializable = require('serializable');

  Path = require('path');

  osenv = require('osenv');

  _ = require('underscore-plus');

  try {
    keytar = require('keytar');
  } catch (error) {
    err = error;
    console.debug('Keytar could not be loaded! Passwords will be stored in cleartext to remoteEdit.json!');
    keytar = void 0;
  }

  module.exports = SftpHost = (function(superClass) {
    extend(SftpHost, superClass);

    Serializable.includeInto(SftpHost);

    atom.deserializers.add(SftpHost);

    Host.registerDeserializers(SftpHost);

    SftpHost.prototype.connection = void 0;

    SftpHost.prototype.protocol = "sftp";

    function SftpHost(alias, hostname, directory, username, port, localFiles, usePassword, useAgent, usePrivateKey, password, passphrase, privateKeyPath, lastOpenDirectory) {
      this.alias = alias != null ? alias : null;
      this.hostname = hostname;
      this.directory = directory;
      this.username = username;
      this.port = port != null ? port : "22";
      this.localFiles = localFiles != null ? localFiles : [];
      this.usePassword = usePassword != null ? usePassword : false;
      this.useAgent = useAgent != null ? useAgent : true;
      this.usePrivateKey = usePrivateKey != null ? usePrivateKey : false;
      this.password = password;
      this.passphrase = passphrase;
      this.privateKeyPath = privateKeyPath;
      this.lastOpenDirectory = lastOpenDirectory;
      SftpHost.__super__.constructor.call(this, this.alias, this.hostname, this.directory, this.username, this.port, this.localFiles, this.usePassword, this.lastOpenDirectory);
    }

    SftpHost.prototype.getConnectionStringUsingAgent = function() {
      var connectionString;
      connectionString = {
        host: this.hostname,
        port: this.port,
        username: this.username
      };
      if (atom.config.get('remote-edit.agentToUse') !== 'Default') {
        _.extend(connectionString, {
          agent: atom.config.get('remote-edit.agentToUse')
        });
      } else if (process.platform === "win32") {
        _.extend(connectionString, {
          agent: 'pageant'
        });
      } else {
        _.extend(connectionString, {
          agent: process.env['SSH_AUTH_SOCK']
        });
      }
      return connectionString;
    };

    SftpHost.prototype.getConnectionStringUsingKey = function() {
      var keytarPassphrase;
      if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (keytar != null)) {
        keytarPassphrase = keytar.getPassword(this.getServiceNamePassphrase(), this.getServiceAccount());
        return {
          host: this.hostname,
          port: this.port,
          username: this.username,
          privateKey: this.getPrivateKey(this.privateKeyPath),
          passphrase: keytarPassphrase
        };
      } else {
        return {
          host: this.hostname,
          port: this.port,
          username: this.username,
          privateKey: this.getPrivateKey(this.privateKeyPath),
          passphrase: this.passphrase
        };
      }
    };

    SftpHost.prototype.getConnectionStringUsingPassword = function() {
      var keytarPassword;
      if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (keytar != null)) {
        keytarPassword = keytar.getPassword(this.getServiceNamePassword(), this.getServiceAccount());
        return {
          host: this.hostname,
          port: this.port,
          username: this.username,
          password: keytarPassword
        };
      } else {
        return {
          host: this.hostname,
          port: this.port,
          username: this.username,
          password: this.password
        };
      }
    };

    SftpHost.prototype.getPrivateKey = function(path) {
      if (path[0] === "~") {
        path = Path.normalize(osenv.home() + path.substring(1, path.length));
      }
      return fs.readFileSync(path, 'ascii', function(err, data) {
        if (err != null) {
          throw err;
        }
        return data.trim();
      });
    };

    SftpHost.prototype.createRemoteFileFromFile = function(path, file) {
      var remoteFile;
      remoteFile = new RemoteFile(Path.normalize(path + "/" + file.filename).split(Path.sep).join('/'), file.longname[0] === '-', file.longname[0] === 'd', file.longname[0] === 'l', filesize(file.attrs.size).human(), parseInt(file.attrs.mode, 10).toString(8).substr(2, 4), moment(file.attrs.mtime * 1000).format("HH:mm:ss DD/MM/YYYY"));
      return remoteFile;
    };

    SftpHost.prototype.getServiceNamePassword = function() {
      return "atom.remote-edit.ssh.password";
    };

    SftpHost.prototype.getServiceNamePassphrase = function() {
      return "atom.remote-edit.ssh.passphrase";
    };

    SftpHost.prototype.getConnectionString = function(connectionOptions) {
      if (this.useAgent) {
        return _.extend(this.getConnectionStringUsingAgent(), connectionOptions);
      } else if (this.usePrivateKey) {
        return _.extend(this.getConnectionStringUsingKey(), connectionOptions);
      } else if (this.usePassword) {
        return _.extend(this.getConnectionStringUsingPassword(), connectionOptions);
      } else {
        throw new Error("No valid connection method is set for SftpHost!");
      }
    };

    SftpHost.prototype.close = function(callback) {
      var ref;
      if ((ref = this.connection) != null) {
        ref.end();
      }
      return typeof callback === "function" ? callback(null) : void 0;
    };

    SftpHost.prototype.connect = function(callback, connectionOptions) {
      if (connectionOptions == null) {
        connectionOptions = {};
      }
      this.emitter.emit('info', {
        message: "Connecting to sftp://" + this.username + "@" + this.hostname + ":" + this.port,
        type: 'info'
      });
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            if (_this.usePrivateKey) {
              return fs.exists(_this.privateKeyPath, (function(exists) {
                if (exists) {
                  return callback(null);
                } else {
                  _this.emitter.emit('info', {
                    message: "Private key does not exist!",
                    type: 'error'
                  });
                  return callback(new Error("Private key does not exist"));
                }
              }));
            } else {
              return callback(null);
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            _this.connection = new ssh2();
            _this.connection.on('error', function(err) {
              _this.emitter.emit('info', {
                message: "Error occured when connecting to sftp://" + _this.username + "@" + _this.hostname + ":" + _this.port,
                type: 'error'
              });
              _this.connection.end();
              return callback(err);
            });
            _this.connection.on('ready', function() {
              _this.emitter.emit('info', {
                message: "Successfully connected to sftp://" + _this.username + "@" + _this.hostname + ":" + _this.port,
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

    SftpHost.prototype.isConnected = function() {
      return (this.connection != null) && this.connection._state === 'authenticated';
    };

    SftpHost.prototype.getFilesMetadata = function(path, callback) {
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.connection.sftp(callback);
          };
        })(this), function(sftp, callback) {
          return sftp.readdir(path, callback);
        }, (function(_this) {
          return function(files, callback) {
            return async.map(files, (function(file, callback) {
              return callback(null, _this.createRemoteFileFromFile(path, file));
            }), callback);
          };
        })(this), function(objects, callback) {
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
              message: "Error occured when reading remote directory sftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + ":" + path,
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

    SftpHost.prototype.getFile = function(localFile, callback) {
      this.emitter.emit('info', {
        message: "Getting remote file sftp://" + this.username + "@" + this.hostname + ":" + this.port + localFile.remoteFile.path,
        type: 'info'
      });
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.connection.sftp(callback);
          };
        })(this), (function(_this) {
          return function(sftp, callback) {
            return sftp.fastGet(localFile.remoteFile.path, localFile.path, function(err) {
              return callback(err, sftp);
            });
          };
        })(this)
      ], (function(_this) {
        return function(err, sftp) {
          if (err != null) {
            _this.emitter.emit('info', {
              message: "Error when reading remote file sftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'error'
            });
          }
          if (err == null) {
            _this.emitter.emit('info', {
              message: "Successfully read remote file sftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'success'
            });
          }
          return typeof callback === "function" ? callback(err, localFile) : void 0;
        };
      })(this));
    };

    SftpHost.prototype.writeFile = function(localFile, callback) {
      this.emitter.emit('info', {
        message: "Writing remote file sftp://" + this.username + "@" + this.hostname + ":" + this.port + localFile.remoteFile.path,
        type: 'info'
      });
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.connection.sftp(callback);
          };
        })(this), function(sftp, callback) {
          return sftp.fastPut(localFile.path, localFile.remoteFile.path, callback);
        }
      ], (function(_this) {
        return function(err) {
          if (err != null) {
            _this.emitter.emit('info', {
              message: "Error occured when writing remote file sftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'error'
            });
            if (err != null) {
              console.error(err);
            }
          } else {
            _this.emitter.emit('info', {
              message: "Successfully wrote remote file sftp://" + _this.username + "@" + _this.hostname + ":" + _this.port + localFile.remoteFile.path,
              type: 'success'
            });
          }
          _this.close();
          return typeof callback === "function" ? callback(err) : void 0;
        };
      })(this));
    };

    SftpHost.prototype.serializeParams = function() {
      var localFile;
      return {
        alias: this.alias,
        hostname: this.hostname,
        directory: this.directory,
        username: this.username,
        port: this.port,
        localFiles: (function() {
          var i, len, ref, results;
          ref = this.localFiles;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            localFile = ref[i];
            results.push(localFile.serialize());
          }
          return results;
        }).call(this),
        useAgent: this.useAgent,
        usePrivateKey: this.usePrivateKey,
        usePassword: this.usePassword,
        password: this.password,
        passphrase: this.passphrase,
        privateKeyPath: this.privateKeyPath,
        lastOpenDirectory: this.lastOpenDirectory
      };
    };

    SftpHost.prototype.deserializeParams = function(params) {
      var i, len, localFile, ref, tmpArray;
      tmpArray = [];
      ref = params.localFiles;
      for (i = 0, len = ref.length; i < len; i++) {
        localFile = ref[i];
        tmpArray.push(LocalFile.deserialize(localFile, {
          host: this
        }));
      }
      params.localFiles = tmpArray;
      return params;
    };

    return SftpHost;

  })(Host);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi9tb2RlbC9zZnRwLWhvc3QuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSx5SEFBQTtJQUFBOzs7RUFBQSxJQUFBLEdBQU8sT0FBQSxDQUFRLFFBQVI7O0VBQ1AsVUFBQSxHQUFhLE9BQUEsQ0FBUSxlQUFSOztFQUNiLFNBQUEsR0FBWSxPQUFBLENBQVEsY0FBUjs7RUFFWixFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBQ0wsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUixJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsUUFBQSxHQUFXLE9BQUEsQ0FBUSxXQUFSOztFQUNYLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7RUFDVCxZQUFBLEdBQWUsT0FBQSxDQUFRLGNBQVI7O0VBQ2YsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUixDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztBQUNKO0lBQ0UsTUFBQSxHQUFTLE9BQUEsQ0FBUSxRQUFSLEVBRFg7R0FBQSxhQUFBO0lBRU07SUFDSixPQUFPLENBQUMsS0FBUixDQUFjLHVGQUFkO0lBQ0EsTUFBQSxHQUFTLE9BSlg7OztFQU1BLE1BQU0sQ0FBQyxPQUFQLEdBQ1E7OztJQUNKLFlBQVksQ0FBQyxXQUFiLENBQXlCLFFBQXpCOztJQUNBLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBbkIsQ0FBdUIsUUFBdkI7O0lBRUEsSUFBSSxDQUFDLHFCQUFMLENBQTJCLFFBQTNCOzt1QkFFQSxVQUFBLEdBQVk7O3VCQUNaLFFBQUEsR0FBVTs7SUFFRyxrQkFBQyxLQUFELEVBQWdCLFFBQWhCLEVBQTJCLFNBQTNCLEVB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SUFKaUI7Ozs7S0FwTEU7QUFyQnpCIiwic291cmNlc0NvbnRlbnQiOlsiSG9zdCA9IHJlcXVpcmUgJy4vaG9zdCdcblJlbW90ZUZpbGUgPSByZXF1aXJlICcuL3JlbW90ZS1maWxlJ1xuTG9jYWxGaWxlID0gcmVxdWlyZSAnLi9sb2NhbC1maWxlJ1xuXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG5zc2gyID0gcmVxdWlyZSAnc3NoMidcbmFzeW5jID0gcmVxdWlyZSAnYXN5bmMnXG51dGlsID0gcmVxdWlyZSAndXRpbCdcbmZpbGVzaXplID0gcmVxdWlyZSAnZmlsZS1zaXplJ1xubW9tZW50ID0gcmVxdWlyZSAnbW9tZW50J1xuU2VyaWFsaXphYmxlID0gcmVxdWlyZSAnc2VyaWFsaXphYmxlJ1xuUGF0aCA9IHJlcXVpcmUgJ3BhdGgnXG5vc2VudiA9IHJlcXVpcmUgJ29zZW52J1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbnRyeVxuICBrZXl0YXIgPSByZXF1aXJlICdrZXl0YXInXG5jYXRjaCBlcnJcbiAgY29uc29sZS5kZWJ1ZyAnS2V5dGFyIGNvdWxkIG5vdCBiZSBsb2FkZWQhIFBhc3N3b3JkcyB3aWxsIGJlIHN0b3JlZCBpbiBjbGVhcnRleHQgdG8gcmVtb3RlRWRpdC5qc29uISdcbiAga2V5dGFyID0gdW5kZWZpbmVkXG5cbm1vZHVsZS5leHBvcnRzID1cbiAgY2xhc3MgU2Z0cEhvc3QgZXh0ZW5kcyBIb3N0XG4gICAgU2VyaWFsaXphYmxlLmluY2x1ZGVJbnRvKHRoaXMpXG4gICAgYXRvbS5kZXNlcmlhbGl6ZXJzLmFkZCh0aGlzKVxuXG4gICAgSG9zdC5yZWdpc3RlckRlc2VyaWFsaXplcnMoU2Z0cEhvc3QpXG5cbiAgICBjb25uZWN0aW9uOiB1bmRlZmluZWRcbiAgICBwcm90b2NvbDogXCJzZnRwXCJcblxuICAgIGNvbnN0cnVjdG9yOiAoQGFsaWFzID0gbnVsbCwgQGhvc3RuYW1lLCBAZGlyZWN0b3J5LCBAdXNlcm5hbWUsIEBwb3J0ID0gXCIyMlwiLCBAbG9jYWxGaWxlcyA9IFtdLCBAdXNlUGFzc3dvcmQgPSBmYWxzZSwgQHVzZUFnZW50ID0gdHJ1ZSwgQHVzZVByaXZhdGVLZXkgPSBmYWxzZSwgQHBhc3N3b3JkLCBAcGFzc3BocmFzZSwgQHByaXZhdGVLZXlQYXRoLCBAbGFzdE9wZW5EaXJlY3RvcnkpIC0+XG4gICAgICBzdXBlciggQGFsaWFzLCBAaG9zdG5hbWUsIEBkaXJlY3RvcnksIEB1c2VybmFtZSwgQHBvcnQsIEBsb2NhbEZpbGVzLCBAdXNlUGFzc3dvcmQsIEBsYXN0T3BlbkRpcmVjdG9yeSlcblxuICAgIGdldENvbm5lY3Rpb25TdHJpbmdVc2luZ0FnZW50OiAtPlxuICAgICAgY29ubmVjdGlvblN0cmluZyA9ICB7XG4gICAgICAgIGhvc3Q6IEBob3N0bmFtZSxcbiAgICAgICAgcG9ydDogQHBvcnQsXG4gICAgICAgIHVzZXJuYW1lOiBAdXNlcm5hbWUsXG4gICAgICB9XG5cbiAgICAgIGlmIGF0b20uY29uZmlnLmdldCgncmVtb3RlLWVkaXQuYWdlbnRUb1VzZScpICE9ICdEZWZhdWx0J1xuICAgICAgICBfLmV4dGVuZChjb25uZWN0aW9uU3RyaW5nLCB7YWdlbnQ6IGF0b20uY29uZmlnLmdldCgncmVtb3RlLWVkaXQuYWdlbnRUb1VzZScpfSlcbiAgICAgIGVsc2UgaWYgcHJvY2Vzcy5wbGF0Zm9ybSA9PSBcIndpbjMyXCJcbiAgICAgICAgXy5leHRlbmQoY29ubmVjdGlvblN0cmluZywge2FnZW50OiAncGFnZWFudCd9KVxuICAgICAgZWxzZVxuICAgICAgICBfLmV4dGVuZChjb25uZWN0aW9uU3RyaW5nLCB7YWdlbnQ6IHByb2Nlc3MuZW52WydTU0hfQVVUSF9TT0NLJ119KVxuXG4gICAgICBjb25uZWN0aW9uU3RyaW5nXG5cbiAgICBnZXRDb25uZWN0aW9uU3RyaW5nVXNpbmdLZXk6IC0+XG4gICAgICBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXInKSBhbmQgKGtleXRhcj8pXG4gICAgICAgIGtleXRhclBhc3NwaHJhc2UgPSBrZXl0YXIuZ2V0UGFzc3dvcmQoQGdldFNlcnZpY2VOYW1lUGFzc3BocmFzZSgpLCBAZ2V0U2VydmljZUFjY291bnQoKSlcbiAgICAgICAge2hvc3Q6IEBob3N0bmFtZSwgcG9ydDogQHBvcnQsIHVzZXJuYW1lOiBAdXNlcm5hbWUsIHByaXZhdGVLZXk6IEBnZXRQcml2YXRlS2V5KEBwcml2YXRlS2V5UGF0aCksIHBhc3NwaHJhc2U6IGtleXRhclBhc3NwaHJhc2V9XG4gICAgICBlbHNlXG4gICAgICAgIHtob3N0OiBAaG9zdG5hbWUsIHBvcnQ6IEBwb3J0LCB1c2VybmFtZTogQHVzZXJuYW1lLCBwcml2YXRlS2V5OiBAZ2V0UHJpdmF0ZUtleShAcHJpdmF0ZUtleVBhdGgpLCBwYXNzcGhyYXNlOiBAcGFzc3BocmFzZX1cblxuXG4gICAgZ2V0Q29ubmVjdGlvblN0cmluZ1VzaW5nUGFzc3dvcmQ6IC0+XG4gICAgICBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXInKSBhbmQgKGtleXRhcj8pXG4gICAgICAgIGtleXRhclBhc3N3b3JkID0ga2V5dGFyLmdldFBhc3N3b3JkKEBnZXRTZXJ2aWNlTmFtZVBhc3N3b3JkKCksIEBnZXRTZXJ2aWNlQWNjb3VudCgpKVxuICAgICAgICB7aG9zdDogQGhvc3RuYW1lLCBwb3J0OiBAcG9ydCwgdXNlcm5hbWU6IEB1c2VybmFtZSwgcGFzc3dvcmQ6IGtleXRhclBhc3N3b3JkfVxuICAgICAgZWxzZVxuICAgICAgICB7aG9zdDogQGhvc3RuYW1lLCBwb3J0OiBAcG9ydCwgdXNlcm5hbWU6IEB1c2VybmFtZSwgcGFzc3dvcmQ6IEBwYXNzd29yZH1cblxuICAgIGdldFByaXZhdGVLZXk6IChwYXRoKSAtPlxuICAgICAgaWYgcGF0aFswXSA9PSBcIn5cIlxuICAgICAgICBwYXRoID0gUGF0aC5ub3JtYWxpemUob3NlbnYuaG9tZSgpICsgcGF0aC5zdWJzdHJpbmcoMSwgcGF0aC5sZW5ndGgpKVxuXG4gICAgICByZXR1cm4gZnMucmVhZEZpbGVTeW5jKHBhdGgsICdhc2NpaScsIChlcnIsIGRhdGEpIC0+XG4gICAgICAgIHRocm93IGVyciBpZiBlcnI/XG4gICAgICAgIHJldHVybiBkYXRhLnRyaW0oKVxuICAgICAgKVxuXG4gICAgY3JlYXRlUmVtb3RlRmlsZUZyb21GaWxlOiAocGF0aCwgZmlsZSkgLT5cbiAgICAgIHJlbW90ZUZpbGUgPSBuZXcgUmVtb3RlRmlsZShQYXRoLm5vcm1hbGl6ZShcIiN7cGF0aH0vI3tmaWxlLmZpbGVuYW1lfVwiKS5zcGxpdChQYXRoLnNlcCkuam9pbignLycpLCAoZmlsZS5sb25nbmFtZVswXSA9PSAnLScpLCAoZmlsZS5sb25nbmFtZVswXSA9PSAnZCcpLCAoZmlsZS5sb25nbmFtZVswXSA9PSAnbCcpLCBmaWxlc2l6ZShmaWxlLmF0dHJzLnNpemUpLmh1bWFuKCksIHBhcnNlSW50KGZpbGUuYXR0cnMubW9kZSwgMTApLnRvU3RyaW5nKDgpLnN1YnN0cigyLCA0KSwgbW9tZW50KGZpbGUuYXR0cnMubXRpbWUgKiAxMDAwKS5mb3JtYXQoXCJISDptbTpzcyBERC9NTS9ZWVlZXCIpKVxuICAgICAgcmV0dXJuIHJlbW90ZUZpbGVcblxuICAgIGdldFNlcnZpY2VOYW1lUGFzc3dvcmQ6IC0+XG4gICAgICBcImF0b20ucmVtb3RlLWVkaXQuc3NoLnBhc3N3b3JkXCJcblxuICAgIGdldFNlcnZpY2VOYW1lUGFzc3BocmFzZTogLT5cbiAgICAgIFwiYXRvbS5yZW1vdGUtZWRpdC5zc2gucGFzc3BocmFzZVwiXG5cbiAgICAjIyMjIyMjIyMjIyMjIyMjIyMjI1xuICAgICMgT3ZlcnJpZGRlbiBtZXRob2RzXG4gICAgZ2V0Q29ubmVjdGlvblN0cmluZzogKGNvbm5lY3Rpb25PcHRpb25zKSAtPlxuICAgICAgaWYgQHVzZUFnZW50XG4gICAgICAgIHJldHVybiBfLmV4dGVuZChAZ2V0Q29ubmVjdGlvblN0cmluZ1VzaW5nQWdlbnQoKSwgY29ubmVjdGlvbk9wdGlvbnMpXG4gICAgICBlbHNlIGlmIEB1c2VQcml2YXRlS2V5XG4gICAgICAgIHJldHVybiBfLmV4dGVuZChAZ2V0Q29ubmVjdGlvblN0cmluZ1VzaW5nS2V5KCksIGNvbm5lY3Rpb25PcHRpb25zKVxuICAgICAgZWxzZSBpZiBAdXNlUGFzc3dvcmRcbiAgICAgICAgcmV0dXJuIF8uZXh0ZW5kKEBnZXRDb25uZWN0aW9uU3RyaW5nVXNpbmdQYXNzd29yZCgpLCBjb25uZWN0aW9uT3B0aW9ucylcbiAgICAgIGVsc2VcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm8gdmFsaWQgY29ubmVjdGlvbiBtZXRob2QgaXMgc2V0IGZvciBTZnRwSG9zdCFcIilcblxuICAgIGNsb3NlOiAoY2FsbGJhY2spIC0+XG4gICAgICBAY29ubmVjdGlvbj8uZW5kKClcbiAgICAgIGNhbGxiYWNrPyhudWxsKVxuXG4gICAgY29ubmVjdDogKGNhbGxiYWNrLCBjb25uZWN0aW9uT3B0aW9ucyA9IHt9KSAtPlxuICAgICAgQGVtaXR0ZXIuZW1pdCAnaW5mbycsIHttZXNzYWdlOiBcIkNvbm5lY3RpbmcgdG8gc2Z0cDovLyN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH1cIiwgdHlwZTogJ2luZm8nfVxuICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIGlmIEB1c2VQcml2YXRlS2V5XG4gICAgICAgICAgICBmcy5leGlzdHMoQHByaXZhdGVLZXlQYXRoLCAoKGV4aXN0cykgPT5cbiAgICAgICAgICAgICAgaWYgZXhpc3RzXG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEBlbWl0dGVyLmVtaXQgJ2luZm8nLCB7bWVzc2FnZTogXCJQcml2YXRlIGtleSBkb2VzIG5vdCBleGlzdCFcIiwgdHlwZTogJ2Vycm9yJ31cbiAgICAgICAgICAgICAgICBjYWxsYmFjayhuZXcgRXJyb3IoXCJQcml2YXRlIGtleSBkb2VzIG5vdCBleGlzdFwiKSlcbiAgICAgICAgICAgICAgKVxuICAgICAgICAgICAgKVxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgIChjYWxsYmFjaykgPT5cbiAgICAgICAgICBAY29ubmVjdGlvbiA9IG5ldyBzc2gyKClcbiAgICAgICAgICBAY29ubmVjdGlvbi5vbiAnZXJyb3InLCAoZXJyKSA9PlxuICAgICAgICAgICAgQGVtaXR0ZXIuZW1pdCAnaW5mbycsIHttZXNzYWdlOiBcIkVycm9yIG9jY3VyZWQgd2hlbiBjb25uZWN0aW5nIHRvIHNmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9XCIsIHR5cGU6ICdlcnJvcid9XG4gICAgICAgICAgICBAY29ubmVjdGlvbi5lbmQoKVxuICAgICAgICAgICAgY2FsbGJhY2soZXJyKVxuICAgICAgICAgIEBjb25uZWN0aW9uLm9uICdyZWFkeScsID0+XG4gICAgICAgICAgICBAZW1pdHRlci5lbWl0ICdpbmZvJywge21lc3NhZ2U6IFwiU3VjY2Vzc2Z1bGx5IGNvbm5lY3RlZCB0byBzZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fVwiLCB0eXBlOiAnc3VjY2Vzcyd9XG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKVxuICAgICAgICAgIEBjb25uZWN0aW9uLmNvbm5lY3QoQGdldENvbm5lY3Rpb25TdHJpbmcoY29ubmVjdGlvbk9wdGlvbnMpKVxuICAgICAgXSwgKGVycikgLT5cbiAgICAgICAgY2FsbGJhY2s/KGVycilcbiAgICAgIClcblxuICAgIGlzQ29ubmVjdGVkOiAtPlxuICAgICAgQGNvbm5lY3Rpb24/IGFuZCBAY29ubmVjdGlvbi5fc3RhdGUgPT0gJ2F1dGhlbnRpY2F0ZWQnXG5cbiAgICBnZXRGaWxlc01ldGFkYXRhOiAocGF0aCwgY2FsbGJhY2spIC0+XG4gICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgQGNvbm5lY3Rpb24uc2Z0cChjYWxsYmFjaylcbiAgICAgICAgKHNmdHAsIGNhbGxiYWNrKSAtPlxuICAgICAgICAgIHNmdHAucmVhZGRpcihwYXRoLCBjYWxsYmFjaylcbiAgICAgICAgKGZpbGVzLCBjYWxsYmFjaykgPT5cbiAgICAgICAgICBhc3luYy5tYXAoZmlsZXMsICgoZmlsZSwgY2FsbGJhY2spID0+IGNhbGxiYWNrKG51bGwsIEBjcmVhdGVSZW1vdGVGaWxlRnJvbUZpbGUocGF0aCwgZmlsZSkpKSwgY2FsbGJhY2spXG4gICAgICAgIChvYmplY3RzLCBjYWxsYmFjaykgLT5cbiAgICAgICAgICBvYmplY3RzLnB1c2gobmV3IFJlbW90ZUZpbGUoKHBhdGggKyBcIi8uLlwiKSwgZmFsc2UsIHRydWUsIGZhbHNlLCBudWxsLCBudWxsLCBudWxsKSlcbiAgICAgICAgICBpZiBhdG9tLmNvbmZpZy5nZXQgJ3JlbW90ZS1lZGl0LnNob3dIaWRkZW5GaWxlcydcbiAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIG9iamVjdHMpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgYXN5bmMuZmlsdGVyKG9iamVjdHMsICgoaXRlbSwgY2FsbGJhY2spIC0+IGl0ZW0uaXNIaWRkZW4oY2FsbGJhY2spKSwgKChyZXN1bHQpIC0+IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkpKVxuICAgICAgXSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIkVycm9yIG9jY3VyZWQgd2hlbiByZWFkaW5nIHJlbW90ZSBkaXJlY3Rvcnkgc2Z0cDovLyN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH06I3twYXRofVwiLCB0eXBlOiAnZXJyb3InfSApXG4gICAgICAgICAgY29uc29sZS5lcnJvciBlcnIgaWYgZXJyP1xuICAgICAgICAgIGNhbGxiYWNrPyhlcnIpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBjYWxsYmFjaz8oZXJyLCAocmVzdWx0LnNvcnQgKGEsIGIpIC0+IHJldHVybiBpZiBhLm5hbWUudG9Mb3dlckNhc2UoKSA+PSBiLm5hbWUudG9Mb3dlckNhc2UoKSB0aGVuIDEgZWxzZSAtMSkpXG4gICAgICApXG5cbiAgICBnZXRGaWxlOiAobG9jYWxGaWxlLCBjYWxsYmFjaykgLT5cbiAgICAgIEBlbWl0dGVyLmVtaXQoJ2luZm8nLCB7bWVzc2FnZTogXCJHZXR0aW5nIHJlbW90ZSBmaWxlIHNmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRofVwiLCB0eXBlOiAnaW5mbyd9KVxuICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIEBjb25uZWN0aW9uLnNmdHAoY2FsbGJhY2spXG4gICAgICAgIChzZnRwLCBjYWxsYmFjaykgPT5cbiAgICAgICAgICBzZnRwLmZhc3RHZXQobG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aCwgbG9jYWxGaWxlLnBhdGgsIChlcnIpID0+IGNhbGxiYWNrKGVyciwgc2Z0cCkpXG4gICAgICBdLCAoZXJyLCBzZnRwKSA9PlxuICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiRXJyb3Igd2hlbiByZWFkaW5nIHJlbW90ZSBmaWxlIHNmdHA6Ly8je0B1c2VybmFtZX1AI3tAaG9zdG5hbWV9OiN7QHBvcnR9I3tsb2NhbEZpbGUucmVtb3RlRmlsZS5wYXRofVwiLCB0eXBlOiAnZXJyb3InfSkgaWYgZXJyP1xuICAgICAgICBAZW1pdHRlci5lbWl0KCdpbmZvJywge21lc3NhZ2U6IFwiU3VjY2Vzc2Z1bGx5IHJlYWQgcmVtb3RlIGZpbGUgc2Z0cDovLyN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH0je2xvY2FsRmlsZS5yZW1vdGVGaWxlLnBhdGh9XCIsIHR5cGU6ICdzdWNjZXNzJ30pIGlmICFlcnI/XG4gICAgICAgIGNhbGxiYWNrPyhlcnIsIGxvY2FsRmlsZSlcbiAgICAgIClcblxuICAgIHdyaXRlRmlsZTogKGxvY2FsRmlsZSwgY2FsbGJhY2spIC0+XG4gICAgICBAZW1pdHRlci5lbWl0ICdpbmZvJywge21lc3NhZ2U6IFwiV3JpdGluZyByZW1vdGUgZmlsZSBzZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7bG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIiwgdHlwZTogJ2luZm8nfVxuICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIEBjb25uZWN0aW9uLnNmdHAoY2FsbGJhY2spXG4gICAgICAgIChzZnRwLCBjYWxsYmFjaykgLT5cbiAgICAgICAgICBzZnRwLmZhc3RQdXQobG9jYWxGaWxlLnBhdGgsIGxvY2FsRmlsZS5yZW1vdGVGaWxlLnBhdGgsIGNhbGxiYWNrKVxuICAgICAgXSwgKGVycikgPT5cbiAgICAgICAgaWYgZXJyP1xuICAgICAgICAgIEBlbWl0dGVyLmVtaXQoJ2luZm8nLCB7bWVzc2FnZTogXCJFcnJvciBvY2N1cmVkIHdoZW4gd3JpdGluZyByZW1vdGUgZmlsZSBzZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7bG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIiwgdHlwZTogJ2Vycm9yJ30pXG4gICAgICAgICAgY29uc29sZS5lcnJvciBlcnIgaWYgZXJyP1xuICAgICAgICBlbHNlXG4gICAgICAgICAgQGVtaXR0ZXIuZW1pdCgnaW5mbycsIHttZXNzYWdlOiBcIlN1Y2Nlc3NmdWxseSB3cm90ZSByZW1vdGUgZmlsZSBzZnRwOi8vI3tAdXNlcm5hbWV9QCN7QGhvc3RuYW1lfToje0Bwb3J0fSN7bG9jYWxGaWxlLnJlbW90ZUZpbGUucGF0aH1cIiwgdHlwZTogJ3N1Y2Nlc3MnfSlcbiAgICAgICAgQGNsb3NlKClcbiAgICAgICAgY2FsbGJhY2s/KGVycilcbiAgICAgIClcblxuICAgIHNlcmlhbGl6ZVBhcmFtczogLT5cbiAgICAgIHtcbiAgICAgICAgQGFsaWFzXG4gICAgICAgIEBob3N0bmFtZVxuICAgICAgICBAZGlyZWN0b3J5XG4gICAgICAgIEB1c2VybmFtZVxuICAgICAgICBAcG9ydFxuICAgICAgICBsb2NhbEZpbGVzOiBsb2NhbEZpbGUuc2VyaWFsaXplKCkgZm9yIGxvY2FsRmlsZSBpbiBAbG9jYWxGaWxlc1xuICAgICAgICBAdXNlQWdlbnRcbiAgICAgICAgQHVzZVByaXZhdGVLZXlcbiAgICAgICAgQHVzZVBhc3N3b3JkXG4gICAgICAgIEBwYXNzd29yZFxuICAgICAgICBAcGFzc3BocmFzZVxuICAgICAgICBAcHJpdmF0ZUtleVBhdGhcbiAgICAgICAgQGxhc3RPcGVuRGlyZWN0b3J5XG4gICAgICB9XG5cbiAgICBkZXNlcmlhbGl6ZVBhcmFtczogKHBhcmFtcykgLT5cbiAgICAgIHRtcEFycmF5ID0gW11cbiAgICAgIHRtcEFycmF5LnB1c2goTG9jYWxGaWxlLmRlc2VyaWFsaXplKGxvY2FsRmlsZSwgaG9zdDogdGhpcykpIGZvciBsb2NhbEZpbGUgaW4gcGFyYW1zLmxvY2FsRmlsZXNcbiAgICAgIHBhcmFtcy5sb2NhbEZpbGVzID0gdG1wQXJyYXlcbiAgICAgIHBhcmFtc1xuIl19
