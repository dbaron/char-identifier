/* vim: set shiftwidth=4 tabstop=4 autoindent cindent noexpandtab: */
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
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
 * The Original Code is the character identifier extension.
 *
 * The Initial Developer of the Original Code is the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   L. David Baron <dbaron@dbaron.org>, Mozilla Corporation (original author)
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

function CharacterDialogOnLoad()
{
	var string = window.arguments[0];
	/*
	 * An array of objects with the following properties:
	 *   "char": a string containing the character
	 *   "unicode": an integer containing the unicode codepoint
	 *   "description" (optional, since lazily constructed): character
	 *                 description
	 */
	var char_objs = [];

	for (var idx = 0; idx < string.length; ++idx) {
		var length = 1;
		var char_obj = {};
		if ((string.charCodeAt(idx) & 0xFC00) == 0xD800 &&
			idx + 1 < string.length &&
			(string.charCodeAt(idx + 1) & 0xFC00) == 0xDC00) {
			// Convert the surrogate pair.
			char_obj.char = string.substring(idx, idx + 2);
			var h = string.charCodeAt(idx) & 0x03FF;
			var l = string.charCodeAt(idx + 1) & 0x03FF;
			char_obj.unicode = 0x10000 + (h << 10) + l;
			++idx; // extra increment
		} else {
			char_obj.char = string.substring(idx, idx + 1);
			char_obj.unicode = string.charCodeAt(idx);
		}
		char_objs.push(char_obj);
	}

	var gCharIdentifierService = Components.classes["@dbaron.org/extensions/char-identifier/service;1"].getService(Components.interfaces.charidentifierIService);

	var tree_view = {
		rowCount: char_objs.length,
		selection: null,
		getRowProperties: function(index, properties) {},
		getCellProperties: function(row, col, properties) {},
		getColumnProperties: function(col, properties) {},
		isContainer: function(index) { return false; },
		isContainerOpen: function(index) { return false; },
		isContainerEmpty: function(index) { return false; },
		isSeparator: function(index) { return false; },
		isSorted: function() { return false; },
		canDrop: function(index, orientation) { return false; },
		drop: function(index, orientation) { throw Components.results.NS_ERROR_UNEXPECTED; },
		getParentIndex: function(rowIndex) { return -1; },
		hasNextSibling: function(rowIndex, afterIndex) { /* XXX ??? */ return false; },
		getLevel: function(index) { return 0; },
		getImageSrc: function(row, col) { return ""; },
		getCellValue: function(row, col) { throw Components.results.NS_ERROR_UNEXPECTED; },
		getCellText: function(row, col) {
			var char_obj = char_objs[row];
			if (col.id == "chars:char")
				return char_obj.char;
			if (col.id == "chars:unicode")
				return "U+" + char_obj.unicode.toString(16).toUpperCase();
			if (col.id == "chars:description")
				return gCharIdentifierService.getCharacterInfo(char_obj.unicode);
			throw Components.results.NS_ERROR_UNEXPECTED;
		},
		setTree: function(tree) { this.treebox = tree; },
		toggleOpenState: function(index) { throw Components.results.NS_ERROR_UNEXPECTED; },
		cycleHeader: function(col) {},
		selectionChanged: function() {},
		cycleCell: function(row, col) {},
		isEditable: function(row, col) { return false; },
		isSelectable: function(row, col) { return false; },
		setCellValue: function(row, col) { throw Components.results.NS_ERROR_UNEXPECTED; },
		setCellText: function(row, col) { throw Components.results.NS_ERROR_UNEXPECTED; },
		performAction: function(action) {},
		performActionOnRow: function(action, row) {},
		performActionOnCell: function(action, row, col) {},

		QueryInterface: function(iid) {
			if (iid.equals(Components.interfaces.nsISupports) ||
				iid.equals(Components.interfaces.nsITreeView))
				return this;
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
	};

	document.getElementById("chars-tree").view = tree_view;
}

function CharacterDialogOnUnload()
{
}
