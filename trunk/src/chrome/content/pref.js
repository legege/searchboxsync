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

var gSearchBoxSyncPreferences = {
  stringBundle: null,

  onLoad: function() {
    this.stringBundle = document.getElementById("bundle_searchboxsync");

    gSearchBoxSyncRulesList.onLoad();
  },

  onAccept: function() {
    return true;
  }
}

var gSearchBoxSyncRulesList = {
  ruleList: null,
  stringBundle: null,

  onLoad: function() {
    this.ruleList = document.getElementById("rulesList");
    this.stringBundle = document.getElementById("bundle_searchboxsync");

    this.refreshRulesList("", false);
  },

  onSelectionChanged: function(aEvent) {

  },

  onAddRule: function(aEvent) {
    this.openRuleEditor(null);
  },

  onEditRule: function(aEvent) {
    if (this.ruleList.selectedItems.length <= 0) {
      return null;
    }
    this.openRuleEditor(this.getSelectedRule());
    return null;
  },

  onDeleteRule: function(aEvent) {
    var rule = this.getSelectedRule();
    if (rule != null) {
      // confirm deletion
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                    .getService(Components.interfaces.nsIPromptService);
      var res = promptService.confirm(window,
                  this.stringBundle.getString("confirmRuleDeletionTitle"),
                  this.stringBundle.getFormattedString("confirmRuleDeletion", [rule.name], 1));
      if (res) {
        gSearchBoxSync.ruleService.deleteRuleByKey(rule.key);
        this.refreshRulesList("", true);
      }
    }
  },

  onMoveUp: function(aEvent) {
    var rule = this.getSelectedRule();
    if (rule != null) {
      if (gSearchBoxSync.ruleService.moveRuleUp(rule)) {
        this.refreshRulesList(rule.key, true);
      }
    }
  },

  onMoveDown: function(aEvent) {
    var rule = this.getSelectedRule();
    if (rule != null) {
      if (gSearchBoxSync.ruleService.moveRuleDown(rule)) {
        this.refreshRulesList(rule.key, true);
      }
    }
  },

  onReset: function(aEvent) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    var res = promptService.confirm(window,
                this.stringBundle.getString("confirmResetTitle"),
                this.stringBundle.getString("confirmReset"));
    if (res) {
      gSearchBoxSync.ruleService.reset(true);
      this.refreshRulesList("", true);
    }

  },

  openRuleEditor: function(aRule) {
    var args = {rule: aRule, result: false};

    window.openDialog("chrome://searchboxsync/content/rule.xul", "SearchBoxSync:Rule",
        "chrome,titlebar,modal,centerscreen,resizable=yes", args);

    if (args.result) {
      this.refreshRulesList(args.rule.key, true);
    }

    return args.result;
  },

  refreshRulesList: function(aRuleToSelect, aFocusList) {
    // remove all children
    while (this.ruleList.hasChildNodes()) {
      this.ruleList.removeChild(this.ruleList.lastChild);
    }

    this.fillRules(this.ruleList, gSearchBoxSync.ruleService.rules);

    if (aRuleToSelect) {
      var item = this.ruleList.getElementsByAttribute("key", aRuleToSelect)[0];
      if (item) {
        this.ruleList.ensureElementIsVisible(item);
        this.ruleList.selectItem(item);
      }
    }
    else {
      var item = this.ruleList.getItemAtIndex(0);
      if (item) {
        this.ruleList.selectItem(item);
      }
    }

    if (aFocusList) {
      this.ruleList.focus();
    }
  },

  fillRules: function(aListBox, aRules) {
    if (!aListBox || !aRules) {
      return;
    }

    for (var i = 0; i < aRules.length; i++) {
      var listitem = this.createRuleListItem(aRules[i]);
      aListBox.appendChild(listitem);
    }
  },

  createRuleListItem: function(aRule) {
    var listitem = document.createElement("listitem");
    listitem.id = "rule." + aRule.key;
    listitem.setAttribute("label", aRule.name);
    listitem.setAttribute("key", aRule.key);
    listitem.setAttribute("disabled", aRule.disabled);
    return listitem;
  },

  getSelectedRule: function() {
    var key = this.ruleList.selectedItems[0].getAttribute("key");
    return gSearchBoxSync.ruleService.getRuleByKey(key);
  }
}