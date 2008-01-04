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

searchboxsync.options.RuleDialog = new function() {
  var name = null;
  var type = null;
  var typeSimple = null;
  var typeRegex = null;
  var disabledCheckbox = null;
  var simpleUrl = null;
  var simpleParameter = null;
  var regexUrl = null;
  var testUrl = null;
  var stringBundle = null;

  var rule = null;

  /**
   * Initializes the extension.
   * @param aEvent The load event.
   */
  this.onLoad = function(aEvent) {
    name = document.getElementById("name");
    type = document.getElementById("type");
    typeSimple = document.getElementById("simpleRule");
    typeRegex = document.getElementById("regexRule");
    disabledCheckbox = document.getElementById("disabledCheckbox");
    simpleUrl = document.getElementById("simpleUrl");
    simpleParameter = document.getElementById("simpleParameter");
    regexUrl = document.getElementById("regexUrl");
    testUrl = document.getElementById("testUrl");
    stringBundle = document.getElementById("bundle-searchboxsync");

    if("arguments" in window && window.arguments.length > 0 && window.arguments[0]) {
      rule = window.arguments[0].rule;
    }

    if (rule != null) {
      putRuleValues(rule);
    }
    else {
      type.value = searchboxsync.RuleService.RULE_TYPE_SIMPLE;
    }
    hideShowControls(type.value);

    testUrl.value = searchboxsync.Util.getCurrentBrowserUrl();
  }

  /**
   * @return Returns false is there is an error.
   */
  this.onAccept = function() {
    if (name.value.length <= 0 || type.value.length <= 0
        || (type.value == searchboxsync.RuleService.RULE_TYPE_SIMPLE &&
          (simpleUrl.value.length <= 0 || simpleParameter.value.length <= 0))
        || (type.value == searchboxsync.RuleService.RULE_TYPE_REGEX &&
          (regexUrl.value.length <= 0))) {
      window.arguments[0].result = false;
      alert(stringBundle.getString("completeAllFields"));
      return false;
    }

    if (rule == null) {
      rule = new searchboxsync.RuleService.Rule();
    }

    rule = setRuleValues(rule);
    rule.key = searchboxsync.RuleService.addUpdateRule(rule);

    window.arguments[0].rule = rule;
    window.arguments[0].result = true;
    return true;
  }

  /**
   * Help Button Event
   */
  this.onHelp = function() {
    searchboxsync.Util.openURL("http://code.google.com/p/searchboxsync/wiki/HowTo");
  }

  /**
   * @param aEvent The event.
   */
  this.onTypeSelect = function(aEvent) {
    hideShowControls(type.value);
  }

  /**
   * This method hide/show controls according to the aRuleType and their
   * hidefor attribute.
   *
   * @param aRuleType The selected rule type.
   */
  function hideShowControls(aRuleType) {
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
  }

  /**
   * This method test the current rule.
   */
  this.testRule = function() {
    var rule = setRuleValues(new searchboxsync.RuleService.Rule());
    var regex = searchboxsync.RuleService.makeUrlRegex(rule);
    var url = testUrl.value;
    var terms = searchboxsync.Util.extractTerms(regex, url);

    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                                  .getService(Components.interfaces.nsIPromptService);
    promptService.alert(window,
                        stringBundle.getString("regexTestResultTitle"),
                        stringBundle.getFormattedString("regexTestResult", [terms]));
  }

  /**
   * @param aRule The rule to get values from.
   */
  function putRuleValues(aRule) {
    name.value = aRule.name;

    if (aRule.type == searchboxsync.RuleService.RULE_TYPE_SIMPLE) {
      type.selectedItem = typeSimple;
    }
    else if (aRule.type == searchboxsync.RuleService.RULE_TYPE_REGEX) {
      type.selectedItem = typeRegex;
    }

    disabledCheckbox.checked = aRule.disabled;
    simpleUrl.value = aRule.simple.url;
    simpleParameter.value = aRule.simple.parameter;
    regexUrl.value = aRule.regex.url;
  }

  /**
   * @param aRule The rule to set values to.
   * @return Returns the aRule field with the values.
   */
  function setRuleValues(aRule) {
    aRule.name = name.value;
    aRule.type = type.selectedItem.value;
    aRule.disabled = disabledCheckbox.checked;
    aRule.simple.url = simpleUrl.value;
    aRule.simple.parameter = simpleParameter.value;
    aRule.regex.url = regexUrl.value;
    return aRule;
  }
}