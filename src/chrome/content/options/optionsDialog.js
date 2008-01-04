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

searchboxsync.options.OptionsDialog = new function() {
  var ruleList = null;
  var stringBundle = null;

  this.onLoad = function() {
    ruleList = document.getElementById("rulesList");
    stringBundle = document.getElementById("bundle-searchboxsync");

    refreshRulesList("", false);
  }

  /**
   * @return false is there is an error.
   */
  this.onAccept = function() {
    return true;
  }

  this.onSelectionChanged = function(aEvent) {}

  this.onAddRule = function(aEvent) {
    openRuleEditor(null);
  }

  this.onEditRule = function(aEvent) {
    if (ruleList.selectedItems.length <= 0) {
      return null;
    }
    openRuleEditor(getSelectedRule());
    return null;
  }

  this.onDeleteRule = function(aEvent) {
    var rule = getSelectedRule();
    if (rule != null) {
      // confirm deletion
      var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                    .getService(Components.interfaces.nsIPromptService);

      var res = promptService.confirm(window,
                                      stringBundle.getString("confirmRuleDeletionTitle"),
                                      stringBundle.getFormattedString("confirmRuleDeletion", [rule.name], 1));
      if (res) {
        searchboxsync.RuleService.deleteRuleByKey(rule.key);
        refreshRulesList("", true);
      }
    }
  }

  this.onMoveUp = function(aEvent) {
    var rule = getSelectedRule();
    if (rule != null) {
      if (searchboxsync.RuleService.moveRuleUp(rule)) {
        refreshRulesList(rule.key, true);
      }
    }
  }

  this.onMoveDown = function(aEvent) {
    var rule = getSelectedRule();
    if (rule != null) {
      if (searchboxsync.RuleService.moveRuleDown(rule)) {
        refreshRulesList(rule.key, true);
      }
    }
  }

  this.onReset = function(aEvent) {
    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);

    var res = promptService.confirm(window,
                                    stringBundle.getString("confirmResetTitle"),
                                    stringBundle.getString("confirmReset"));
    if (res) {
      searchboxsync.RuleService.reset(true);
      refreshRulesList("", true);
    }

  }

  function openRuleEditor(aRule) {
    var args = {rule: aRule, result: false};

    window.openDialog("chrome://searchboxsync/content/options/ruleDialog.xul", "@NAME@:rule",
        "chrome,titlebar,modal,centerscreen,resizable=yes", args);

    if (args.result) {
      refreshRulesList(args.rule.key, true);
    }

    return args.result;
  }

  function refreshRulesList(aRuleToSelect, aFocusList) {
    // remove all children
    while (ruleList.hasChildNodes()) {
      ruleList.removeChild(ruleList.lastChild);
    }

    fillRules(ruleList, searchboxsync.RuleService.rules);

    if (aRuleToSelect) {
      var item = ruleList.getElementsByAttribute("key", aRuleToSelect)[0];
      if (item) {
        ruleList.ensureElementIsVisible(item);
        ruleList.selectItem(item);
      }
    }
    else {
      var item = ruleList.getItemAtIndex(0);
      if (item) {
        ruleList.selectItem(item);
      }
    }

    if (aFocusList) {
      ruleList.focus();
    }
  }

  function fillRules(aListBox, aRules) {
    if (!aListBox || !aRules) {
      return;
    }

    for (var i = 0; i < aRules.length; i++) {
      var listitem = createRuleListItem(aRules[i]);
      aListBox.appendChild(listitem);
    }
  }

  function createRuleListItem(aRule) {
    var listitem = document.createElement("listitem");
    listitem.id = "rule." + aRule.key;
    listitem.setAttribute("label", aRule.name);
    listitem.setAttribute("key", aRule.key);
    listitem.setAttribute("disabled", aRule.disabled);
    return listitem;
  }

  function getSelectedRule() {
    var key = ruleList.selectedItems[0].getAttribute("key");
    return searchboxsync.RuleService.getRuleByKey(key);
  }
}