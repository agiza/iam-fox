function windowOnLoad() {
  var args = window.arguments[0];
  document.title = 'Certificates - ' + args.userName;
  var listbox = $('user-cert-listbox');
  refreshUserCert();
}

function listboxOnSelect(event) {
  var args = window.arguments[0];
  var iamcli = args.iamcli;
  var userName = args.userName;

  var item = event.currentTarget;

  if (!item || !item.value) {
    return;
  }

  var textbox = $('user-cert-textbox');
  var certId = item.value;
  textbox.value = decodeURIComponent(window.certHash[certId]);
}

function inProgress(callback) {
  var loader = $('user-cert-loader');
  loader.hidden = false;

  var retval = null;
  var exception = null;

  try {
    retval = callback();
  } catch (e) {
    exception = e;
  }

  loader.hidden = true;

  if (exception) {
    throw exception;
  }

  return retval;
}

function openSigningCertAddDialog() {
  var args = window.arguments[0];
  var iamcli = args.iamcli;
  var userName = args.userName;

  openDialog('chrome://iamfox/content/signing-cert-add-dialog.xul', 'signing-cert-add-dialog', 'chrome,modal,width=400,height=400',
             {iamcli:iamcli, refreshUserCert:refreshUserCert, inProgress:inProgress, userName:userName});
}

function deleteUserCert() {
  var args = window.arguments[0];
  var iamcli = args.iamcli;
  var userName = args.userName;

  var listbox = $('user-cert-listbox');
  var item = listbox.selectedItem;

  if (!item || !item.value) {
    return;
  }

  var certId = item.value;

  if (!confirm("Are you sure you want to delete '" + certId + " ' ?")) {
    return;
  }

  protect(function() {
    inProgress(function() {
      var params = [['UserName', userName], ['CertificateId', certId]];
      iamcli.query_or_die('DeleteSigningCertificate', params);
    });

    var textbox = $('user-cert-textbox');
    delete window.certHash[certId];
    listbox.removeItemAt(listbox.currentIndex);
    listbox.clearSelection();
    textbox.value = null;
  });
}

function refreshUserCert() {
  var args = window.arguments[0];
  var iamcli = args.iamcli;
  var userName = args.userName;

  protect(function() {
    var xhr = inProgress(function() {
      return iamcli.query_or_die('ListSigningCertificates', [['UserName', userName]]);
    });

    var listbox = $('user-cert-listbox');
    var textbox = $('user-cert-textbox');
    var certificates = [];
    window.certHash = {};

    for each (var member in xhr.xml()..Certificates.member) {
      certificates.push(member);
      window.certHash[member.CertificateId.toString()] = member.CertificateBody.toString();
    }

    listbox.clearSelection();
    textbox.value = null;

    for (var i = listbox.itemCount - 1; i >= 0; i--) {
      listbox.removeItemAt(i);
    }

    for (var i = 0; i < certificates.length; i++) {
      var cert = certificates[i];
      listbox.appendItem(cert.CertificateId, cert.CertificateId);
    }
  });
}
