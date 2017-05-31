(function() {
  var FilesView, FtpHost, Host, HostView, HostsView, InterProcessDataWatcher, LocalFile, OpenFilesView, Q, RemoteEditEditor, SftpHost, _, fs, url;

  _ = require('underscore-plus');

  RemoteEditEditor = require('./model/remote-edit-editor');

  OpenFilesView = null;

  HostView = null;

  HostsView = null;

  FilesView = null;

  Host = null;

  SftpHost = null;

  FtpHost = null;

  LocalFile = null;

  url = null;

  Q = null;

  InterProcessDataWatcher = null;

  fs = null;

  module.exports = {
    config: {
      showHiddenFiles: {
        title: 'Show hidden files',
        type: 'boolean',
        "default": false
      },
      uploadOnSave: {
        title: 'Upload on save',
        description: 'When enabled, remote files will be automatically uploaded when saved',
        type: 'boolean',
        "default": true
      },
      notifications: {
        title: 'Display notifications',
        type: 'boolean',
        "default": true
      },
      sshPrivateKeyPath: {
        title: 'Path to private SSH key',
        type: 'string',
        "default": '~/.ssh/id_rsa'
      },
      defaultSerializePath: {
        title: 'Default path to serialize remoteEdit data',
        type: 'string',
        "default": '~/.atom/remoteEdit.json'
      },
      agentToUse: {
        title: 'SSH agent',
        description: 'Overrides default SSH agent. See ssh2 docs for more info.',
        type: 'string',
        "default": 'Default'
      },
      foldersOnTop: {
        title: 'Show folders on top',
        type: 'boolean',
        "default": false
      },
      followLinks: {
        title: 'Follow symbolic links',
        description: 'If set to true, symbolic links are treated as directories',
        type: 'boolean',
        "default": true
      },
      clearFileList: {
        title: 'Clear file list',
        description: 'When enabled, the open files list will be cleared on initialization',
        type: 'boolean',
        "default": false
      },
      rememberLastOpenDirectory: {
        title: 'Remember last open directory',
        description: 'When enabled, browsing a host will return you to the last directory you entered',
        type: 'boolean',
        "default": false
      },
      storePasswordsUsingKeytar: {
        title: 'Store passwords using node-keytar',
        description: 'When enabled, passwords and passphrases will be stored in system\'s keychain',
        type: 'boolean',
        "default": false
      },
      filterHostsUsing: {
        type: 'object',
        properties: {
          hostname: {
            type: 'boolean',
            "default": true
          },
          alias: {
            type: 'boolean',
            "default": false
          },
          username: {
            type: 'boolean',
            "default": false
          },
          port: {
            type: 'boolean',
            "default": false
          }
        }
      }
    },
    activate: function(state) {
      this.setupOpeners();
      this.initializeIpdwIfNecessary();
      atom.commands.add('atom-workspace', 'remote-edit:show-open-files', (function(_this) {
        return function() {
          return _this.showOpenFiles();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:browse', (function(_this) {
        return function() {
          return _this.browse();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:new-host-sftp', (function(_this) {
        return function() {
          return _this.newHostSftp();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:new-host-ftp', (function(_this) {
        return function() {
          return _this.newHostFtp();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:toggle-files-view', (function(_this) {
        return function() {
          return _this.createFilesView().toggle();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:reload-folder', (function(_this) {
        return function() {
          return _this.createFilesView().reloadFolder();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:create-folder', (function(_this) {
        return function() {
          return _this.createFilesView().createFolder();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:create-file', (function(_this) {
        return function() {
          return _this.createFilesView().createFile();
        };
      })(this));
      atom.commands.add('atom-workspace', 'remote-edit:rename-folder-file', (function(_this) {
        return function() {
          return _this.createFilesView().renameFolderFile();
        };
      })(this));
      return atom.commands.add('atom-workspace', 'remote-edit:remove-folder-file', (function(_this) {
        return function() {
          return _this.createFilesView().deleteFolderFile();
        };
      })(this));
    },
    deactivate: function() {
      var ref;
      return (ref = this.ipdw) != null ? ref.destroy() : void 0;
    },
    newHostSftp: function() {
      var host, view;
      if (HostView == null) {
        HostView = require('./view/host-view');
      }
      if (SftpHost == null) {
        SftpHost = require('./model/sftp-host');
      }
      host = new SftpHost();
      view = new HostView(host, this.getOrCreateIpdw());
      return view.toggle();
    },
    newHostFtp: function() {
      var host, view;
      if (HostView == null) {
        HostView = require('./view/host-view');
      }
      if (FtpHost == null) {
        FtpHost = require('./model/ftp-host');
      }
      host = new FtpHost();
      view = new HostView(host, this.getOrCreateIpdw());
      return view.toggle();
    },
    browse: function() {
      var view;
      if (HostsView == null) {
        HostsView = require('./view/hosts-view');
      }
      view = new HostsView(this.getOrCreateIpdw());
      return view.toggle();
    },
    showOpenFiles: function() {
      var showOpenFilesView;
      if (OpenFilesView == null) {
        OpenFilesView = require('./view/open-files-view');
      }
      showOpenFilesView = new OpenFilesView(this.getOrCreateIpdw());
      return showOpenFilesView.toggle();
    },
    createFilesView: function() {
      if (this.filesView == null) {
        FilesView = require('./view/files-view');
        this.filesView = new FilesView(this.state);
      }
      return this.filesView;
    },
    initializeIpdwIfNecessary: function() {
      var editor, i, len, ref, results, stop;
      if (atom.config.get('remote-edit.notifications')) {
        stop = false;
        ref = atom.workspace.getTextEditors();
        results = [];
        for (i = 0, len = ref.length; i < len; i++) {
          editor = ref[i];
          if (!stop) {
            if (editor instanceof RemoteEditEditor) {
              this.getOrCreateIpdw();
              results.push(stop = true);
            } else {
              results.push(void 0);
            }
          }
        }
        return results;
      }
    },
    getOrCreateIpdw: function() {
      if (this.ipdw === void 0) {
        if (InterProcessDataWatcher == null) {
          InterProcessDataWatcher = require('./model/inter-process-data-watcher');
        }
        fs = require('fs-plus');
        return this.ipdw = new InterProcessDataWatcher(fs.absolute(atom.config.get('remote-edit.defaultSerializePath')));
      } else {
        return this.ipdw;
      }
    },
    setupOpeners: function() {
      return atom.workspace.addOpener(function(uriToOpen) {
        var error, host, localFile, protocol, query, ref;
        if (url == null) {
          url = require('url');
        }
        try {
          ref = url.parse(uriToOpen, true), protocol = ref.protocol, host = ref.host, query = ref.query;
        } catch (error1) {
          error = error1;
          return;
        }
        if (protocol !== 'remote-edit:') {
          return;
        }
        if (host === 'localfile') {
          if (Q == null) {
            Q = require('q');
          }
          if (Host == null) {
            Host = require('./model/host');
          }
          if (FtpHost == null) {
            FtpHost = require('./model/ftp-host');
          }
          if (SftpHost == null) {
            SftpHost = require('./model/sftp-host');
          }
          if (LocalFile == null) {
            LocalFile = require('./model/local-file');
          }
          localFile = LocalFile.deserialize(JSON.parse(decodeURIComponent(query.localFile)));
          host = Host.deserialize(JSON.parse(decodeURIComponent(query.host)));
          return atom.project.bufferForPath(localFile.path).then(function(buffer) {
            var editor, params, ws;
            params = {
              buffer: buffer,
              registerEditor: true,
              host: host,
              localFile: localFile
            };
            ws = atom.workspace;
            params = _.extend({
              config: ws.config,
              notificationManager: ws.notificationManager,
              packageManager: ws.packageManager,
              clipboard: ws.clipboard,
              viewRegistry: ws.viewRegistry,
              grammarRegistry: ws.grammarRegistry,
              project: ws.project,
              assert: ws.assert,
              applicationDelegate: ws.applicationDelegate
            }, params);
            return editor = new RemoteEditEditor(params);
          });
        }
      });
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi9tYWluLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFFSixnQkFBQSxHQUFtQixPQUFBLENBQVEsNEJBQVI7O0VBR25CLGFBQUEsR0FBZ0I7O0VBQ2hCLFFBQUEsR0FBVzs7RUFDWCxTQUFBLEdBQVk7O0VBQ1osU0FBQSxHQUFZOztFQUNaLElBQUEsR0FBTzs7RUFDUCxRQUFBLEdBQVc7O0VBQ1gsT0FBQSxHQUFVOztFQUNWLFNBQUEsR0FBWTs7RUFDWixHQUFBLEdBQU07O0VBQ04sQ0FBQSxHQUFJOztFQUNKLHVCQUFBLEdBQTBCOztFQUMxQixFQUFBLEdBQUs7O0VBRUwsTUFBTSxDQUFDLE9BQVAsR0FDRTtJQUFBLE1BQUEsRUFDRTtNQUFBLGVBQUEsRUFDRTtRQUFBLEtBQUEsRUFBTyxtQkFBUDtRQUNBLElBQUEsRUFBTSxTQUROO1FBRUEsQ0FBQSxPQUFBLENBQUEsRUFBUyxLQUZUO09BREY7TUFJQSxZQUFBLEVBQ0U7UUFBQSxLQUFBLEVBQU8sZ0JBQVA7UUFDQSxXQUFBLEVBQWEsc0VBRGI7UUFFQSxJQUFBLEVBQU0sU0FGTjtRQUdBLENBQUEsT0FBQSxDQUFBLEVBQVMsSUFIVDtPQUxGO01BU0EsYUFBQSxFQUNFO1FBQUEsS0FBQSxFQUFPLHVCQUFQO1FBQ0EsSUFBQSxFQUFNLFNBRE47UUFFQSxDQUFBLE9BQUEsQ0FBQSxFQUFTLElBRlQ7T0FWRjtNQWFBLGlCQUFBLEVBQ0U7UUFBQSxLQUFBLEVBQU8seUJBQVA7UUFDQSxJQUFBLEVBQU0sUUFETjtRQUVBLENBQUEsT0FBQSxDQUFBLEVBQVMsZUFGVDtPQWRGO01BaUJBLG9CQUFBLEVBQ0U7UUFBQSxLQUFBLEVBQU8sMkNBQVA7UUFDQSxJQUFBLEVBQU0sUUFETjtR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QUFBLEVBQXFCLEVBQUUsQ0FBQyxtQkFGckY7YUFBVCxFQUdOLE1BSE07bUJBSVQsTUFBQSxHQUFhLElBQUEsZ0JBQUEsQ0FBaUIsTUFBakI7VUFSaUMsQ0FBaEQsRUFURjs7TUFSdUIsQ0FBekI7SUFEWSxDQXBJZDs7QUFuQkYiLCJzb3VyY2VzQ29udGVudCI6WyJfID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuIyBJbXBvcnQgbmVlZGVkIHRvIHJlZ2lzdGVyIGRlc2VyaWFsaXplclxuUmVtb3RlRWRpdEVkaXRvciA9IHJlcXVpcmUgJy4vbW9kZWwvcmVtb3RlLWVkaXQtZWRpdG9yJ1xuXG4jIERlZmVycmVkIHJlcXVpcmVtZW50c1xuT3BlbkZpbGVzVmlldyA9IG51bGxcbkhvc3RWaWV3ID0gbnVsbFxuSG9zdHNWaWV3ID0gbnVsbFxuRmlsZXNWaWV3ID0gbnVsbFxuSG9zdCA9IG51bGxcblNmdHBIb3N0ID0gbnVsbFxuRnRwSG9zdCA9IG51bGxcbkxvY2FsRmlsZSA9IG51bGxcbnVybCA9IG51bGxcblEgPSBudWxsXG5JbnRlclByb2Nlc3NEYXRhV2F0Y2hlciA9IG51bGxcbmZzID0gbnVsbFxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIGNvbmZpZzpcbiAgICBzaG93SGlkZGVuRmlsZXM6XG4gICAgICB0aXRsZTogJ1Nob3cgaGlkZGVuIGZpbGVzJ1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiBmYWxzZVxuICAgIHVwbG9hZE9uU2F2ZTpcbiAgICAgIHRpdGxlOiAnVXBsb2FkIG9uIHNhdmUnXG4gICAgICBkZXNjcmlwdGlvbjogJ1doZW4gZW5hYmxlZCwgcmVtb3RlIGZpbGVzIHdpbGwgYmUgYXV0b21hdGljYWxseSB1cGxvYWRlZCB3aGVuIHNhdmVkJ1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgbm90aWZpY2F0aW9uczpcbiAgICAgIHRpdGxlOiAnRGlzcGxheSBub3RpZmljYXRpb25zJ1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgc3NoUHJpdmF0ZUtleVBhdGg6XG4gICAgICB0aXRsZTogJ1BhdGggdG8gcHJpdmF0ZSBTU0gga2V5J1xuICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgIGRlZmF1bHQ6ICd+Ly5zc2gvaWRfcnNhJ1xuICAgIGRlZmF1bHRTZXJpYWxpemVQYXRoOlxuICAgICAgdGl0bGU6ICdEZWZhdWx0IHBhdGggdG8gc2VyaWFsaXplIHJlbW90ZUVkaXQgZGF0YSdcbiAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICBkZWZhdWx0OiAnfi8uYXRvbS9yZW1vdGVFZGl0Lmpzb24nXG4gICAgYWdlbnRUb1VzZTpcbiAgICAgIHRpdGxlOiAnU1NIIGFnZW50J1xuICAgICAgZGVzY3JpcHRpb246ICdPdmVycmlkZXMgZGVmYXVsdCBTU0ggYWdlbnQuIFNlZSBzc2gyIGRvY3MgZm9yIG1vcmUgaW5mby4nXG4gICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgZGVmYXVsdDogJ0RlZmF1bHQnXG4gICAgZm9sZGVyc09uVG9wOlxuICAgICAgdGl0bGU6ICdTaG93IGZvbGRlcnMgb24gdG9wJ1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiBmYWxzZVxuICAgIGZvbGxvd0xpbmtzOlxuICAgICAgdGl0bGU6ICdGb2xsb3cgc3ltYm9saWMgbGlua3MnXG4gICAgICBkZXNjcmlwdGlvbjogJ0lmIHNldCB0byB0cnVlLCBzeW1ib2xpYyBsaW5rcyBhcmUgdHJlYXRlZCBhcyBkaXJlY3RvcmllcydcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgZGVmYXVsdDogdHJ1ZVxuICAgIGNsZWFyRmlsZUxpc3Q6XG4gICAgICB0aXRsZTogJ0NsZWFyIGZpbGUgbGlzdCdcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2hlbiBlbmFibGVkLCB0aGUgb3BlbiBmaWxlcyBsaXN0IHdpbGwgYmUgY2xlYXJlZCBvbiBpbml0aWFsaXphdGlvbidcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICByZW1lbWJlckxhc3RPcGVuRGlyZWN0b3J5OlxuICAgICAgdGl0bGU6ICdSZW1lbWJlciBsYXN0IG9wZW4gZGlyZWN0b3J5J1xuICAgICAgZGVzY3JpcHRpb246ICdXaGVuIGVuYWJsZWQsIGJyb3dzaW5nIGEgaG9zdCB3aWxsIHJldHVybiB5b3UgdG8gdGhlIGxhc3QgZGlyZWN0b3J5IHlvdSBlbnRlcmVkJ1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiBmYWxzZVxuICAgIHN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXI6XG4gICAgICB0aXRsZTogJ1N0b3JlIHBhc3N3b3JkcyB1c2luZyBub2RlLWtleXRhcidcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2hlbiBlbmFibGVkLCBwYXNzd29yZHMgYW5kIHBhc3NwaHJhc2VzIHdpbGwgYmUgc3RvcmVkIGluIHN5c3RlbVxcJ3Mga2V5Y2hhaW4nXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgZmlsdGVySG9zdHNVc2luZzpcbiAgICAgIHR5cGU6ICdvYmplY3QnXG4gICAgICBwcm9wZXJ0aWVzOlxuICAgICAgICBob3N0bmFtZTpcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICAgIGFsaWFzOlxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIHVzZXJuYW1lOlxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgICAgIHBvcnQ6XG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcblxuXG4gIGFjdGl2YXRlOiAoc3RhdGUpIC0+XG4gICAgQHNldHVwT3BlbmVycygpXG4gICAgQGluaXRpYWxpemVJcGR3SWZOZWNlc3NhcnkoKVxuXG4gICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20td29ya3NwYWNlJywgJ3JlbW90ZS1lZGl0OnNob3ctb3Blbi1maWxlcycsID0+IEBzaG93T3BlbkZpbGVzKCkpXG4gICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20td29ya3NwYWNlJywgJ3JlbW90ZS1lZGl0OmJyb3dzZScsID0+IEBicm93c2UoKSlcbiAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS13b3Jrc3BhY2UnLCAncmVtb3RlLWVkaXQ6bmV3LWhvc3Qtc2Z0cCcsID0+IEBuZXdIb3N0U2Z0cCgpKVxuICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXdvcmtzcGFjZScsICdyZW1vdGUtZWRpdDpuZXctaG9zdC1mdHAnLCA9PiBAbmV3SG9zdEZ0cCgpKVxuICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXdvcmtzcGFjZScsICdyZW1vdGUtZWRpdDp0b2dnbGUtZmlsZXMtdmlldycsID0+IEBjcmVhdGVGaWxlc1ZpZXcoKS50b2dnbGUoKSlcbiAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS13b3Jrc3BhY2UnLCAncmVtb3RlLWVkaXQ6cmVsb2FkLWZvbGRlcicsID0+IEBjcmVhdGVGaWxlc1ZpZXcoKS5yZWxvYWRGb2xkZXIoKSlcbiAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS13b3Jrc3BhY2UnLCAncmVtb3RlLWVkaXQ6Y3JlYXRlLWZvbGRlcicsID0+IEBjcmVhdGVGaWxlc1ZpZXcoKS5jcmVhdGVGb2xkZXIoKSlcbiAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS13b3Jrc3BhY2UnLCAncmVtb3RlLWVkaXQ6Y3JlYXRlLWZpbGUnLCA9PiBAY3JlYXRlRmlsZXNWaWV3KCkuY3JlYXRlRmlsZSgpKVxuICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXdvcmtzcGFjZScsICdyZW1vdGUtZWRpdDpyZW5hbWUtZm9sZGVyLWZpbGUnLCA9PiBAY3JlYXRlRmlsZXNWaWV3KCkucmVuYW1lRm9sZGVyRmlsZSgpKVxuICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXdvcmtzcGFjZScsICdyZW1vdGUtZWRpdDpyZW1vdmUtZm9sZGVyLWZpbGUnLCA9PiBAY3JlYXRlRmlsZXNWaWV3KCkuZGVsZXRlRm9sZGVyRmlsZSgpKVxuXG4gIGRlYWN0aXZhdGU6IC0+XG4gICAgQGlwZHc/LmRlc3Ryb3koKVxuXG4gIG5ld0hvc3RTZnRwOiAtPlxuICAgIEhvc3RWaWV3ID89IHJlcXVpcmUgJy4vdmlldy9ob3N0LXZpZXcnXG4gICAgU2Z0cEhvc3QgPz0gcmVxdWlyZSAnLi9tb2RlbC9zZnRwLWhvc3QnXG4gICAgaG9zdCA9IG5ldyBTZnRwSG9zdCgpXG4gICAgdmlldyA9IG5ldyBIb3N0Vmlldyhob3N0LCBAZ2V0T3JDcmVhdGVJcGR3KCkpXG4gICAgdmlldy50b2dnbGUoKVxuXG4gIG5ld0hvc3RGdHA6IC0+XG4gICAgSG9zdFZpZXcgPz0gcmVxdWlyZSAnLi92aWV3L2hvc3QtdmlldydcbiAgICBGdHBIb3N0ID89IHJlcXVpcmUgJy4vbW9kZWwvZnRwLWhvc3QnXG4gICAgaG9zdCA9IG5ldyBGdHBIb3N0KClcbiAgICB2aWV3ID0gbmV3IEhvc3RWaWV3KGhvc3QsIEBnZXRPckNyZWF0ZUlwZHcoKSlcbiAgICB2aWV3LnRvZ2dsZSgpXG5cbiAgYnJvd3NlOiAtPlxuICAgIEhvc3RzVmlldyA/PSByZXF1aXJlICcuL3ZpZXcvaG9zdHMtdmlldydcbiAgICB2aWV3ID0gbmV3IEhvc3RzVmlldyhAZ2V0T3JDcmVhdGVJcGR3KCkpXG4gICAgdmlldy50b2dnbGUoKVxuXG4gIHNob3dPcGVuRmlsZXM6IC0+XG4gICAgT3BlbkZpbGVzVmlldyA/PSByZXF1aXJlICcuL3ZpZXcvb3Blbi1maWxlcy12aWV3J1xuICAgIHNob3dPcGVuRmlsZXNWaWV3ID0gbmV3IE9wZW5GaWxlc1ZpZXcoQGdldE9yQ3JlYXRlSXBkdygpKVxuICAgIHNob3dPcGVuRmlsZXNWaWV3LnRvZ2dsZSgpXG5cbiAgY3JlYXRlRmlsZXNWaWV3OiAtPlxuICAgIHVubGVzcyBAZmlsZXNWaWV3P1xuICAgICAgRmlsZXNWaWV3ID0gcmVxdWlyZSAnLi92aWV3L2ZpbGVzLXZpZXcnXG4gICAgICBAZmlsZXNWaWV3ID0gbmV3IEZpbGVzVmlldyhAc3RhdGUpXG4gICAgQGZpbGVzVmlld1xuXG4gIGluaXRpYWxpemVJcGR3SWZOZWNlc3Nhcnk6IC0+XG4gICAgaWYgYXRvbS5jb25maWcuZ2V0ICdyZW1vdGUtZWRpdC5ub3RpZmljYXRpb25zJ1xuICAgICAgc3RvcCA9IGZhbHNlXG4gICAgICBmb3IgZWRpdG9yIGluIGF0b20ud29ya3NwYWNlLmdldFRleHRFZGl0b3JzKCkgd2hlbiAhc3RvcFxuICAgICAgICBpZiBlZGl0b3IgaW5zdGFuY2VvZiBSZW1vdGVFZGl0RWRpdG9yXG4gICAgICAgICAgQGdldE9yQ3JlYXRlSXBkdygpXG4gICAgICAgICAgc3RvcCA9IHRydWVcblxuICBnZXRPckNyZWF0ZUlwZHc6IC0+XG4gICAgaWYgQGlwZHcgaXMgdW5kZWZpbmVkXG4gICAgICBJbnRlclByb2Nlc3NEYXRhV2F0Y2hlciA/PSByZXF1aXJlICcuL21vZGVsL2ludGVyLXByb2Nlc3MtZGF0YS13YXRjaGVyJ1xuICAgICAgZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuICAgICAgQGlwZHcgPSBuZXcgSW50ZXJQcm9jZXNzRGF0YVdhdGNoZXIoZnMuYWJzb2x1dGUoYXRvbS5jb25maWcuZ2V0KCdyZW1vdGUtZWRpdC5kZWZhdWx0U2VyaWFsaXplUGF0aCcpKSlcbiAgICBlbHNlXG4gICAgICBAaXBkd1xuXG4gIHNldHVwT3BlbmVyczogLT5cbiAgICBhdG9tLndvcmtzcGFjZS5hZGRPcGVuZXIgKHVyaVRvT3BlbikgLT5cbiAgICAgIHVybCA/PSByZXF1aXJlICd1cmwnXG4gICAgICB0cnlcbiAgICAgICAge3Byb3RvY29sLCBob3N0LCBxdWVyeX0gPSB1cmwucGFyc2UodXJpVG9PcGVuLCB0cnVlKVxuICAgICAgY2F0Y2ggZXJyb3JcbiAgICAgICAgcmV0dXJuXG4gICAgICByZXR1cm4gdW5sZXNzIHByb3RvY29sIGlzICdyZW1vdGUtZWRpdDonXG5cbiAgICAgIGlmIGhvc3QgaXMgJ2xvY2FsZmlsZSdcbiAgICAgICAgUSA/PSByZXF1aXJlICdxJ1xuICAgICAgICBIb3N0ID89IHJlcXVpcmUgJy4vbW9kZWwvaG9zdCdcbiAgICAgICAgRnRwSG9zdCA/PSByZXF1aXJlICcuL21vZGVsL2Z0cC1ob3N0J1xuICAgICAgICBTZnRwSG9zdCA/PSByZXF1aXJlICcuL21vZGVsL3NmdHAtaG9zdCdcbiAgICAgICAgTG9jYWxGaWxlID89IHJlcXVpcmUgJy4vbW9kZWwvbG9jYWwtZmlsZSdcbiAgICAgICAgbG9jYWxGaWxlID0gTG9jYWxGaWxlLmRlc2VyaWFsaXplKEpTT04ucGFyc2UoZGVjb2RlVVJJQ29tcG9uZW50KHF1ZXJ5LmxvY2FsRmlsZSkpKVxuICAgICAgICBob3N0ID0gSG9zdC5kZXNlcmlhbGl6ZShKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudChxdWVyeS5ob3N0KSkpXG5cbiAgICAgICAgYXRvbS5wcm9qZWN0LmJ1ZmZlckZvclBhdGgobG9jYWxGaWxlLnBhdGgpLnRoZW4gKGJ1ZmZlcikgLT5cbiAgICAgICAgICBwYXJhbXMgPSB7YnVmZmVyOiBidWZmZXIsIHJlZ2lzdGVyRWRpdG9yOiB0cnVlLCBob3N0OiBob3N0LCBsb2NhbEZpbGU6IGxvY2FsRmlsZX1cbiAgICAgICAgICAjIGNvcGllZCBmcm9tIHdvcmtzcGFjZS5idWlsZFRleHRFZGl0b3JcbiAgICAgICAgICB3cyA9IGF0b20ud29ya3NwYWNlXG4gICAgICAgICAgcGFyYW1zID0gXy5leHRlbmQoe1xuICAgICAgICAgICAgY29uZmlnOiB3cy5jb25maWcsIG5vdGlmaWNhdGlvbk1hbmFnZXI6IHdzLm5vdGlmaWNhdGlvbk1hbmFnZXIsIHBhY2thZ2VNYW5hZ2VyOiB3cy5wYWNrYWdlTWFuYWdlciwgY2xpcGJvYXJkOiB3cy5jbGlwYm9hcmQsIHZpZXdSZWdpc3RyeTogd3Mudmlld1JlZ2lzdHJ5LFxuICAgICAgICAgICAgZ3JhbW1hclJlZ2lzdHJ5OiB3cy5ncmFtbWFyUmVnaXN0cnksIHByb2plY3Q6IHdzLnByb2plY3QsIGFzc2VydDogd3MuYXNzZXJ0LCBhcHBsaWNhdGlvbkRlbGVnYXRlOiB3cy5hcHBsaWNhdGlvbkRlbGVnYXRlXG4gICAgICAgICAgfSwgcGFyYW1zKVxuICAgICAgICAgIGVkaXRvciA9IG5ldyBSZW1vdGVFZGl0RWRpdG9yKHBhcmFtcylcbiJdfQ==
