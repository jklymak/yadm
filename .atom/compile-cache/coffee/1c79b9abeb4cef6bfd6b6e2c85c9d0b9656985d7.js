(function() {
  var Path, RemoteFile, Serializable;

  Serializable = require('serializable');

  Path = require('path');

  module.exports = RemoteFile = (function() {
    Serializable.includeInto(RemoteFile);

    atom.deserializers.add(RemoteFile);

    function RemoteFile(path, isFile, isDir, isLink, size, permissions, lastModified) {
      this.path = path;
      this.isFile = isFile;
      this.isDir = isDir;
      this.isLink = isLink;
      this.size = size;
      this.permissions = permissions;
      this.lastModified = lastModified;
      this.name = Path.basename(this.path);
      this.dirName = Path.dirname(this.path);
      if (this.name === '..') {
        this.path = Path.dirname(Path.dirname(this.path));
      }
    }

    RemoteFile.prototype.isHidden = function(callback) {
      return callback(!(this.name[0] === "." && this.name.length > 2));
    };

    RemoteFile.prototype.serializeParams = function() {
      return {
        path: this.path,
        isFile: this.isFile,
        isDir: this.isDir,
        isLink: this.isLink,
        size: this.size,
        permissions: this.permissions,
        lastModified: this.lastModified
      };
    };

    return RemoteFile;

  })();

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi9tb2RlbC9yZW1vdGUtZmlsZS5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLFlBQUEsR0FBZSxPQUFBLENBQVEsY0FBUjs7RUFFZixJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBRVAsTUFBTSxDQUFDLE9BQVAsR0FDUTtJQUNKLFlBQVksQ0FBQyxXQUFiLENBQXlCLFVBQXpCOztJQUNBLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBbkIsQ0FBdUIsVUFBdkI7O0lBRWEsb0JBQUMsSUFBRCxFQUFRLE1BQVIsRUFBaUIsS0FBakIsRUFBeUIsTUFBekIsRUFBa0MsSUFBbEMsRUFBeUMsV0FBekMsRUFBdUQsWUFBdkQ7TUFBQyxJQUFDLENBQUEsT0FBRDtNQUFPLElBQUMsQ0FBQSxTQUFEO01BQVMsSUFBQyxDQUFBLFFBQUQ7TUFBUSxJQUFDLENBQUEsU0FBRDtNQUFTLElBQUMsQ0FBQSxPQUFEO01BQU8sSUFBQyxDQUFBLGNBQUQ7TUFBYyxJQUFDLENBQUEsZUFBRDtNQUNsRSxJQUFDLENBQUEsSUFBRCxHQUFRLElBQUksQ0FBQyxRQUFMLENBQWMsSUFBQyxDQUFBLElBQWY7TUFDUixJQUFDLENBQUEsT0FBRCxHQUFXLElBQUksQ0FBQyxPQUFMLENBQWEsSUFBQyxDQUFBLElBQWQ7TUFDWCxJQUFHLElBQUMsQ0FBQSxJQUFELEtBQVMsSUFBWjtRQUNFLElBQUMsQ0FBQSxJQUFELEdBQVEsSUFBSSxDQUFDLE9BQUwsQ0FBYSxJQUFJLENBQUMsT0FBTCxDQUFhLElBQUMsQ0FBQSxJQUFkLENBQWIsRUFEVjs7SUFIVzs7eUJBTWIsUUFBQSxHQUFVLFNBQUMsUUFBRDthQUNSLFFBQUEsQ0FBUyxDQUFDLENBQUMsSUFBQyxDQUFBLElBQUssQ0FBQSxDQUFBLENBQU4sS0FBWSxHQUFaLElBQW1CLElBQUMsQ0FBQSxJQUFJLENBQUMsTUFBTixHQUFlLENBQW5DLENBQVY7SUFEUTs7eUJBR1YsZUFBQSxHQUFpQixTQUFBO2FBQ2Y7UUFBRSxNQUFELElBQUMsQ0FBQSxJQUFGO1FBQVMsUUFBRCxJQUFDLENBQUEsTUFBVDtRQUFrQixPQUFELElBQUMsQ0FBQSxLQUFsQjtRQUEwQixRQUFELElBQUMsQ0FBQSxNQUExQjtRQUFtQyxNQUFELElBQUMsQ0FBQSxJQUFuQztRQUEwQyxhQUFELElBQUMsQ0FBQSxXQUExQztRQUF3RCxjQUFELElBQUMsQ0FBQSxZQUF4RDs7SUFEZTs7Ozs7QUFsQnJCIiwic291cmNlc0NvbnRlbnQiOlsiU2VyaWFsaXphYmxlID0gcmVxdWlyZSAnc2VyaWFsaXphYmxlJ1xuXG5QYXRoID0gcmVxdWlyZSAncGF0aCdcblxubW9kdWxlLmV4cG9ydHMgPVxuICBjbGFzcyBSZW1vdGVGaWxlXG4gICAgU2VyaWFsaXphYmxlLmluY2x1ZGVJbnRvKHRoaXMpXG4gICAgYXRvbS5kZXNlcmlhbGl6ZXJzLmFkZCh0aGlzKVxuXG4gICAgY29uc3RydWN0b3I6IChAcGF0aCwgQGlzRmlsZSwgQGlzRGlyLCBAaXNMaW5rLCBAc2l6ZSwgQHBlcm1pc3Npb25zLCBAbGFzdE1vZGlmaWVkKSAtPlxuICAgICAgQG5hbWUgPSBQYXRoLmJhc2VuYW1lKEBwYXRoKVxuICAgICAgQGRpck5hbWUgPSBQYXRoLmRpcm5hbWUoQHBhdGgpXG4gICAgICBpZiBAbmFtZSA9PSAnLi4nXG4gICAgICAgIEBwYXRoID0gUGF0aC5kaXJuYW1lKFBhdGguZGlybmFtZShAcGF0aCkpXG5cbiAgICBpc0hpZGRlbjogKGNhbGxiYWNrKSAtPlxuICAgICAgY2FsbGJhY2soIShAbmFtZVswXSA9PSBcIi5cIiAmJiBAbmFtZS5sZW5ndGggPiAyKSlcblxuICAgIHNlcmlhbGl6ZVBhcmFtczogLT5cbiAgICAgIHtAcGF0aCwgQGlzRmlsZSwgQGlzRGlyLCBAaXNMaW5rLCBAc2l6ZSwgQHBlcm1pc3Npb25zLCBAbGFzdE1vZGlmaWVkfVxuIl19
