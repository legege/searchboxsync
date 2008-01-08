/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is SearchBox Sync.
 *
 * The Initial Developer of the Original Code is 
 *  Georges-Etienne Legendre <legege@legege.com> <http://legege.com>.
 * Portions created by the Initial Developer are Copyright (C) 2008.
 * All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

if (!this.searchboxsync) this.searchboxsync = {};


/**
 * @return the absolute path of the file in the user profile.
 */
searchboxsync.getUserProfileRDFFile = function(aFilename) {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
                       .getService(Components.interfaces.nsIProperties)
                       .get("ProfD", Components.interfaces.nsIFile);
  file.append(aFilename);

  // Not necessary
  // if (!file.isFile() || !file.isWritable() || !file.isReadable()) {
  //   alert(" has type or permission problems");
  // }

  var conv = Components.classes["@mozilla.org/network/protocol;1?name=file"]
                       .createInstance(Components.interfaces.nsIFileProtocolHandler);

  var url = conv.newFileURI(file);
  return url.spec;
}
