function UserTreeView(iamcli) {
  this.iamcli = iamcli;
  this.rows = [];
  this.rowCount = 0;
}

UserTreeView.prototype = {
  getCellText: function(row, column) {
    return this.rows[row][column.id];
  },

  setTree: function(tree) {
    this.tree = tree;
  },

  updateRowCount: function() {
    if (this.rowCount == this.rows.length) {
      return;
    }

    this.tree.rowCountChanged(0, -this.rowCount);
    this.rowCount = this.rows.length;
    this.tree.rowCountChanged(0, this.rowCount);
  },

  refresh: function(noupdate) {
    this.rows.length = 0;

    try {
      var xhr = this.iamcli.query('ListUsers');

      if (!xhr.success()) {
        alert(xhr.responseText);
        return;
      }

      for each (var member in xhr.xml()..Users.member) {
        this.rows.push(member);
      }

      this.updateRowCount();
      this.tree.invalidate();
    } catch (e) {
      alert(e);
    }
  }
};
