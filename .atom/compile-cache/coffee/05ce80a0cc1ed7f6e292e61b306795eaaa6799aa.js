(function() {
  var FtpHost, Host, HostView, HostsView, InterProcessDataWatcher, LocalFile, OpenFilesView, Q, RemoteEditEditor, SftpHost, _, fs, url;

  _ = require('underscore-plus');

  RemoteEditEditor = require('./model/remote-edit-editor');

  OpenFilesView = null;

  HostView = null;

  HostsView = null;

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
      return atom.commands.add('atom-workspace', 'remote-edit:new-host-ftp', (function(_this) {
        return function() {
          return _this.newHostFtp();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQvbGliL21haW4uY29mZmVlIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQUEsTUFBQTs7RUFBQSxDQUFBLEdBQUksT0FBQSxDQUFRLGlCQUFSOztFQUVKLGdCQUFBLEdBQW1CLE9BQUEsQ0FBUSw0QkFBUjs7RUFHbkIsYUFBQSxHQUFnQjs7RUFDaEIsUUFBQSxHQUFXOztFQUNYLFNBQUEsR0FBWTs7RUFDWixJQUFBLEdBQU87O0VBQ1AsUUFBQSxHQUFXOztFQUNYLE9BQUEsR0FBVTs7RUFDVixTQUFBLEdBQVk7O0VBQ1osR0FBQSxHQUFNOztFQUNOLENBQUEsR0FBSTs7RUFDSix1QkFBQSxHQUEwQjs7RUFDMUIsRUFBQSxHQUFLOztFQUVMLE1BQU0sQ0FBQyxPQUFQLEdBQ0U7SUFBQSxNQUFBLEVBQ0U7TUFBQSxlQUFBLEVBQ0U7UUFBQSxLQUFBLEVBQU8sbUJBQVA7UUFDQSxJQUFBLEVBQU0sU0FETjtRQUVBLENBQUEsT0FBQSxDQUFBLEVBQVMsS0FGVDtPQURGO01BSUEsWUFBQSxFQUNFO1FBQUEsS0FBQSxFQUFPLGdCQUFQO1FBQ0EsV0FBQSxFQUFhLHNFQURiO1FBRUEsSUFBQSxFQUFNLFNBRk47UUFHQSxDQUFBLE9BQUEsQ0FBQSxFQUFTLElBSFQ7T0FMRjtNQVNBLGFBQUEsRUFDRTtRQUFBLEtBQUEsRUFBTyx1QkFBUDtRQUNBLElBQUEsRUFBTSxTQUROO1FBRUEsQ0FBQSxPQUFBLENBQUEsRUFBUyxJQUZUO09BVkY7TUFhQSxpQkFBQSxFQUNFO1FBQUEsS0FBQSxFQUFPLHlCQUFQO1FBQ0EsSUFBQSxFQUFNLFFBRE47UUFFQSxDQUFBLE9BQUEsQ0FBQSxFQUFTLGVBRlQ7T0FkRjtNQWlCQSxvQkFBQSxFQUNFO1FBQUEsS0FBQSxFQUFPLDJDQUFQO1FBQ0EsSUFBQSxFQUFNLFFBRE47UUFFQSxDQUFBLE9BQUEsQ0FB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QUFMLENBQWlCLElBQUksQ0FBQyxLQUFMLENBQVcsa0JBQUEsQ0FBbUIsS0FBSyxDQUFDLElBQXpCLENBQVgsQ0FBakI7aUJBRVAsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFiLENBQTJCLFNBQVMsQ0FBQyxJQUFyQyxDQUEwQyxDQUFDLElBQTNDLENBQWdELFNBQUMsTUFBRDtBQUM5QyxnQkFBQTtZQUFBLE1BQUEsR0FBUztjQUFDLE1BQUEsRUFBUSxNQUFUO2NBQWlCLGNBQUEsRUFBZ0IsSUFBakM7Y0FBdUMsSUFBQSxFQUFNLElBQTdDO2NBQW1ELFNBQUEsRUFBVyxTQUE5RDs7WUFFVCxFQUFBLEdBQUssSUFBSSxDQUFDO1lBQ1YsTUFBQSxHQUFTLENBQUMsQ0FBQyxNQUFGLENBQVM7Y0FDaEIsTUFBQSxFQUFRLEVBQUUsQ0FBQyxNQURLO2NBQ0csbUJBQUEsRUFBcUIsRUFBRSxDQUFDLG1CQUQzQjtjQUNnRCxjQUFBLEVBQWdCLEVBQUUsQ0FBQyxjQURuRTtjQUNtRixTQUFBLEVBQVcsRUFBRSxDQUFDLFNBRGpHO2NBQzRHLFlBQUEsRUFBYyxFQUFFLENBQUMsWUFEN0g7Y0FFaEIsZUFBQSxFQUFpQixFQUFFLENBQUMsZUFGSjtjQUVxQixPQUFBLEVBQVMsRUFBRSxDQUFDLE9BRmpDO2NBRTBDLE1BQUEsRUFBUSxFQUFFLENBQUMsTUFGckQ7Y0FFNkQsbUJBQUEsRUFBcUIsRUFBRSxDQUFDLG1CQUZyRjthQUFULEVBR04sTUFITTttQkFJVCxNQUFBLEdBQWEsSUFBQSxnQkFBQSxDQUFpQixNQUFqQjtVQVJpQyxDQUFoRCxFQVRGOztNQVJ1QixDQUF6QjtJQURZLENBeEhkOztBQWxCRiIsInNvdXJjZXNDb250ZW50IjpbIl8gPSByZXF1aXJlICd1bmRlcnNjb3JlLXBsdXMnXG4jIEltcG9ydCBuZWVkZWQgdG8gcmVnaXN0ZXIgZGVzZXJpYWxpemVyXG5SZW1vdGVFZGl0RWRpdG9yID0gcmVxdWlyZSAnLi9tb2RlbC9yZW1vdGUtZWRpdC1lZGl0b3InXG5cbiMgRGVmZXJyZWQgcmVxdWlyZW1lbnRzXG5PcGVuRmlsZXNWaWV3ID0gbnVsbFxuSG9zdFZpZXcgPSBudWxsXG5Ib3N0c1ZpZXcgPSBudWxsXG5Ib3N0ID0gbnVsbFxuU2Z0cEhvc3QgPSBudWxsXG5GdHBIb3N0ID0gbnVsbFxuTG9jYWxGaWxlID0gbnVsbFxudXJsID0gbnVsbFxuUSA9IG51bGxcbkludGVyUHJvY2Vzc0RhdGFXYXRjaGVyID0gbnVsbFxuZnMgPSBudWxsXG5cbm1vZHVsZS5leHBvcnRzID1cbiAgY29uZmlnOlxuICAgIHNob3dIaWRkZW5GaWxlczpcbiAgICAgIHRpdGxlOiAnU2hvdyBoaWRkZW4gZmlsZXMnXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgdXBsb2FkT25TYXZlOlxuICAgICAgdGl0bGU6ICdVcGxvYWQgb24gc2F2ZSdcbiAgICAgIGRlc2NyaXB0aW9uOiAnV2hlbiBlbmFibGVkLCByZW1vdGUgZmlsZXMgd2lsbCBiZSBhdXRvbWF0aWNhbGx5IHVwbG9hZGVkIHdoZW4gc2F2ZWQnXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICBub3RpZmljYXRpb25zOlxuICAgICAgdGl0bGU6ICdEaXNwbGF5IG5vdGlmaWNhdGlvbnMnXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICBzc2hQcml2YXRlS2V5UGF0aDpcbiAgICAgIHRpdGxlOiAnUGF0aCB0byBwcml2YXRlIFNTSCBrZXknXG4gICAgICB0eXBlOiAnc3RyaW5nJ1xuICAgICAgZGVmYXVsdDogJ34vLnNzaC9pZF9yc2EnXG4gICAgZGVmYXVsdFNlcmlhbGl6ZVBhdGg6XG4gICAgICB0aXRsZTogJ0RlZmF1bHQgcGF0aCB0byBzZXJpYWxpemUgcmVtb3RlRWRpdCBkYXRhJ1xuICAgICAgdHlwZTogJ3N0cmluZydcbiAgICAgIGRlZmF1bHQ6ICd+Ly5hdG9tL3JlbW90ZUVkaXQuanNvbidcbiAgICBhZ2VudFRvVXNlOlxuICAgICAgdGl0bGU6ICdTU0ggYWdlbnQnXG4gICAgICBkZXNjcmlwdGlvbjogJ092ZXJyaWRlcyBkZWZhdWx0IFNTSCBhZ2VudC4gU2VlIHNzaDIgZG9jcyBmb3IgbW9yZSBpbmZvLidcbiAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICBkZWZhdWx0OiAnRGVmYXVsdCdcbiAgICBmb2xkZXJzT25Ub3A6XG4gICAgICB0aXRsZTogJ1Nob3cgZm9sZGVycyBvbiB0b3AnXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgZm9sbG93TGlua3M6XG4gICAgICB0aXRsZTogJ0ZvbGxvdyBzeW1ib2xpYyBsaW5rcydcbiAgICAgIGRlc2NyaXB0aW9uOiAnSWYgc2V0IHRvIHRydWUsIHN5bWJvbGljIGxpbmtzIGFyZSB0cmVhdGVkIGFzIGRpcmVjdG9yaWVzJ1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgY2xlYXJGaWxlTGlzdDpcbiAgICAgIHRpdGxlOiAnQ2xlYXIgZmlsZSBsaXN0J1xuICAgICAgZGVzY3JpcHRpb246ICdXaGVuIGVuYWJsZWQsIHRoZSBvcGVuIGZpbGVzIGxpc3Qgd2lsbCBiZSBjbGVhcmVkIG9uIGluaXRpYWxpemF0aW9uJ1xuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiBmYWxzZVxuICAgIHJlbWVtYmVyTGFzdE9wZW5EaXJlY3Rvcnk6XG4gICAgICB0aXRsZTogJ1JlbWVtYmVyIGxhc3Qgb3BlbiBkaXJlY3RvcnknXG4gICAgICBkZXNjcmlwdGlvbjogJ1doZW4gZW5hYmxlZCwgYnJvd3NpbmcgYSBob3N0IHdpbGwgcmV0dXJuIHlvdSB0byB0aGUgbGFzdCBkaXJlY3RvcnkgeW91IGVudGVyZWQnXG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgIGRlZmF1bHQ6IGZhbHNlXG4gICAgc3RvcmVQYXNzd29yZHNVc2luZ0tleXRhcjpcbiAgICAgIHRpdGxlOiAnU3RvcmUgcGFzc3dvcmRzIHVzaW5nIG5vZGUta2V5dGFyJ1xuICAgICAgZGVzY3JpcHRpb246ICdXaGVuIGVuYWJsZWQsIHBhc3N3b3JkcyBhbmQgcGFzc3BocmFzZXMgd2lsbCBiZSBzdG9yZWQgaW4gc3lzdGVtXFwncyBrZXljaGFpbidcbiAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICBmaWx0ZXJIb3N0c1VzaW5nOlxuICAgICAgdHlwZTogJ29iamVjdCdcbiAgICAgIHByb3BlcnRpZXM6XG4gICAgICAgIGhvc3RuYW1lOlxuICAgICAgICAgIHR5cGU6ICdib29sZWFuJ1xuICAgICAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgICAgYWxpYXM6XG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgdXNlcm5hbWU6XG4gICAgICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICAgICAgZGVmYXVsdDogZmFsc2VcbiAgICAgICAgcG9ydDpcbiAgICAgICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgICAgICBkZWZhdWx0OiBmYWxzZVxuXG5cbiAgYWN0aXZhdGU6IChzdGF0ZSkgLT5cbiAgICBAc2V0dXBPcGVuZXJzKClcbiAgICBAaW5pdGlhbGl6ZUlwZHdJZk5lY2Vzc2FyeSgpXG5cbiAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS13b3Jrc3BhY2UnLCAncmVtb3RlLWVkaXQ6c2hvdy1vcGVuLWZpbGVzJywgPT4gQHNob3dPcGVuRmlsZXMoKSlcbiAgICBhdG9tLmNvbW1hbmRzLmFkZCgnYXRvbS13b3Jrc3BhY2UnLCAncmVtb3RlLWVkaXQ6YnJvd3NlJywgPT4gQGJyb3dzZSgpKVxuICAgIGF0b20uY29tbWFuZHMuYWRkKCdhdG9tLXdvcmtzcGFjZScsICdyZW1vdGUtZWRpdDpuZXctaG9zdC1zZnRwJywgPT4gQG5ld0hvc3RTZnRwKCkpXG4gICAgYXRvbS5jb21tYW5kcy5hZGQoJ2F0b20td29ya3NwYWNlJywgJ3JlbW90ZS1lZGl0Om5ldy1ob3N0LWZ0cCcsID0+IEBuZXdIb3N0RnRwKCkpXG5cbiAgZGVhY3RpdmF0ZTogLT5cbiAgICBAaXBkdz8uZGVzdHJveSgpXG5cbiAgbmV3SG9zdFNmdHA6IC0+XG4gICAgSG9zdFZpZXcgPz0gcmVxdWlyZSAnLi92aWV3L2hvc3QtdmlldydcbiAgICBTZnRwSG9zdCA/PSByZXF1aXJlICcuL21vZGVsL3NmdHAtaG9zdCdcbiAgICBob3N0ID0gbmV3IFNmdHBIb3N0KClcbiAgICB2aWV3ID0gbmV3IEhvc3RWaWV3KGhvc3QsIEBnZXRPckNyZWF0ZUlwZHcoKSlcbiAgICB2aWV3LnRvZ2dsZSgpXG5cbiAgbmV3SG9zdEZ0cDogLT5cbiAgICBIb3N0VmlldyA/PSByZXF1aXJlICcuL3ZpZXcvaG9zdC12aWV3J1xuICAgIEZ0cEhvc3QgPz0gcmVxdWlyZSAnLi9tb2RlbC9mdHAtaG9zdCdcbiAgICBob3N0ID0gbmV3IEZ0cEhvc3QoKVxuICAgIHZpZXcgPSBuZXcgSG9zdFZpZXcoaG9zdCwgQGdldE9yQ3JlYXRlSXBkdygpKVxuICAgIHZpZXcudG9nZ2xlKClcblxuICBicm93c2U6IC0+XG4gICAgSG9zdHNWaWV3ID89IHJlcXVpcmUgJy4vdmlldy9ob3N0cy12aWV3J1xuICAgIHZpZXcgPSBuZXcgSG9zdHNWaWV3KEBnZXRPckNyZWF0ZUlwZHcoKSlcbiAgICB2aWV3LnRvZ2dsZSgpXG5cbiAgc2hvd09wZW5GaWxlczogLT5cbiAgICBPcGVuRmlsZXNWaWV3ID89IHJlcXVpcmUgJy4vdmlldy9vcGVuLWZpbGVzLXZpZXcnXG4gICAgc2hvd09wZW5GaWxlc1ZpZXcgPSBuZXcgT3BlbkZpbGVzVmlldyhAZ2V0T3JDcmVhdGVJcGR3KCkpXG4gICAgc2hvd09wZW5GaWxlc1ZpZXcudG9nZ2xlKClcblxuICBpbml0aWFsaXplSXBkd0lmTmVjZXNzYXJ5OiAtPlxuICAgIGlmIGF0b20uY29uZmlnLmdldCAncmVtb3RlLWVkaXQubm90aWZpY2F0aW9ucydcbiAgICAgIHN0b3AgPSBmYWxzZVxuICAgICAgZm9yIGVkaXRvciBpbiBhdG9tLndvcmtzcGFjZS5nZXRUZXh0RWRpdG9ycygpIHdoZW4gIXN0b3BcbiAgICAgICAgaWYgZWRpdG9yIGluc3RhbmNlb2YgUmVtb3RlRWRpdEVkaXRvclxuICAgICAgICAgIEBnZXRPckNyZWF0ZUlwZHcoKVxuICAgICAgICAgIHN0b3AgPSB0cnVlXG5cbiAgZ2V0T3JDcmVhdGVJcGR3OiAtPlxuICAgIGlmIEBpcGR3IGlzIHVuZGVmaW5lZFxuICAgICAgSW50ZXJQcm9jZXNzRGF0YVdhdGNoZXIgPz0gcmVxdWlyZSAnLi9tb2RlbC9pbnRlci1wcm9jZXNzLWRhdGEtd2F0Y2hlcidcbiAgICAgIGZzID0gcmVxdWlyZSAnZnMtcGx1cydcbiAgICAgIEBpcGR3ID0gbmV3IEludGVyUHJvY2Vzc0RhdGFXYXRjaGVyKGZzLmFic29sdXRlKGF0b20uY29uZmlnLmdldCgncmVtb3RlLWVkaXQuZGVmYXVsdFNlcmlhbGl6ZVBhdGgnKSkpXG4gICAgZWxzZVxuICAgICAgQGlwZHdcblxuICBzZXR1cE9wZW5lcnM6IC0+XG4gICAgYXRvbS53b3Jrc3BhY2UuYWRkT3BlbmVyICh1cmlUb09wZW4pIC0+XG4gICAgICB1cmwgPz0gcmVxdWlyZSAndXJsJ1xuICAgICAgdHJ5XG4gICAgICAgIHtwcm90b2NvbCwgaG9zdCwgcXVlcnl9ID0gdXJsLnBhcnNlKHVyaVRvT3BlbiwgdHJ1ZSlcbiAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgIHJldHVyblxuICAgICAgcmV0dXJuIHVubGVzcyBwcm90b2NvbCBpcyAncmVtb3RlLWVkaXQ6J1xuXG4gICAgICBpZiBob3N0IGlzICdsb2NhbGZpbGUnXG4gICAgICAgIFEgPz0gcmVxdWlyZSAncSdcbiAgICAgICAgSG9zdCA/PSByZXF1aXJlICcuL21vZGVsL2hvc3QnXG4gICAgICAgIEZ0cEhvc3QgPz0gcmVxdWlyZSAnLi9tb2RlbC9mdHAtaG9zdCdcbiAgICAgICAgU2Z0cEhvc3QgPz0gcmVxdWlyZSAnLi9tb2RlbC9zZnRwLWhvc3QnXG4gICAgICAgIExvY2FsRmlsZSA/PSByZXF1aXJlICcuL21vZGVsL2xvY2FsLWZpbGUnXG4gICAgICAgIGxvY2FsRmlsZSA9IExvY2FsRmlsZS5kZXNlcmlhbGl6ZShKU09OLnBhcnNlKGRlY29kZVVSSUNvbXBvbmVudChxdWVyeS5sb2NhbEZpbGUpKSlcbiAgICAgICAgaG9zdCA9IEhvc3QuZGVzZXJpYWxpemUoSlNPTi5wYXJzZShkZWNvZGVVUklDb21wb25lbnQocXVlcnkuaG9zdCkpKVxuXG4gICAgICAgIGF0b20ucHJvamVjdC5idWZmZXJGb3JQYXRoKGxvY2FsRmlsZS5wYXRoKS50aGVuIChidWZmZXIpIC0+XG4gICAgICAgICAgcGFyYW1zID0ge2J1ZmZlcjogYnVmZmVyLCByZWdpc3RlckVkaXRvcjogdHJ1ZSwgaG9zdDogaG9zdCwgbG9jYWxGaWxlOiBsb2NhbEZpbGV9XG4gICAgICAgICAgIyBjb3BpZWQgZnJvbSB3b3Jrc3BhY2UuYnVpbGRUZXh0RWRpdG9yXG4gICAgICAgICAgd3MgPSBhdG9tLndvcmtzcGFjZVxuICAgICAgICAgIHBhcmFtcyA9IF8uZXh0ZW5kKHtcbiAgICAgICAgICAgIGNvbmZpZzogd3MuY29uZmlnLCBub3RpZmljYXRpb25NYW5hZ2VyOiB3cy5ub3RpZmljYXRpb25NYW5hZ2VyLCBwYWNrYWdlTWFuYWdlcjogd3MucGFja2FnZU1hbmFnZXIsIGNsaXBib2FyZDogd3MuY2xpcGJvYXJkLCB2aWV3UmVnaXN0cnk6IHdzLnZpZXdSZWdpc3RyeSxcbiAgICAgICAgICAgIGdyYW1tYXJSZWdpc3RyeTogd3MuZ3JhbW1hclJlZ2lzdHJ5LCBwcm9qZWN0OiB3cy5wcm9qZWN0LCBhc3NlcnQ6IHdzLmFzc2VydCwgYXBwbGljYXRpb25EZWxlZ2F0ZTogd3MuYXBwbGljYXRpb25EZWxlZ2F0ZVxuICAgICAgICAgIH0sIHBhcmFtcylcbiAgICAgICAgICBlZGl0b3IgPSBuZXcgUmVtb3RlRWRpdEVkaXRvcihwYXJhbXMpXG4iXX0=
