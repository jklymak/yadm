(function() {
  var CompositeDisposable, File, ref;

  ref = require('atom'), CompositeDisposable = ref.CompositeDisposable, File = ref.File;

  module.exports = {
    config: {
      pythonPath: {
        type: 'string',
        "default": '/usr/bin/python',
        order: 1,
        title: 'Python Executable Path',
        description: "Optional path to python executable."
      },
      minPrefix: {
        type: 'integer',
        "default": 2,
        order: 2,
        title: 'Minimum word length',
        description: "Only autocomplete when you have typed at least this many characters. Note: autocomplete is always active for user-defined type fields."
      },
      preserveCase: {
        type: 'boolean',
        "default": true,
        order: 3,
        title: 'Preserve completion case',
        description: "Preserve case of suggestions from their defintion when inserting completions. Otherwise all suggestions will be lowercase."
      },
      useSnippets: {
        type: 'boolean',
        "default": true,
        order: 3,
        title: 'Use argument snippets',
        description: "Use snippets for function/subroutine arguments. See: https://github.com/atom/snippets for more information."
      }
    },
    provider: null,
    activate: function() {
      this.subscriptions = new CompositeDisposable;
      this.subscriptions.add(atom.commands.add('atom-workspace', {
        'autocomplete-fortran:rebuild': (function(_this) {
          return function() {
            return _this.rebuild();
          };
        })(this)
      }));
      this.subscriptions.add(atom.commands.add('atom-workspace', {
        'autocomplete-fortran:saveIndex': (function(_this) {
          return function() {
            return _this.saveIndex();
          };
        })(this)
      }));
      return this.subscriptions.add(atom.commands.add("atom-text-editor", {
        'autocomplete-fortran:go-declaration': (function(_this) {
          return function(e) {
            return _this.goDeclaration(atom.workspace.getActiveTextEditor(), e);
          };
        })(this)
      }));
    },
    deactivate: function() {
      this.subscriptions.dispose();
      return this.provider = null;
    },
    provide: function() {
      var FortranProvider;
      if (this.provider == null) {
        FortranProvider = require('./fortran-provider');
        this.provider = new FortranProvider();
      }
      return this.provider;
    },
    rebuild: function() {
      if (this.provider != null) {
        return this.provider.rebuildIndex();
      }
    },
    goDeclaration: function(editor, e) {
      var bufferRange, defPos, f, fileName, lineRef, ref1, splitInfo, varWord;
      editor.selectWordsContainingCursors();
      varWord = editor.getSelectedText();
      bufferRange = editor.getSelectedBufferRange();
      defPos = this.provider.goToDef(varWord, editor, bufferRange.end);
      if (defPos != null) {
        splitInfo = defPos.split(":");
        fileName = splitInfo[0];
        lineRef = splitInfo[1];
        f = new File(fileName);
        return f.exists().then(function(result) {
          if (result) {
            return atom.workspace.open(fileName, {
              initialLine: lineRef - 1,
              initialColumn: 0
            });
          }
        });
      } else {
        return (ref1 = atom.notifications) != null ? ref1.addWarning("Could not find definition: '" + varWord + "'", {
          dismissable: true
        }) : void 0;
      }
    },
    saveIndex: function() {
      return this.provider.saveIndex();
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvYXV0b2NvbXBsZXRlLWZvcnRyYW4vbGliL2F1dG9jb21wbGV0ZS1mb3J0cmFuLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUFBLE1BQUE7O0VBQUEsTUFBNkIsT0FBQSxDQUFRLE1BQVIsQ0FBN0IsRUFBQyw2Q0FBRCxFQUFxQjs7RUFFckIsTUFBTSxDQUFDLE9BQVAsR0FDRTtJQUFBLE1BQUEsRUFDRTtNQUFBLFVBQUEsRUFDRTtRQUFBLElBQUEsRUFBTSxRQUFOO1FBQ0EsQ0FBQSxPQUFBLENBQUEsRUFBUyxpQkFEVDtRQUVBLEtBQUEsRUFBTyxDQUZQO1FBR0EsS0FBQSxFQUFPLHdCQUhQO1FBSUEsV0FBQSxFQUFhLHFDQUpiO09BREY7TUFNQSxTQUFBLEVBQ0U7UUFBQSxJQUFBLEVBQU0sU0FBTjtRQUNBLENBQUEsT0FBQSxDQUFBLEVBQVMsQ0FEVDtRQUVBLEtBQUEsRUFBTyxDQUZQO1FBR0EsS0FBQSxFQUFPLHFCQUhQO1FBSUEsV0FBQSxFQUFhLHdJQUpiO09BUEY7TUFZQSxZQUFBLEVBQ0U7UUFBQSxJQUFBLEVBQU0sU0FBTjtRQUNBLENBQUEsT0FBQSxDQUFBLEVBQVMsSUFEVDtRQUVBLEtBQUEsRUFBTyxDQUZQO1FBR0EsS0FBQSxFQUFPLDBCQUhQO1FBSUEsV0FBQSxFQUFhLDRIQUpiO09BYkY7TUFrQkEsV0FBQSxFQUNFO1FBQUEsSUFBQSxFQUFNLFNBQU47UUFDQSxDQUFBLE9BQUEsQ0FBQSxFQUFTLElBRFQ7UUFFQSxLQUFBLEVBQU8sQ0FGUDtRQUdBLEtBQUEsRUFBTyx1QkFIUDtRQUlBLFdBQUEsRUFBYSw2R0FKYjtPQW5CRjtLQURGO0lBeUJBLFFBQUEsRUFBVSxJQXpCVjtJQTJCQSxRQUFBLEVBQVUsU0FBQTtNQUdSLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUk7TUFFckIsSUFBQyxDQUFBLGFBQWEsQ0FB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bSdcblxubW9kdWxlLmV4cG9ydHMgPVxuICBjb25maWc6XG4gICAgcHl0aG9uUGF0aDpcbiAgICAgIHR5cGU6ICdzdHJpbmcnXG4gICAgICBkZWZhdWx0OiAnL3Vzci9iaW4vcHl0aG9uJ1xuICAgICAgb3JkZXI6IDFcbiAgICAgIHRpdGxlOiAnUHl0aG9uIEV4ZWN1dGFibGUgUGF0aCdcbiAgICAgIGRlc2NyaXB0aW9uOiBcIk9wdGlvbmFsIHBhdGggdG8gcHl0aG9uIGV4ZWN1dGFibGUuXCJcbiAgICBtaW5QcmVmaXg6XG4gICAgICB0eXBlOiAnaW50ZWdlcidcbiAgICAgIGRlZmF1bHQ6IDJcbiAgICAgIG9yZGVyOiAyXG4gICAgICB0aXRsZTogJ01pbmltdW0gd29yZCBsZW5ndGgnXG4gICAgICBkZXNjcmlwdGlvbjogXCJPbmx5IGF1dG9jb21wbGV0ZSB3aGVuIHlvdSBoYXZlIHR5cGVkIGF0IGxlYXN0IHRoaXMgbWFueSBjaGFyYWN0ZXJzLiBOb3RlOiBhdXRvY29tcGxldGUgaXMgYWx3YXlzIGFjdGl2ZSBmb3IgdXNlci1kZWZpbmVkIHR5cGUgZmllbGRzLlwiXG4gICAgcHJlc2VydmVDYXNlOlxuICAgICAgdHlwZTogJ2Jvb2xlYW4nXG4gICAgICBkZWZhdWx0OiB0cnVlXG4gICAgICBvcmRlcjogM1xuICAgICAgdGl0bGU6ICdQcmVzZXJ2ZSBjb21wbGV0aW9uIGNhc2UnXG4gICAgICBkZXNjcmlwdGlvbjogXCJQcmVzZXJ2ZSBjYXNlIG9mIHN1Z2dlc3Rpb25zIGZyb20gdGhlaXIgZGVmaW50aW9uIHdoZW4gaW5zZXJ0aW5nIGNvbXBsZXRpb25zLiBPdGhlcndpc2UgYWxsIHN1Z2dlc3Rpb25zIHdpbGwgYmUgbG93ZXJjYXNlLlwiXG4gICAgdXNlU25pcHBldHM6XG4gICAgICB0eXBlOiAnYm9vbGVhbidcbiAgICAgIGRlZmF1bHQ6IHRydWVcbiAgICAgIG9yZGVyOiAzXG4gICAgICB0aXRsZTogJ1VzZSBhcmd1bWVudCBzbmlwcGV0cydcbiAgICAgIGRlc2NyaXB0aW9uOiBcIlVzZSBzbmlwcGV0cyBmb3IgZnVuY3Rpb24vc3Vicm91dGluZSBhcmd1bWVudHMuIFNlZTogaHR0cHM6Ly9naXRodWIuY29tL2F0b20vc25pcHBldHMgZm9yIG1vcmUgaW5mb3JtYXRpb24uXCJcbiAgcHJvdmlkZXI6IG51bGxcblxuICBhY3RpdmF0ZTogLT5cbiAgICAjY29uc29sZS5sb2cgJ0FjdGl2YXRlZCBBQy1Gb3J0cmFuISdcbiAgICAjIEV2ZW50cyBzdWJzY3JpYmVkIHRvIGluIGF0b20ncyBzeXN0ZW0gY2FuIGJlIGVhc2lseSBjbGVhbmVkIHVwIHdpdGggYSBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgQHN1YnNjcmlwdGlvbnMgPSBuZXcgQ29tcG9zaXRlRGlzcG9zYWJsZVxuICAgICMgUmVnaXN0ZXIgY29tbWFuZCB0aGF0IHJlYnVpbGRzIGluZGV4XG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIGF0b20uY29tbWFuZHMuYWRkICdhdG9tLXdvcmtzcGFjZScsXG4gICAgICAnYXV0b2NvbXBsZXRlLWZvcnRyYW46cmVidWlsZCc6ID0+IEByZWJ1aWxkKClcbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgYXRvbS5jb21tYW5kcy5hZGQgJ2F0b20td29ya3NwYWNlJyxcbiAgICAgICdhdXRvY29tcGxldGUtZm9ydHJhbjpzYXZlSW5kZXgnOiA9PiBAc2F2ZUluZGV4KClcbiAgICBAc3Vic2NyaXB0aW9ucy5hZGQgYXRvbS5jb21tYW5kcy5hZGQgXCJhdG9tLXRleHQtZWRpdG9yXCIsXG4gICAgICAnYXV0b2NvbXBsZXRlLWZvcnRyYW46Z28tZGVjbGFyYXRpb24nOiAoZSk9PiBAZ29EZWNsYXJhdGlvbiBhdG9tLndvcmtzcGFjZS5nZXRBY3RpdmVUZXh0RWRpdG9yKCksZVxuXG4gIGRlYWN0aXZhdGU6IC0+XG4gICAgQHN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG4gICAgQHByb3ZpZGVyID0gbnVsbFxuXG4gIHByb3ZpZGU6IC0+XG4gICAgdW5sZXNzIEBwcm92aWRlcj9cbiAgICAgIEZvcnRyYW5Qcm92aWRlciA9IHJlcXVpcmUoJy4vZm9ydHJhbi1wcm92aWRlcicpXG4gICAgICBAcHJvdmlkZXIgPSBuZXcgRm9ydHJhblByb3ZpZGVyKClcbiAgICBAcHJvdmlkZXJcblxuICByZWJ1aWxkOiAoKS0+XG4gICAgI2NvbnNvbGUubG9nIFwiUmVidWlsZCB0cmlnZ2VyZWRcIlxuICAgIGlmIEBwcm92aWRlcj9cbiAgICAgIEBwcm92aWRlci5yZWJ1aWxkSW5kZXgoKVxuXG4gIGdvRGVjbGFyYXRpb246IChlZGl0b3IsIGUpLT5cbiAgICBlZGl0b3Iuc2VsZWN0V29yZHNDb250YWluaW5nQ3Vyc29ycygpXG4gICAgdmFyV29yZCA9IGVkaXRvci5nZXRTZWxlY3RlZFRleHQoKVxuICAgIGJ1ZmZlclJhbmdlID0gZWRpdG9yLmdldFNlbGVjdGVkQnVmZmVyUmFuZ2UoKVxuICAgIGRlZlBvcyA9IEBwcm92aWRlci5nb1RvRGVmKHZhcldvcmQsIGVkaXRvciwgYnVmZmVyUmFuZ2UuZW5kKVxuICAgICNjb25zb2xlLmxvZyBkZWZQb3NcbiAgICBpZiBkZWZQb3M/XG4gICAgICBzcGxpdEluZm8gPSBkZWZQb3Muc3BsaXQoXCI6XCIpXG4gICAgICBmaWxlTmFtZSA9IHNwbGl0SW5mb1swXVxuICAgICAgbGluZVJlZiA9IHNwbGl0SW5mb1sxXVxuICAgICAgZiA9IG5ldyBGaWxlIGZpbGVOYW1lXG4gICAgICBmLmV4aXN0cygpLnRoZW4gKHJlc3VsdCkgLT5cbiAgICAgICAgYXRvbS53b3Jrc3BhY2Uub3BlbiBmaWxlTmFtZSwge2luaXRpYWxMaW5lOmxpbmVSZWYtMSwgaW5pdGlhbENvbHVtbjowfSBpZiByZXN1bHRcbiAgICBlbHNlXG4gICAgICBhdG9tLm5vdGlmaWNhdGlvbnM/LmFkZFdhcm5pbmcoXCJDb3VsZCBub3QgZmluZCBkZWZpbml0aW9uOiAnI3t2YXJXb3JkfSdcIiwge1xuICAgICAgICBkaXNtaXNzYWJsZTogdHJ1ZVxuICAgICAgfSlcblxuICBzYXZlSW5kZXg6ICgpIC0+XG4gICAgQHByb3ZpZGVyLnNhdmVJbmRleCgpXG4iXX0=
