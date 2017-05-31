(function() {
  var $, CompositeDisposable, FtpHost, Host, HostView, SftpHost, TextEditorView, View, _, err, fs, keytar, ref,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('atom-space-pen-views'), $ = ref.$, View = ref.View, TextEditorView = ref.TextEditorView;

  CompositeDisposable = require('atom').CompositeDisposable;

  _ = require('underscore-plus');

  Host = require('../model/host');

  SftpHost = require('../model/sftp-host');

  FtpHost = require('../model/ftp-host');

  fs = require('fs-plus');

  try {
    keytar = require('keytar');
  } catch (error) {
    err = error;
    console.debug('Keytar could not be loaded! Passwords will be stored in cleartext to remoteEdit.json!');
    keytar = void 0;
  }

  module.exports = HostView = (function(superClass) {
    extend(HostView, superClass);

    function HostView() {
      this.focusPrev = bind(this.focusPrev, this);
      this.focusNext = bind(this.focusNext, this);
      return HostView.__super__.constructor.apply(this, arguments);
    }

    HostView.content = function() {
      return this.div({
        "class": 'host-view'
      }, (function(_this) {
        return function() {
          _this.h2("Connection settings", {
            "class": "host-header"
          });
          _this.label('Hostname:');
          _this.subview('hostname', new TextEditorView({
            mini: true
          }));
          _this.label('Default directory:');
          _this.subview('directory', new TextEditorView({
            mini: true
          }));
          _this.label('Username:');
          _this.subview('username', new TextEditorView({
            mini: true
          }));
          _this.label('Port:');
          _this.subview('port', new TextEditorView({
            mini: true
          }));
          _this.h2("Authentication settings", {
            "class": "host-header"
          });
          _this.div({
            "class": 'block',
            outlet: 'authenticationButtonsBlock'
          }, function() {
            return _this.div({
              "class": 'btn-group'
            }, function() {
              _this.button({
                "class": 'btn selected',
                outlet: 'userAgentButton',
                click: 'userAgentButtonClick'
              }, 'User agent');
              _this.button({
                "class": 'btn',
                outlet: 'privateKeyButton',
                click: 'privateKeyButtonClick'
              }, 'Private key');
              return _this.button({
                "class": 'btn',
                outlet: 'passwordButton',
                click: 'passwordButtonClick'
              }, 'Password');
            });
          });
          _this.div({
            "class": 'block',
            outlet: 'passwordBlock'
          }, function() {
            _this.label('Password:');
            _this.subview('password', new TextEditorView({
              mini: true
            }));
            _this.label('Passwords are by default stored in cleartext! Leave password field empty if you want to be prompted.', {
              "class": 'text-warning'
            });
            return _this.label('Passwords can be saved to default system keychain by enabling option in settings.', {
              "class": 'text-warning'
            });
          });
          _this.div({
            "class": 'block',
            outlet: 'privateKeyBlock'
          }, function() {
            _this.label('Private key path:');
            _this.subview('privateKeyPath', new TextEditorView({
              mini: true
            }));
            _this.label('Private key passphrase:');
            _this.subview('privateKeyPassphrase', new TextEditorView({
              mini: true
            }));
            _this.label('Passphrases are by default stored in cleartext! Leave Passphrases field empty if you want to be prompted.', {
              "class": 'text-warning'
            });
            return _this.label('Passphrases can be saved to default system keychain by enabling option in settings.', {
              "class": 'text-warning'
            });
          });
          _this.h2("Additional settings", {
            "class": "host-header"
          });
          _this.label('Alias:');
          _this.subview('alias', new TextEditorView({
            mini: true
          }));
          _this.div({
            "class": 'block',
            outlet: 'buttonBlock'
          }, function() {
            _this.button({
              "class": 'inline-block btn pull-right',
              outlet: 'cancelButton',
              click: 'cancel'
            }, 'Cancel');
            return _this.button({
              "class": 'inline-block btn pull-right',
              outlet: 'saveButton',
              click: 'confirm'
            }, 'Save');
          });
          return _this.div({
            "class": 'clear'
          });
        };
      })(this));
    };

    HostView.prototype.initialize = function(host, ipdw) {
      var keytarPassphrase, keytarPassword, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8;
      this.host = host;
      this.ipdw = ipdw;
      if (this.host == null) {
        throw new Error("Parameter \"host\" undefined!");
      }
      this.disposables = new CompositeDisposable;
      this.disposables.add(atom.commands.add('atom-workspace', {
        'core:confirm': (function(_this) {
          return function() {
            return _this.confirm();
          };
        })(this),
        'core:cancel': (function(_this) {
          return function(event) {
            _this.cancel();
            return event.stopPropagation();
          };
        })(this)
      }));
      this.subscriptions = new CompositeDisposable;
      this.subscriptions.add(atom.commands.add(this.element, {
        'host-view:focus-next': this.focusNext,
        'host-view:focus-previous': this.focusPrev
      }));
      this.alias.setText((ref1 = this.host.alias) != null ? ref1 : "");
      this.hostname.setText((ref2 = this.host.hostname) != null ? ref2 : "");
      this.directory.setText((ref3 = this.host.directory) != null ? ref3 : "/");
      this.username.setText((ref4 = this.host.username) != null ? ref4 : "");
      this.port.setText((ref5 = this.host.port) != null ? ref5 : "");
      if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (keytar != null)) {
        keytarPassword = keytar.getPassword(this.host.getServiceNamePassword(), this.host.getServiceAccount());
        this.password.setText(keytarPassword != null ? keytarPassword : "");
      } else {
        this.password.setText((ref6 = this.host.password) != null ? ref6 : "");
      }
      this.privateKeyPath.setText((ref7 = this.host.privateKeyPath) != null ? ref7 : atom.config.get('remote-edit.sshPrivateKeyPath'));
      if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (this.host instanceof SftpHost) && (keytar != null)) {
        keytarPassphrase = keytar.getPassword(this.host.getServiceNamePassphrase(), this.host.getServiceAccount());
        return this.privateKeyPassphrase.setText(keytarPassphrase != null ? keytarPassphrase : "");
      } else {
        return this.privateKeyPassphrase.setText((ref8 = this.host.passphrase) != null ? ref8 : "");
      }
    };

    HostView.prototype.focusNext = function() {
      var elements, focusedElement, focusedIndex;
      elements = [this.hostname, this.directory, this.username, this.port, this.alias, this.saveButton];
      focusedElement = _.find(elements, function(el) {
        return el.hasClass('is-focused');
      });
      focusedIndex = elements.indexOf(focusedElement);
      focusedIndex = focusedIndex + 1;
      if (focusedIndex > elements.length) {
        focusedIndex = 0;
      }
      return elements[focusedIndex].focus();
    };

    HostView.prototype.focusPrev = function() {
      var elements, focusedElement, focusedIndex;
      elements = [this.hostname, this.directory, this.username, this.port, this.alias, this.saveButton];
      focusedElement = _.find(elements, function(el) {
        return el.hasClass('is-focused');
      });
      focusedIndex = elements.indexOf(focusedElement);
      focusedIndex = focusedIndex - 1;
      if (focusedIndex < 0) {
        focusedIndex = elements.length - 1;
      }
      return elements[focusedIndex].focus();
    };

    HostView.prototype.userAgentButtonClick = function() {
      this.privateKeyButton.toggleClass('selected', false);
      this.userAgentButton.toggleClass('selected', true);
      this.passwordButton.toggleClass('selected', false);
      this.passwordBlock.hide();
      return this.privateKeyBlock.hide();
    };

    HostView.prototype.privateKeyButtonClick = function() {
      this.privateKeyButton.toggleClass('selected', true);
      this.userAgentButton.toggleClass('selected', false);
      this.passwordButton.toggleClass('selected', false);
      this.passwordBlock.hide();
      this.privateKeyBlock.show();
      return this.privateKeyPath.focus();
    };

    HostView.prototype.passwordButtonClick = function() {
      this.privateKeyButton.toggleClass('selected', false);
      this.userAgentButton.toggleClass('selected', false);
      this.passwordButton.toggleClass('selected', true);
      this.privateKeyBlock.hide();
      this.passwordBlock.show();
      return this.password.focus();
    };

    HostView.prototype.confirm = function() {
      var keytarResult;
      this.cancel();
      this.host.alias = this.alias.getText();
      this.host.hostname = this.hostname.getText();
      this.host.directory = this.directory.getText();
      this.host.username = this.username.getText();
      this.host.port = this.port.getText();
      if (this.host instanceof SftpHost) {
        this.host.useAgent = this.userAgentButton.hasClass('selected');
        this.host.usePrivateKey = this.privateKeyButton.hasClass('selected');
        this.host.usePassword = this.passwordButton.hasClass('selected');
        if (this.privateKeyButton.hasClass('selected')) {
          this.host.privateKeyPath = fs.absolute(this.privateKeyPath.getText());
          if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (this.privateKeyPassphrase.getText().length > 0) && (keytar != null)) {
            keytar.replacePassword(this.host.getServiceNamePassphrase(), this.host.getServiceAccount(), this.privateKeyPassphrase.getText());
            this.host.passphrase = "***** keytar *****";
          } else if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (this.privateKeyPassphrase.getText().length === 0)) {
            keytar.deletePassword(this.host.getServiceNamePassphrase(), this.host.getServiceAccount());
            this.host.passphrase = "";
          } else {
            this.host.passphrase = this.privateKeyPassphrase.getText();
          }
        }
        if (this.passwordButton.hasClass('selected')) {
          if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (this.password.getText().length > 0) && (keytar != null)) {
            keytarResult = keytar.replacePassword(this.host.getServiceNamePassword(), this.host.getServiceAccount(), this.password.getText());
            this.host.password = "***** keytar *****";
          } else if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (this.password.getText().length === 0) && (keytar != null)) {
            keytar.deletePassword(this.host.getServiceNamePassword(), this.host.getServiceAccount());
            this.host.password = "";
          } else {
            this.host.password = this.password.getText();
          }
        }
      } else if (this.host instanceof FtpHost) {
        this.host.usePassword = true;
        if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (this.password.getText().length > 0) && (keytar != null)) {
          keytarResult = keytar.replacePassword(this.host.getServiceNamePassword(), this.host.getServiceAccount(), this.password.getText());
          this.host.password = "***** keytar *****";
        } else if (atom.config.get('remote-edit.storePasswordsUsingKeytar') && (this.password.getText().length === 0) && (keytar != null)) {
          keytar.deletePassword(this.host.getServiceNamePassword(), this.host.getServiceAccount());
          this.host.password = "";
        } else {
          this.host.password = this.password.getText();
        }
      } else {
        throw new Error("\"host\" is not valid type!", this.host);
      }
      if (this.ipdw != null) {
        return this.ipdw.getData().then((function(_this) {
          return function(data) {
            return data.addNewHost(_this.host);
          };
        })(this));
      } else {
        return this.host.invalidate();
      }
    };

    HostView.prototype.destroy = function() {
      if (this.panel != null) {
        this.panel.destroy();
      }
      return this.disposables.dispose();
    };

    HostView.prototype.cancel = function() {
      this.cancelled();
      this.restoreFocus();
      return this.destroy();
    };

    HostView.prototype.cancelled = function() {
      return this.hide();
    };

    HostView.prototype.toggle = function() {
      var ref1;
      if ((ref1 = this.panel) != null ? ref1.isVisible() : void 0) {
        return this.cancel();
      } else {
        return this.show();
      }
    };

    HostView.prototype.show = function() {
      if (this.host instanceof SftpHost) {
        this.authenticationButtonsBlock.show();
        if (this.host.usePassword) {
          this.passwordButton.click();
        } else if (this.host.usePrivateKey) {
          this.privateKeyButton.click();
        } else if (this.host.useAgent) {
          this.userAgentButton.click();
        }
      } else if (this.host instanceof FtpHost) {
        this.authenticationButtonsBlock.hide();
        this.passwordBlock.show();
        this.privateKeyBlock.hide();
      } else {
        throw new Error("\"host\" is unknown!", this.host);
      }
      if (this.panel == null) {
        this.panel = atom.workspace.addModalPanel({
          item: this
        });
      }
      this.panel.show();
      this.storeFocusedElement();
      return this.hostname.focus();
    };

    HostView.prototype.hide = function() {
      var ref1;
      return (ref1 = this.panel) != null ? ref1.hide() : void 0;
    };

    HostView.prototype.storeFocusedElement = function() {
      return this.previouslyFocusedElement = $(document.activeElement);
    };

    HostView.prototype.restoreFocus = function() {
      var ref1;
      return (ref1 = this.previouslyFocusedElement) != null ? ref1.focus() : void 0;
    };

    return HostView;

  })(View);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi92aWV3L2hvc3Qtdmlldy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLHdHQUFBO0lBQUE7Ozs7RUFBQSxNQUE0QixPQUFBLENBQVEsc0JBQVIsQ0FBNUIsRUFBQyxTQUFELEVBQUksZUFBSixFQUFVOztFQUNULHNCQUF1QixPQUFBLENBQVEsTUFBUjs7RUFFeEIsQ0FBQSxHQUFJLE9BQUEsQ0FBUSxpQkFBUjs7RUFDSixJQUFBLEdBQU8sT0FBQSxDQUFRLGVBQVI7O0VBQ1AsUUFBQSxHQUFXLE9BQUEsQ0FBUSxvQkFBUjs7RUFDWCxPQUFBLEdBQVUsT0FBQSxDQUFRLG1CQUFSOztFQUVWLEVBQUEsR0FBSyxPQUFBLENBQVEsU0FBUjs7QUFFTDtJQUNFLE1BQUEsR0FBUyxPQUFBLENBQVEsUUFBUixFQURYO0dBQUEsYUFBQTtJQUVNO0lBQ0osT0FBTyxDQUFDLEtBQVIsQ0FBYyx1RkFBZDtJQUNBLE1BQUEsR0FBUyxPQUpYOzs7RUFNQSxNQUFNLENBQUMsT0FBUCxHQUNROzs7Ozs7Ozs7SUFDSixRQUFDLENBQUEsT0FBRCxHQUFVLFNBQUE7YUFDUixJQUFDLENBQUEsR0FBRCxDQUFLO1FBQUEsQ0FBQSxLQUFBLENBQUEsRUFBTyxXQUFQO09BQUwsRUFBeUIsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO1VBQ3ZCLEtBQUMsQ0FBQSxFQUFELENBQUkscUJBQUosRUFBMkI7WUFBQSxDQUFBLEtBQUEsQ0FBQSxFQUFPLGFBQVA7V0FBM0I7VUFDQSxLQUFDLENBQUEsS0FBRCxDQUFPLFdBQVA7VUFDQSxLQUFDLENBQUEsT0FBRCxDQUFTLFVBQVQsRUFBeUIsSUFBQSxjQUFBLENBQWU7WUFBQSxJQUFBLEVBQU0sSUFBTjtXQUFmLENBQXpCO1VBRUEsS0FBQyxDQUFBLEtBQUQsQ0FBTyxvQkFBUDtV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LENBQUEsRUFERjtTQUFBLE1BRUssSUFBRyxJQUFDLENBQUEsSUFBSSxDQUFDLGFBQVQ7VUFDSCxJQUFDLENBQUEsZ0JBQWdCLENBQUMsS0FBbEIsQ0FBQSxFQURHO1NBQUEsTUFFQSxJQUFHLElBQUMsQ0FBQSxJQUFJLENBQUMsUUFBVDtVQUNILElBQUMsQ0FBQSxlQUFlLENBQUMsS0FBakIsQ0FBQSxFQURHO1NBTlA7T0FBQSxNQVFLLElBQUksSUFBQyxDQUFBLElBQUQsWUFBaUIsT0FBckI7UUFDSCxJQUFDLENBQUEsMEJBQTBCLENBQUMsSUFBNUIsQ0FBQTtRQUNBLElBQUMsQ0FBQSxhQUFhLENBQUMsSUFBZixDQUFBO1FBQ0EsSUFBQyxDQUFBLGVBQWUsQ0FBQyxJQUFqQixDQUFBLEVBSEc7T0FBQSxNQUFBO0FBS0gsY0FBVSxJQUFBLEtBQUEsQ0FBTSxzQkFBTixFQUE4QixJQUFDLENBQUEsSUFBL0IsRUFMUDs7O1FBT0wsSUFBQyxDQUFBLFFBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFmLENBQTZCO1VBQUEsSUFBQSxFQUFNLElBQU47U0FBN0I7O01BQ1YsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFQLENBQUE7TUFFQSxJQUFDLENBQUEsbUJBQUQsQ0FBQTthQUNBLElBQUMsQ0FBQSxRQUFRLENBQUMsS0FBVixDQUFBO0lBcEJJOzt1QkFzQk4sSUFBQSxHQUFNLFNBQUE7QUFDSixVQUFBOytDQUFNLENBQUUsSUFBUixDQUFBO0lBREk7O3VCQUdOLG1CQUFBLEdBQXFCLFNBQUE7YUFDbkIsSUFBQyxDQUFBLHdCQUFELEdBQTRCLENBQUEsQ0FBRSxRQUFRLENBQUMsYUFBWDtJQURUOzt1QkFHckIsWUFBQSxHQUFjLFNBQUE7QUFDWixVQUFBO2tFQUF5QixDQUFFLEtBQTNCLENBQUE7SUFEWTs7OztLQWxPTztBQWpCekIiLCJzb3VyY2VzQ29udGVudCI6WyJ7JCwgVmlldywgVGV4dEVkaXRvclZpZXd9ID0gcmVxdWlyZSAnYXRvbS1zcGFjZS1wZW4tdmlld3MnXG57Q29tcG9zaXRlRGlzcG9zYWJsZX0gPSByZXF1aXJlICdhdG9tJ1xuXG5fID0gcmVxdWlyZSAndW5kZXJzY29yZS1wbHVzJ1xuSG9zdCA9IHJlcXVpcmUgJy4uL21vZGVsL2hvc3QnXG5TZnRwSG9zdCA9IHJlcXVpcmUgJy4uL21vZGVsL3NmdHAtaG9zdCdcbkZ0cEhvc3QgPSByZXF1aXJlICcuLi9tb2RlbC9mdHAtaG9zdCdcblxuZnMgPSByZXF1aXJlICdmcy1wbHVzJ1xuXG50cnlcbiAga2V5dGFyID0gcmVxdWlyZSAna2V5dGFyJ1xuY2F0Y2ggZXJyXG4gIGNvbnNvbGUuZGVidWcgJ0tleXRhciBjb3VsZCBub3QgYmUgbG9hZGVkISBQYXNzd29yZHMgd2lsbCBiZSBzdG9yZWQgaW4gY2xlYXJ0ZXh0IHRvIHJlbW90ZUVkaXQuanNvbiEnXG4gIGtleXRhciA9IHVuZGVmaW5lZFxuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIGNsYXNzIEhvc3RWaWV3IGV4dGVuZHMgVmlld1xuICAgIEBjb250ZW50OiAtPlxuICAgICAgQGRpdiBjbGFzczogJ2hvc3QtdmlldycsID0+XG4gICAgICAgIEBoMiBcIkNvbm5lY3Rpb24gc2V0dGluZ3NcIiwgY2xhc3M6IFwiaG9zdC1oZWFkZXJcIlxuICAgICAgICBAbGFiZWwgJ0hvc3RuYW1lOidcbiAgICAgICAgQHN1YnZpZXcgJ2hvc3RuYW1lJywgbmV3IFRleHRFZGl0b3JWaWV3KG1pbmk6IHRydWUpXG5cbiAgICAgICAgQGxhYmVsICdEZWZhdWx0IGRpcmVjdG9yeTonXG4gICAgICAgIEBzdWJ2aWV3ICdkaXJlY3RvcnknLCBuZXcgVGV4dEVkaXRvclZpZXcobWluaTogdHJ1ZSlcblxuICAgICAgICBAbGFiZWwgJ1VzZXJuYW1lOidcbiAgICAgICAgQHN1YnZpZXcgJ3VzZXJuYW1lJywgbmV3IFRleHRFZGl0b3JWaWV3KG1pbmk6IHRydWUpXG5cbiAgICAgICAgQGxhYmVsICdQb3J0OidcbiAgICAgICAgQHN1YnZpZXcgJ3BvcnQnLCBuZXcgVGV4dEVkaXRvclZpZXcobWluaTogdHJ1ZSlcblxuXG4gICAgICAgIEBoMiBcIkF1dGhlbnRpY2F0aW9uIHNldHRpbmdzXCIsIGNsYXNzOiBcImhvc3QtaGVhZGVyXCJcbiAgICAgICAgQGRpdiBjbGFzczogJ2Jsb2NrJywgb3V0bGV0OiAnYXV0aGVudGljYXRpb25CdXR0b25zQmxvY2snLCA9PlxuICAgICAgICAgIEBkaXYgY2xhc3M6ICdidG4tZ3JvdXAnLCA9PlxuICAgICAgICAgICAgQGJ1dHRvbiBjbGFzczogJ2J0biBzZWxlY3RlZCcsIG91dGxldDogJ3VzZXJBZ2VudEJ1dHRvbicsIGNsaWNrOiAndXNlckFnZW50QnV0dG9uQ2xpY2snLCAnVXNlciBhZ2VudCdcbiAgICAgICAgICAgIEBidXR0b24gY2xhc3M6ICdidG4nLCBvdXRsZXQ6ICdwcml2YXRlS2V5QnV0dG9uJywgY2xpY2s6ICdwcml2YXRlS2V5QnV0dG9uQ2xpY2snLCAnUHJpdmF0ZSBrZXknXG4gICAgICAgICAgICBAYnV0dG9uIGNsYXNzOiAnYnRuJywgb3V0bGV0OiAncGFzc3dvcmRCdXR0b24nLCBjbGljazogJ3Bhc3N3b3JkQnV0dG9uQ2xpY2snLCAnUGFzc3dvcmQnXG5cbiAgICAgICAgQGRpdiBjbGFzczogJ2Jsb2NrJywgb3V0bGV0OiAncGFzc3dvcmRCbG9jaycsID0+XG4gICAgICAgICAgQGxhYmVsICdQYXNzd29yZDonXG4gICAgICAgICAgQHN1YnZpZXcgJ3Bhc3N3b3JkJywgbmV3IFRleHRFZGl0b3JWaWV3KG1pbmk6IHRydWUpXG4gICAgICAgICAgQGxhYmVsICdQYXNzd29yZHMgYXJlIGJ5IGRlZmF1bHQgc3RvcmVkIGluIGNsZWFydGV4dCEgTGVhdmUgcGFzc3dvcmQgZmllbGQgZW1wdHkgaWYgeW91IHdhbnQgdG8gYmUgcHJvbXB0ZWQuJywgY2xhc3M6ICd0ZXh0LXdhcm5pbmcnXG4gICAgICAgICAgQGxhYmVsICdQYXNzd29yZHMgY2FuIGJlIHNhdmVkIHRvIGRlZmF1bHQgc3lzdGVtIGtleWNoYWluIGJ5IGVuYWJsaW5nIG9wdGlvbiBpbiBzZXR0aW5ncy4nLCBjbGFzczogJ3RleHQtd2FybmluZydcblxuICAgICAgICBAZGl2IGNsYXNzOiAnYmxvY2snLCBvdXRsZXQ6ICdwcml2YXRlS2V5QmxvY2snLCA9PlxuICAgICAgICAgIEBsYWJlbCAnUHJpdmF0ZSBrZXkgcGF0aDonXG4gICAgICAgICAgQHN1YnZpZXcgJ3ByaXZhdGVLZXlQYXRoJywgbmV3IFRleHRFZGl0b3JWaWV3KG1pbmk6IHRydWUpXG4gICAgICAgICAgQGxhYmVsICdQcml2YXRlIGtleSBwYXNzcGhyYXNlOidcbiAgICAgICAgICBAc3VidmlldyAncHJpdmF0ZUtleVBhc3NwaHJhc2UnLCBuZXcgVGV4dEVkaXRvclZpZXcobWluaTogdHJ1ZSlcbiAgICAgICAgICBAbGFiZWwgJ1Bhc3NwaHJhc2VzIGFyZSBieSBkZWZhdWx0IHN0b3JlZCBpbiBjbGVhcnRleHQhIExlYXZlIFBhc3NwaHJhc2VzIGZpZWxkIGVtcHR5IGlmIHlvdSB3YW50IHRvIGJlIHByb21wdGVkLicsIGNsYXNzOiAndGV4dC13YXJuaW5nJ1xuICAgICAgICAgIEBsYWJlbCAnUGFzc3BocmFzZXMgY2FuIGJlIHNhdmVkIHRvIGRlZmF1bHQgc3lzdGVtIGtleWNoYWluIGJ5IGVuYWJsaW5nIG9wdGlvbiBpbiBzZXR0aW5ncy4nLCBjbGFzczogJ3RleHQtd2FybmluZydcblxuICAgICAgICBAaDIgXCJBZGRpdGlvbmFsIHNldHRpbmdzXCIsIGNsYXNzOiBcImhvc3QtaGVhZGVyXCJcbiAgICAgICAgQGxhYmVsICdBbGlhczonXG4gICAgICAgIEBzdWJ2aWV3ICdhbGlhcycsIG5ldyBUZXh0RWRpdG9yVmlldyhtaW5pOiB0cnVlKVxuXG4gICAgICAgIEBkaXYgY2xhc3M6ICdibG9jaycsIG91dGxldDogJ2J1dHRvbkJsb2NrJywgPT5cbiAgICAgICAgICBAYnV0dG9uIGNsYXNzOiAnaW5saW5lLWJsb2NrIGJ0biBwdWxsLXJpZ2h0Jywgb3V0bGV0OiAnY2FuY2VsQnV0dG9uJywgY2xpY2s6ICdjYW5jZWwnLCAnQ2FuY2VsJ1xuICAgICAgICAgIEBidXR0b24gY2xhc3M6ICdpbmxpbmUtYmxvY2sgYnRuIHB1bGwtcmlnaHQnLCBvdXRsZXQ6ICdzYXZlQnV0dG9uJywgY2xpY2s6ICdjb25maXJtJywnU2F2ZSdcblxuICAgICAgICBAZGl2IGNsYXNzOiAnY2xlYXInXG5cbiAgICBpbml0aWFsaXplOiAoQGhvc3QsIEBpcGR3KSAtPlxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiUGFyYW1ldGVyIFxcXCJob3N0XFxcIiB1bmRlZmluZWQhXCIpIGlmICFAaG9zdD9cblxuICAgICAgQGRpc3Bvc2FibGVzID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICAgIEBkaXNwb3NhYmxlcy5hZGQgYXRvbS5jb21tYW5kcy5hZGQgJ2F0b20td29ya3NwYWNlJyxcbiAgICAgICAgJ2NvcmU6Y29uZmlybSc6ID0+IEBjb25maXJtKClcbiAgICAgICAgJ2NvcmU6Y2FuY2VsJzogKGV2ZW50KSA9PlxuICAgICAgICAgIEBjYW5jZWwoKVxuICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG5cbiAgICAgIEBzdWJzY3JpcHRpb25zID0gbmV3IENvbXBvc2l0ZURpc3Bvc2FibGVcbiAgICAgIEBzdWJzY3JpcHRpb25zLmFkZCBhdG9tLmNvbW1hbmRzLmFkZCBAZWxlbWVudCxcbiAgICAgICAgJ2hvc3Qtdmlldzpmb2N1cy1uZXh0JzogQGZvY3VzTmV4dFxuICAgICAgICAnaG9zdC12aWV3OmZvY3VzLXByZXZpb3VzJzogQGZvY3VzUHJldlxuXG4gICAgICBAYWxpYXMuc2V0VGV4dChAaG9zdC5hbGlhcyA/IFwiXCIpXG4gICAgICBAaG9zdG5hbWUuc2V0VGV4dChAaG9zdC5ob3N0bmFtZSA/IFwiXCIpXG4gICAgICBAZGlyZWN0b3J5LnNldFRleHQoQGhvc3QuZGlyZWN0b3J5ID8gXCIvXCIpXG4gICAgICBAdXNlcm5hbWUuc2V0VGV4dChAaG9zdC51c2VybmFtZSA/IFwiXCIpXG5cbiAgICAgIEBwb3J0LnNldFRleHQoQGhvc3QucG9ydCA/IFwiXCIpXG5cbiAgICAgIGlmIGF0b20uY29uZmlnLmdldCgncmVtb3RlLWVkaXQuc3RvcmVQYXNzd29yZHNVc2luZ0tleXRhcicpIGFuZCAoa2V5dGFyPylcbiAgICAgICAga2V5dGFyUGFzc3dvcmQgPSBrZXl0YXIuZ2V0UGFzc3dvcmQoQGhvc3QuZ2V0U2VydmljZU5hbWVQYXNzd29yZCgpLCBAaG9zdC5nZXRTZXJ2aWNlQWNjb3VudCgpKVxuICAgICAgICBAcGFzc3dvcmQuc2V0VGV4dChrZXl0YXJQYXNzd29yZCA/IFwiXCIpXG4gICAgICBlbHNlXG4gICAgICAgIEBwYXNzd29yZC5zZXRUZXh0KEBob3N0LnBhc3N3b3JkID8gXCJcIilcblxuICAgICAgQHByaXZhdGVLZXlQYXRoLnNldFRleHQoQGhvc3QucHJpdmF0ZUtleVBhdGggPyBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnNzaFByaXZhdGVLZXlQYXRoJykpXG4gICAgICBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXInKSBhbmQgKEBob3N0IGluc3RhbmNlb2YgU2Z0cEhvc3QpIGFuZCAoa2V5dGFyPylcbiAgICAgICAga2V5dGFyUGFzc3BocmFzZSA9IGtleXRhci5nZXRQYXNzd29yZChAaG9zdC5nZXRTZXJ2aWNlTmFtZVBhc3NwaHJhc2UoKSwgQGhvc3QuZ2V0U2VydmljZUFjY291bnQoKSlcbiAgICAgICAgQHByaXZhdGVLZXlQYXNzcGhyYXNlLnNldFRleHQoa2V5dGFyUGFzc3BocmFzZSA/IFwiXCIpXG4gICAgICBlbHNlXG4gICAgICAgIEBwcml2YXRlS2V5UGFzc3BocmFzZS5zZXRUZXh0KEBob3N0LnBhc3NwaHJhc2UgPyBcIlwiKVxuXG4gICAgZm9jdXNOZXh0OiA9PlxuICAgICAgZWxlbWVudHMgPSBbQGhvc3RuYW1lLCBAZGlyZWN0b3J5LCBAdXNlcm5hbWUsIEBwb3J0LCBAYWxpYXMsIEBzYXZlQnV0dG9uXVxuICAgICAgZm9jdXNlZEVsZW1lbnQgPSBfLmZpbmQgZWxlbWVudHMsIChlbCkgLT4gZWwuaGFzQ2xhc3MoJ2lzLWZvY3VzZWQnKVxuICAgICAgZm9jdXNlZEluZGV4ID0gZWxlbWVudHMuaW5kZXhPZiBmb2N1c2VkRWxlbWVudFxuXG4gICAgICBmb2N1c2VkSW5kZXggPSBmb2N1c2VkSW5kZXggKyAxXG4gICAgICBmb2N1c2VkSW5kZXggPSAwIGlmIGZvY3VzZWRJbmRleCA+IGVsZW1lbnRzLmxlbmd0aFxuICAgICAgZWxlbWVudHNbZm9jdXNlZEluZGV4XS5mb2N1cygpXG5cbiAgICBmb2N1c1ByZXY6ID0+XG4gICAgICBlbGVtZW50cyA9IFtAaG9zdG5hbWUsIEBkaXJlY3RvcnksIEB1c2VybmFtZSwgQHBvcnQsIEBhbGlhcywgQHNhdmVCdXR0b25dXG4gICAgICBmb2N1c2VkRWxlbWVudCA9IF8uZmluZCBlbGVtZW50cywgKGVsKSAtPiBlbC5oYXNDbGFzcygnaXMtZm9jdXNlZCcpXG4gICAgICBmb2N1c2VkSW5kZXggPSBlbGVtZW50cy5pbmRleE9mIGZvY3VzZWRFbGVtZW50XG5cbiAgICAgIGZvY3VzZWRJbmRleCA9IGZvY3VzZWRJbmRleCAtIDFcbiAgICAgIGZvY3VzZWRJbmRleCA9IGVsZW1lbnRzLmxlbmd0aCAtIDEgaWYgZm9jdXNlZEluZGV4IDwgMFxuICAgICAgZWxlbWVudHNbZm9jdXNlZEluZGV4XS5mb2N1cygpXG5cbiAgICB1c2VyQWdlbnRCdXR0b25DbGljazogLT5cbiAgICAgIEBwcml2YXRlS2V5QnV0dG9uLnRvZ2dsZUNsYXNzKCdzZWxlY3RlZCcsIGZhbHNlKVxuICAgICAgQHVzZXJBZ2VudEJ1dHRvbi50b2dnbGVDbGFzcygnc2VsZWN0ZWQnLCB0cnVlKVxuICAgICAgQHBhc3N3b3JkQnV0dG9uLnRvZ2dsZUNsYXNzKCdzZWxlY3RlZCcsIGZhbHNlKVxuICAgICAgQHBhc3N3b3JkQmxvY2suaGlkZSgpXG4gICAgICBAcHJpdmF0ZUtleUJsb2NrLmhpZGUoKVxuXG4gICAgcHJpdmF0ZUtleUJ1dHRvbkNsaWNrOiAtPlxuICAgICAgQHByaXZhdGVLZXlCdXR0b24udG9nZ2xlQ2xhc3MoJ3NlbGVjdGVkJywgdHJ1ZSlcbiAgICAgIEB1c2VyQWdlbnRCdXR0b24udG9nZ2xlQ2xhc3MoJ3NlbGVjdGVkJywgZmFsc2UpXG4gICAgICBAcGFzc3dvcmRCdXR0b24udG9nZ2xlQ2xhc3MoJ3NlbGVjdGVkJywgZmFsc2UpXG4gICAgICBAcGFzc3dvcmRCbG9jay5oaWRlKClcbiAgICAgIEBwcml2YXRlS2V5QmxvY2suc2hvdygpXG4gICAgICBAcHJpdmF0ZUtleVBhdGguZm9jdXMoKVxuXG4gICAgcGFzc3dvcmRCdXR0b25DbGljazogLT5cbiAgICAgIEBwcml2YXRlS2V5QnV0dG9uLnRvZ2dsZUNsYXNzKCdzZWxlY3RlZCcsIGZhbHNlKVxuICAgICAgQHVzZXJBZ2VudEJ1dHRvbi50b2dnbGVDbGFzcygnc2VsZWN0ZWQnLCBmYWxzZSlcbiAgICAgIEBwYXNzd29yZEJ1dHRvbi50b2dnbGVDbGFzcygnc2VsZWN0ZWQnLCB0cnVlKVxuICAgICAgQHByaXZhdGVLZXlCbG9jay5oaWRlKClcbiAgICAgIEBwYXNzd29yZEJsb2NrLnNob3coKVxuICAgICAgQHBhc3N3b3JkLmZvY3VzKClcblxuXG4gICAgY29uZmlybTogLT5cbiAgICAgIEBjYW5jZWwoKVxuXG4gICAgICBAaG9zdC5hbGlhcyA9IEBhbGlhcy5nZXRUZXh0KClcbiAgICAgIEBob3N0Lmhvc3RuYW1lID0gQGhvc3RuYW1lLmdldFRleHQoKVxuICAgICAgQGhvc3QuZGlyZWN0b3J5ID0gQGRpcmVjdG9yeS5nZXRUZXh0KClcbiAgICAgIEBob3N0LnVzZXJuYW1lID0gQHVzZXJuYW1lLmdldFRleHQoKVxuICAgICAgQGhvc3QucG9ydCA9IEBwb3J0LmdldFRleHQoKVxuXG4gICAgICBpZiBAaG9zdCBpbnN0YW5jZW9mIFNmdHBIb3N0XG4gICAgICAgIEBob3N0LnVzZUFnZW50ID0gQHVzZXJBZ2VudEJ1dHRvbi5oYXNDbGFzcygnc2VsZWN0ZWQnKVxuICAgICAgICBAaG9zdC51c2VQcml2YXRlS2V5ID0gQHByaXZhdGVLZXlCdXR0b24uaGFzQ2xhc3MoJ3NlbGVjdGVkJylcbiAgICAgICAgQGhvc3QudXNlUGFzc3dvcmQgPSBAcGFzc3dvcmRCdXR0b24uaGFzQ2xhc3MoJ3NlbGVjdGVkJylcblxuICAgICAgICBpZiBAcHJpdmF0ZUtleUJ1dHRvbi5oYXNDbGFzcygnc2VsZWN0ZWQnKVxuICAgICAgICAgIEBob3N0LnByaXZhdGVLZXlQYXRoID0gZnMuYWJzb2x1dGUoQHByaXZhdGVLZXlQYXRoLmdldFRleHQoKSlcbiAgICAgICAgICBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXInKSBhbmQgKEBwcml2YXRlS2V5UGFzc3BocmFzZS5nZXRUZXh0KCkubGVuZ3RoID4gMCkgYW5kIChrZXl0YXI/KVxuICAgICAgICAgICAga2V5dGFyLnJlcGxhY2VQYXNzd29yZChAaG9zdC5nZXRTZXJ2aWNlTmFtZVBhc3NwaHJhc2UoKSwgQGhvc3QuZ2V0U2VydmljZUFjY291bnQoKSwgQHByaXZhdGVLZXlQYXNzcGhyYXNlLmdldFRleHQoKSlcbiAgICAgICAgICAgIEBob3N0LnBhc3NwaHJhc2UgPSBcIioqKioqIGtleXRhciAqKioqKlwiXG4gICAgICAgICAgZWxzZSBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXInKSBhbmQgKEBwcml2YXRlS2V5UGFzc3BocmFzZS5nZXRUZXh0KCkubGVuZ3RoIGlzIDApXG4gICAgICAgICAgICBrZXl0YXIuZGVsZXRlUGFzc3dvcmQoQGhvc3QuZ2V0U2VydmljZU5hbWVQYXNzcGhyYXNlKCksIEBob3N0LmdldFNlcnZpY2VBY2NvdW50KCkpXG4gICAgICAgICAgICBAaG9zdC5wYXNzcGhyYXNlID0gXCJcIlxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBob3N0LnBhc3NwaHJhc2UgPSBAcHJpdmF0ZUtleVBhc3NwaHJhc2UuZ2V0VGV4dCgpXG4gICAgICAgIGlmIEBwYXNzd29yZEJ1dHRvbi5oYXNDbGFzcygnc2VsZWN0ZWQnKVxuICAgICAgICAgIGlmIGF0b20uY29uZmlnLmdldCgncmVtb3RlLWVkaXQuc3RvcmVQYXNzd29yZHNVc2luZ0tleXRhcicpIGFuZCAoQHBhc3N3b3JkLmdldFRleHQoKS5sZW5ndGggPiAwKSBhbmQgKGtleXRhcj8pXG4gICAgICAgICAgICBrZXl0YXJSZXN1bHQgPSBrZXl0YXIucmVwbGFjZVBhc3N3b3JkKEBob3N0LmdldFNlcnZpY2VOYW1lUGFzc3dvcmQoKSwgQGhvc3QuZ2V0U2VydmljZUFjY291bnQoKSwgQHBhc3N3b3JkLmdldFRleHQoKSlcbiAgICAgICAgICAgIEBob3N0LnBhc3N3b3JkID0gXCIqKioqKiBrZXl0YXIgKioqKipcIlxuICAgICAgICAgIGVsc2UgaWYgYXRvbS5jb25maWcuZ2V0KCdyZW1vdGUtZWRpdC5zdG9yZVBhc3N3b3Jkc1VzaW5nS2V5dGFyJykgYW5kIChAcGFzc3dvcmQuZ2V0VGV4dCgpLmxlbmd0aCBpcyAwKSBhbmQgKGtleXRhcj8pXG4gICAgICAgICAgICBrZXl0YXIuZGVsZXRlUGFzc3dvcmQoQGhvc3QuZ2V0U2VydmljZU5hbWVQYXNzd29yZCgpLCBAaG9zdC5nZXRTZXJ2aWNlQWNjb3VudCgpKVxuICAgICAgICAgICAgQGhvc3QucGFzc3dvcmQgPSBcIlwiXG4gICAgICAgICAgZWxzZVxuICAgICAgICAgICAgQGhvc3QucGFzc3dvcmQgPSBAcGFzc3dvcmQuZ2V0VGV4dCgpXG4gICAgICBlbHNlIGlmIEBob3N0IGluc3RhbmNlb2YgRnRwSG9zdFxuICAgICAgICBAaG9zdC51c2VQYXNzd29yZCA9IHRydWVcbiAgICAgICAgaWYgYXRvbS5jb25maWcuZ2V0KCdyZW1vdGUtZWRpdC5zdG9yZVBhc3N3b3Jkc1VzaW5nS2V5dGFyJykgYW5kIChAcGFzc3dvcmQuZ2V0VGV4dCgpLmxlbmd0aCA+IDApIGFuZCAoa2V5dGFyPylcbiAgICAgICAgICBrZXl0YXJSZXN1bHQgPSBrZXl0YXIucmVwbGFjZVBhc3N3b3JkKEBob3N0LmdldFNlcnZpY2VOYW1lUGFzc3dvcmQoKSwgQGhvc3QuZ2V0U2VydmljZUFjY291bnQoKSwgQHBhc3N3b3JkLmdldFRleHQoKSlcbiAgICAgICAgICBAaG9zdC5wYXNzd29yZCA9IFwiKioqKioga2V5dGFyICoqKioqXCJcbiAgICAgICAgZWxzZSBpZiBhdG9tLmNvbmZpZy5nZXQoJ3JlbW90ZS1lZGl0LnN0b3JlUGFzc3dvcmRzVXNpbmdLZXl0YXInKSBhbmQgKEBwYXNzd29yZC5nZXRUZXh0KCkubGVuZ3RoIGlzIDApIGFuZCAoa2V5dGFyPylcbiAgICAgICAgICBrZXl0YXIuZGVsZXRlUGFzc3dvcmQoQGhvc3QuZ2V0U2VydmljZU5hbWVQYXNzd29yZCgpLCBAaG9zdC5nZXRTZXJ2aWNlQWNjb3VudCgpKVxuICAgICAgICAgIEBob3N0LnBhc3N3b3JkID0gXCJcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgQGhvc3QucGFzc3dvcmQgPSBAcGFzc3dvcmQuZ2V0VGV4dCgpXG4gICAgICBlbHNlXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlxcXCJob3N0XFxcIiBpcyBub3QgdmFsaWQgdHlwZSFcIiwgQGhvc3QpXG5cblxuXG4gICAgICBpZiBAaXBkdz9cbiAgICAgICAgQGlwZHcuZ2V0RGF0YSgpLnRoZW4oKGRhdGEpID0+XG4gICAgICAgICAgZGF0YS5hZGROZXdIb3N0KEBob3N0KVxuICAgICAgICApXG4gICAgICBlbHNlXG4gICAgICAgIEBob3N0LmludmFsaWRhdGUoKVxuXG4gICAgZGVzdHJveTogLT5cbiAgICAgIEBwYW5lbC5kZXN0cm95KCkgaWYgQHBhbmVsP1xuICAgICAgQGRpc3Bvc2FibGVzLmRpc3Bvc2UoKVxuXG4gICAgY2FuY2VsOiAtPlxuICAgICAgQGNhbmNlbGxlZCgpXG4gICAgICBAcmVzdG9yZUZvY3VzKClcbiAgICAgIEBkZXN0cm95KClcblxuICAgIGNhbmNlbGxlZDogLT5cbiAgICAgIEBoaWRlKClcblxuICAgIHRvZ2dsZTogLT5cbiAgICAgIGlmIEBwYW5lbD8uaXNWaXNpYmxlKClcbiAgICAgICAgQGNhbmNlbCgpXG4gICAgICBlbHNlXG4gICAgICAgIEBzaG93KClcblxuICAgIHNob3c6IC0+XG4gICAgICBpZiAoQGhvc3QgaW5zdGFuY2VvZiBTZnRwSG9zdClcbiAgICAgICAgQGF1dGhlbnRpY2F0aW9uQnV0dG9uc0Jsb2NrLnNob3coKVxuICAgICAgICBpZiBAaG9zdC51c2VQYXNzd29yZFxuICAgICAgICAgIEBwYXNzd29yZEJ1dHRvbi5jbGljaygpXG4gICAgICAgIGVsc2UgaWYgQGhvc3QudXNlUHJpdmF0ZUtleVxuICAgICAgICAgIEBwcml2YXRlS2V5QnV0dG9uLmNsaWNrKClcbiAgICAgICAgZWxzZSBpZiBAaG9zdC51c2VBZ2VudFxuICAgICAgICAgIEB1c2VyQWdlbnRCdXR0b24uY2xpY2soKVxuICAgICAgZWxzZSBpZiAoQGhvc3QgaW5zdGFuY2VvZiBGdHBIb3N0KVxuICAgICAgICBAYXV0aGVudGljYXRpb25CdXR0b25zQmxvY2suaGlkZSgpXG4gICAgICAgIEBwYXNzd29yZEJsb2NrLnNob3coKVxuICAgICAgICBAcHJpdmF0ZUtleUJsb2NrLmhpZGUoKVxuICAgICAgZWxzZVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJcXFwiaG9zdFxcXCIgaXMgdW5rbm93biFcIiwgQGhvc3QpXG5cbiAgICAgIEBwYW5lbCA/PSBhdG9tLndvcmtzcGFjZS5hZGRNb2RhbFBhbmVsKGl0ZW06IHRoaXMpXG4gICAgICBAcGFuZWwuc2hvdygpXG5cbiAgICAgIEBzdG9yZUZvY3VzZWRFbGVtZW50KClcbiAgICAgIEBob3N0bmFtZS5mb2N1cygpXG5cbiAgICBoaWRlOiAtPlxuICAgICAgQHBhbmVsPy5oaWRlKClcblxuICAgIHN0b3JlRm9jdXNlZEVsZW1lbnQ6IC0+XG4gICAgICBAcHJldmlvdXNseUZvY3VzZWRFbGVtZW50ID0gJChkb2N1bWVudC5hY3RpdmVFbGVtZW50KVxuXG4gICAgcmVzdG9yZUZvY3VzOiAtPlxuICAgICAgQHByZXZpb3VzbHlGb2N1c2VkRWxlbWVudD8uZm9jdXMoKVxuIl19
