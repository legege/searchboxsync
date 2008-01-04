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

searchboxsync.Overlay = new function() {
   var self = this;
   var stringBundle = null;

  /**
   * Initializes the extension.
   * @param aEvent The load event.
   */
  this.onLoad = function(aEvent) {
    if (aEvent.target != document || !window.getBrowser) {
      return;
    }

    stringBundle = document.getElementById("bundle-searchboxsync");

    //Add a progress listener to detect when the location changes.
    window.getBrowser().addProgressListener(this.progressListener,
                                            Components.interfaces.nsIWebProgress.STATE_STOP);

    setTimeout(function() {
      searchboxsync.Overlay.checkDefaultRules();
    }, 50);

    addEventListener("unload", function(aEvent) { searchboxsync.Overlay.onUnload(aEvent); }, false);
  }

  /**
   * Uninitializes the extension.
   * @param aEvent The unload event.
   */
  this.onUnload = function(aEvent) {
    window.getBrowser().removeProgressListener(this.progressListener);
  }

  /**
   * Check if a new version has been installed and, if so, ask the user
   * to reset the default synchronization rules.
   */
  this.checkDefaultRules = function() {
    if (searchboxsync.Preferences.version == 0) {
      searchboxsync.Preferences.version = SEARCHBOXSYNC_VERSION;
    }

    if (SEARCHBOXSYNC_VERSION > searchboxsync.Preferences.version) {
        var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                      .getService(Components.interfaces.nsIPromptService);
        var res = promptService.confirmEx(window,
                    stringBundle.getString("resetDefaultTitle"),
                    stringBundle.getString("resetDefault"),
                    Components.interfaces.nsIPromptService.BUTTON_TITLE_YES * Components.interfaces.nsIPromptService.BUTTON_POS_0
                    + Components.interfaces.nsIPromptService.BUTTON_TITLE_NO * Components.interfaces.nsIPromptService.BUTTON_POS_1,
                    null, null, null, null, {value: false});
        if (res == 0) {
          searchboxsync.RuleService.reset(true);
        }
    }

    searchboxsync.Preferences.version = SEARCHBOXSYNC_VERSION;
  }

  /**
   * Update the searchbox as the location changed.
   * @param aUrl The url of the new loaded page.
   */
  this.update = function(aUrl) {
    if (!this.searchbox) {
      return;
    }

    var rules = searchboxsync.RuleService.rules;
    if (rules != null) {
      for (var i = 0; i < rules.length; i++) {
        if (rules[i].disabled == true) {
          continue;
        }

        var regex = searchboxsync.RuleService.makeUrlRegex(rules[i]);
        if (regex == null) {
          continue;
        }

        var terms = searchboxsync.Util.extractTerms(regex, aUrl);
        if (terms && terms != "") {
          this.searchbar.removeAttribute("empty");
          this.searchbox.value = terms;
          break;
        }
      }
    }
  }

  /**
   * @return the searchbar
   */
  this.__defineGetter__("searchbar", function() {
    return document.getElementById("searchbar");
  });

  /**
   * @return the searchbox
   */
  this.__defineGetter__("searchbox", function() {
    var searchbar = this.searchbar;
    if (searchbar) {
      return document.getAnonymousElementByAttribute(searchbar, "anonid", "searchbar-textbox");
    }
    return null;
  });

  /**
   * Progress Listener to automatically refresh the terms on location change.
   */
  this.progressListener = new function() {
    this.QueryInterface = function(aIID) {
      if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsISupports)) {
        return this;
      }
      throw Components.results.NS_NOINTERFACE;
    }

    this.onProgressChange = function (aWebProgress, aRequest, aCurSelfProgress,
                                      aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress) {}

    this.onStatusChange = function(aWebProgress, aRequest, aStatus, aMessage) {}

    this.onSecurityChange = function(aWebProgress, aRequest, aState) {}

    this.onLinkIconAvailable = function(a) {}

    this.onStateChange = function (aWebProgress, aRequest, aStateFlags, aStatus) {}

    this.onLocationChange = function(aProgress, aRequest, aLocation) {
      if (aLocation) {
        setTimeout(function() {
          searchboxsync.Overlay.update(aLocation.spec);
        }, 0);
      }
    }
  }
};

addEventListener("load", function(aEvent) { searchboxsync.Overlay.onLoad(aEvent); }, false);