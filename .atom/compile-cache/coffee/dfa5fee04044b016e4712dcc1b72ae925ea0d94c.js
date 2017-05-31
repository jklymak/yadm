(function() {
  var $, $$, CompositeDisposable, Dialog, Emitter, FilesView, LocalFile, Q, View, _, async, fs, mkdirp, moment, os, path, ref, ref1, upath, util,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('atom-space-pen-views'), $ = ref.$, $$ = ref.$$, View = ref.View;

  ref1 = require('atom'), CompositeDisposable = ref1.CompositeDisposable, Emitter = ref1.Emitter;

  LocalFile = require('../model/local-file');

  Dialog = require('./dialog');

  fs = require('fs');

  os = require('os');

  async = require('async');

  util = require('util');

  path = require('path');

  Q = require('q');

  _ = require('underscore-plus');

  mkdirp = require('mkdirp');

  moment = require('moment');

  upath = require('upath');

  module.exports = FilesView = (function(superClass) {
    extend(FilesView, superClass);

    function FilesView() {
      this.deleteFolderFile = bind(this.deleteFolderFile, this);
      this.renameFolderFile = bind(this.renameFolderFile, this);
      this.createFile = bind(this.createFile, this);
      this.createFolder = bind(this.createFolder, this);
      this.reloadFolder = bind(this.reloadFolder, this);
      this.resizeTreeView = bind(this.resizeTreeView, this);
      this.resizeStopped = bind(this.resizeStopped, this);
      this.resizeStarted = bind(this.resizeStarted, this);
      this.openDirectory = bind(this.openDirectory, this);
      this.openFile = bind(this.openFile, this);
      this.updatePath = bind(this.updatePath, this);
      return FilesView.__super__.constructor.apply(this, arguments);
    }

    FilesView.content = function() {
      return this.div({
        "class": 'remote-edit-tree-view remote-edit-resizer tool-panel',
        'data-show-on-right-side': false
      }, (function(_this) {
        return function() {
          _this.div({
            "class": 'remote-edit-scroller order--center'
          }, function() {
            _this.div({
              "class": 'remote-edit-info focusable-panel',
              tabindex: -1,
              click: 'clickInfo'
            }, function() {
              _this.p({
                "class": 'remote-edit-server'
              }, function() {
                _this.span({
                  "class": 'remote-edit-server-type inline-block'
                }, 'FTP:');
                return _this.span({
                  "class": 'remote-edit-server-alias inline-block highlight',
                  outlet: 'server_alias'
                }, 'unknown');
              });
              return _this.p({
                "class": 'remote-edit-folder text-bold'
              }, function() {
                _this.span('Folder: ');
                return _this.span({
                  outlet: 'server_folder'
                }, 'unknown');
              });
            });
            _this.div({
              "class": 'remote-edit-scroller',
              outlet: 'scroller'
            }, function() {
              return _this.ol({
                "class": 'list-tree full-menu focusable-panel',
                tabindex: -1,
                outlet: 'list'
              });
            });
            return _this.div({
              "class": 'remote-edit-message',
              outlet: 'message'
            });
          });
          return _this.div({
            "class": 'remote-edit-resize-handle',
            outlet: 'resizeHandle'
          });
        };
      })(this));
    };

    FilesView.prototype.initialize = function(host) {
      this.host = host;
      this.emitter = new Emitter;
      this.disposables = new CompositeDisposable;
      return this.listenForEvents();
    };

    FilesView.prototype.connect = function(connectionOptions, connect_path) {
      var dir;
      if (connectionOptions == null) {
        connectionOptions = {};
      }
      if (connect_path == null) {
        connect_path = false;
      }
      dir = upath.normalize(connect_path ? connect_path : atom.config.get('remote-edit.rememberLastOpenDirectory') && (this.host.lastOpenDirectory != null) ? this.host.lastOpenDirectory : this.host.directory);
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            if (_this.host.usePassword && (connectionOptions.password == null)) {
              if (_this.host.password === "" || _this.host.password === '' || (_this.host.password == null)) {
                return async.waterfall([
                  function(callback) {
                    var passwordDialog;
                    passwordDialog = new Dialog({
                      prompt: "Enter password"
                    });
                    return passwordDialog.toggle(callback);
                  }
                ], function(err, result) {
                  connectionOptions = _.extend({
                    password: result
                  }, connectionOptions);
                  _this.toggle();
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
              _this.setMessage("Connecting...");
              return _this.host.connect(callback, connectionOptions);
            } else {
              return callback(null);
            }
          };
        })(this), (function(_this) {
          return function(callback) {
            return _this.populate(dir, callback);
          };
        })(this)
      ], (function(_this) {
        return function(err, result) {
          if (err != null) {
            console.error(err);
            _this.list.empty();
            if (err.code === 450 || err.type === "PERMISSION_DENIED") {
              return _this.setError("You do not have read permission to what you've specified as the default directory! See the console for more info.");
            } else if (err.code === 2 && _this.path === _this.host.lastOpenDirectory) {
              _this.host.lastOpenDirectory = void 0;
              return _this.connect(connectionOptions);
            } else if (_this.host.usePassword && (err.code === 530 || err.level === "connection-ssh")) {
              return async.waterfall([
                function(callback) {
                  var passwordDialog;
                  passwordDialog = new Dialog({
                    prompt: "Enter password"
                  });
                  return passwordDialog.toggle(callback);
                }
              ], function(err, result) {
                _this.toggle();
                return _this.connect({
                  password: result
                });
              });
            } else {
              return _this.setError(err);
            }
          }
        };
      })(this));
    };

    FilesView.prototype.getFilterKey = function() {
      return "name";
    };

    FilesView.prototype.destroy = function() {
      if (this.panel != null) {
        this.panel.destroy();
      }
      return this.disposables.dispose();
    };

    FilesView.prototype.cancelled = function() {
      var ref2;
      this.hide();
      if ((ref2 = this.host) != null) {
        ref2.close();
      }
      return this.destroy();
    };

    FilesView.prototype.toggle = function() {
      var ref2;
      if ((ref2 = this.panel) != null ? ref2.isVisible() : void 0) {
        return this.hide();
      } else {
        return this.show();
      }
    };

    FilesView.prototype.show = function() {
      var ref2;
      if (this.panel == null) {
        this.panel = atom.workspace.addLeftPanel({
          item: this,
          visible: true
        });
      }
      return (ref2 = this.panel) != null ? ref2.show() : void 0;
    };

    FilesView.prototype.hide = function() {
      var ref2;
      return (ref2 = this.panel) != null ? ref2.hide() : void 0;
    };

    FilesView.prototype.viewForItem = function(item) {
      var icon;
      icon = (function() {
        switch (false) {
          case !item.isDir:
            return 'icon-file-directory';
          case !item.isLink:
            return 'icon-file-symlink-file';
          default:
            return 'icon-file-text';
        }
      })();
      return $$(function() {
        return this.li({
          "class": 'list-item list-selectable-item two-lines'
        }, (function(_this) {
          return function() {
            _this.span({
              "class": 'primary-line icon ' + icon,
              'data-name': item.name,
              title: item.name
            }, item.name);
            if (item.name !== '..') {
              return _this.span({
                "class": 'text-subtle text-smaller'
              }, "S: " + item.size + ", M: " + item.lastModified + ", P: " + item.permissions);
            }
          };
        })(this));
      });
    };

    FilesView.prototype.populate = function(dir, callback) {
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.host.getFilesMetadata(dir, callback);
          };
        })(this), (function(_this) {
          return function(items, callback) {
            if (atom.config.get('remote-edit.foldersOnTop')) {
              items = _.sortBy(items, 'isFile');
            }
            _this.setItems(items);
            return callback(void 0, void 0);
          };
        })(this)
      ], (function(_this) {
        return function(err, result) {
          _this.updatePath(dir);
          _this.populateInfo();
          if (err != null) {
            _this.setError(err);
          }
          return typeof callback === "function" ? callback(err, result) : void 0;
        };
      })(this));
    };

    FilesView.prototype.populateList = function() {
      FilesView.__super__.populateList.apply(this, arguments);
      return this.setError(path.resolve(this.path));
    };

    FilesView.prototype.populateInfo = function() {
      this.server_alias.html(this.host.alias ? this.host.alias : this.host.hostname);
      return this.server_folder.html(this.path);
    };

    FilesView.prototype.getNewPath = function(next) {
      if (this.path[this.path.length - 1] === "/") {
        return this.path + next;
      } else {
        return this.path + "/" + next;
      }
    };

    FilesView.prototype.updatePath = function(next) {
      this.path = upath.normalize(next);
      this.host.lastOpenDirectory = this.path;
      return this.server_folder.html(this.path);
    };

    FilesView.prototype.getDefaultSaveDirForHostAndFile = function(file, callback) {
      return async.waterfall([
        function(callback) {
          return fs.realpath(os.tmpDir(), callback);
        }, function(tmpDir, callback) {
          tmpDir = tmpDir + path.sep + "remote-edit";
          return fs.mkdir(tmpDir, (function(err) {
            if ((err != null) && err.code === 'EEXIST') {
              return callback(null, tmpDir);
            } else {
              return callback(err, tmpDir);
            }
          }));
        }, (function(_this) {
          return function(tmpDir, callback) {
            tmpDir = tmpDir + path.sep + _this.host.hashCode() + '_' + _this.host.username + "-" + _this.host.hostname + file.dirName;
            return mkdirp(tmpDir, (function(err) {
              if ((err != null) && err.code === 'EEXIST') {
                return callback(null, tmpDir);
              } else {
                return callback(err, tmpDir);
              }
            }));
          };
        })(this)
      ], function(err, savePath) {
        return callback(err, savePath);
      });
    };

    FilesView.prototype.openFile = function(file) {
      var dtime;
      dtime = moment().format("HH:mm:ss DD/MM/YY");
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            return _this.getDefaultSaveDirForHostAndFile(file, callback);
          };
        })(this), (function(_this) {
          return function(savePath, callback) {
            var confirmResult, filePane, filePaneItem, localFile, uri;
            savePath = savePath + path.sep + dtime.replace(/([^a-z0-9\s]+)/gi, '').replace(/([\s]+)/gi, '-') + "_" + file.name;
            localFile = new LocalFile(savePath, file, dtime, _this.host);
            _this.host.getFile(localFile, callback);
            uri = path.normalize(savePath);
            filePane = atom.workspace.paneForURI(uri);
            if (filePane) {
              filePaneItem = filePane.itemForURI(uri);
              filePane.activateItem(filePaneItem);
              confirmResult = atom.confirm({
                message: 'Reopen this file?',
                detailedMessage: 'Unsaved data will be lost.',
                buttons: ['Yes', 'No']
              });
              if (confirmResult) {
                callback(null, null);
              } else {
                filePaneItem.destroy();
              }
            }
            if (!filePane || !confirmResult) {
              localFile = new LocalFile(savePath, file, dtime, _this.host);
              return _this.host.getFile(localFile, callback);
            }
          };
        })(this)
      ], (function(_this) {
        return function(err, localFile) {
          var uri;
          _this.deselect();
          if (err != null) {
            _this.setError(err);
            return console.error(err);
          } else if (localFile) {
            _this.host.addLocalFile(localFile);
            uri = "remote-edit://localFile/?localFile=" + (encodeURIComponent(JSON.stringify(localFile.serialize()))) + "&host=" + (encodeURIComponent(JSON.stringify(localFile.host.serialize())));
            return atom.workspace.open(uri, {
              split: 'left'
            });
          }
        };
      })(this));
    };

    FilesView.prototype.openDirectory = function(dir) {
      dir = upath.normalize(dir);
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            if (!_this.host.isConnected()) {
              _this.connect({}, dir);
            }
            return callback(null);
          };
        })(this), (function(_this) {
          return function(callback) {
            _this.host.invalidate();
            return _this.populate(dir);
          };
        })(this)
      ], function(err, savePath) {
        return callback(err, savePath);
      });
    };

    FilesView.prototype.confirmed = function(item) {
      return async.waterfall([
        (function(_this) {
          return function(callback) {
            var dir;
            if (!_this.host.isConnected()) {
              dir = item.isFile ? item.dirName : item.path;
              _this.connect({}, dir);
            }
            return callback(null);
          };
        })(this), (function(_this) {
          return function(callback) {
            if (item.isFile) {
              return _this.openFile(item);
            } else if (item.isDir) {
              _this.host.invalidate();
              return _this.populate(item.path);
            } else if (item.isLink) {
              if (atom.config.get('remote-edit.followLinks')) {
                return _this.populate(item.path);
              } else {
                return _this.openFile(item);
              }
            }
          };
        })(this)
      ], function(err, savePath) {
        return callback(err, savePath);
      });
    };

    FilesView.prototype.clickInfo = function(event, element) {};

    FilesView.prototype.resizeStarted = function() {
      $(document).on('mousemove', this.resizeTreeView);
      return $(document).on('mouseup', this.resizeStopped);
    };

    FilesView.prototype.resizeStopped = function() {
      $(document).off('mousemove', this.resizeTreeView);
      return $(document).off('mouseup', this.resizeStopped);
    };

    FilesView.prototype.resizeTreeView = function(arg) {
      var pageX, which, width;
      pageX = arg.pageX, which = arg.which;
      if (which !== 1) {
        return this.resizeStopped();
      }
      width = pageX - this.offset().left;
      return this.width(width);
    };

    FilesView.prototype.resizeToFitContent = function() {
      this.width(1);
      return this.width(this.list.outerWidth());
    };

    FilesView.prototype.listenForEvents = function() {
      this.list.on('mousedown', 'li', (function(_this) {
        return function(e) {
          if ($(e.target).closest('li').hasClass('selected')) {
            false;
          }
          _this.deselect();
          _this.selectedItem = $(e.target).closest('li').addClass('selected').data('select-list-item');
          if (e.which === 1) {
            _this.confirmed(_this.selectedItem);
            e.preventDefault();
            return false;
          } else if (e.which === 3) {
            return false;
          }
        };
      })(this));
      this.on('dblclick', '.remote-edit-resize-handle', (function(_this) {
        return function() {
          return _this.resizeToFitContent();
        };
      })(this));
      this.on('mousedown', '.remote-edit-resize-handle', (function(_this) {
        return function(e) {
          return _this.resizeStarted(e);
        };
      })(this));
      this.disposables.add(atom.commands.add('atom-workspace', 'filesview:open', (function(_this) {
        return function() {
          var item;
          item = _this.getSelectedItem();
          if (item.isFile) {
            return _this.openFile(item);
          } else if (item.isDir) {
            return _this.openDirectory(item);
          }
        };
      })(this)));
      return this.disposables.add(atom.commands.add('atom-workspace', 'filesview:previous-folder', (function(_this) {
        return function() {
          if (_this.path.length > 1) {
            return _this.openDirectory(_this.path + path.sep + '..');
          }
        };
      })(this)));
    };

    FilesView.prototype.setItems = function(items1) {
      var i, item, itemView, len, results;
      this.items = items1 != null ? items1 : [];
      this.message.hide();
      if (this.items == null) {
        return;
      }
      this.list.empty();
      if (this.items.length) {
        results = [];
        for (i = 0, len = items.length; i < len; i++) {
          item = items[i];
          itemView = $(this.viewForItem(item));
          itemView.data('select-list-item', item);
          results.push(this.list.append(itemView));
        }
        return results;
      } else {
        return this.setMessage('No matches found');
      }
    };

    FilesView.prototype.reloadFolder = function() {
      return this.openDirectory(this.path);
    };

    FilesView.prototype.createFolder = function() {
      if (typeof this.host.createFolder === 'function') {
        return async.waterfall([
          function(callback) {
            var nameDialog;
            nameDialog = new Dialog({
              prompt: "Enter the name for new folder."
            });
            return nameDialog.toggle(callback);
          }, (function(_this) {
            return function(foldername, callback) {
              return _this.host.createFolder(_this.path + "/" + foldername, callback);
            };
          })(this)
        ], (function(_this) {
          return function(err, result) {
            return _this.openDirectory(_this.path);
          };
        })(this));
      } else {
        throw new Error("Not implemented yet!");
      }
    };

    FilesView.prototype.createFile = function() {
      if (typeof this.host.createFile === 'function') {
        return async.waterfall([
          function(callback) {
            var nameDialog;
            nameDialog = new Dialog({
              prompt: "Enter the name for new file."
            });
            return nameDialog.toggle(callback);
          }, (function(_this) {
            return function(filename, callback) {
              return _this.host.createFile(_this.path + "/" + filename, callback);
            };
          })(this)
        ], (function(_this) {
          return function(err, result) {
            return _this.openDirectory(_this.path);
          };
        })(this));
      } else {
        throw new Error("Not implemented yet!");
      }
    };

    FilesView.prototype.renameFolderFile = function() {
      if (typeof this.host.renameFolderFile === 'function') {
        if (this.selectedItem && this.selectedItem.name && this.selectedItem.name !== '.') {
          return async.waterfall([
            (function(_this) {
              return function(callback) {
                var nameDialog;
                nameDialog = new Dialog({
                  prompt: "Enter the new name for " + (_this.selectedItem.isDir ? 'folder' : _this.selectedItem.isFile ? 'file' : 'link') + " \"" + _this.selectedItem.name + "\"."
                });
                nameDialog.miniEditor.setText(_this.selectedItem.name);
                return nameDialog.toggle(callback);
              };
            })(this), (function(_this) {
              return function(newname, callback) {
                _this.deselect();
                return _this.host.renameFolderFile(_this.path, _this.selectedItem.name, newname, _this.selectedItem.isDir, callback);
              };
            })(this)
          ], (function(_this) {
            return function(err, result) {
              return _this.openDirectory(_this.path);
            };
          })(this));
        }
      } else {
        throw new Error("Not implemented yet!");
      }
    };

    FilesView.prototype.deleteFolderFile = function() {
      if (typeof this.host.deleteFolderFile === 'function') {
        if (this.selectedItem && this.selectedItem.name && this.selectedItem.name !== '.') {
          atom.confirm({
            message: "Are you sure you want to delete " + (this.selectedItem.isDir ? 'folder' : this.selectedItem.isFile ? 'file' : 'link') + "?",
            detailedMessage: "You are deleting: " + this.selectedItem.name,
            buttons: {
              'Yes': (function(_this) {
                return function() {
                  return _this.host.deleteFolderFile(_this.path + "/" + _this.selectedItem.name, _this.selectedItem.isDir, function() {
                    return _this.openDirectory(_this.path);
                  });
                };
              })(this),
              'No': (function(_this) {
                return function() {
                  return _this.deselect();
                };
              })(this)
            }
          });
          return this.selectedItem = false;
        }
      } else {
        throw new Error("Not implemented yet!");
      }
    };

    FilesView.prototype.deselect = function() {
      return this.list.find('li.selected').removeClass('selected');
    };

    FilesView.prototype.setError = function(message) {
      if (message == null) {
        message = '';
      }
      return this.emitter.emit('info', {
        message: message,
        type: 'error'
      });
    };

    FilesView.prototype.setMessage = function(message) {
      if (message == null) {
        message = '';
      }
      return this.message.empty().show().append("<ul class='background-message centered'><li>" + message + "</li></ul>");
    };

    return FilesView;

  })(View);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi92aWV3L2ZpbGVzLXZpZXcuY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQSwwSUFBQTtJQUFBOzs7O0VBQUEsTUFBZ0IsT0FBQSxDQUFRLHNCQUFSLENBQWhCLEVBQUMsU0FBRCxFQUFJLFdBQUosRUFBUTs7RUFDUixPQUFpQyxPQUFBLENBQVEsTUFBUixDQUFqQyxFQUFDLDhDQUFELEVBQXNCOztFQUN0QixTQUFBLEdBQVksT0FBQSxDQUFRLHFCQUFSOztFQUVaLE1BQUEsR0FBUyxPQUFBLENBQVEsVUFBUjs7RUFFVCxFQUFBLEdBQUssT0FBQSxDQUFRLElBQVI7O0VBQ0wsRUFBQSxHQUFLLE9BQUEsQ0FBUSxJQUFSOztFQUNMLEtBQUEsR0FBUSxPQUFBLENBQVEsT0FBUjs7RUFDUixJQUFBLEdBQU8sT0FBQSxDQUFRLE1BQVI7O0VBQ1AsSUFBQSxHQUFPLE9BQUEsQ0FBUSxNQUFSOztFQUNQLENBQUEsR0FBSSxPQUFBLENBQVEsR0FBUjs7RUFDSixDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUNKLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUjs7RUFDVCxNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBQ1QsS0FBQSxHQUFRLE9BQUEsQ0FBUSxPQUFSOztFQUVSLE1BQU0sQ0FBQyxPQUFQLEdBQ1E7Ozs7Ozs7Ozs7Ozs7Ozs7OztJQUVKLFNBQUMsQ0FBQSxPQUFELEdBQVUsU0FBQTthQUNSLElBQUMsQ0FBQSxHQUFELENBQUs7UUFBQSxDQUFBLEtBQUEsQ0FBQSxFQUFPLHNEQUFQO1FBQStELHlCQUFBLEVBQTJCLEtBQTFGO09BQUwsRUFBc0csQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO1VBQ3BHLEtBQUMsQ0FBQSxHQUFELENBQUs7WUFBQSxDQUFBLEtBQUEsQ0FBQSxFQUFPLG9D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QUErQiw4Q0FBQSxHQUErQyxPQUEvQyxHQUF1RCxZQUF0RjtJQURVOzs7O0tBeFhVO0FBbEIxQiIsInNvdXJjZXNDb250ZW50IjpbInskLCAkJCwgVmlld30gPSByZXF1aXJlICdhdG9tLXNwYWNlLXBlbi12aWV3cydcbntDb21wb3NpdGVEaXNwb3NhYmxlLCBFbWl0dGVyfSA9IHJlcXVpcmUgJ2F0b20nXG5Mb2NhbEZpbGUgPSByZXF1aXJlICcuLi9tb2RlbC9sb2NhbC1maWxlJ1xuXG5EaWFsb2cgPSByZXF1aXJlICcuL2RpYWxvZydcblxuZnMgPSByZXF1aXJlICdmcydcbm9zID0gcmVxdWlyZSAnb3MnXG5hc3luYyA9IHJlcXVpcmUgJ2FzeW5jJ1xudXRpbCA9IHJlcXVpcmUgJ3V0aWwnXG5wYXRoID0gcmVxdWlyZSAncGF0aCdcblEgPSByZXF1aXJlICdxJ1xuXyA9IHJlcXVpcmUgJ3VuZGVyc2NvcmUtcGx1cydcbm1rZGlycCA9IHJlcXVpcmUgJ21rZGlycCdcbm1vbWVudCA9IHJlcXVpcmUgJ21vbWVudCdcbnVwYXRoID0gcmVxdWlyZSAndXBhdGgnXG5cbm1vZHVsZS5leHBvcnRzID1cbiAgY2xhc3MgRmlsZXNWaWV3IGV4dGVuZHMgVmlld1xuXG4gICAgQGNvbnRlbnQ6IC0+XG4gICAgICBAZGl2IGNsYXNzOiAncmVtb3RlLWVkaXQtdHJlZS12aWV3IHJlbW90ZS1lZGl0LXJlc2l6ZXIgdG9vbC1wYW5lbCcsICdkYXRhLXNob3ctb24tcmlnaHQtc2lkZSc6IGZhbHNlLCA9PlxuICAgICAgICBAZGl2IGNsYXNzOiAncmVtb3RlLWVkaXQtc2Nyb2xsZXIgb3JkZXItLWNlbnRlcicsID0+XG4gICAgICAgICAgQGRpdiBjbGFzczogJ3JlbW90ZS1lZGl0LWluZm8gZm9jdXNhYmxlLXBhbmVsJywgdGFiaW5kZXg6IC0xLCBjbGljazogJ2NsaWNrSW5mbycsID0+XG4gICAgICAgICAgICBAcCBjbGFzczogJ3JlbW90ZS1lZGl0LXNlcnZlcicsID0+XG4gICAgICAgICAgICAgIEBzcGFuIGNsYXNzOiAncmVtb3RlLWVkaXQtc2VydmVyLXR5cGUgaW5saW5lLWJsb2NrJywgJ0ZUUDonXG4gICAgICAgICAgICAgIEBzcGFuIGNsYXNzOiAncmVtb3RlLWVkaXQtc2VydmVyLWFsaWFzIGlubGluZS1ibG9jayBoaWdobGlnaHQnLCBvdXRsZXQ6ICdzZXJ2ZXJfYWxpYXMnLCAndW5rbm93bidcbiAgICAgICAgICAgIEBwIGNsYXNzOiAncmVtb3RlLWVkaXQtZm9sZGVyIHRleHQtYm9sZCcsID0+XG4gICAgICAgICAgICAgIEBzcGFuICdGb2xkZXI6ICdcbiAgICAgICAgICAgICAgQHNwYW4gb3V0bGV0OiAnc2VydmVyX2ZvbGRlcicsICd1bmtub3duJ1xuXG4gICAgICAgICAgQGRpdiBjbGFzczogJ3JlbW90ZS1lZGl0LXNjcm9sbGVyJywgb3V0bGV0OiAnc2Nyb2xsZXInLCA9PlxuICAgICAgICAgICAgQG9sIGNsYXNzOiAnbGlzdC10cmVlIGZ1bGwtbWVudSBmb2N1c2FibGUtcGFuZWwnLCB0YWJpbmRleDogLTEsIG91dGxldDogJ2xpc3QnXG4gICAgICAgICAgQGRpdiBjbGFzczogJ3JlbW90ZS1lZGl0LW1lc3NhZ2UnLCBvdXRsZXQ6ICdtZXNzYWdlJ1xuICAgICAgICBAZGl2IGNsYXNzOiAncmVtb3RlLWVkaXQtcmVzaXplLWhhbmRsZScsIG91dGxldDogJ3Jlc2l6ZUhhbmRsZSdcblxuICAgIGluaXRpYWxpemU6IChAaG9zdCkgLT5cbiAgICAgIEBlbWl0dGVyID0gbmV3IEVtaXR0ZXJcbiAgICAgIEBkaXNwb3NhYmxlcyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgICBAbGlzdGVuRm9yRXZlbnRzKClcblxuICAgIGNvbm5lY3Q6IChjb25uZWN0aW9uT3B0aW9ucyA9IHt9LCBjb25uZWN0X3BhdGggPSBmYWxzZSkgLT5cbiAgICAgIGRpciA9IHVwYXRoLm5vcm1hbGl6ZShpZiBjb25uZWN0X3BhdGggdGhlbiBjb25uZWN0X3BhdGggZWxzZSBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnJlbWVtYmVyTGFzdE9wZW5EaXJlY3RvcnknKSBhbmQgQGhvc3QubGFzdE9wZW5EaXJlY3Rvcnk/IHRoZW4gQGhvc3QubGFzdE9wZW5EaXJlY3RvcnkgZWxzZSBAaG9zdC5kaXJlY3RvcnkpXG4gICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgaWYgQGhvc3QudXNlUGFzc3dvcmQgYW5kICFjb25uZWN0aW9uT3B0aW9ucy5wYXNzd29yZD9cbiAgICAgICAgICAgIGlmIEBob3N0LnBhc3N3b3JkID09IFwiXCIgb3IgQGhvc3QucGFzc3dvcmQgPT0gJycgb3IgIUBob3N0LnBhc3N3b3JkP1xuICAgICAgICAgICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAgICAgICAgIChjYWxsYmFjaykgLT5cbiAgICAgICAgICAgICAgICAgIHBhc3N3b3JkRGlhbG9nID0gbmV3IERpYWxvZyh7cHJvbXB0OiBcIkVudGVyIHBhc3N3b3JkXCJ9KVxuICAgICAgICAgICAgICAgICAgcGFzc3dvcmREaWFsb2cudG9nZ2xlKGNhbGxiYWNrKVxuICAgICAgICAgICAgICBdLCAoZXJyLCByZXN1bHQpID0+XG4gICAgICAgICAgICAgICAgY29ubmVjdGlvbk9wdGlvbnMgPSBfLmV4dGVuZCh7cGFzc3dvcmQ6IHJlc3VsdH0sIGNvbm5lY3Rpb25PcHRpb25zKVxuICAgICAgICAgICAgICAgIEB0b2dnbGUoKVxuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgICAgICAgIClcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgICAgICBlbHNlXG4gICAgICAgICAgICBjYWxsYmFjayhudWxsKVxuICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgaWYgIUBob3N0LmlzQ29ubmVjdGVkKClcbiAgICAgICAgICAgIEBzZXRNZXNzYWdlKFwiQ29ubmVjdGluZy4uLlwiKVxuICAgICAgICAgICAgQGhvc3QuY29ubmVjdChjYWxsYmFjaywgY29ubmVjdGlvbk9wdGlvbnMpXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgY2FsbGJhY2sobnVsbClcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIEBwb3B1bGF0ZShkaXIsIGNhbGxiYWNrKVxuICAgICAgXSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgY29uc29sZS5lcnJvciBlcnJcbiAgICAgICAgICBAbGlzdC5lbXB0eSgpXG4gICAgICAgICAgaWYgZXJyLmNvZGUgPT0gNDUwIG9yIGVyci50eXBlID09IFwiUEVSTUlTU0lPTl9ERU5JRURcIlxuICAgICAgICAgICAgQHNldEVycm9yKFwiWW91IGRvIG5vdCBoYXZlIHJlYWQgcGVybWlzc2lvbiB0byB3aGF0IHlvdSd2ZSBzcGVjaWZpZWQgYXMgdGhlIGRlZmF1bHQgZGlyZWN0b3J5ISBTZWUgdGhlIGNvbnNvbGUgZm9yIG1vcmUgaW5mby5cIilcbiAgICAgICAgICBlbHNlIGlmIGVyci5jb2RlIGlzIDIgYW5kIEBwYXRoIGlzIEBob3N0Lmxhc3RPcGVuRGlyZWN0b3J5XG4gICAgICAgICAgICAjIG5vIHN1Y2ggZmlsZSwgY2FuIG9jY3VyIGlmIGxhc3RPcGVuRGlyZWN0b3J5IGlzIHVzZWQgYW5kIHRoZSBkaXIgaGFzIGJlZW4gcmVtb3ZlZFxuICAgICAgICAgICAgQGhvc3QubGFzdE9wZW5EaXJlY3RvcnkgPSB1bmRlZmluZWRcbiAgICAgICAgICAgIEBjb25uZWN0KGNvbm5lY3Rpb25PcHRpb25zKVxuICAgICAgICAgIGVsc2UgaWYgQGhvc3QudXNlUGFzc3dvcmQgYW5kIChlcnIuY29kZSA9PSA1MzAgb3IgZXJyLmxldmVsID09IFwiY29ubmVjdGlvbi1zc2hcIilcbiAgICAgICAgICAgIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICAgICAgICAgIChjYWxsYmFjaykgLT5cbiAgICAgICAgICAgICAgICBwYXNzd29yZERpYWxvZyA9IG5ldyBEaWFsb2coe3Byb21wdDogXCJFbnRlciBwYXNzd29yZFwifSlcbiAgICAgICAgICAgICAgICBwYXNzd29yZERpYWxvZy50b2dnbGUoY2FsbGJhY2spXG4gICAgICAgICAgICBdLCAoZXJyLCByZXN1bHQpID0+XG4gICAgICAgICAgICAgIEB0b2dnbGUoKVxuICAgICAgICAgICAgICBAY29ubmVjdCh7cGFzc3dvcmQ6IHJlc3VsdH0pXG4gICAgICAgICAgICApXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHNldEVycm9yKGVycilcbiAgICAgIClcblxuICAgIGdldEZpbHRlcktleTogLT5cbiAgICAgIHJldHVybiBcIm5hbWVcIlxuXG4gICAgZGVzdHJveTogLT5cbiAgICAgIEBwYW5lbC5kZXN0cm95KCkgaWYgQHBhbmVsP1xuICAgICAgQGRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuXG4gICAgY2FuY2VsbGVkOiAtPlxuICAgICAgQGhpZGUoKVxuICAgICAgQGhvc3Q/LmNsb3NlKClcbiAgICAgIEBkZXN0cm95KClcblxuICAgIHRvZ2dsZTogLT5cbiAgICAgIGlmIEBwYW5lbD8uaXNWaXNpYmxlKClcbiAgICAgICAgQGhpZGUoKVxuICAgICAgZWxzZVxuICAgICAgICBAc2hvdygpXG5cbiAgICBzaG93OiAtPlxuICAgICAgQHBhbmVsID89IGF0b20ud29ya3NwYWNlLmFkZExlZnRQYW5lbChpdGVtOiB0aGlzLCB2aXNpYmxlOiB0cnVlKVxuICAgICAgQHBhbmVsPy5zaG93KClcblxuICAgIGhpZGU6IC0+XG4gICAgICBAcGFuZWw/LmhpZGUoKVxuXG4gICAgdmlld0Zvckl0ZW06IChpdGVtKSAtPlxuICAgICAgaWNvbiA9IHN3aXRjaFxuICAgICAgICB3aGVuIGl0ZW0uaXNEaXIgdGhlbiAnaWNvbi1maWxlLWRpcmVjdG9yeSdcbiAgICAgICAgd2hlbiBpdGVtLmlzTGluayB0aGVuICdpY29uLWZpbGUtc3ltbGluay1maWxlJ1xuICAgICAgICBlbHNlICdpY29uLWZpbGUtdGV4dCdcbiAgICAgICQkIC0+XG4gICAgICAgIEBsaSBjbGFzczogJ2xpc3QtaXRlbSBsaXN0LXNlbGVjdGFibGUtaXRlbSB0d28tbGluZXMnLCA9PlxuICAgICAgICAgIEBzcGFuIGNsYXNzOiAncHJpbWFyeS1saW5lIGljb24gJysgaWNvbiwgJ2RhdGEtbmFtZScgOiBpdGVtLm5hbWUsIHRpdGxlIDogaXRlbS5uYW1lLCBpdGVtLm5hbWVcbiAgICAgICAgICBpZiBpdGVtLm5hbWUgIT0gJy4uJ1xuICAgICAgICAgICAgQHNwYW4gY2xhc3M6ICd0ZXh0LXN1YnRsZSB0ZXh0LXNtYWxsZXInLCBcIlM6ICN7aXRlbS5zaXplfSwgTTogI3tpdGVtLmxhc3RNb2RpZmllZH0sIFA6ICN7aXRlbS5wZXJtaXNzaW9uc31cIlxuXG4gICAgcG9wdWxhdGU6IChkaXIsIGNhbGxiYWNrKSAtPlxuICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIEBob3N0LmdldEZpbGVzTWV0YWRhdGEoZGlyLCBjYWxsYmFjaylcbiAgICAgICAgKGl0ZW1zLCBjYWxsYmFjaykgPT5cbiAgICAgICAgICBpdGVtcyA9IF8uc29ydEJ5KGl0ZW1zLCAnaXNGaWxlJykgaWYgYXRvbS5jb25maWcuZ2V0ICdyZW1vdGUtZWRpdC5mb2xkZXJzT25Ub3AnXG4gICAgICAgICAgQHNldEl0ZW1zKGl0ZW1zKVxuICAgICAgICAgIGNhbGxiYWNrKHVuZGVmaW5lZCwgdW5kZWZpbmVkKVxuICAgICAgXSwgKGVyciwgcmVzdWx0KSA9PlxuICAgICAgICBAdXBkYXRlUGF0aChkaXIpXG4gICAgICAgIEBwb3B1bGF0ZUluZm8oKVxuICAgICAgICBAc2V0RXJyb3IoZXJyKSBpZiBlcnI/XG4gICAgICAgIGNhbGxiYWNrPyhlcnIsIHJlc3VsdClcbiAgICAgIClcblxuICAgIHBvcHVsYXRlTGlzdDogLT5cbiAgICAgIHN1cGVyXG4gICAgICBAc2V0RXJyb3IgcGF0aC5yZXNvbHZlIEBwYXRoXG5cbiAgICBwb3B1bGF0ZUluZm86IC0+XG4gICAgICBAc2VydmVyX2FsaWFzLmh0bWwoaWYgQGhvc3QuYWxpYXMgdGhlbiBAaG9zdC5hbGlhcyBlbHNlIEBob3N0Lmhvc3RuYW1lKVxuICAgICAgQHNlcnZlcl9mb2xkZXIuaHRtbChAcGF0aClcblxuICAgIGdldE5ld1BhdGg6IChuZXh0KSAtPlxuICAgICAgaWYgKEBwYXRoW0BwYXRoLmxlbmd0aCAtIDFdID09IFwiL1wiKVxuICAgICAgICBAcGF0aCArIG5leHRcbiAgICAgIGVsc2VcbiAgICAgICAgQHBhdGggKyBcIi9cIiArIG5leHRcblxuICAgIHVwZGF0ZVBhdGg6IChuZXh0KSA9PlxuICAgICAgQHBhdGggPSB1cGF0aC5ub3JtYWxpemUobmV4dClcbiAgICAgIEBob3N0Lmxhc3RPcGVuRGlyZWN0b3J5ID0gQHBhdGhcbiAgICAgIEBzZXJ2ZXJfZm9sZGVyLmh0bWwoQHBhdGgpXG5cbiAgICBnZXREZWZhdWx0U2F2ZURpckZvckhvc3RBbmRGaWxlOiAoZmlsZSwgY2FsbGJhY2spIC0+XG4gICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAoY2FsbGJhY2spIC0+XG4gICAgICAgICAgZnMucmVhbHBhdGgob3MudG1wRGlyKCksIGNhbGxiYWNrKVxuICAgICAgICAodG1wRGlyLCBjYWxsYmFjaykgLT5cbiAgICAgICAgICB0bXBEaXIgPSB0bXBEaXIgKyBwYXRoLnNlcCArIFwicmVtb3RlLWVkaXRcIlxuICAgICAgICAgIGZzLm1rZGlyKHRtcERpciwgKChlcnIpIC0+XG4gICAgICAgICAgICBpZiBlcnI/ICYmIGVyci5jb2RlID09ICdFRVhJU1QnXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHRtcERpcilcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCB0bXBEaXIpXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgICAodG1wRGlyLCBjYWxsYmFjaykgPT5cbiAgICAgICAgICB0bXBEaXIgPSB0bXBEaXIgKyBwYXRoLnNlcCArIEBob3N0Lmhhc2hDb2RlKCkgKyAnXycgKyBAaG9zdC51c2VybmFtZSArIFwiLVwiICsgQGhvc3QuaG9zdG5hbWUgKyAgZmlsZS5kaXJOYW1lXG4gICAgICAgICAgbWtkaXJwKHRtcERpciwgKChlcnIpIC0+XG4gICAgICAgICAgICBpZiBlcnI/ICYmIGVyci5jb2RlID09ICdFRVhJU1QnXG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIHRtcERpcilcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgY2FsbGJhY2soZXJyLCB0bXBEaXIpXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuICAgICAgXSwgKGVyciwgc2F2ZVBhdGgpIC0+XG4gICAgICAgIGNhbGxiYWNrKGVyciwgc2F2ZVBhdGgpXG4gICAgICApXG5cbiAgICBvcGVuRmlsZTogKGZpbGUpID0+XG4gICAgICBkdGltZSA9IG1vbWVudCgpLmZvcm1hdChcIkhIOm1tOnNzIEREL01NL1lZXCIpXG4gICAgICBhc3luYy53YXRlcmZhbGwoW1xuICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgQGdldERlZmF1bHRTYXZlRGlyRm9ySG9zdEFuZEZpbGUoZmlsZSwgY2FsbGJhY2spXG4gICAgICAgIChzYXZlUGF0aCwgY2FsbGJhY2spID0+XG4gICAgICAgICAgc2F2ZVBhdGggPSBzYXZlUGF0aCArIHBhdGguc2VwICsgZHRpbWUucmVwbGFjZSgvKFteYS16MC05XFxzXSspL2dpLCAnJykucmVwbGFjZSgvKFtcXHNdKykvZ2ksICctJykgKyBcIl9cIiArIGZpbGUubmFtZVxuICAgICAgICAgIGxvY2FsRmlsZSA9IG5ldyBMb2NhbEZpbGUoc2F2ZVBhdGgsIGZpbGUsIGR0aW1lLCBAaG9zdClcbiAgICAgICAgICBAaG9zdC5nZXRGaWxlKGxvY2FsRmlsZSwgY2FsbGJhY2spXG4gICAgICAgICAgdXJpID0gcGF0aC5ub3JtYWxpemUoc2F2ZVBhdGgpXG4gICAgICAgICAgZmlsZVBhbmUgPSBhdG9tLndvcmtzcGFjZS5wYW5lRm9yVVJJKHVyaSlcbiAgICAgICAgICBpZiBmaWxlUGFuZVxuICAgICAgICAgICAgZmlsZVBhbmVJdGVtID0gZmlsZVBhbmUuaXRlbUZvclVSSSh1cmkpXG4gICAgICAgICAgICBmaWxlUGFuZS5hY3RpdmF0ZUl0ZW0oZmlsZVBhbmVJdGVtKVxuICAgICAgICAgICAgY29uZmlybVJlc3VsdCA9IGF0b20uY29uZmlybVxuICAgICAgICAgICAgICBtZXNzYWdlOiAnUmVvcGVuIHRoaXMgZmlsZT8nXG4gICAgICAgICAgICAgIGRldGFpbGVkTWVzc2FnZTogJ1Vuc2F2ZWQgZGF0YSB3aWxsIGJlIGxvc3QuJ1xuICAgICAgICAgICAgICBidXR0b25zOiBbJ1llcycsJ05vJ11cbiAgICAgICAgICAgICMgY29uZmlybVJlc3VsdDogWWVzID0gMCwgTm8gPSAxLCBDbG9zZSBidXR0b24gPSAxXG4gICAgICAgICAgICBpZiBjb25maXJtUmVzdWx0XG4gICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIG51bGwpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgIGZpbGVQYW5lSXRlbS5kZXN0cm95KClcblxuICAgICAgICAgIGlmICFmaWxlUGFuZSBvciAhY29uZmlybVJlc3VsdFxuICAgICAgICAgICAgbG9jYWxGaWxlID0gbmV3IExvY2FsRmlsZShzYXZlUGF0aCwgZmlsZSwgZHRpbWUsIEBob3N0KVxuICAgICAgICAgICAgQGhvc3QuZ2V0RmlsZShsb2NhbEZpbGUsIGNhbGxiYWNrKVxuICAgICAgXSwgKGVyciwgbG9jYWxGaWxlKSA9PlxuICAgICAgICBAZGVzZWxlY3QoKVxuICAgICAgICBpZiBlcnI/XG4gICAgICAgICAgQHNldEVycm9yKGVycilcbiAgICAgICAgICBjb25zb2xlLmVycm9yIGVyclxuICAgICAgICBlbHNlIGlmIGxvY2FsRmlsZVxuICAgICAgICAgIEBob3N0LmFkZExvY2FsRmlsZShsb2NhbEZpbGUpXG4gICAgICAgICAgdXJpID0gXCJyZW1vdGUtZWRpdDovL2xvY2FsRmlsZS8/bG9jYWxGaWxlPSN7ZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KGxvY2FsRmlsZS5zZXJpYWxpemUoKSkpfSZob3N0PSN7ZW5jb2RlVVJJQ29tcG9uZW50KEpTT04uc3RyaW5naWZ5KGxvY2FsRmlsZS5ob3N0LnNlcmlhbGl6ZSgpKSl9XCJcbiAgICAgICAgICBhdG9tLndvcmtzcGFjZS5vcGVuKHVyaSwgc3BsaXQ6ICdsZWZ0JylcbiAgICAgIClcblxuICAgIG9wZW5EaXJlY3Rvcnk6IChkaXIpID0+XG4gICAgICBkaXIgPSB1cGF0aC5ub3JtYWxpemUoZGlyKVxuICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIGlmICFAaG9zdC5pc0Nvbm5lY3RlZCgpXG4gICAgICAgICAgICBAY29ubmVjdCh7fSwgZGlyKVxuICAgICAgICAgIGNhbGxiYWNrKG51bGwpXG4gICAgICAgIChjYWxsYmFjaykgPT5cbiAgICAgICAgICBAaG9zdC5pbnZhbGlkYXRlKClcbiAgICAgICAgICBAcG9wdWxhdGUoZGlyKVxuICAgICAgXSwgKGVyciwgc2F2ZVBhdGgpIC0+XG4gICAgICAgIGNhbGxiYWNrKGVyciwgc2F2ZVBhdGgpXG4gICAgICApXG5cbiAgICBjb25maXJtZWQ6IChpdGVtKSAtPlxuICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgKGNhbGxiYWNrKSA9PlxuICAgICAgICAgIGlmICFAaG9zdC5pc0Nvbm5lY3RlZCgpXG4gICAgICAgICAgICBkaXIgPSBpZiBpdGVtLmlzRmlsZSB0aGVuIGl0ZW0uZGlyTmFtZSBlbHNlIGl0ZW0ucGF0aFxuICAgICAgICAgICAgQGNvbm5lY3Qoe30sIGRpcilcbiAgICAgICAgICBjYWxsYmFjayhudWxsKVxuICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgaWYgaXRlbS5pc0ZpbGVcbiAgICAgICAgICAgIEBvcGVuRmlsZShpdGVtKVxuICAgICAgICAgIGVsc2UgaWYgaXRlbS5pc0RpclxuICAgICAgICAgICAgQGhvc3QuaW52YWxpZGF0ZSgpXG4gICAgICAgICAgICBAcG9wdWxhdGUoaXRlbS5wYXRoKVxuICAgICAgICAgIGVsc2UgaWYgaXRlbS5pc0xpbmtcbiAgICAgICAgICAgIGlmIGF0b20uY29uZmlnLmdldCgncmVtb3RlLWVkaXQuZm9sbG93TGlua3MnKVxuICAgICAgICAgICAgICBAcG9wdWxhdGUoaXRlbS5wYXRoKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICBAb3BlbkZpbGUoaXRlbSlcbiAgICAgIF0sIChlcnIsIHNhdmVQYXRoKSAtPlxuICAgICAgICBjYWxsYmFjayhlcnIsIHNhdmVQYXRoKVxuICAgICAgKVxuICAgIGNsaWNrSW5mbzogKGV2ZW50LCBlbGVtZW50KSAtPlxuICAgICAgI2NvbnNvbGUubG9nIGV2ZW50XG5cbiAgICByZXNpemVTdGFydGVkOiA9PlxuICAgICAgJChkb2N1bWVudCkub24oJ21vdXNlbW92ZScsIEByZXNpemVUcmVlVmlldylcbiAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZXVwJywgQHJlc2l6ZVN0b3BwZWQpXG5cbiAgICByZXNpemVTdG9wcGVkOiA9PlxuICAgICAgJChkb2N1bWVudCkub2ZmKCdtb3VzZW1vdmUnLCBAcmVzaXplVHJlZVZpZXcpXG4gICAgICAkKGRvY3VtZW50KS5vZmYoJ21vdXNldXAnLCBAcmVzaXplU3RvcHBlZClcblxuICAgIHJlc2l6ZVRyZWVWaWV3OiAoe3BhZ2VYLCB3aGljaH0pID0+XG4gICAgICByZXR1cm4gQHJlc2l6ZVN0b3BwZWQoKSB1bmxlc3Mgd2hpY2ggaXMgMVxuICAgICAgd2lkdGggPSBwYWdlWCAtIEBvZmZzZXQoKS5sZWZ0XG4gICAgICBAd2lkdGgod2lkdGgpXG5cbiAgICByZXNpemVUb0ZpdENvbnRlbnQ6IC0+XG4gICAgICBAd2lkdGgoMSkgIyBTaHJpbmsgdG8gbWVhc3VyZSB0aGUgbWluaW11bSB3aWR0aCBvZiBsaXN0XG4gICAgICBAd2lkdGgoQGxpc3Qub3V0ZXJXaWR0aCgpKVxuXG4gICAgbGlzdGVuRm9yRXZlbnRzOiAtPlxuICAgICAgQGxpc3Qub24gJ21vdXNlZG93bicsICdsaScsIChlKSA9PlxuICAgICAgICBpZiAkKGUudGFyZ2V0KS5jbG9zZXN0KCdsaScpLmhhc0NsYXNzKCdzZWxlY3RlZCcpXG4gICAgICAgICAgZmFsc2VcbiAgICAgICAgQGRlc2VsZWN0KClcbiAgICAgICAgQHNlbGVjdGVkSXRlbSA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2xpJykuYWRkQ2xhc3MoJ3NlbGVjdGVkJykuZGF0YSgnc2VsZWN0LWxpc3QtaXRlbScpXG4gICAgICAgIGlmIGUud2hpY2ggPT0gMVxuICAgICAgICAgIEBjb25maXJtZWQoQHNlbGVjdGVkSXRlbSlcbiAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgICBmYWxzZVxuICAgICAgICBlbHNlIGlmIGUud2hpY2ggPT0gM1xuICAgICAgICAgIGZhbHNlXG5cbiAgICAgIEBvbiAnZGJsY2xpY2snLCAnLnJlbW90ZS1lZGl0LXJlc2l6ZS1oYW5kbGUnLCA9PlxuICAgICAgICBAcmVzaXplVG9GaXRDb250ZW50KClcblxuICAgICAgQG9uICdtb3VzZWRvd24nLCAnLnJlbW90ZS1lZGl0LXJlc2l6ZS1oYW5kbGUnLCAoZSkgPT4gQHJlc2l6ZVN0YXJ0ZWQoZSlcblxuICAgICAgQGRpc3Bvc2FibGVzLmFkZCBhdG9tLmNvbW1hbmRzLmFkZCAnYXRvbS13b3Jrc3BhY2UnLCAnZmlsZXN2aWV3Om9wZW4nLCA9PlxuICAgICAgICBpdGVtID0gQGdldFNlbGVjdGVkSXRlbSgpXG4gICAgICAgIGlmIGl0ZW0uaXNGaWxlXG4gICAgICAgICAgQG9wZW5GaWxlKGl0ZW0pXG4gICAgICAgIGVsc2UgaWYgaXRlbS5pc0RpclxuICAgICAgICAgIEBvcGVuRGlyZWN0b3J5KGl0ZW0pXG5cbiAgICAgIEBkaXNwb3NhYmxlcy5hZGQgYXRvbS5jb21tYW5kcy5hZGQgJ2F0b20td29ya3NwYWNlJywgJ2ZpbGVzdmlldzpwcmV2aW91cy1mb2xkZXInLCA9PlxuICAgICAgICBpZiBAcGF0aC5sZW5ndGggPiAxXG4gICAgICAgICAgQG9wZW5EaXJlY3RvcnkoQHBhdGggKyBwYXRoLnNlcCArICcuLicpXG5cbiAgICBzZXRJdGVtczogKEBpdGVtcz1bXSkgLT5cbiAgICAgIEBtZXNzYWdlLmhpZGUoKVxuICAgICAgcmV0dXJuIHVubGVzcyBAaXRlbXM/XG5cbiAgICAgIEBsaXN0LmVtcHR5KClcbiAgICAgIGlmIEBpdGVtcy5sZW5ndGhcbiAgICAgICAgZm9yIGl0ZW0gaW4gaXRlbXNcbiAgICAgICAgICBpdGVtVmlldyA9ICQoQHZpZXdGb3JJdGVtKGl0ZW0pKVxuICAgICAgICAgIGl0ZW1WaWV3LmRhdGEoJ3NlbGVjdC1saXN0LWl0ZW0nLCBpdGVtKVxuICAgICAgICAgIEBsaXN0LmFwcGVuZChpdGVtVmlldylcbiAgICAgIGVsc2VcbiAgICAgICAgQHNldE1lc3NhZ2UoJ05vIG1hdGNoZXMgZm91bmQnKVxuXG4gICAgcmVsb2FkRm9sZGVyOiAoKSA9PlxuICAgICAgQG9wZW5EaXJlY3RvcnkoQHBhdGgpXG5cbiAgICBjcmVhdGVGb2xkZXI6ICgpID0+XG4gICAgICBpZiB0eXBlb2YgQGhvc3QuY3JlYXRlRm9sZGVyID09ICdmdW5jdGlvbidcbiAgICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgICAoY2FsbGJhY2spIC0+XG4gICAgICAgICAgICBuYW1lRGlhbG9nID0gbmV3IERpYWxvZyh7cHJvbXB0OiBcIkVudGVyIHRoZSBuYW1lIGZvciBuZXcgZm9sZGVyLlwifSlcbiAgICAgICAgICAgIG5hbWVEaWFsb2cudG9nZ2xlKGNhbGxiYWNrKVxuICAgICAgICAgIChmb2xkZXJuYW1lLCBjYWxsYmFjaykgPT5cbiAgICAgICAgICAgIEBob3N0LmNyZWF0ZUZvbGRlcihAcGF0aCArIFwiL1wiICsgZm9sZGVybmFtZSwgY2FsbGJhY2spXG4gICAgICAgIF0sIChlcnIsIHJlc3VsdCkgPT5cbiAgICAgICAgICBAb3BlbkRpcmVjdG9yeShAcGF0aClcbiAgICAgICAgKVxuICAgICAgZWxzZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQgeWV0IVwiKVxuXG4gICAgY3JlYXRlRmlsZTogKCkgPT5cbiAgICAgIGlmIHR5cGVvZiBAaG9zdC5jcmVhdGVGaWxlID09ICdmdW5jdGlvbidcbiAgICAgICAgYXN5bmMud2F0ZXJmYWxsKFtcbiAgICAgICAgICAoY2FsbGJhY2spIC0+XG4gICAgICAgICAgICBuYW1lRGlhbG9nID0gbmV3IERpYWxvZyh7cHJvbXB0OiBcIkVudGVyIHRoZSBuYW1lIGZvciBuZXcgZmlsZS5cIn0pXG4gICAgICAgICAgICBuYW1lRGlhbG9nLnRvZ2dsZShjYWxsYmFjaylcbiAgICAgICAgICAoZmlsZW5hbWUsIGNhbGxiYWNrKSA9PlxuICAgICAgICAgICAgQGhvc3QuY3JlYXRlRmlsZShAcGF0aCArIFwiL1wiICsgZmlsZW5hbWUsIGNhbGxiYWNrKVxuICAgICAgICBdLCAoZXJyLCByZXN1bHQpID0+XG4gICAgICAgICAgQG9wZW5EaXJlY3RvcnkoQHBhdGgpXG4gICAgICAgIClcbiAgICAgIGVsc2VcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkIHlldCFcIilcblxuICAgIHJlbmFtZUZvbGRlckZpbGU6ICgpID0+XG4gICAgICBpZiB0eXBlb2YgQGhvc3QucmVuYW1lRm9sZGVyRmlsZSA9PSAnZnVuY3Rpb24nXG4gICAgICAgIGlmIEBzZWxlY3RlZEl0ZW0gYW5kIEBzZWxlY3RlZEl0ZW0ubmFtZSBhbmQgQHNlbGVjdGVkSXRlbS5uYW1lICE9ICcuJ1xuICAgICAgICAgIGFzeW5jLndhdGVyZmFsbChbXG4gICAgICAgICAgICAoY2FsbGJhY2spID0+XG4gICAgICAgICAgICAgIG5hbWVEaWFsb2cgPSBuZXcgRGlhbG9nKHtwcm9tcHQ6IFwiXCJcIkVudGVyIHRoZSBuZXcgbmFtZSBmb3IgI3tpZiBAc2VsZWN0ZWRJdGVtLmlzRGlyIHRoZW4gJ2ZvbGRlcicgZWxzZSBpZiBAc2VsZWN0ZWRJdGVtLmlzRmlsZSB0aGVuICdmaWxlJyBlbHNlICdsaW5rJ30gXCIje0BzZWxlY3RlZEl0ZW0ubmFtZX1cIi5cIlwiXCJ9KVxuICAgICAgICAgICAgICBuYW1lRGlhbG9nLm1pbmlFZGl0b3Iuc2V0VGV4dChAc2VsZWN0ZWRJdGVtLm5hbWUpXG4gICAgICAgICAgICAgIG5hbWVEaWFsb2cudG9nZ2xlKGNhbGxiYWNrKVxuICAgICAgICAgICAgKG5ld25hbWUsIGNhbGxiYWNrKSA9PlxuICAgICAgICAgICAgICBAZGVzZWxlY3QoKVxuICAgICAgICAgICAgICBAaG9zdC5yZW5hbWVGb2xkZXJGaWxlKEBwYXRoLCBAc2VsZWN0ZWRJdGVtLm5hbWUsIG5ld25hbWUsIEBzZWxlY3RlZEl0ZW0uaXNEaXIsIGNhbGxiYWNrKVxuICAgICAgICAgIF0sIChlcnIsIHJlc3VsdCkgPT5cbiAgICAgICAgICAgIEBvcGVuRGlyZWN0b3J5KEBwYXRoKVxuICAgICAgICAgIClcbiAgICAgIGVsc2VcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTm90IGltcGxlbWVudGVkIHlldCFcIilcblxuICAgIGRlbGV0ZUZvbGRlckZpbGU6ICgpID0+XG4gICAgICBpZiB0eXBlb2YgQGhvc3QuZGVsZXRlRm9sZGVyRmlsZSA9PSAnZnVuY3Rpb24nXG4gICAgICAgIGlmIEBzZWxlY3RlZEl0ZW0gYW5kIEBzZWxlY3RlZEl0ZW0ubmFtZSBhbmQgQHNlbGVjdGVkSXRlbS5uYW1lICE9ICcuJ1xuICAgICAgICAgIGF0b20uY29uZmlybVxuICAgICAgICAgICAgbWVzc2FnZTogXCJBcmUgeW91IHN1cmUgeW91IHdhbnQgdG8gZGVsZXRlICN7aWYgQHNlbGVjdGVkSXRlbS5pc0RpciB0aGVuJ2ZvbGRlcicgZWxzZSBpZiBAc2VsZWN0ZWRJdGVtLmlzRmlsZSB0aGVuICdmaWxlJyBlbHNlICdsaW5rJ30/XCJcbiAgICAgICAgICAgIGRldGFpbGVkTWVzc2FnZTogXCJZb3UgYXJlIGRlbGV0aW5nOiAje0BzZWxlY3RlZEl0ZW0ubmFtZX1cIlxuICAgICAgICAgICAgYnV0dG9uczpcbiAgICAgICAgICAgICAgICdZZXMnOiA9PlxuICAgICAgICAgICAgICAgICBAaG9zdC5kZWxldGVGb2xkZXJGaWxlKEBwYXRoICsgXCIvXCIgKyBAc2VsZWN0ZWRJdGVtLm5hbWUsIEBzZWxlY3RlZEl0ZW0uaXNEaXIsICgpID0+XG4gICAgICAgICAgICAgICAgICAgQG9wZW5EaXJlY3RvcnkoQHBhdGgpXG4gICAgICAgICAgICAgICAgIClcbiAgICAgICAgICAgICAgICdObyc6ID0+XG4gICAgICAgICAgICAgICAgQGRlc2VsZWN0KClcblxuICAgICAgICAgIEBzZWxlY3RlZEl0ZW0gPSBmYWxzZVxuICAgICAgZWxzZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJOb3QgaW1wbGVtZW50ZWQgeWV0IVwiKVxuXG4gICAgZGVzZWxlY3Q6ICgpIC0+XG4gICAgICAgIEBsaXN0LmZpbmQoJ2xpLnNlbGVjdGVkJykucmVtb3ZlQ2xhc3MoJ3NlbGVjdGVkJyk7XG5cbiAgICBzZXRFcnJvcjogKG1lc3NhZ2U9JycpIC0+XG4gICAgICBAZW1pdHRlci5lbWl0ICdpbmZvJywge21lc3NhZ2U6IG1lc3NhZ2UsIHR5cGU6ICdlcnJvcid9XG5cbiAgICBzZXRNZXNzYWdlOiAobWVzc2FnZT0nJykgLT5cbiAgICAgIEBtZXNzYWdlLmVtcHR5KCkuc2hvdygpLmFwcGVuZChcIjx1bCBjbGFzcz0nYmFja2dyb3VuZC1tZXNzYWdlIGNlbnRlcmVkJz48bGk+I3ttZXNzYWdlfTwvbGk+PC91bD5cIilcbiJdfQ==
