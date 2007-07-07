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

 * The Initial Developer of the Original Code is Georges-Etienne Legendre.
 * Portions created by Georges-Etienne Legendre are Copyright (C) 2004-2007.
 * All Rights Reserved.
 *
 * Contributor(s):
 *  Georges-Etienne Legendre <legege@legege.com> <http://legege.com>
 *
 * ***** END LICENSE BLOCK ***** */

var gSearchBoxSyncOverlay = {
  stringBundle: null,

  /**
   * Initializes the extension.
   * @param aEvent The load event.
   */
  onLoad: function(aEvent) {
    if (aEvent.target != document || !window.getBrowser)
      return;

    //Add a progress listener to detect when the location changes.
    window.getBrowser().addProgressListener(gSearchBoxSyncProgressListener,
                                            Components.interfaces.nsIWebProgress.STATE_STOP);

    this.stringBundle = document.getElementById("bundle_searchboxsync");

    setTimeout(function() {
      gSearchBoxSyncOverlay.checkDefaultRules();
    }, 50);

    addEventListener("unload", function(aEvent) { gSearchBoxSyncOverlay.onUnload(aEvent); }, false);
  },

  /**
   * Uninitializes the extension.
   * @param aEvent The unload event.
   */
  onUnload: function(aEvent) {
    window.getBrowser().removeProgressListener(gSearchBoxSyncProgressListener);
  },

  /**
   * Check if a new version has been installed and, if so, ask the user
   * to reset the default synchronization rules.
   */
  checkDefaultRules: function() {
    if (gSearchBoxSync.pref.version == 0) {
      gSearchBoxSync.pref.version = SEARCHBOXSYNC_VERSION;
    }

  if (SEARCHBOXSYNC_VERSION > gSearchBoxSync.pref.version) {
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                    .getService(Components.interfaces.nsIPromptService);
      var res = promptService.confirmEx(window,
                  this.stringBundle.getString("resetDefaultTitle"),
                  this.stringBundle.getString("resetDefault"),
                  Components.interfaces.nsIPromptService.BUTTON_TITLE_YES * Components.interfaces.nsIPromptService.BUTTON_POS_0
                  + Components.interfaces.nsIPromptService.BUTTON_TITLE_NO * Components.interfaces.nsIPromptService.BUTTON_POS_1,
                  null, null, null, null, {value: false});
      if (res == 0) {
        gSearchBoxSync.ruleService.reset(true);
      }
  }

    gSearchBoxSync.pref.version = SEARCHBOXSYNC_VERSION;
  },

  /**
   * Update the searchbox as the location changed.
   * @param aUrl The url of the new loaded page.
   */
  update: function(aUrl) {
    if (!this.searchBox.exist()) {
      return;
    }

    var rules = gSearchBoxSync.ruleService.rules;
    if (rules != null) {
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].disabled == true) {
          continue;
        }

        var regex = gSearchBoxSync.ruleService.makeUrlRegex(rules[i]);
        if (regex == null) {
          continue;
        }

        var terms = gSearchBoxSyncUtil.extractTerms(regex, aUrl);
        if (terms && terms != "") {
          this.searchBox.value = terms;
          break;
        }
      }
    }
  },

  searchBox: {
    /**
     * Return a reference to the searchbar.
     * @private
     */
    get ref() {
      return document.getElementById("searchbar");
    },

    /**
     * @return Returns the current searchbox value.
     * @private
     */
    get value() {
      var textbox = document.getAnonymousElementByAttribute(this.ref, "class", "searchbar-textbox");
      if (textbox) {
        return textbox.inputField.value;
      }
    },

    /**
     * Sets the value of the searchbox.
     * @param value The value to set.
     * @private
     */
    set value(aValue) {
      var textbox = document.getAnonymousElementByAttribute(this.ref, "class", "searchbar-textbox");
      if (textbox) {
        textbox.inputField.value = aValue;

        /*
          XXXLegendre: We have to fire a "oninput" event
          because it appears that we cannot fire/catch an "input"
          event on the searchbar. It might be related to bug 281859.
        */
        var evt = document.createEvent("Events");
        evt.initEvent("oninput", true, true);
        this.ref.dispatchEvent(evt);

		/* For Firefox 2.0 */
        var searchbar = document.getElementById("searchbar");
        searchbar.removeAttribute("empty");
      }
    },

    /**
     * Determines if the searchbox exists.
     * @return Returns true if the searchbox exists.
     */
    exist: function() {
      return this.ref != null;
    }
  }
};

var gSearchBoxSyncProgressListener = {
  QueryInterface: function(aIID) {
    if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
      aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
      aIID.equals(Components.interfaces.nsISupports)) {
      return this;
    }
    throw Components.results.NS_NOINTERFACE;
  },

  onProgressChange: function (aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {},

  onStatusChange: function(aWebProgress, aRequest, aStatus, aMessage) {},

  onSecurityChange: function(aWebProgress, aRequest, aState) {},

  onLinkIconAvailable: function(a) {},

  onStateChange: function (aWebProgress, aRequest, aStateFlags, aStatus) {},

  onLocationChange: function(aProgress, aRequest, aLocation) {
    if (aLocation) {
      setTimeout(function() { gSearchBoxSyncOverlay.update(aLocation.spec) }, 0);
    }
  }
}

addEventListener("load", function(aEvent) { gSearchBoxSyncOverlay.onLoad(aEvent); }, false);