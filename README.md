[Character Identifier](https://dbaron.org/mozilla/char-identifier/) is a [Web Extension](https://developer.mozilla.org/en-US/Add-ons/WebExtensions) that adds a browser context menu item for selected text that provides more information (from the [Unicode database](http://www.unicode.org/ucd/)) about the characters selected.

It was previously (in this same repository) a Firefox extension using the old XUL-based Firefox extensions API. Because it is a Web extension, it works in both Firefox, Chrome, and Edge.

Build it by running `make`. The unpacked output will be in `output/`, and the packaged extension will be in `char-identifier.zip`.
