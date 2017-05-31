(function() {
  module.exports = {
    display: function(text, timeout) {
      var ref, span, statusBar;
      if (this.timeout != null) {
        clearTimeout(this.timeout);
      }
      if ((ref = this.statusBarTile) != null) {
        ref.destroy();
      }
      statusBar = document.querySelector("status-bar");
      span = document.createElement('span');
      span.textContent = text;
      if (statusBar != null) {
        this.statusBarTile = statusBar.addLeftTile({
          item: span,
          priority: 100
        });
      }
      if (timeout != null) {
        if (this.timeout != null) {
          clearTimeout(this.timeout);
        }
        return this.timeout = setTimeout((function(_this) {
          return function() {
            var ref1;
            return (ref1 = _this.statusBarTile) != null ? ref1.destroy() : void 0;
          };
        })(this), timeout);
      }
    }
  };

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiL1VzZXJzL2prbHltYWsvLmF0b20vcGFja2FnZXMvcmVtb3RlLWF0b20vbGliL3N0YXR1cy1tZXNzYWdlLmNvZmZlZSJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtFQUFBLE1BQU0sQ0FBQyxPQUFQLEdBQ0k7SUFBQSxPQUFBLEVBQVMsU0FBQyxJQUFELEVBQU8sT0FBUDtBQUNMLFVBQUE7TUFBQSxJQUEwQixvQkFBMUI7UUFBQSxZQUFBLENBQWEsSUFBQyxDQUFBLE9BQWQsRUFBQTs7O1dBQ2MsQ0FBRSxPQUFoQixDQUFBOztNQUNBLFNBQUEsR0FBWSxRQUFRLENBQUMsYUFBVCxDQUF1QixZQUF2QjtNQUNaLElBQUEsR0FBTyxRQUFRLENBQUMsYUFBVCxDQUF1QixNQUF2QjtNQUNQLElBQUksQ0FBQyxXQUFMLEdBQW1CO01BQ25CLElBQUcsaUJBQUg7UUFDSSxJQUFDLENBQUEsYUFBRCxHQUFpQixTQUFTLENBQUMsV0FBVixDQUFzQjtVQUFBLElBQUEsRUFBTSxJQUFOO1VBQVksUUFBQSxFQUFVLEdBQXRCO1NBQXRCLEVBRHJCOztNQUdBLElBQUcsZUFBSDtRQUNJLElBQTBCLG9CQUExQjtVQUFBLFlBQUEsQ0FBYSxJQUFDLENBQUEsT0FBZCxFQUFBOztlQUNBLElBQUMsQ0FBQSxPQUFELEdBQVcsVUFBQSxDQUFXLENBQUEsU0FBQSxLQUFBO2lCQUFBLFNBQUE7QUFDbEIsZ0JBQUE7OERBQWMsQ0FBRSxPQUFoQixDQUFBO1VBRGtCO1FBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQSxDQUFYLEVBRVQsT0FGUyxFQUZmOztJQVRLLENBQVQ7O0FBREoiLCJzb3VyY2VzQ29udGVudCI6WyJtb2R1bGUuZXhwb3J0cyA9XG4gICAgZGlzcGxheTogKHRleHQsIHRpbWVvdXQpIC0+XG4gICAgICAgIGNsZWFyVGltZW91dChAdGltZW91dCkgaWYgQHRpbWVvdXQ/XG4gICAgICAgIEBzdGF0dXNCYXJUaWxlPy5kZXN0cm95KClcbiAgICAgICAgc3RhdHVzQmFyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcInN0YXR1cy1iYXJcIilcbiAgICAgICAgc3BhbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKVxuICAgICAgICBzcGFuLnRleHRDb250ZW50ID0gdGV4dFxuICAgICAgICBpZiBzdGF0dXNCYXI/XG4gICAgICAgICAgICBAc3RhdHVzQmFyVGlsZSA9IHN0YXR1c0Jhci5hZGRMZWZ0VGlsZShpdGVtOiBzcGFuLCBwcmlvcml0eTogMTAwKVxuXG4gICAgICAgIGlmIHRpbWVvdXQ/XG4gICAgICAgICAgICBjbGVhclRpbWVvdXQoQHRpbWVvdXQpIGlmIEB0aW1lb3V0P1xuICAgICAgICAgICAgQHRpbWVvdXQgPSBzZXRUaW1lb3V0KD0+XG4gICAgICAgICAgICAgICAgQHN0YXR1c0JhclRpbGU/LmRlc3Ryb3koKVxuICAgICAgICAgICAgLCB0aW1lb3V0KVxuIl19
