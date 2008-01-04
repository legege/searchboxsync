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
 * Portions created by the Initial Developer are Copyright (C) 2004-2008.
 * All Rights Reserved.
 *
 * ***** END LICENSE BLOCK ***** */

searchboxsync.Preferences = new function() {
  this.PREF_VERSION = "version";

  var PREF_BRANCH = "extensions.@NAME@.";
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                              .getService(Components.interfaces.nsIPrefService);

  /**
   * @return the preferences branch.
   */
  this.__defineGetter__("branch", function() {
    return prefService.getBranch(PREF_BRANCH);
  });

  /**
   * @return the version.
   */
  this.__defineGetter__("version", function() {
    try {
      return this.branch.getCharPref(this.PREF_VERSION);
    }
    catch (e) {
      this.version = "0";
      return "0";
    }
  });

  /**
   * Sets the version.
   * @param aValue the version.
   */
  this.__defineSetter__("version", function(aValue) {
    this.branch.setCharPref(this.PREF_VERSION, aValue);
  });
}