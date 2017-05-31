(function() {
  var CompositeDisposable, Point, Range, ref;

  ref = require('atom'), CompositeDisposable = ref.CompositeDisposable, Point = ref.Point, Range = ref.Range;

  module.exports = {
    subscriptions: null,
    activate: function() {
      this.subscriptions = new CompositeDisposable;
      return this.subscriptions.add(atom.commands.add('atom-workspace', {
        'language-fortran:toggleComment': (function(_this) {
          return function() {
            return _this.toggleComment();
          };
        })(this)
      }));
    },
    deactivate: function() {
      return this.subscriptions.dispose();
    },
    toggleComment: function() {
      var buffer, commentToken, editor, end, endRow, i, len, range, ref1, results, row, selection, start, startRow;
      commentToken = "C";
      if (editor = atom.workspace.getActiveTextEditor()) {
        if (editor.getGrammar().scopeName === 'source.fortran.fixed') {
          if (buffer = editor.getBuffer()) {
            ref1 = editor.getSelections();
            results = [];
            for (i = 0, len = ref1.length; i < len; i++) {
              selection = ref1[i];
              range = selection.getBufferRange();
              start = range.start;
              end = range.end;
              startRow = start.row;
              endRow = end.row;
              results.push((function() {
                var j, ref2, ref3, results1;
                results1 = [];
                for (row = j = ref2 = startRow, ref3 = endRow; ref2 <= ref3 ? j <= ref3 : j >= ref3; row = ref2 <= ref3 ? ++j : --j) {
                  if (this.isCommentLine(row)) {
                    results1.push(this.removeCommentToken(buffer, row, commentToken));
                  } else {
                    results1.push(this.addCommentToken(buffer, row, commentToken));
                  }
                }
                return results1;
              }).call(this));
            }
            return results;
          }
        }
      }
    },
    addCommentToken: function(buffer, row, token) {
      var range, replaceText, rowText, rowTextLength;
      rowText = buffer.lineForRow(row);
      rowTextLength = rowText.length;
      replaceText = token + rowText;
      range = [[row, 0], [row, rowTextLength]];
      return buffer.setTextInRange(range, replaceText);
    },
    removeCommentToken: function(buffer, row, token) {
      var range, replaceText, rowText, rowTextLength, tokenLength;
      tokenLength = token.length;
      rowText = buffer.lineForRow(row);
      rowTextLength = rowText.length;
      replaceText = rowText.substring(tokenLength);
      range = [[row, 0], [row, rowTextLength]];
      return buffer.setTextInRange(range, replaceText);
    },
    isCommentLine: function(row) {
      var editor, i, isCommented, len, point, scope, scopes;
      isCommented = false;
      point = [row, 0];
      editor = atom.workspace.getActiveTextEditor();
      scopes = editor.scopeDescriptorForBufferPosition(point).getScopesArray();
      if (scopes.length > 1) {
        for (i = 0, len = scopes.length; i < len; i++) {
          scope = scopes[i];
          if (scope.match(/comment/g)) {
            isCommented = true;
            return isCommented;
          }
        }
      }
      return isCommented;
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvbGFuZ3VhZ2UtZm9ydHJhbi9saWIvbGFuZ3VhZ2UtZm9ydHJhbi5jb2ZmZWUiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFBQSxNQUFBOztFQUFBLE1BQXNDLE9BQUEsQ0FBUSxNQUFSLENBQXRDLEVBQUMsNkNBQUQsRUFBc0IsaUJBQXRCLEVBQTZCOztFQUU3QixNQUFNLENBQUMsT0FBUCxHQUNFO0lBQUEsYUFBQSxFQUFlLElBQWY7SUFFQSxRQUFBLEVBQVUsU0FBQTtNQUNSLElBQUMsQ0FBQSxhQUFELEdBQWlCLElBQUk7YUFDckIsSUFBQyxDQUFBLGFBQWEsQ0FBQyxHQUFmLENBQW1CLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBZCxDQUFrQixnQkFBbEIsRUFDakI7UUFBQSxnQ0FBQSxFQUFrQyxDQUFBLFNBQUEsS0FBQTtpQkFBQSxTQUFBO21CQUFHLEtBQUMsQ0FBQSxhQUFELENBQUE7VUFBSDtRQUFBLENBQUEsQ0FBQSxDQUFBLElBQUEsQ0FBbEM7T0FEaUIsQ0FBbkI7SUFGUSxDQUZWO0lBT0EsVUFBQSxFQUFZLFNBQUE7YUFDVixJQUFDLENBQUEsYUFBYSxDQUFDLE9BQWYsQ0FBQTtJQURVLENBUFo7SUFXQSxhQUFBLEVBQWUsU0FBQTtBQUNiLFVBQUE7TUFBQSxZQUFBLEdBQWU7TUFDZixJQUFHLE1BQUEsR0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFmLENBQUEsQ0FBWjtRQUNFLElBQUcsTUFBTSxDQUFDLFVBQVAsQ0FBQSxDQUFtQixDQUFDLFNBQXBCLEtBQWlDLHNCQUFwQztVQUNFLElBQUcsTUFBQSxHQUFTLE1BQU0sQ0FBQyxTQUFQLENBQUEsQ0FBWjtBQUNFO0FBQUE7aUJBQUEsc0NBQUE7O2NBQ0UsS0FBQSxHQUFRLFNBQVMsQ0FBQyxjQUFWLENBQUE7Y0FDUixLQUFBLEdBQVEsS0FBSyxDQUFDO2NBQ2QsR0FBQSxHQUFNLEtBQUssQ0FBQztjQUNaLFFBQUEsR0FBVyxLQUFLLENBQUM7Y0FDakIsTUFBQSxHQUFTLEdBQUcsQ0FBQzs7O0FBQ2I7cUJBQVcsOEdBQVg7a0JBQ0UsSUFBRyxJQUFDLENBQUEsYUFBRCxDQUFlLEdBQWYsQ0FBSDtrQ0FDRSxJQUFDLENBQUEsa0JBQUQsQ0FBb0IsTUFBcEIsRUFBNEIsR0FBNUIsRUFBaUMsWUFBakMsR0FERjttQkFBQSxNQUFBO2tDQUdFLElBQUMsQ0FBQSxlQUFELENBQWlCLE1BQWpCLEVBQXlCLEdBQXpCLEVBQThCLFlBQTlCLEdBSEY7O0FBREY7OztBQU5GOzJCQURGO1dBREY7U0FERjs7SUFGYSxDQVhmO0lBNkJBLGVBQUEsRUFBaUIsU0FBQyxNQUFELEVBQVMsR0FBVCxFQUFjLEtBQWQ7QUFDZixVQUFBO01BQUEsT0FBQSxHQUFVLE1BQU0sQ0FBQyxVQUFQLENBQWtCLEdBQWxCO01BQ1YsYUFBQSxHQUFnQixPQUFPLENBQUM7TUFDeEIsV0FBQSxHQUFjLEtBQUEsR0FBUTtNQUN0QixLQUFBLEdBQVEsQ0FBQyxDQUFDLEdBQUQsRUFBTSxDQUFOLENBQUQsRUFBVyxDQUFDLEdBQUQsRUFBTSxhQUFOLENBQVg7YUFDUixNQUFNLENBQUMsY0FBUCxDQUFzQixLQUF0QixFQUE2QixXQUE3QjtJQUxlLENBN0JqQjtJQXFDQSxrQkFBQSxFQUFvQixTQUFDLE1BQUQsRUFBUyxHQUFULEVBQWMsS0FBZDtBQUNsQixVQUFBO01BQUEsV0FBQSxHQUFjLEtBQUssQ0FBQztNQUNwQixPQUFBLEdBQVUsTUFBTSxDQUFDLFVBQVAsQ0FBa0IsR0FBbEI7TUFDVixhQUFBLEdBQWdCLE9BQU8sQ0FBQztNQUN4QixXQUFBLEdBQWMsT0FBTyxDQUFDLFNBQVIsQ0FBa0IsV0FBbEI7TUFDZCxLQUFBLEdBQVEsQ0FBQyxDQUFDLEdBQUQsRUFBTSxDQUFOLENBQUQsRUFBVyxDQUFDLEdBQUQsRUFBTSxhQUFOLENBQVg7YUFDUixNQUFNLENBQUMsY0FBUCxDQUFzQixLQUF0QixFQUE2QixXQUE3QjtJQU5rQixDQXJDcEI7SUE4Q0EsYUFBQSxFQUFlLFNBQUMsR0FBRDtBQUNiLFVBQUE7TUFBQSxXQUFBLEdBQWM7TUFDZCxLQUFBLEdBQVEsQ0FBQyxHQUFELEVBQUssQ0FBTDtNQUNSLE1BQUEsR0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFmLENBQUE7TUFDVCxNQUFBLEdBQVMsTUFBTSxDQUFDLGdDQUFQLENBQXdDLEtBQXhDLENBQThDLENBQUMsY0FBL0MsQ0FBQTtNQUNULElBQUcsTUFBTSxDQUFDLE1BQVAsR0FBZ0IsQ0FBbkI7QUFDRSxhQUFBLHdDQUFBOztVQUNFLElBQUcsS0FBSyxDQUFDLEtBQU4sQ0FBWSxVQUFaLENBQUg7WUFDRSxXQUFBLEdBQWM7QUFDZCxtQkFBTyxZQUZUOztBQURGLFNBREY7O0FBS0EsYUFBTztJQVZNLENBOUNmOztBQUhGIiwic291cmNlc0NvbnRlbnQiOlsie0NvbXBvc2l0ZURpc3Bvc2FibGUsIFBvaW50LCBSYW5nZX0gPSByZXF1aXJlICdhdG9tJ1xuXG5tb2R1bGUuZXhwb3J0cyA9XG4gIHN1YnNjcmlwdGlvbnM6IG51bGxcblxuICBhY3RpdmF0ZTogLT5cbiAgICBAc3Vic2NyaXB0aW9ucyA9IG5ldyBDb21wb3NpdGVEaXNwb3NhYmxlXG4gICAgQHN1YnNjcmlwdGlvbnMuYWRkIGF0b20uY29tbWFuZHMuYWRkICdhdG9tLXdvcmtzcGFjZScsXG4gICAgICAnbGFuZ3VhZ2UtZm9ydHJhbjp0b2dnbGVDb21tZW50JzogPT4gQHRvZ2dsZUNvbW1lbnQoKVxuXG4gIGRlYWN0aXZhdGU6IC0+XG4gICAgQHN1YnNjcmlwdGlvbnMuZGlzcG9zZSgpXG5cbiAgIyB0b2dnbGVzIGNvbW1lbnRzIG9uIGFuZCBvZmYgZm9yIGVhY2ggc2VsZWN0ZWQgbGluZSBpbiB0aGUgYWN0aXZlIGJ1ZmZlclxuICB0b2dnbGVDb21tZW50OiAtPlxuICAgIGNvbW1lbnRUb2tlbiA9IFwiQ1wiXG4gICAgaWYgZWRpdG9yID0gYXRvbS53b3Jrc3BhY2UuZ2V0QWN0aXZlVGV4dEVkaXRvcigpXG4gICAgICBpZiBlZGl0b3IuZ2V0R3JhbW1hcigpLnNjb3BlTmFtZSBpcyAnc291cmNlLmZvcnRyYW4uZml4ZWQnXG4gICAgICAgIGlmIGJ1ZmZlciA9IGVkaXRvci5nZXRCdWZmZXIoKVxuICAgICAgICAgIGZvciBzZWxlY3Rpb24gaW4gZWRpdG9yLmdldFNlbGVjdGlvbnMoKVxuICAgICAgICAgICAgcmFuZ2UgPSBzZWxlY3Rpb24uZ2V0QnVmZmVyUmFuZ2UoKVxuICAgICAgICAgICAgc3RhcnQgPSByYW5nZS5zdGFydFxuICAgICAgICAgICAgZW5kID0gcmFuZ2UuZW5kXG4gICAgICAgICAgICBzdGFydFJvdyA9IHN0YXJ0LnJvd1xuICAgICAgICAgICAgZW5kUm93ID0gZW5kLnJvd1xuICAgICAgICAgICAgZm9yIHJvdyBpbiBbc3RhcnRSb3cuLmVuZFJvd11cbiAgICAgICAgICAgICAgaWYgQGlzQ29tbWVudExpbmUocm93KVxuICAgICAgICAgICAgICAgIEByZW1vdmVDb21tZW50VG9rZW4oYnVmZmVyLCByb3csIGNvbW1lbnRUb2tlbilcbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEBhZGRDb21tZW50VG9rZW4oYnVmZmVyLCByb3csIGNvbW1lbnRUb2tlbilcblxuICAjIGFkZCBhIGNvbW1lbnQgdG9rZW4gdG8gdGhlIHN0YXJ0IG9mIHRoZSBnaXZlbiByb3dcbiAgYWRkQ29tbWVudFRva2VuOiAoYnVmZmVyLCByb3csIHRva2VuKSAtPlxuICAgIHJvd1RleHQgPSBidWZmZXIubGluZUZvclJvdyhyb3cpXG4gICAgcm93VGV4dExlbmd0aCA9IHJvd1RleHQubGVuZ3RoXG4gICAgcmVwbGFjZVRleHQgPSB0b2tlbiArIHJvd1RleHRcbiAgICByYW5nZSA9IFtbcm93LCAwXSwgW3Jvdywgcm93VGV4dExlbmd0aF1dXG4gICAgYnVmZmVyLnNldFRleHRJblJhbmdlKHJhbmdlLCByZXBsYWNlVGV4dClcblxuICAjIHJlbW92ZXMgY2hhcmFjdGVycyBlcXVhbCB0byB0aGUgdG9rZW4gbGVuZ3RoIGZyb20gdGhlIHN0YXJ0IG9mIHRoZSBnaXZlbiByb3dcbiAgcmVtb3ZlQ29tbWVudFRva2VuOiAoYnVmZmVyLCByb3csIHRva2VuKSAtPlxuICAgIHRva2VuTGVuZ3RoID0gdG9rZW4ubGVuZ3RoXG4gICAgcm93VGV4dCA9IGJ1ZmZlci5saW5lRm9yUm93KHJvdylcbiAgICByb3dUZXh0TGVuZ3RoID0gcm93VGV4dC5sZW5ndGhcbiAgICByZXBsYWNlVGV4dCA9IHJvd1RleHQuc3Vic3RyaW5nKHRva2VuTGVuZ3RoKVxuICAgIHJhbmdlID0gW1tyb3csIDBdLCBbcm93LCByb3dUZXh0TGVuZ3RoXV1cbiAgICBidWZmZXIuc2V0VGV4dEluUmFuZ2UocmFuZ2UsIHJlcGxhY2VUZXh0KVxuXG4gICMgZGV0ZXJtaW5lcyBpZiB0aGUgbGluZSBjb250YWluaW5nIHRoZSBnaXZlbiBwb2ludCBpcyBhIGNvbW1lbnRlZCBsaW5lLlxuICBpc0NvbW1lbnRMaW5lOiAocm93KSAtPlxuICAgIGlzQ29tbWVudGVkID0gZmFsc2VcbiAgICBwb2ludCA9IFtyb3csMF1cbiAgICBlZGl0b3IgPSBhdG9tLndvcmtzcGFjZS5nZXRBY3RpdmVUZXh0RWRpdG9yKClcbiAgICBzY29wZXMgPSBlZGl0b3Iuc2NvcGVEZXNjcmlwdG9yRm9yQnVmZmVyUG9zaXRpb24ocG9pbnQpLmdldFNjb3Blc0FycmF5KClcbiAgICBpZiBzY29wZXMubGVuZ3RoID4gMVxuICAgICAgZm9yIHNjb3BlIGluIHNjb3Blc1xuICAgICAgICBpZiBzY29wZS5tYXRjaCgvY29tbWVudC9nKVxuICAgICAgICAgIGlzQ29tbWVudGVkID0gdHJ1ZVxuICAgICAgICAgIHJldHVybiBpc0NvbW1lbnRlZFxuICAgIHJldHVybiBpc0NvbW1lbnRlZFxuIl19
