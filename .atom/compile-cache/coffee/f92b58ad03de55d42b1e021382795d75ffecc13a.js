(function() {
  var Emitter, Host, Serializable, _, async, fs, hash, osenv;

  Serializable = require('serializable');

  async = require('async');

  Emitter = require('atom').Emitter;

  hash = require('string-hash');

  _ = require('underscore-plus');

  osenv = require('osenv');

  fs = require('fs-plus');

  module.exports = Host = (function() {
    Serializable.includeInto(Host);

    atom.deserializers.add(Host);

    function Host(alias, hostname, directory, username, port, localFiles, usePassword, lastOpenDirectory) {
      this.alias = alias != null ? alias : null;
      this.hostname = hostname;
      this.directory = directory != null ? directory : "/";
      this.username = username != null ? username : osenv.user();
      this.port = port;
      this.localFiles = localFiles != null ? localFiles : [];
      this.usePassword = usePassword;
      this.lastOpenDirectory = lastOpenDirectory;
      this.emitter = new Emitter;
      this.searchKey = this.hostname;
      atom.config.observe("remote-edit.filterHostsUsing", (function(_this) {
        return function(settings) {
          var ref;
          return _this.searchKey = (ref = _this.getSearchKey(settings)) != null ? ref : _this.searchKey;
        };
      })(this));
      if (atom.config.get('remote-edit.clearFileList')) {
        _.each(this.localFiles, (function(_this) {
          return function(val) {
            return _this.removeLocalFile(val);
          };
        })(this));
      } else {
        _.each(this.localFiles, (function(_this) {
          return function(val) {
            return fs.exists(val.path, function(exists) {
              if (!exists) {
                return _this.removeLocalFile(val);
              }
            });
          };
        })(this));
      }
    }

    Host.prototype.getSearchKey = function(searchKeySettings) {
      var toReturn;
      toReturn = "";
      if (searchKeySettings["alias"]) {
        toReturn = toReturn + " " + this.alias;
      }
      if (searchKeySettings["hostname"]) {
        toReturn = toReturn + " " + this.hostname;
      }
      if (searchKeySettings["username"]) {
        toReturn = toReturn + " " + this.username;
      }
      if (searchKeySettings["port"]) {
        toReturn = toReturn + " " + this.port;
      }
      return toReturn;
    };

    Host.prototype.getServiceAccount = function() {
      return this.username + "@" + this.hostname + ":" + this.port;
    };

    Host.prototype.destroy = function() {
      return this.emitter.dispose();
    };

    Host.prototype.getConnectionString = function() {
      throw new Error("Function getConnectionString() needs to be implemented by subclasses!");
    };

    Host.prototype.connect = function(callback, connectionOptions) {
      if (connectionOptions == null) {
        connectionOptions = {};
      }
      throw new Error("Function connect(callback) needs to be implemented by subclasses!");
    };

    Host.prototype.close = function(callback) {
      throw new Error("Needs to be implemented by subclasses!");
    };

    Host.prototype.getFilesMetadata = function(path, callback) {
      throw new Error("Function getFiles(Callback) needs to be implemented by subclasses!");
    };

    Host.prototype.getFile = function(localFile, callback) {
      throw new Error("Must be implemented in subclass!");
    };

    Host.prototype.writeFile = function(localFile, callback) {
      throw new Error("Must be implemented in subclass!");
    };

    Host.prototype.serializeParams = function() {
      throw new Error("Must be implemented in subclass!");
    };

    Host.prototype.isConnected = function() {
      throw new Error("Must be implemented in subclass!");
    };

    Host.prototype.hashCode = function() {
      return hash(this.hostname + this.directory + this.username + this.port);
    };

    Host.prototype.addLocalFile = function(localFile) {
      this.localFiles.push(localFile);
      return this.emitter.emit('did-change', localFile);
    };

    Host.prototype.removeLocalFile = function(localFile) {
      this.localFiles = _.reject(this.localFiles, (function(val) {
        return val === localFile;
      }));
      return this.emitter.emit('did-change', localFile);
    };

    Host.prototype["delete"] = function() {
      var file, i, len, ref;
      ref = this.localFiles;
      for (i = 0, len = ref.length; i < len; i++) {
        file = ref[i];
        file["delete"]();
      }
      return this.emitter.emit('did-delete', this);
    };

    Host.prototype.invalidate = function() {
      return this.emitter.emit('did-change');
    };

    Host.prototype.onDidChange = function(callback) {
      return this.emitter.on('did-change', callback);
    };

    Host.prototype.onDidDelete = function(callback) {
      return this.emitter.on('did-delete', callback);
    };

    Host.prototype.onInfo = function(callback) {
      return this.emitter.on('info', callback);
    };

    return Host;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi9tb2RlbC9ob3N0LmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxjQUFSOztFQUNmLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUCxVQUFXLE9BQUEsQ0FBUSxNQUFSOztFQUNaLElBQUEsR0FBTyxPQUFBLENBQVEsYUFBUjs7RUFDUCxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUixFQUFBLEdBQUssT0FBQSxDQUFRLFNBQVI7O0VBRUwsTUFBTSxDQUFDLE9BQVAsR0FDUTtJQUNKLFlBQVksQ0FBQyxXQUFiLENBQXlCLElBQXpCOztJQUNBLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBbkIsQ0FBdUIsSUFBdkI7O0lBRWEsY0FBQyxLQUFELEVBQWdCLFFBQWhCLEVBQTJCLFNBQTNCLEVBQTZDLFFBQTdDLEVBQXVFLElBQXZFLEVBQThFLFVBQTlFLEVBQWdHLFdBQWhHLEVBQThHLGlCQUE5RztNQUFDLElBQUMsQ0FBQSx3QkFBRCxRQUFTO01BQU0sSUFBQyxDQUFBLFdBQUQ7TUFBVyxJQUFDLENBQUEsZ0NBQUQsWUFBYTtNQUFLLElBQUMsQ0FBQSw4QkFBRCxXQUFZLEtBQUssQ0FBQyxJQUFOLENBQUE7TUFBYyxJQUFDLENBQUEsT0FBRDtNQUFPLElBQUMsQ0FBQSxrQ0FBRCxhQUFjO01BQUksSUFBQyxDQUFBLGNBQUQ7TUFBYyxJQUFDLENBQUEsb0JBQUQ7TUFDekgsSUFBQyxDQUFBLE9BQUQsR0FBVyxJQUFJO01BQ2YsSUFBQyxDQUFBLFNBQUQsR0FBYSxJQUFDLENBQUE7TUFDZCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQVosQ0FBb0IsOEJBQXBCLEVBQW9ELENBQUEsU0FB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eW5jID0gcmVxdWlyZSAnYXN5bmMnXG57RW1pdHRlcn0gPSByZXF1aXJlICdhdG9tJ1xuaGFzaCA9IHJlcXVpcmUgJ3N0cmluZy1oYXNoJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbm9zZW52ID0gcmVxdWlyZSAnb3NlbnYnXG5mcyA9IHJlcXVpcmUgJ2ZzLXBsdXMnXG5cbm1vZHVsZS5leHBvcnRzID1cbiAgY2xhc3MgSG9zdFxuICAgIFNlcmlhbGl6YWJsZS5pbmNsdWRlSW50byh0aGlzKVxuICAgIGF0b20uZGVzZXJpYWxpemVycy5hZGQodGhpcylcblxuICAgIGNvbnN0cnVjdG9yOiAoQGFsaWFzID0gbnVsbCwgQGhvc3RuYW1lLCBAZGlyZWN0b3J5ID0gXCIvXCIsIEB1c2VybmFtZSA9IG9zZW52LnVzZXIoKSwgQHBvcnQsIEBsb2NhbEZpbGVzID0gW10sIEB1c2VQYXNzd29yZCwgQGxhc3RPcGVuRGlyZWN0b3J5KSAtPlxuICAgICAgQGVtaXR0ZXIgPSBuZXcgRW1pdHRlclxuICAgICAgQHNlYXJjaEtleSA9IEBob3N0bmFtZVxuICAgICAgYXRvbS5jb25maWcub2JzZXJ2ZSBcInJlbW90ZS1lZGl0LmZpbHRlckhvc3RzVXNpbmdcIiwgKHNldHRpbmdzKSA9PlxuICAgICAgICBAc2VhcmNoS2V5ID0gQGdldFNlYXJjaEtleShzZXR0aW5ncykgPyBAc2VhcmNoS2V5XG5cbiAgICAgIGlmIGF0b20uY29uZmlnLmdldCAncmVtb3RlLWVkaXQuY2xlYXJGaWxlTGlzdCdcbiAgICAgICAgXy5lYWNoKEBsb2NhbEZpbGVzLCAodmFsKSA9PlxuICAgICAgICAgIEByZW1vdmVMb2NhbEZpbGUodmFsKVxuICAgICAgICAgIClcbiAgICAgIGVsc2VcbiAgICAgICAgIyBSZW1vdmUgbG9jYWxGaWxlcyBpZiB0aGUgdW5kZXJseWluZyBmaWxlIGhhcyBiZWVuIGRlbGV0ZWQgb24gbG9jYWxob3N0XG4gICAgICAgIF8uZWFjaChAbG9jYWxGaWxlcywgKHZhbCkgPT5cbiAgICAgICAgICBmcy5leGlzdHModmFsLnBhdGgsIChleGlzdHMpID0+XG4gICAgICAgICAgICBAcmVtb3ZlTG9jYWxGaWxlKHZhbCkgaWYgbm90IGV4aXN0c1xuICAgICAgICAgICAgKVxuICAgICAgICAgIClcblxuICAgIGdldFNlYXJjaEtleTogKHNlYXJjaEtleVNldHRpbmdzKSAtPlxuICAgICAgdG9SZXR1cm4gPSBcIlwiXG4gICAgICB0b1JldHVybiA9IFwiI3t0b1JldHVybn0gI3tAYWxpYXN9XCIgaWYgc2VhcmNoS2V5U2V0dGluZ3NbXCJhbGlhc1wiXVxuICAgICAgdG9SZXR1cm4gPSBcIiN7dG9SZXR1cm59ICN7QGhvc3RuYW1lfVwiIGlmIHNlYXJjaEtleVNldHRpbmdzW1wiaG9zdG5hbWVcIl1cbiAgICAgIHRvUmV0dXJuID0gXCIje3RvUmV0dXJufSAje0B1c2VybmFtZX1cIiBpZiBzZWFyY2hLZXlTZXR0aW5nc1tcInVzZXJuYW1lXCJdXG4gICAgICB0b1JldHVybiA9IFwiI3t0b1JldHVybn0gI3tAcG9ydH1cIiBpZiBzZWFyY2hLZXlTZXR0aW5nc1tcInBvcnRcIl1cbiAgICAgIHJldHVybiB0b1JldHVyblxuXG4gICAgZ2V0U2VydmljZUFjY291bnQ6IC0+XG4gICAgICBcIiN7QHVzZXJuYW1lfUAje0Bob3N0bmFtZX06I3tAcG9ydH1cIlxuXG4gICAgZGVzdHJveTogLT5cbiAgICAgIEBlbWl0dGVyLmRpc3Bvc2UoKVxuXG4gICAgZ2V0Q29ubmVjdGlvblN0cmluZzogLT5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkZ1bmN0aW9uIGdldENvbm5lY3Rpb25TdHJpbmcoKSBuZWVkcyB0byBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc2VzIVwiKVxuXG4gICAgY29ubmVjdDogKGNhbGxiYWNrLCBjb25uZWN0aW9uT3B0aW9ucyA9IHt9KSAtPlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRnVuY3Rpb24gY29ubmVjdChjYWxsYmFjaykgbmVlZHMgdG8gYmUgaW1wbGVtZW50ZWQgYnkgc3ViY2xhc3NlcyFcIilcblxuICAgIGNsb3NlOiAoY2FsbGJhY2spIC0+XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOZWVkcyB0byBiZSBpbXBsZW1lbnRlZCBieSBzdWJjbGFzc2VzIVwiKVxuXG4gICAgZ2V0RmlsZXNNZXRhZGF0YTogKHBhdGgsIGNhbGxiYWNrKSAtPlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiRnVuY3Rpb24gZ2V0RmlsZXMoQ2FsbGJhY2spIG5lZWRzIHRvIGJlIGltcGxlbWVudGVkIGJ5IHN1YmNsYXNzZXMhXCIpXG5cbiAgICBnZXRGaWxlOiAobG9jYWxGaWxlLCBjYWxsYmFjaykgLT5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3MhXCIpXG5cbiAgICB3cml0ZUZpbGU6IChsb2NhbEZpbGUsIGNhbGxiYWNrKSAtPlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTXVzdCBiZSBpbXBsZW1lbnRlZCBpbiBzdWJjbGFzcyFcIilcblxuICAgIHNlcmlhbGl6ZVBhcmFtczogLT5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3MhXCIpXG5cbiAgICBpc0Nvbm5lY3RlZDogLT5cbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk11c3QgYmUgaW1wbGVtZW50ZWQgaW4gc3ViY2xhc3MhXCIpXG5cbiAgICBoYXNoQ29kZTogLT5cbiAgICAgIGhhc2goQGhvc3RuYW1lICsgQGRpcmVjdG9yeSArIEB1c2VybmFtZSArIEBwb3J0KVxuXG4gICAgYWRkTG9jYWxGaWxlOiAobG9jYWxGaWxlKSAtPlxuICAgICAgQGxvY2FsRmlsZXMucHVzaChsb2NhbEZpbGUpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlJywgbG9jYWxGaWxlXG5cbiAgICByZW1vdmVMb2NhbEZpbGU6IChsb2NhbEZpbGUpIC0+XG4gICAgICBAbG9jYWxGaWxlcyA9IF8ucmVqZWN0KEBsb2NhbEZpbGVzLCAoKHZhbCkgLT4gdmFsID09IGxvY2FsRmlsZSkpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtY2hhbmdlJywgbG9jYWxGaWxlXG5cbiAgICBkZWxldGU6IC0+XG4gICAgICBmb3IgZmlsZSBpbiBAbG9jYWxGaWxlc1xuICAgICAgICBmaWxlLmRlbGV0ZSgpXG4gICAgICBAZW1pdHRlci5lbWl0ICdkaWQtZGVsZXRlJywgdGhpc1xuXG4gICAgaW52YWxpZGF0ZTogLT5cbiAgICAgIEBlbWl0dGVyLmVtaXQgJ2RpZC1jaGFuZ2UnXG5cbiAgICBvbkRpZENoYW5nZTogKGNhbGxiYWNrKSAtPlxuICAgICAgQGVtaXR0ZXIub24gJ2RpZC1jaGFuZ2UnLCBjYWxsYmFja1xuXG4gICAgb25EaWREZWxldGU6IChjYWxsYmFjaykgLT5cbiAgICAgIEBlbWl0dGVyLm9uICdkaWQtZGVsZXRlJywgY2FsbGJhY2tcblxuICAgIG9uSW5mbzogKGNhbGxiYWNrKSAtPlxuICAgICAgQGVtaXR0ZXIub24gJ2luZm8nLCBjYWxsYmFja1xuIl19
