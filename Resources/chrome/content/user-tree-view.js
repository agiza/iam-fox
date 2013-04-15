function UserTreeView(iamcli) {
  this.iamcli = iamcli;
  this.rows = [];
  this.printRows = [];
  this.rowCount = 0;
  this.selection = null;
  this.sorted = false;
}

UserTreeView.prototype = {
  getCellText: function(row, column) {
    var colkey = column.id.toString().split('.');

    if (colkey.length < 1) {
      return null;
    }

    colkey = colkey[colkey.length - 1];

    return this.printRows[row][colkey];
  },

  setTree: function(tree) {
    this.tree = tree;
  },

  isSorted: function() {
    return this.sorted;
  },

  cycleHeader: function(column) {
    var user = this.selectedRow();
    if (!user) { return; }

    if (sortRowsByColumn(column, this.rows)) {
      this.invalidate();
      this.sorted = true;

      if (user) {
        this.selectByName(user.UserName);
      }
    }
  },

  invalidate: function() {
    this.printRows.length = 0;

    var pathFilter = $('user-tree-path-filter').selectedItem;
    var pathValue = pathFilter ? pathFilter.value : '/';
    var filterValue = ($('user-tree-filter').value || '').trim();

    function filter(elem) {
      var rp = new RegExp('^' + pathValue);
      var rv = new RegExp(filterValue);

      if (!rp.test(elem.Path.toString())) {
        return false;
      }

      for each (var child in elem.*) {
        if (rv.test(child.toString())) {
          return true;
        }
      }

      return false;
    };

    for (var i = 0; i < this.rows.length; i++) {
      var row =  this.rows[i];

      if (filter(row)) {
        this.printRows.push(row);
      }
    }

    if (this.rowCount != this.printRows.length) {
      this.tree.rowCountChanged(0, -this.rowCount);
      this.rowCount = this.printRows.length;
      this.tree.rowCountChanged(0, this.rowCount);
    }

    this.tree.invalidate();
  },

  refresh: function(noupdate) {
    this.rows.length = 0;

    protect(function() {
      var pathList = ['/'];

      var walk = function(marker) {
        var params = [];

        if (marker) {
          params.push(['Marker', marker])
        }

        var xhr = inProgress(function() {
          return this.iamcli.query_or_die('ListUsers', params);
        }.bind(this));

        var xml = xhr.xml();

        for each (var member in xml..Users.member) {
          this.rows.push(member);
          pathList.push(member.Path.toString());
        }

        var isTruncated = ((xml..IsTruncated || '').toString().trim().toLowerCase() == 'true');

        return isTruncated ? (xml..Marker || '').toString().trim() : null;
      }.bind(this);

      var marker = null;

      do {
        marker = walk(marker);
      } while (marker);

      var pathFilter = $('user-tree-path-filter');
      pathFilter.removeAllItems();
      pathList = pathList.uniq().sort();

      for (var i = 0; i < pathList.length; i++) {
        var path = pathList[i];
        pathFilter.appendItem(path, path);
      }

      pathFilter.selectedIndex = 0;

      for (var i = 0; i < this.tree.columns.count; i++) {
        this.tree.columns.getColumnAt(i).element.setAttribute('sortDirection', 'natural');
      }

      this.invalidate();
    }.bind(this));
  },

  onDblclick: function(event) {
    var user = this.selectedRow();

    if (!user || (event && event.target.tagName != 'treechildren')) {
      return;
    }

    var userName = user.UserName;
    var xhr = null;

    openModalWindow('user-detail-window.xul', 'user-datail-window', 640, 480,
                    {iamcli:this.iamcli, userName:userName});
  },

  selectedRow: function() {
    var idx = this.selection.currentIndex;
    return (idx != -1) ? this.printRows[idx] : null;
  },

  openUserCertWindow: function(event) {
    var user = this.selectedRow();
    if (!user) { return; }
    var userName = user.UserName;

    openModalWindow('user-cert-window.xul', 'user-cert-window', 640, 480,
                    {iamcli:this.iamcli, userName:userName});
  },

  deleteUser: function() {
    var user = this.selectedRow();
    if (!user) { return; }
    var userName = user.UserName;

    if (!confirm("Are you sure you want to delete '" + userName + "' ?")) {
      return;
    }

    protect(function() {
      inProgress(function() {
        var walk = function(marker) {
          var params = [['UserName', userName]];

          if (marker) {
            params.push(['Marker', marker])
          }

          var xhr = this.iamcli.query_or_die('ListAccessKeys', params);
          var xml = xhr.xml();

          for each (var member in xml..AccessKeyMetadata.member) {
            var params = [['UserName', userName], ['AccessKeyId', member.AccessKeyId]];
            this.iamcli.query_or_die('DeleteAccessKey', params);
          }

          var isTruncated = ((xml..IsTruncated || '').toString().trim().toLowerCase() == 'true');

          return isTruncated ? (xml..Marker || '').toString().trim() : null;
        }.bind(this);

        var marker = null;

        do {
          marker = walk(marker);
        } while (marker);

        walk = function(marker) {
          var params = [['UserName', userName]];

          if (marker) {
            params.push(['Marker', marker])
          }

          var xhr = this.iamcli.query_or_die('ListGroupsForUser', params);
          var xml = xhr.xml();

          for each (var member in xml..Groups.member) {
            var params = [['UserName', userName], ['GroupName', member.GroupName]];
            this.iamcli.query_or_die('RemoveUserFromGroup', params);
          }

          var isTruncated = ((xml..IsTruncated || '').toString().trim().toLowerCase() == 'true');

          return isTruncated ? (xml..Marker || '').toString().trim() : null;
        }.bind(this);

        marker = null;

        do {
          marker = walk(marker);
        } while (marker);

        walk = function(marker) {
          var params = [['UserName', userName]];

          if (marker) {
            params.push(['Marker', marker])
          }

          var xhr = this.iamcli.query_or_die('ListSigningCertificates', params);
          var xml = xhr.xml();

          for each (var member in xml..Certificates.member) {
            var params = [['UserName', userName], ['CertificateId', member.CertificateId]];
            this.iamcli.query_or_die('DeleteSigningCertificate', params);
          }

          var isTruncated = ((xml..IsTruncated || '').toString().trim().toLowerCase() == 'true');

          return isTruncated ? (xml..Marker || '').toString().trim() : null;
        }.bind(this);

        marker = null;

        do {
          marker = walk(marker);
        } while (marker);

        walk = function(marker) {
          var params = [['UserName', userName]];

          if (marker) {
            params.push(['Marker', marker])
          }

          var xhr = this.iamcli.query_or_die('ListUserPolicies', params);
          var xml = xhr.xml();

          for each (var member in xml..PolicyNames.member) {
            var params = [['UserName', userName], ['PolicyName', member]];
            this.iamcli.query_or_die('DeleteUserPolicy', params);
          }

          var isTruncated = ((xml..IsTruncated || '').toString().trim().toLowerCase() == 'true');

          return isTruncated ? (xml..Marker || '').toString().trim() : null;
        }.bind(this);

        marker = null;

        do {
          marker = walk(marker);
        } while (marker);

        this.iamcli.query_or_die('DeleteUser', [['UserName', userName]]);

        Prefs.deleteUserAccessKeyId(userName);
        Prefs.deleteUserSecretAccessKey(userName);

        this.refresh();
      }.bind(this));
    }.bind(this));
  },

  openUserEditDialog: function() {
    var user = this.selectedRow();
    if (!user) { return; }
    openDialog('chrome://iamfox/content/user-edit-dialog.xul', 'user-edit-dialog', 'chrome,modal,centerscreen',
               {view:this, inProgress:inProgress, user:user});
  },

  openViewKeyDialog: function() {
    var user = this.selectedRow();
    if (!user) { return; }
    openDialog('chrome://iamfox/content/user-view-key-dialog.xul', 'user-edit-dialog', 'chrome,modal,centerscreen',
               {view:this, inProgress:inProgress, user:user});
  },

  openUserCreateLoginProfileDialog: function() {
    var user = this.selectedRow();
    if (!user) { return; }
    openDialog('chrome://iamfox/content/user-create-login-profile-dialog.xul', 'user-create-login-profile-dialog', 'chrome,modal,centerscreen',
               {view:this, inProgress:inProgress, user:user});
  },

  openUserOpenConsoleDialog: function() {
    var user = this.selectedRow();
    if (!user) { return; }
    openDialog('chrome://iamfox/content/user-open-console-dialog.xul', 'user-open-console-dialog', 'chrome,modal,centerscreen', {user:user});
  },

  selectByName: function(name) {
    var rows = this.rows;

    for (var i = 0; i < rows.length; i++) {
      var user = rows[i];

      if (user.UserName == name) {
        this.selection.select(i);
      }
    }

    this.rows
  },

  openUserGroupWindow: function() {
    var user = this.selectedRow();
    if (!user) { return; }
    openModalWindow('user-group-window.xul', 'user-cert-window', 400, 400,
                    {iamcli:this.iamcli, userName:user.UserName});
  },

  deleteLoginProfile: function() {
    var user = this.selectedRow();
    if (!user) { return; }
    var userName = user.UserName;

    if (!confirm("Are you sure you want to delete '" + userName + "'s login profile' ?")) {
      return;
    }

    protect(function() {
      inProgress(function() {
        this.iamcli.query_or_die('DeleteLoginProfile', [['UserName', userName]]);
      }.bind(this));
    }.bind(this));
  },

  copyColumnToClipboard: function(name) {
    var row = this.selectedRow();

    if (row) {
      copyToClipboard(row[name].toString());
    }
  }
};
