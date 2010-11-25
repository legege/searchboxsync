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

searchboxsync.RuleService = new function() {
  this.RULE_TYPE_SIMPLE = "simple";
  this.RULE_TYPE_REGEX = "regex";

  var self = this;

  var rs = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                     .getService(Components.interfaces.nsIRDFService);

  var cu = Components.classes["@mozilla.org/rdf/container-utils;1"]
                     .getService(Components.interfaces.nsIRDFContainerUtils);

  var rulesCache = null;

  var rulesCacheObserver = new function() {
    this.observe = function(subject, topic, data) {
       self.updateRulesCache();
    }

    this.register = function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
      observerService.addObserver(this, "rulesCache", false);
    }

    this.unregister = function() {
      var observerService = Components.classes["@mozilla.org/observer-service;1"]
                              .getService(Components.interfaces.nsIObserverService);
      observerService.removeObserver(this, "rulesCache");
    }
  }

  var rdfUtil = new function() {
    var rs = Components.classes["@mozilla.org/rdf/rdf-service;1"]
                       .getService(Components.interfaces.nsIRDFService);

    this.readAttribute = function(aDS, aRes, aName) {
      var target = aDS.GetTarget(aRes, rs.GetResource(aName), true);
      if (target) {
        return target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
      }
      return null;
    }

    this.writeAttribute = function(aDS, aRes, aName, aValue) {
      var target = aDS.GetTarget(aRes, rs.GetResource(aName), true);
      if (target) {
        aDS.Change(aRes, rs.GetResource(aName), target, rs.GetLiteral(aValue));
      }
      else {
        aDS.Assert(aRes, rs.GetResource(aName), rs.GetLiteral(aValue), true);
      }
    }

    this.removeAttributes = function(aDS, aRes) {
      var attributes = aDS.ArcLabelsOut(aRes);
      while (attributes.hasMoreElements()) {
        var att = attributes.getNext();
        var target = aDS.GetTarget(aRes, att, true);
        aDS.Unassert(aRes, att, target);
      }
    }

    this.saveDataSource = function(aDS) {
      var remoteDS = aDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
      remoteDS.Flush();
    }
  };

  var rdfContainer = null;

  this.__defineGetter__("rdfDatasource", function() {
    var file = searchboxsync.getUserProfileRDFFile("@NAME@.rdf");
    return rs.GetDataSourceBlocking(file);
  });

  this.__defineGetter__("rules", function() {
    if (!rulesCache) {
      this.updateRulesCache();
    }
    return rulesCache;
  });

  this.addUpdateRule = function(aRule) {
    var res;
    if (aRule.key != null) {
      res = rs.GetResource("rdf:#$" + aRule.key);
      writeRuleToResource(aRule, res);
    }
    else {
      res = rs.GetAnonymousResource();
      writeRuleToResource(aRule, res);

      rdfContainer.AppendElement(res);
    }
    notifyRulesUpdate();

    return res.Value.replace("rdf:#$", "");
  }

  this.deleteRuleByKey = function(aKey) {
    var res = rs.GetResource("rdf:#$" + aKey);
    rdfUtil.removeAttributes(this.rdfDatasource, res);
    rdfContainer.RemoveElement(res, true);

    notifyRulesUpdate();
  }

  this.moveRuleUp = function(aRule) {
    var movingRes = rs.GetResource("rdf:#$" + aRule.key);

    var index = rdfContainer.IndexOf(movingRes);
    if (index > 1) {
      rdfContainer.RemoveElement(movingRes, true);
      rdfContainer.InsertElementAt(movingRes, index - 1, true);

      notifyRulesUpdate();
      return true;
    }
    return false;
  }

  this.moveRuleDown = function(aRule) {
    var movingRes = rs.GetResource("rdf:#$" + aRule.key);

    var index = rdfContainer.IndexOf(movingRes);
    if (index < rdfContainer.GetCount()) {
      rdfContainer.RemoveElement(movingRes, true);
      rdfContainer.InsertElementAt(movingRes, index + 1, true);

      notifyRulesUpdate();
      return true;
    }
    return false;
  }

  this.reset = function(aPackageOnly) {
    var children = rdfContainer.GetElements();
    while (children.hasMoreElements()) {
      var res = children.getNext();
      if (res instanceof Components.interfaces.nsIRDFResource) {
        var source = rdfUtil.readAttribute(this.rdfDatasource, res,
                                           "http://legege.com/rdf#source");
        if (!aPackageOnly || aPackageOnly && source == "package") {
          rdfUtil.removeAttributes(this.rdfDatasource, res);
          rdfContainer.RemoveElement(res, false);
        }
      }
    }

    rulesCache = null;

    this.addDefaultRules();
    notifyRulesUpdate();
  }

  this.getRuleByKey = function(aKey) {
    var rule = new searchboxsync.Rule();

    var res = rs.GetResource("rdf:#$" + aKey);

    if (res != null) {
      return readRuleFromResource(res);
    }

    return rule;
  }

  this.updateRulesCache = function() {
    var rules = new Array();

    var children = rdfContainer.GetElements();
    while (children.hasMoreElements()) {
      var res = children.getNext();
      if (res instanceof Components.interfaces.nsIRDFResource) {
        rules.push(readRuleFromResource(res));
      }
    }

    rulesCache = rules;
  }

  this.makeUrlRegex = function(aRule) {
    var urlRegex;

    if (aRule.type == this.RULE_TYPE_REGEX) {
      urlRegex = aRule.regex.url;
    }
    else if (aRule.type == this.RULE_TYPE_SIMPLE) {
      var urlStart = aRule.simple.url;
      var urlParameter = aRule.simple.parameter;

      if (urlStart.length <= 0 || urlParameter.length <= 0) {
        return null;
      }

      urlRegex = "^" + searchboxsync.Util.escapeRegex(urlStart) + "[^?]*\\?(.*&)?"
          + searchboxsync.Util.escapeRegex(urlParameter) + "=([^&]+)";
    }

    return urlRegex;
  }

  this.addDefaultRules = function() {
    rule = new searchboxsync.Rule();
    rule.name = "Google";
    rule.type = "regex";
    rule.source = "package";
    rule.regex.url = "^http[s]?://([^.]+\\.)?google\\.([a-z]+\\.?)+/[^?/]*\\?(.*&)?(as_)?q=([^&]+)";
    this.addUpdateRule(rule);

    rule = new searchboxsync.Rule();
    rule.name = "Yahoo!";
    rule.type = "regex";
    rule.source = "package";
    rule.regex.url = "^http[s]?://([^.]+\\.)?search\\.yahoo\\.([a-z]+\\.?)+/[^?/]*\\?(.*&)?p=([^&]+)";
    this.addUpdateRule(rule);

    rule = new searchboxsync.Rule();
    rule.name = "Amazon";
    rule.type = "regex";
    rule.source = "package";
    rule.regex.url = "^http[s]?://(www\\.)?amazon\\.([a-z]+\\.?)+/s/ref=[\\w]+(/[\\d-]*)?\\?(.*&)?field-keywords=([^&]+)";
    this.addUpdateRule(rule);
  }

  function notifyRulesUpdate() {
    Components.classes["@mozilla.org/observer-service;1"]
              .getService(Components.interfaces.nsIObserverService)
              .notifyObservers(null, "rulesCache", null);
  }

  function writeRuleToResource(aRule, aResource) {
    rdfUtil.writeAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#name", aRule.name);
    rdfUtil.writeAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#type", aRule.type);
    rdfUtil.writeAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#source", aRule.source);
    rdfUtil.writeAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#disabled", aRule.disabled);

    // Simple
    rdfUtil.writeAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#simpleUrl", aRule.simple.url);
    rdfUtil.writeAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#simpleParameter", aRule.simple.parameter);

    // Regex
    rdfUtil.writeAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#regexUrl", aRule.regex.url);
  }

  function readRuleFromResource(aResource) {
    var rule = new searchboxsync.Rule();

    rule.key = aResource.Value.replace("rdf:#$", "");

    rule.name = rdfUtil.readAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#name");

    rule.type = rdfUtil.readAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#type");
    if (rule.type != self.RULE_TYPE_SIMPLE && rule.type != self.RULE_TYPE_REGEX) {
      rule.type = self.RULE_TYPE_SIMPLE;
    }

    rule.source = rdfUtil.readAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#source");

    rule.disabled = (rdfUtil.readAttribute(self.rdfDatasource, aResource,
                                           "http://legege.com/rdf#disabled") == "false") ? false : true;

    // Simple
    rule.simple.url = rdfUtil.readAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#simpleUrl");
    rule.simple.url = (rule.simple.url == null) ? "" : rule.simple.url;

    rule.simple.parameter = rdfUtil.readAttribute(self.rdfDatasource, aResource,
                                                  "http://legege.com/rdf#simpleParameter");
    rule.simple.parameter = (rule.simple.parameter == null) ? "" : rule.simple.parameter;

    // Regex
    rule.regex.url = rdfUtil.readAttribute(self.rdfDatasource, aResource, "http://legege.com/rdf#regexUrl");
    rule.regex.url = (rule.regex.url == null) ? "" : rule.regex.url;

    return rule;
  }

  /**
   * Construction
   */
  var res = rs.GetResource("urn:searchboxsync:rules");
  if (!cu.IsSeq(this.rdfDatasource, res)) {
    rdfContainer = cu.MakeSeq(this.rdfDatasource, res);
    this.addDefaultRules();
  }
  else {
    rdfContainer = cu.MakeSeq(this.rdfDatasource, res);
  }

  rulesCacheObserver.register();
  addEventListener("unload", function(aEvent) { searchboxsync.RuleService.onUnload(aEvent); }, false);

  this.onUnload = function(aEvent) {
    rulesCacheObserver.unregister();
  };

}
