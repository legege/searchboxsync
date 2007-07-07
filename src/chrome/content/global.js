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

const SEARCHBOXSYNC_VERSION = "@VERSION@";

var gSearchBoxSyncRDFUtil = {
  _rs : Components.classes["@mozilla.org/rdf/rdf-service;1"]
                  .getService(Components.interfaces.nsIRDFService),

  readAttribute: function(aDS, aRes, aName) {
    var target = aDS.GetTarget(aRes, this._rs.GetResource(aName), true);
    if (target) {
      return target.QueryInterface(Components.interfaces.nsIRDFLiteral).Value;
    }
    return null;
  },

  writeAttribute: function(aDS, aRes, aName, aValue) {
    var target = aDS.GetTarget(aRes, this._rs.GetResource(aName), true);
    if (target) {
      aDS.Change(aRes, this._rs.GetResource(aName), target, this._rs.GetLiteral(aValue));
    }
    else {
      aDS.Assert(aRes, this._rs.GetResource(aName), this._rs.GetLiteral(aValue), true);
    }
  },

  removeAttributes: function(aDS, aRes) {
    var attributes = aDS.ArcLabelsOut(aRes);
    while (attributes.hasMoreElements()) {
      var att = attributes.getNext();
      var target = aDS.GetTarget(aRes, att, true);
      aDS.Unassert(aRes, att, target);
    }
  },

  /**
   * @return Returns the absolute path of the file in the user profile.
   */
  getUserProfileRDFFile: function(aFilename) {
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
  },

  saveDataSource: function(aDS) {
    var rds = aDS.QueryInterface(Components.interfaces.nsIRDFRemoteDataSource);
    rds.Flush();
  }
}

var gSearchBoxSyncUtil = {
  extractTerms: function(aUrlRegex, aUrl) {
    if (!aUrlRegex) {
      return null;
    }

    var urlExpression = new RegExp(aUrlRegex, 'i');
    var terms = "";
	var encodetype = "";

    // Test to see if the URL matches the given pattern
    if (urlExpression.test(aUrl)) {
      // Extract the search terms from the URL
      terms = RegExp.lastParen;
      terms = terms.replace(/\+/g, " "); // Replace all + signs with a space
      terms = terms.replace(/%252B/g, " "); // Replace all %252B signs with a space

      // Fixed by Masao Fukushima (alice0775@yahoo.co.jp)
      encodetype = GetEscapeCodeType(terms);
      switch (encodetype) {
        case "EUCJP": terms = UnescapeEUCJP(terms); break;
        case "SJIS": terms = UnescapeSJIS(terms); break;
        case "JIS7": terms = UnescapeJIS7(terms); break;
        case "JIS8": terms = UnescapeJIS8(terms); break;
        default: terms = decodeURIComponent(terms); break;
      }
    }

    /*
     * XXXLegendre: a problem caused by decodeURIComponent; See the bug #314456.
     * I leave this here because this extension can be installed in Mozilla < 1.8.
     */
    if (terms == "") {
      terms = "";
    }

    return terms;
  },

  getCurrentBrowserUrl: function() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                      .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    if (browserWindow) {
      return browserWindow.content.location.href;
    }
    return null;
  },

  /**
   * Open a URL in a new window.
   * @param aURL The url to open.
   */
  openURL: function(aURL) {
    openDialog("chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", aURL, null, null);
  },

  /**
   * Escapes a string before to be used in a Regular Expression.
   * @param aValue The value to be escaped.
   * @return Returns the escaped value.
   */
  escapeRegex: function(aValue) {
    // These characters has to be escaped : ^ $ \ . * + ? ( ) [ ] { } |
    // @see http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf (p.142)
    return aValue.replace(/(\^)|(\$)|(\\)|(\.)|(\*)|(\+)|(\?)|(\()|(\))|(\[)|(\])|(\{)|(\})|(\|)/g, "\\$&");
  }
}

/**
 * The representation of a synchronization rule.
 */
function Rule() {
  this.key = null;
  this.name = null;
  this.type = null;
  this.source = "user";
  this.disabled = false;
  this.simple = {url: "", parameter: ""};
  this.regex = {url: ""};
}

function RulesCacheObserver() {}
RulesCacheObserver.prototype = {
  observe: function(subject, topic, data) {
     gSearchBoxSync.ruleService.updateRulesCache();
  },
  register: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "rulesCache", false);
  },
  unregister: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(this, "rulesCache");
  }
}

var gSearchBoxSync = {
  SEARCHBOXSYNC_VERSION: "0.3.5",

  init: function() {
    this.rdf.init();
    this.ruleService.init();

    addEventListener("unload", function(aEvent) { gSearchBoxSync.uninit(); }, false);
  },

  uninit: function() {
    this.ruleService.uninit();
  },

  /**
   * Preferences
   */
  pref: {
    PREF_BRANCH: "extensions.searchboxsync.",
    PREF_VERSION: "version",
    _prefService: Components.classes["@mozilla.org/preferences-service;1"]
                            .getService(Components.interfaces.nsIPrefService),

    /**
     * @return Returns the preferences branch.
     */
    get branch() {
      return this._prefService.getBranch(this.PREF_BRANCH);
    },

    /**
     * @return Returns the version.
     */
    get version() {
      try {
        return this.branch.getCharPref(this.PREF_VERSION);
      }
      catch (e) {
        this.highlighted = false;
        return false;
      }
    },

    /**
     * Sets the version.
     * @param v The version
     */
    set version(v) {
      this.branch.setCharPref(this.PREF_VERSION, v);
    }
  },

  rdf: {
    _rs : Components.classes["@mozilla.org/rdf/rdf-service;1"]
                    .getService(Components.interfaces.nsIRDFService),
    datasource: null,
    RDF_FILE: "searchboxsync.rdf",

    init: function() {
      this.datasource = this._rs.GetDataSourceBlocking(gSearchBoxSyncRDFUtil
        .getUserProfileRDFFile(this.RDF_FILE));
    }
  },

  ruleService: {
    _rs : Components.classes["@mozilla.org/rdf/rdf-service;1"]
                    .getService(Components.interfaces.nsIRDFService),
    _cu : Components.classes["@mozilla.org/rdf/container-utils;1"]
                    .getService(Components.interfaces.nsIRDFContainerUtils),
    _rulesCache: null,
    _rulesCacheObserver: null,
    rdfContainer: null,
    rdfDatasource: null,
    RULE_TYPE_SIMPLE: "simple",
    RULE_TYPE_REGEX: "regex",

    init: function() {
      this.rdfDatasource = gSearchBoxSync.rdf.datasource;

      var res = this._rs.GetResource("urn:searchboxsync:rules");
      if (!this._cu.IsSeq(this.rdfDatasource, res)) {
        this.rdfContainer = this._cu.MakeSeq(this.rdfDatasource, res);
        this.addDefaultRules();
      }
      else {
        this.rdfContainer = this._cu.MakeSeq(this.rdfDatasource, res);
      }

      this._rulesCacheObserver = new RulesCacheObserver();
      this._rulesCacheObserver.register();
    },

    uninit: function() {
      this._rulesCacheObserver.unregister();
    },

    get rules() {
      if (!this._rulesCache) {
        this.updateRulesCache();
      }
      return this._rulesCache;
    },

    addUpdateRule: function(aRule) {
      var res;
      if (aRule.key != null) {
        res = this._rs.GetResource("rdf:#$" + aRule.key);
        this._writeRuleToResource(aRule, res);
      }
      else {
        res = this._rs.GetAnonymousResource();
        this._writeRuleToResource(aRule, res);

        this.rdfContainer.AppendElement(res);
      }
      this._notifyRulesUpdate();

      return res.Value.replace("rdf:#$", "");
    },

    deleteRuleByKey: function(aKey) {
      var res = this._rs.GetResource("rdf:#$" + aKey);
      gSearchBoxSyncRDFUtil.removeAttributes(this.rdfDatasource, res);
      this.rdfContainer.RemoveElement(res, true);

      this._notifyRulesUpdate();
    },

    moveRuleUp: function(aRule) {
      var movingRes = this._rs.GetResource("rdf:#$" + aRule.key);

      var index = this.rdfContainer.IndexOf(movingRes);
      if (index > 1) {
        this.rdfContainer.RemoveElement(movingRes, true);
        this.rdfContainer.InsertElementAt(movingRes, index - 1, true);

        this._notifyRulesUpdate();
        return true;
      }
      return false;
    },

    moveRuleDown: function(aRule) {
      var movingRes = this._rs.GetResource("rdf:#$" + aRule.key);

      var index = this.rdfContainer.IndexOf(movingRes);
      if (index < this.rdfContainer.GetCount()) {
        this.rdfContainer.RemoveElement(movingRes, true);
        this.rdfContainer.InsertElementAt(movingRes, index + 1, true);

        this._notifyRulesUpdate();
        return true;
      }
      return false;
    },

    reset: function(aPackageOnly) {
      var children = this.rdfContainer.GetElements();
      while (children.hasMoreElements()) {
        var res = children.getNext();
        if (res instanceof Components.interfaces.nsIRDFResource) {
          var source = gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
              res, "http://legege.com/rdf#source");
          if (!aPackageOnly || aPackageOnly && source == "package") {
            gSearchBoxSyncRDFUtil.removeAttributes(this.rdfDatasource, res);
            this.rdfContainer.RemoveElement(res, false);
          }
        }
      }

      this._rulesCache = null;

      this.addDefaultRules();
      this._notifyRulesUpdate();
    },

    getRuleByKey: function(aKey) {
      var rule = new Rule();

      var res = this._rs.GetResource("rdf:#$" + aKey);

      if (res != null) {
        return this._readRuleFromResource(res);
      }

      return rule;
    },

    updateRulesCache: function() {
      var rules = new Array();

      var children = this.rdfContainer.GetElements();
      while (children.hasMoreElements()) {
        var res = children.getNext();
        if (res instanceof Components.interfaces.nsIRDFResource) {
          rules.push(this._readRuleFromResource(res));
        }
      }

      this._rulesCache = rules;
    },

    _notifyRulesUpdate: function() {
      Components.classes["@mozilla.org/observer-service;1"]
                .getService(Components.interfaces.nsIObserverService)
                .notifyObservers(null, "rulesCache", null);
    },

    _writeRuleToResource: function(aRule, aResource) {
      gSearchBoxSyncRDFUtil.writeAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#name", aRule.name);
      gSearchBoxSyncRDFUtil.writeAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#type", aRule.type);
      gSearchBoxSyncRDFUtil.writeAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#source", aRule.source);
      gSearchBoxSyncRDFUtil.writeAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#disabled", aRule.disabled);

      // Simple
      gSearchBoxSyncRDFUtil.writeAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#simpleUrl", aRule.simple.url);
      gSearchBoxSyncRDFUtil.writeAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#simpleParameter", aRule.simple.parameter);

      // Regex
      gSearchBoxSyncRDFUtil.writeAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#regexUrl", aRule.regex.url);
    },

    _readRuleFromResource: function(aResource) {
      var rule = new Rule();

      rule.key = aResource.Value.replace("rdf:#$", "");
      rule.name = gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#name");
      rule.type = gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#type");

      if (rule.type != gSearchBoxSync.ruleService.RULE_TYPE_SIMPLE &&
          rule.type != gSearchBoxSync.ruleService.RULE_TYPE_REGEX) {
        rule.type = gSearchBoxSync.ruleService.RULE_TYPE_SIMPLE;
      }

      rule.source = gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#source");
      rule.disabled = (gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#disabled") == "false") ? false : true;

      // Simple
      rule.simple.url = gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#simpleUrl");
      rule.simple.url = (rule.simple.url == null) ? "" : rule.simple.url;
      rule.simple.parameter = gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#simpleParameter");
      rule.simple.parameter = (rule.simple.parameter == null) ? "" : rule.simple.parameter;

      // Regex
      rule.regex.url = gSearchBoxSyncRDFUtil.readAttribute(this.rdfDatasource,
        aResource, "http://legege.com/rdf#regexUrl");
      rule.regex.url = (rule.regex.url == null) ? "" : rule.regex.url;

      return rule;
    },

    addDefaultRules: function() {
      rule = new Rule();
      rule.name = "Firefox Keyword Search";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "^keyword:(.*)";
      this.addUpdateRule(rule);

      var rule = new Rule();
      rule.name = "Google";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "^http://[^.]*.google\\..*/[^(?|/)]*\\?(.*&)?(as_)?q=([^&]+)";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "Yahoo!";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "^http://([^\\.]+\\.)?search.yahoo\\..*/[^?/]*\\?(.*&)?p=([^&]+)";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "MSN";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "^http://search.([^\\.]+\\.)?msn\\..*/results\\.asp[x]\\?(.*&)?q=([^&]+)";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "Amazon";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "^http://www\\.amazon\\..*/exec/obidos/([\\w]+-)*search(-[\\w]+)*/[\\d-]*\?(.*&)?field-keywords=([^&]+)";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "Answers.com";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "^http://www\\.answers\\.com/([^&/?]*)[^/]*$";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "Creative Commons";
      rule.type = "simple";
      rule.source = "package";
      rule.simple.url = "http://search.creativecommons.org/index.jsp";
      rule.simple.parameter = "q";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "eBay";
      rule.type = "simple";
      rule.source = "package";
      rule.simple.url = "http://search.ebay.com/search/";
      rule.simple.parameter = "satitle";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "Wikipedia";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "http://[^.]{2,3}\\.wikipedia\\.org/wiki/Special:Search\\?(.*&)?search=([^&]+)";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "Reference.com (Dictionary.com, Thesaurus.com)";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "http://[^.]*\\.reference\\.com/search\\?(.*&)?q=([^&]+)";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "Mozilla Update";
      rule.type = "regex";
      rule.source = "package";
      rule.regex.url = "^http[s]://addons\\.mozilla\\.org/quicksearch\\.php\\?(.*&)?q=([^&]+)";
      this.addUpdateRule(rule);

      rule = new Rule();
      rule.name = "SourceForge.net";
      rule.type = "simple";
      rule.source = "package";
      rule.simple.url = "http://sourceforge.net/search/";
      rule.simple.parameter = "words";
      this.addUpdateRule(rule);
    },

    makeUrlRegex: function(aRule) {
      var urlRegex;

      if (aRule.type == gSearchBoxSync.ruleService.RULE_TYPE_REGEX) {
        urlRegex = aRule.regex.url;
      }
      else if (aRule.type == gSearchBoxSync.ruleService.RULE_TYPE_SIMPLE) {
        var urlStart = aRule.simple.url;
        var urlParameter = aRule.simple.parameter;

        if (urlStart.length <= 0 || urlParameter.length <= 0) {
          return null;
        }

        urlRegex = "^" + gSearchBoxSyncUtil.escapeRegex(urlStart) + "[^?]*\\?(.*&)?"
            + gSearchBoxSyncUtil.escapeRegex(urlParameter) + "=([^&]+)";
      }

      return urlRegex;
    }
  }
}

gSearchBoxSync.init();