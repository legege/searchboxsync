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

var gSearchBoxSyncRule = {
  name: null,
  type: null,
  typeSimple: null,
  typeRegex: null,
  disabledCheckbox: null,
  simpleUrl: null,
  simpleParameter: null,
  regexUrl: null,
  testUrl: null,
  stringBundle: null,
  rule: null,

  /**
   * Initializes the extension.
   * @param aEvent The load event.
   */
  onLoad: function(aEvent) {
    this.name = document.getElementById("name");
    this.type = document.getElementById("type");
    this.typeSimple = document.getElementById("simpleRule");
    this.typeRegex = document.getElementById("regexRule");
    this.disabledCheckbox = document.getElementById("disabledCheckbox");
    this.simpleUrl = document.getElementById("simpleUrl");
    this.simpleParameter = document.getElementById("simpleParameter");
    this.regexUrl = document.getElementById("regexUrl");
    this.testUrl = document.getElementById("testUrl");
    this.stringBundle = document.getElementById("bundle_searchboxsync");

    if("arguments" in window && window.arguments.length > 0 && window.arguments[0]) {
      this.rule = window.arguments[0].rule;
    }

    if (this.rule != null) {
      this._putRuleValues(this.rule);
    }
    else {
      this.type.value = gSearchBoxSync.ruleService.RULE_TYPE_SIMPLE;
    }
    this.hideShowControls(this.type.value);

    this.testUrl.value = gSearchBoxSyncUtil.getCurrentBrowserUrl();
  },

  /**
   * @return Returns false is there is an error.
   */
  onAccept: function() {
    if (this.name.value.length <= 0
        || this.type.value.length <= 0
        || (this.type.value == gSearchBoxSync.ruleService.RULE_TYPE_SIMPLE &&
          (this.simpleUrl.value.length <= 0 || this.simpleParameter.value.length <= 0))
        || (this.type.value == gSearchBoxSync.ruleService.RULE_TYPE_REGEX &&
          (this.regexUrl.value.length <= 0))) {
      window.arguments[0].result = false;
      alert(this.stringBundle.getString("completeAllFields"));
      return false;
    }

    if (this.rule == null) {
      this.rule = new Rule();
    }

    this.rule = this._setRuleValues(this.rule);
    this.rule.key = gSearchBoxSync.ruleService.addUpdateRule(this.rule);

    window.arguments[0].rule = this.rule;
    window.arguments[0].result = true;
    return true;
  },

  /**
   * Help Button Event
   */
  onHelp: function() {
    gSearchBoxSyncUtil.openURL("http://legege.com/mozilla/searchboxsyncHelp.php");
  },

  /**
   * @param aEvent The event.
   */
  onTypeSelect: function(aEvent) {
    this.hideShowControls(this.type.value);
  },

  /**
   * This method hide/show controls according to the aRuleType and their
   * hidefor attribute.
   *
   * @param aRuleType The selected rule type.
   */
  hideShowControls: function(aRuleType) {
    var controls = document.getElementsByAttribute("hidefor", "*");

    for (var controlNo = 0; controlNo < controls.length; controlNo++) {
      var control = controls[controlNo];
      var hideFor = control.getAttribute("hidefor");

      var hide = false;
      var hideForTokens = hideFor.split(",");
      for (var tokenNo = 0; tokenNo < hideForTokens.length; tokenNo++) {
        if (hideForTokens[tokenNo] == aRuleType) {
          hide = true;
          break;
        }
      }

      if (hide) {
        control.setAttribute("hidden", "true");
      }
      else {
        control.removeAttribute("hidden");
      }
      window.sizeToContent();
    }
  },

  /**
   * This method test the current rule.
   */
  testRule: function() {
    var rule = this._setRuleValues(new Rule());
    var regex = gSearchBoxSync.ruleService.makeUrlRegex(rule);
    var url = this.testUrl.value;
    var terms = gSearchBoxSyncUtil.extractTerms(regex, url);

    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window,
      this.stringBundle.getString("regexTestResultTitle"),
      this.stringBundle.getFormattedString("regexTestResult", [terms]));
  },

  /**
   * @param aRule The rule to get values from.
   */
  _putRuleValues: function(aRule) {
    this.name.value = aRule.name;

    if (aRule.type == gSearchBoxSync.ruleService.RULE_TYPE_SIMPLE) {
      this.type.selectedItem = this.typeSimple;
    }
    else if (aRule.type == gSearchBoxSync.ruleService.RULE_TYPE_REGEX) {
      this.type.selectedItem = this.typeRegex;
    }

    this.disabledCheckbox.checked = aRule.disabled;
    this.simpleUrl.value = aRule.simple.url;
    this.simpleParameter.value = aRule.simple.parameter;
    this.regexUrl.value = aRule.regex.url;
  },

  /**
   * @param aRule The rule to set values to.
   * @return Returns the aRule field with the values.
   */
  _setRuleValues: function(aRule) {
    aRule.name = this.name.value;
    aRule.type = this.type.selectedItem.value;
    aRule.disabled = this.disabledCheckbox.checked;
    aRule.simple.url = this.simpleUrl.value;
    aRule.simple.parameter = this.simpleParameter.value;
    aRule.regex.url = this.regexUrl.value;
    return aRule;
  }
}