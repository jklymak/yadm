(function() {
  var Host, LocalFile, RemoteFile, Serializable, fs;

  Serializable = require('serializable');

  RemoteFile = require('./remote-file');

  Host = require('./host');

  fs = require('fs-plus');

  module.exports = LocalFile = (function() {
    Serializable.includeInto(LocalFile);

    atom.deserializers.add(LocalFile);

    function LocalFile(path, remoteFile, dtime, host) {
      this.path = path;
      this.remoteFile = remoteFile;
      this.dtime = dtime;
      this.host = host != null ? host : null;
      this.name = this.remoteFile.name;
    }

    LocalFile.prototype.serializeParams = function() {
      return {
        path: this.path,
        remoteFile: this.remoteFile.serialize(),
        dtime: this.dtime
      };
    };

    LocalFile.prototype.deserializeParams = function(params) {
      params.remoteFile = RemoteFile.deserialize(params.remoteFile);
      return params;
    };

    LocalFile.prototype["delete"] = function() {
      var ref;
      fs.unlink(this.path, function() {
        if (typeof err !== "undefined" && err !== null) {
          return console.error(err);
        }
      });
      return (ref = this.host) != null ? ref.removeLocalFile(this) : void 0;
    };

    return LocalFile;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi9tb2RlbC9sb2NhbC1maWxlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsWUFBQSxHQUFlLE9BQUEsQ0FBUSxjQUFSOztFQUNmLFVBQUEsR0FBYSxPQUFBLENBQVEsZUFBUjs7RUFDYixJQUFBLEdBQU8sT0FBQSxDQUFRLFFBQVI7O0VBQ1AsRUFBQSxHQUFLLE9BQUEsQ0FBUSxTQUFSOztFQUVMLE1BQU0sQ0FBQyxPQUFQLEdBQ1E7SUFDSixZQUFZLENBQUMsV0FBYixDQUF5QixTQUF6Qjs7SUFDQSxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQW5CLENBQXVCLFNBQXZCOztJQUVhLG1CQUFDLElBQUQsRUFBUSxVQUFSLEVBQXFCLEtBQXJCLEVBQTZCLElBQTdCO01BQUMsSUFBQyxDQUFBLE9BQUQ7TUFBTyxJQUFDLENBQUEsYUFBRDtNQUFhLElBQUMsQ0FBQSxRQUFEO01BQVEsSUFBQyxDQUFBLHNCQUFELE9BQVE7TUFDaEQsSUFBQyxDQUFBLElBQUQsR0FBUSxJQUFDLENBQUEsVUFBVSxDQUFDO0lBRFQ7O3dCQUdiLGVBQUEsR0FBaUIsU0FBQTthQUNmO1FBQ0csTUFBRCxJQUFDLENBQUEsSUFESDtRQUVFLFVBQUEsRUFBWSxJQUFDLENBQUEsVUFBVSxDQUFDLFNBQVosQ0FBQSxDQUZkO1FBR0csT0FBRCxJQUFDLENBQUEsS0FISDs7SUFEZTs7d0JBT2pCLGlCQUFBLEdBQW1CLFNBQUMsTUFBRDtNQUNqQixNQUFNLENBQUMsVUFBUCxHQUFvQixVQUFVLENBQUMsV0FBWCxDQUF1QixNQUFNLENBQUMsVUFBOUI7YUFDcEI7SUFGaUI7O3lCQUluQixRQUFBLEdBQVEsU0FBQTtBQUNOLFVBQUE7TUFBQSxFQUFFLENBQUMsTUFBSCxDQUFVLElBQUMsQ0FBQSxJQUFYLEVBQWlCLFNBQUE7UUFBRyxJQUFxQiwwQ0FBckI7aUJBQUEsT0FBTyxDQUFDLEtBQVIsQ0FBYyxHQUFkLEVBQUE7O01BQUgsQ0FBakI7NENBQ0ssQ0FBRSxlQUFQLENBQXVCLElBQXZCO0lBRk07Ozs7O0FBeEJaIiwic291cmNlc0NvbnRlbnQiOlsiU2VyaWFsaXphYmxlID0gcmVxdWlyZSAnc2VyaWFsaXphYmxlJ1xuUmVtb3RlRmlsZSA9IHJlcXVpcmUgJy4vcmVtb3RlLWZpbGUnXG5Ib3N0ID0gcmVxdWlyZSAnLi9ob3N0J1xuZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIGNsYXNzIExvY2FsRmlsZVxuICAgIFNlcmlhbGl6YWJsZS5pbmNsdWRlSW50byh0aGlzKVxuICAgIGF0b20uZGVzZXJpYWxpemVycy5hZGQodGhpcylcblxuICAgIGNvbnN0cnVjdG9yOiAoQHBhdGgsIEByZW1vdGVGaWxlLCBAZHRpbWUsIEBob3N0ID0gbnVsbCkgLT5cbiAgICAgIEBuYW1lID0gQHJlbW90ZUZpbGUubmFtZVxuXG4gICAgc2VyaWFsaXplUGFyYW1zOiAtPlxuICAgICAge1xuICAgICAgICBAcGF0aFxuICAgICAgICByZW1vdGVGaWxlOiBAcmVtb3RlRmlsZS5zZXJpYWxpemUoKVxuICAgICAgICBAZHRpbWVcbiAgICAgIH1cblxuICAgIGRlc2VyaWFsaXplUGFyYW1zOiAocGFyYW1zKSAtPlxuICAgICAgcGFyYW1zLnJlbW90ZUZpbGUgPSBSZW1vdGVGaWxlLmRlc2VyaWFsaXplKHBhcmFtcy5yZW1vdGVGaWxlKVxuICAgICAgcGFyYW1zXG5cbiAgICBkZWxldGU6IC0+XG4gICAgICBmcy51bmxpbmsoQHBhdGgsIC0+IGNvbnNvbGUuZXJyb3IgZXJyIGlmIGVycj8pXG4gICAgICBAaG9zdD8ucmVtb3ZlTG9jYWxGaWxlKHRoaXMpXG4iXX0=
