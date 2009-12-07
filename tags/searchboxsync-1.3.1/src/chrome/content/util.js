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

searchboxsync.Util = new function() {
  this.extractTerms = function(aUrlRegex, aUrl) {
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
        case "EUCJP":
          terms = UnescapeEUCJP(terms);
          break;
        case "SJIS":
          terms = UnescapeSJIS(terms);
          break;
        case "JIS7":
          terms = UnescapeJIS7(terms);
          break;
        case "JIS8":
          terms = UnescapeJIS8(terms);
          break;
        default:
          terms = decodeURIComponent(terms);
          break;
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
  }

  this.getCurrentBrowserUrl = function() {
    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
                       .getService(Components.interfaces.nsIWindowMediator);
    var browserWindow = wm.getMostRecentWindow("navigator:browser");
    if (browserWindow) {
      return browserWindow.content.location.href;
    }
    return null;
  }

  /**
   * Open a URL in a new window.
   * @param aURL The url to open.
   */
  this.openURL = function(aURL) {
    openDialog("chrome://browser/content/browser.xul", "_blank", "chrome,all,dialog=no", aURL, null, null);
  }

  /**
   * Escapes a string before to be used in a Regular Expression.
   * @param aValue The value to be escaped.
   * @return Returns the escaped value.
   */
  this.escapeRegex = function(aValue) {
    // These characters has to be escaped : ^ $ \ . * + ? ( ) [ ] { } |
    // @see http://www.ecma-international.org/publications/files/ECMA-ST/Ecma-262.pdf (p.142)
    return aValue.replace(/(\^)|(\$)|(\\)|(\.)|(\*)|(\+)|(\?)|(\()|(\))|(\[)|(\])|(\{)|(\})|(\|)/g, "\\$&");
  }
}
