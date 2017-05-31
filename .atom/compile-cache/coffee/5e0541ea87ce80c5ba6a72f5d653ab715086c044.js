(function() {
  var $, $$, CompositeDisposable, Dialog, TextEditorView, View, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  ref = require('atom-space-pen-views'), $ = ref.$, $$ = ref.$$, View = ref.View, TextEditorView = ref.TextEditorView;

  CompositeDisposable = require('atom').CompositeDisposable;

  module.exports = Dialog = (function(superClass) {
    extend(Dialog, superClass);

    function Dialog() {
      return Dialog.__super__.constructor.apply(this, arguments);
    }

    Dialog.content = function(arg) {
      var prompt;
      prompt = (arg != null ? arg : {}).prompt;
      return this.div({
        "class": 'dialog'
      }, (function(_this) {
        return function() {
          _this.label(prompt, {
            "class": 'icon',
            outlet: 'promptText'
          });
          _this.subview('miniEditor', new TextEditorView({
            mini: true
          }));
          return _this.div({
            "class": 'error-message',
            outlet: 'errorMessage'
          });
        };
      })(this));
    };

    Dialog.prototype.initialize = function(arg) {
      var iconClass;
      iconClass = (arg != null ? arg : {}).iconClass;
      if (iconClass) {
        this.promptText.addClass(iconClass);
      }
      this.disposables = new CompositeDisposable;
      this.disposables.add(atom.commands.add('atom-workspace', {
        'core:confirm': (function(_this) {
          return function() {
            return _this.onConfirm(_this.miniEditor.getText());
          };
        })(this),
        'core:cancel': (function(_this) {
          return function(event) {
            _this.cancel();
            return event.stopPropagation();
          };
        })(this)
      }));
      this.miniEditor.getModel().onDidChange((function(_this) {
        return function() {
          return _this.showError();
        };
      })(this));
      return this.miniEditor.on('blur', (function(_this) {
        return function() {
          return _this.cancel();
        };
      })(this));
    };

    Dialog.prototype.onConfirm = function(value) {
      if (typeof this.callback === "function") {
        this.callback(void 0, value);
      }
      this.cancel();
      return value;
    };

    Dialog.prototype.showError = function(message) {
      if (message == null) {
        message = '';
      }
      this.errorMessage.text(message);
      if (message) {
        return this.flashError();
      }
    };

    Dialog.prototype.destroy = function() {
      return this.disposables.dispose();
    };

    Dialog.prototype.cancel = function() {
      this.cancelled();
      this.restoreFocus();
      return this.destroy();
    };

    Dialog.prototype.cancelled = function() {
      return this.hide();
    };

    Dialog.prototype.toggle = function(callback) {
      var ref1;
      this.callback = callback;
      if ((ref1 = this.panel) != null ? ref1.isVisible() : void 0) {
        return this.cancel();
      } else {
        return this.show();
      }
    };

    Dialog.prototype.show = function() {
      if (this.panel == null) {
        this.panel = atom.workspace.addModalPanel({
          item: this
        });
      }
      this.panel.show();
      this.storeFocusedElement();
      return this.miniEditor.focus();
    };

    Dialog.prototype.hide = function() {
      var ref1;
      return (ref1 = this.panel) != null ? ref1.hide() : void 0;
    };

    Dialog.prototype.storeFocusedElement = function() {
      return this.previouslyFocusedElement = $(document.activeElement);
    };

    Dialog.prototype.restoreFocus = function() {
      var ref1;
      return (ref1 = this.previouslyFocusedElement) != null ? ref1.focus() : void 0;
    };

    return Dialog;

  })(View);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWVkaXQyL2xpYi92aWV3L2RpYWxvZy5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBLDZEQUFBO0lBQUE7OztFQUFBLE1BQWdDLE9BQUEsQ0FBUSxzQkFBUixDQUFoQyxFQUFDLFNBQUQsRUFBSSxXQUFKLEVBQVEsZUFBUixFQUFjOztFQUNiLHNCQUF1QixPQUFBLENBQVEsTUFBUjs7RUFFeEIsTUFBTSxDQUFDLE9BQVAsR0FDTTs7Ozs7OztJQUNKLE1BQUMsQ0FBQSxPQUFELEdBQVUsU0FBQyxHQUFEO0FBQ1IsVUFBQTtNQURVLHdCQUFELE1BQVc7YUFDcEIsSUFBQyxDQUFBLEdBQUQsQ0FBSztRQUFBLENBQUEsS0FBQSxDQUFBLEVBQU8sUUFBUDtPQUFMLEVBQXNCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtVQUNwQixLQUFDLENBQUEsS0FBRCxDQUFPLE1BQVAsRUFBZTtZQUFBLENBQUEsS0FBQSxDQUFBLEVBQU8sTUFBUDtZQUFlLE1BQUEsRUFBUSxZQUF2QjtXQUFmO1VBQ0EsS0FBQyxDQUFBLE9BQUQsQ0FBUyxZQUFULEVBQTJCLElBQUEsY0FBQSxDQUFlO1lBQUEsSUFBQSxFQUFNLElBQU47V0FBZixDQUEzQjtpQkFDQSxLQUFDLENBQUEsR0FBRCxDQUFLO1lBQUEsQ0FBQSxLQUFBLENBQUEsRUFBTyxlQUFQO1lBQXdCLE1BQUEsRUFBUSxjQUFoQztXQUFMO1FBSG9CO01BQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUF0QjtJQURROztxQkFNVixVQUFBLEdBQVksU0FBQyxHQUFEO0FBQ1YsVUFBQTtNQURZLDJCQUFELE1BQWM7TUFDekIsSUFBbUMsU0FBbkM7UUFBQSxJQUFDLENBQUEsVUFBVSxDQUFDLFFBQVosQ0FBcUIsU0FBckIsRUFBQTs7TUFFQSxJQUFDLENBQUEsV0FBRCxHQUFlLElBQUk7TUFDbkIsSUFBQyxDQUFBLFdBQVcsQ0FBQyxHQUFiLENBQWlCLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBZCxDQUFrQixnQkFBbEIsRUFDZjtRQUFBLGNBQUEsRUFBZ0IsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQTttQkFBRyxLQUFDLENBQUEsU0FBRCxDQUFXLEtBQUMsQ0FBQSxVQUFVLENBQUMsT0FBWixDQUFBLENBQVg7VUFBSDtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBaEI7UUFDQSxhQUFBLEVBQWUsQ0FBQSxTQUFBLEtBQUE7aUJBQUEsU0FBQyxLQUFEO1lBQ2IsS0FBQyxDQUFBLE1BQUQsQ0FBQTttQkFDQSxLQUFLLENBQUMsZUFBTixDQUFBO1VBRmE7UUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBRGY7T0FEZSxDQUFqQjtNQU1BLElBQUMsQ0FBQSxVQUFVLENBQUMsUUFBWixDQUFBLENBQXNCLENBQUMsV0FBdkIsQ0FBbUMsQ0FBQSxTQUFBLEtBQUE7ZUFBQSxTQUFBO2lCQUFHLEtBQUMsQ0FBQSxTQUFELENBQUE7UUFBSDtNQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbkM7YUFDQSxJQUFDLENBQUEsVUFBVSxDQUFDLEVBQVosQ0FBZSxNQUFmLEVBQXVCLENBQUEsU0FBQSxLQUFBO2VBQUEsU0FBQTtpQkFBRyxLQUFDLENBQUEsTUFBRCxDQUFBO1FBQUg7TUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBLENBQXZCO0lBWFU7O3FCQWFaLFNBQUEsR0FBVyxTQUFDLEtBQUQ7O1FBQ1QsSUFBQyxDQUFBLFNBQVUsUUFBVzs7TUFDdEIsSUFBQyxDQUFBLE1BQUQsQ0FBQTthQUNBO0lBSFM7O3FCQUtYLFNBQUEsR0FBVyxTQUFDLE9BQUQ7O1FBQUMsVUFBUTs7TUFDbEIsSUFBQyxDQUFBLFlBQVksQ0FBQyxJQUFkLENBQW1CLE9BQW5CO01BQ0EsSUFBaUIsT0FBakI7ZUFBQSxJQUFDLENBQUEsVUFBRCxDQUFBLEVBQUE7O0lBRlM7O3FCQUlYLE9BQUEsR0FBUyxTQUFBO2FBQ1AsSUFBQyxDQUFBLFdBQVcsQ0FBQyxPQUFiLENBQUE7SUFETzs7cUJBR1QsTUFBQSxHQUFRLFNBQUE7TUFDTixJQUFDLENBQUEsU0FBRCxDQUFBO01BQ0EsSUFBQyxDQUFBLFlBQUQsQ0FBQTthQUNBLElBQUMsQ0FBQSxPQUFELENBQUE7SUFITTs7cUJBS1IsU0FBQSxHQUFXLFNBQUE7YUFDVCxJQUFDLENBQUEsSUFBRCxDQUFBO0lBRFM7O3FCQUdYLE1BQUEsR0FBUSxTQUFDLFFBQUQ7QUFDTixVQUFBO01BRE8sSUFBQyxDQUFBLFdBQUQ7TUFDUCxzQ0FBUyxDQUFFLFNBQVIsQ0FBQSxVQUFIO2VBQ0UsSUFBQyxDQUFBLE1BQUQsQ0FBQSxFQURGO09BQUEsTUFBQTtlQUdFLElBQUMsQ0FBQSxJQUFELENBQUEsRUFIRjs7SUFETTs7cUJBTVIsSUFBQSxHQUFNLFNBQUE7O1FBQ0osSUFBQyxDQUFBLFFBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxhQUFmLENBQTZCO1VBQUEsSUFBQSxFQUFNLElBQU47U0FBN0I7O01BQ1YsSUFBQyxDQUFBLEtBQUssQ0FBQyxJQUFQLENBQUE7TUFDQSxJQUFDLENBQUEsbUJBQUQsQ0FBQTthQUNBLElBQUMsQ0FBQSxVQUFVLENBQUMsS0FBWixDQUFBO0lBSkk7O3FCQU1OLElBQUEsR0FBTSxTQUFBO0FBQ0osVUFBQTsrQ0FBTSxDQUFFLElBQVIsQ0FBQTtJQURJOztxQkFHTixtQkFBQSxHQUFxQixTQUFBO2FBQ25CLElBQUMsQ0FBQSx3QkFBRCxHQUE0QixDQUFBLENBQUUsUUFBUSxDQUFDLGFBQVg7SUFEVDs7cUJBR3JCLFlBQUEsR0FBYyxTQUFBO0FBQ1osVUFBQTtrRUFBeUIsQ0FBRSxLQUEzQixDQUFBO0lBRFk7Ozs7S0ExREs7QUFKckIiLCJzb3VyY2VzQ29udGVudCI6WyJ7JCwgJCQsIFZpZXcsIFRleHRFZGl0b3JWaWV3fSA9IHJlcXVpcmUgJ2F0b20tc3BhY2UtcGVuLXZpZXdzJ1xue0NvbXBvc2l0ZURpc3Bvc2FibGV9ID0gcmVxdWlyZSAnYXRvbSdcblxubW9kdWxlLmV4cG9ydHMgPVxuY2xhc3MgRGlhbG9nIGV4dGVuZHMgVmlld1xuICBAY29udGVudDogKHtwcm9tcHR9ID0ge30pIC0+XG4gICAgQGRpdiBjbGFzczogJ2RpYWxvZycsID0+XG4gICAgICBAbGFiZWwgcHJvbXB0LCBjbGFzczogJ2ljb24nLCBvdXRsZXQ6ICdwcm9tcHRUZXh0J1xuICAgICAgQHN1YnZpZXcgJ21pbmlFZGl0b3InLCBuZXcgVGV4dEVkaXRvclZpZXcobWluaTogdHJ1ZSlcbiAgICAgIEBkaXYgY2xhc3M6ICdlcnJvci1tZXNzYWdlJywgb3V0bGV0OiAnZXJyb3JNZXNzYWdlJ1xuXG4gIGluaXRpYWxpemU6ICh7aWNvbkNsYXNzfSA9IHt9KSAtPlxuICAgIEBwcm9tcHRUZXh0LmFkZENsYXNzKGljb25DbGFzcykgaWYgaWNvbkNsYXNzXG5cbiAgICBAZGlzcG9zYWJsZXMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgIEBkaXNwb3NhYmxlcy5hZGQgYXRvbS5jb21tYW5kcy5hZGQgJ2F0b20td29ya3NwYWNlJyxcbiAgICAgICdjb3JlOmNvbmZpcm0nOiA9PiBAb25Db25maXJtKEBtaW5pRWRpdG9yLmdldFRleHQoKSlcbiAgICAgICdjb3JlOmNhbmNlbCc6IChldmVudCkgPT5cbiAgICAgICAgQGNhbmNlbCgpXG4gICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpXG5cbiAgICBAbWluaUVkaXRvci5nZXRNb2RlbCgpLm9uRGlkQ2hhbmdlID0+IEBzaG93RXJyb3IoKVxuICAgIEBtaW5pRWRpdG9yLm9uICdibHVyJywgPT4gQGNhbmNlbCgpXG5cbiAgb25Db25maXJtOiAodmFsdWUpIC0+XG4gICAgQGNhbGxiYWNrPyh1bmRlZmluZWQsIHZhbHVlKVxuICAgIEBjYW5jZWwoKVxuICAgIHZhbHVlXG5cbiAgc2hvd0Vycm9yOiAobWVzc2FnZT0nJykgLT5cbiAgICBAZXJyb3JNZXNzYWdlLnRleHQobWVzc2FnZSlcbiAgICBAZmxhc2hFcnJvcigpIGlmIG1lc3NhZ2VcblxuICBkZXN0cm95OiAtPlxuICAgIEBkaXNwb3NhYmxlcy5kaXNwb3NlKClcblxuICBjYW5jZWw6IC0+XG4gICAgQGNhbmNlbGxlZCgpXG4gICAgQHJlc3RvcmVGb2N1cygpXG4gICAgQGRlc3Ryb3koKVxuXG4gIGNhbmNlbGxlZDogLT5cbiAgICBAaGlkZSgpXG5cbiAgdG9nZ2xlOiAoQGNhbGxiYWNrKSAtPlxuICAgIGlmIEBwYW5lbD8uaXNWaXNpYmxlKClcbiAgICAgIEBjYW5jZWwoKVxuICAgIGVsc2VcbiAgICAgIEBzaG93KClcblxuICBzaG93OiAoKSAtPlxuICAgIEBwYW5lbCA/PSBhdG9tLndvcmtzcGFjZS5hZGRNb2RhbFBhbmVsKGl0ZW06IHRoaXMpXG4gICAgQHBhbmVsLnNob3coKVxuICAgIEBzdG9yZUZvY3VzZWRFbGVtZW50KClcbiAgICBAbWluaUVkaXRvci5mb2N1cygpXG5cbiAgaGlkZTogLT5cbiAgICBAcGFuZWw/LmhpZGUoKVxuXG4gIHN0b3JlRm9jdXNlZEVsZW1lbnQ6IC0+XG4gICAgQHByZXZpb3VzbHlGb2N1c2VkRWxlbWVudCA9ICQoZG9jdW1lbnQuYWN0aXZlRWxlbWVudClcblxuICByZXN0b3JlRm9jdXM6IC0+XG4gICAgQHByZXZpb3VzbHlGb2N1c2VkRWxlbWVudD8uZm9jdXMoKVxuIl19
