// vim: set sw=4 noet ts=4 autoindent copyindent:
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
 * The Original Code is about:accessibilityenabled.
 *
 * The Initial Developer of the Original Code is the Mozilla Foundation.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   L. David Baron <dbaron@dbaron.org> (original author)
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

var gMainDB = null;
var gHanDB = null;
var gJamoDB = null;

function getCharacterInfo(aCodepoint) {
	// Exclude all the regions that have entries showing up in
	//    grep ", \(First\|Last\)" ../data/UnicodeData.txt
	if ((0x3400 <= aCodepoint && aCodepoint <= 0x4db5) ||
	    (0x4e00 <= aCodepoint && aCodepoint <= 0x9fbb) ||
	    (0x20000 <= aCodepoint && aCodepoint <= 0x2a6d6))
		return getUnihanCharacterInfo(aCodepoint);

	if (0xac00 <= aCodepoint && aCodepoint <= 0xd7a3)
		return getHangulSyllable(aCodepoint);

	if (0xd800 <= aCodepoint && aCodepoint <= 0xdb7f)
		return "<Non Private Use High Surrogate>";
	if (0xdb80 <= aCodepoint && aCodepoint <= 0xdbff)
		return "<Private Use High Surrogate>";
	if (0xdc00 <= aCodepoint && aCodepoint <= 0xdfff)
		return "<Low Surrogate>";
	if (0xe000 <= aCodepoint && aCodepoint <= 0xf8ff)
		return "<Private Use>";
	if (0xf0000 <= aCodepoint && aCodepoint <= 0xffffd)
		return "<Plane 15 Private Use>";
	if (0x100000 <= aCodepoint && aCodepoint <= 0x10fffd)
		return "<Plane 16 Private Use>";

	if (!ensure_main_db())
		return "Loading...";
	if (aCodepoint in gMainDB)
		return gMainDB[aCodepoint];
	return "";
}

function getUnihanCharacterInfo(aCodepoint) {
	var result = "<CJK Ideograph>";

	if (!ensure_han_db()) {
		result += " Loading...";
		return result;
	}
	var obj = gHanDB[aCodepoint];
	if (obj) {
		if ("kJapaneseKun" in obj || "kJapaneseOn" in obj) {
			result += " [ja: ";
			if ("kJapaneseKun" in obj)
				result += obj["kJapaneseKun"];
			result += " / ";
			if ("kJapaneseOn" in obj)
				result += obj["kJapaneseOn"];
			result += "]";
		}
		if ("kMandarin" in obj)
			result += " [zh(M):" + obj["kMandarin"] + "]";
		if ("kCantonese" in obj)
			result += " [zh(C):" + obj["kCantonese"] + "]";
		if ("kKorean" in obj)
			result += " [ko:" + obj["kKorean"] + "]";
		if ("kDefinition" in obj)
			result += " (" + obj["kDefinition"] + ")";
	}

	return result;
}

function getHangulSyllable(aCodepoint) {
	if (!ensure_jamo_db()) {
		return "HANGUL SYLLABLE Loading...";
	}

	// This code is based on pseudo-code in the Unicode
	// specification, version 4.0, section 3.12.
	// A Hangul syllable is composed of a leading consonant (L), a
	// vowel (V), and a trailing consonant (T, optional).
	const SBase = 0xAC00;
	const LBase = 0x1100;
	const VBase = 0x1161;
	const TBase = 0x11A7;
	const SCount = 11172;
	const LCount = 19;
	const VCount = 21;
	const TCount = 28;
	const NCount = VCount * TCount;

	var SIndex = aCodepoint - SBase;
	if (SIndex < 0 || SIndex >= SCount)
		throw CR.NS_ERROR_UNEXPECTED;
	var L = LBase + Math.floor(SIndex / NCount);
	var V = VBase + Math.floor((SIndex % NCount) / TCount);
	var T = TBase + SIndex % TCount;

	var result = "HANGUL SYLLABLE " + gJamoDB[L] + gJamoDB[V];
	if (T != TBase)
		result += gJamoDB[T];
	return result;
}

function ensure_main_db() {
	if (gMainDB)
		return gMainDB.loaded;
	gMainDB = new Array();
	gMainDB.loaded = false;

	// FIXME: Return to event loop every 5000 lines!
	read_file_in_extension("UnicodeData.txt").then((generate_lines) => {
		for (let line of generate_lines()) {
			var fields = line.split(";");
			var codepoint = parseInt(fields[0], 16);
			var description = fields[1];
			if (fields[10] != "")
				description += " (" + fields[10] + ")";
			gMainDB[codepoint] = description;
		}

		gMainDB.loaded = true;
		notify_db_loaded();
	});
	return false;
}

function ensure_han_db() {
	if (gHanDB)
		return gHanDB.loaded;
	gHanDB = new Array();
	gHanDB.loaded = false;

	// FIXME: Return to event loop every 5000 lines!
	read_file_in_extension("Unihan_Readings.txt").then((generate_lines) => {
		for (let line of generate_lines()) {
			var fields = line.split("\t");
			if (fields.length < 3)
				continue;
			var codepoint = parseInt(fields[0].substring(2), 16);
			if (!(codepoint in gHanDB))
				gHanDB[codepoint] = {};
			var key = fields[1];
			var value = fields[2];
			gHanDB[codepoint][key] = value;
		}
		gHanDB.loaded = true;
		notify_db_loaded();
	});
	return false;
}

function ensure_jamo_db() {
	if (gJamoDB)
		return gJamoDB.loaded;
	gJamoDB = new Array();
	gJamoDB.loaded = false;

	read_file_in_extension("Jamo.txt").then((generate_lines) => {
		for (let line of generate_lines()) {
			var fields = line.match(/^([0-9A-F]+); (\w*)/);
			if (!fields)
				continue;
			var codepoint = parseInt(fields[1], 16);
			var jamo = fields[2];
			gJamoDB[codepoint] = jamo;
		}
		gJamoDB.loaded = true;
		notify_db_loaded();
	});

	return false;
}

function read_file_in_extension(aFilename) {
	// FIXME: Do we need to force UTF-8, or does the default work?
	return Promise.resolve( // response.text() returns a Promise (FIXME: needed?)
		fetch("data/" + aFilename).
		// FIXME: Use streams when available!
		then((response) => response.text())).
	then((text) => function* generate_lines() {
		let gNextChar = 0;
		while (true) {
			let nextNewline = text.indexOf("\n", gNextChar);
			if (nextNewline == -1) {
				yield text.substr(gNextChar);
				break;
			}
			yield text.substr(gNextChar, nextNewline - gNextChar);
			gNextChar = nextNewline + 1;
		}
	});
}

function string_to_char_array(string)
{
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

	return char_objs;
}

var gCurrentData = {};
var gPendingData = [];

onmessage = function(event) {
	var data = event.data;
	if (data.operation === "add_pending") {
		let arr = string_to_char_array(data.string);
		gPendingData.push(arr);
		// start the load of necessary data, and throw
		// away the result
		fill_descriptions(arr);
	} else if (data.operation === "register") {
		let chars = gPendingData.pop();
		gCurrentData[data.id] = chars;
		send_chars(data.id);
	} else if (data.operation === "unregister") {
		delete gCurrentData[data.id];
	}
};

function fill_descriptions(arr) {
	arr.forEach((ch) => {
		ch.description = getCharacterInfo(ch.unicode);
	});
}

function send_chars(id) {
	postMessage({id: id, chars: gCurrentData[id]});
}

function notify_db_loaded() {
	for (let id in gCurrentData) {
		fill_descriptions(gCurrentData[id]);
		send_chars(id);
	}
	for (let chars of gPendingData) {
		fill_descriptions(chars);
	}
}
