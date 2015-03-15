# FAQ #

  * **How to see what does this add-on do?**
> > Install the add-on and then try to [search something](http://www.google.com/search?q=Mozilla) with [Google](http://www.google.com). The content of the searchbox in the toolbar will change accordingly.

  * **How to add a custom synchronization rule?**
    1. Open the Add-ons Manager (Tools &gt; Add-ons)
    1. Double-click on SearchBox Sync.
    1. Click on "Add...".
    1. Complete all fields.
      * If you choose the rule type "Simple", you have to provide the beginning of the address and the parameter's name in the address where to get the keywords.
      * If you choose the rule type "Regular Expression", you have to provide a valid regular expression. The last _group_ of the expression will determine the terms to be extracted in the address.
    1. It's recommanded to test the rule before to add it.

  * **Can I disable/delete a default synchronization rule?**
> > Yes you can.

  * **A default synchronization rule doesn't work, why?**
> > Well, it might be an unpredicted case. Please [contact me](http://legege.com/contact).

# Custom Rules Suggestions #

| Name | [A9](http://a9.com/) |
|:-----|:---------------------|
| Type | Regular Expression |
| Definition | URL Regex: `^http://a9\.com/([^&/?]*)[^/]*$` |

| Name | [Mozilla Cross Reference (LXR)](http://lxr.mozilla.org/) |
|:-----|:---------------------------------------------------------|
| Type | Regular Expression |
| Definition | URL Regex: `^http://lxr\.mozilla\.org/[^/]+/[^?]+\?((string)|i)=([^&]+)` |

| Name | [WordReference.com](http://www.wordreference.com/) |
|:-----|:---------------------------------------------------|
| Type | Regular Expression |
| Definition | URL Regex: `^http://www\.wordreference\.com/.{2}/translation\.asp\?tranword=(.*)&.*$)` |

| Name | [everyclick](http://www.everyclick.co.uk/)  (by John Pratt, not tested) |
|:-----|:------------------------------------------------------------------------|
| Type | Regular Expression |
| Definition | URL Regex: `^http://[^.]*.everyclick\..*/[^(?|/)]*\?(.*&)?(as_)?keyword=([^&]+)` |