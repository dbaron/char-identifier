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

const CI = Components.interfaces;
const CC = Components.classes;
const CR = Components.results;

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function CharIdentifierService() {
	this.mMainDB = null;
	this.mHanDB = null;
	this.mJamoDB = null;
}

CharIdentifierService.prototype = {
	// Data for module / factory.
	classDescription: "char-identifier service",
	classID: Components.ID("{49ba9c07-8ce2-412b-afd6-8202d7828f38}"),
	contractID: "@dbaron.org/extensions/char-identifier/service;1",

	// nsISupports implementation
	QueryInterface: function(uuid) {
		if (uuid.equals(CI.nsISupports) ||
		    uuid.equals(CI.charidentifierIService))
			return this;
		throw CR.NS_NOINTERFACE;
	},

	// charidentifierIService implementation
	getCharacterInfo: function(aCodepoint) {
		// Exclude all the regions that have entries showing up in
		//    grep ", \(First\|Last\)" ../data/UnicodeData.txt
		if ((0x3400 <= aCodepoint && aCodepoint <= 0x4db5) ||
		    (0x4e00 <= aCodepoint && aCodepoint <= 0x9fbb) ||
		    (0x20000 <= aCodepoint && aCodepoint <= 0x2a6d6))
			return this.getUnihanCharacterInfo(aCodepoint);

		if (0xac00 <= aCodepoint && aCodepoint <= 0xd7a3)
			return this.getHangulSyllable(aCodepoint);

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

		if (!this.ensure_main_db())
			return "Loading...";
		if (aCodepoint in this.mMainDB)
			return this.mMainDB[aCodepoint];
		return "";
	},

	// private

	getUnihanCharacterInfo: function(aCodepoint) {
		var result = "<CJK Ideograph>";

		if (!this.ensure_han_db()) {
			result += " Loading...";
			return result;
		}
		var obj = this.mHanDB[aCodepoint];
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
	},

	getHangulSyllable: function(aCodepoint) {
		if (!this.ensure_jamo_db()) {
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

		var result = "HANGUL SYLLABLE " + this.mJamoDB[L] + this.mJamoDB[V];
		if (T != TBase)
			result += this.mJamoDB[T];
		return result;
	},

	notify_descriptions_loaded: function() {
		var os = CC["@mozilla.org/observer-service;1"].getService(CI.nsIObserverService);
		os.notifyObservers(this, "@dbaron.org/extensions/char-identifier/descriptions-loaded;1", "");
	},

	ensure_main_db: function() {
		if (this.mMainDB)
			return this.mMainDB.loaded;
		this.mMainDB = new Array();
		this.mMainDB.loaded = false;

		var line = { value: "" };
		var more_lines;

		var lis = this.read_file_in_extension("UnicodeData.txt");
		var timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer);
		var outer_this = this;
		var timer_callback = {
			notify: function() {
				var count = 5000; // lines at a time
				do {
					more_lines = lis.readLine(line);

					var fields = line.value.split(";");
					var codepoint = parseInt(fields[0], 16);
					var description = fields[1];
					if (fields[10] != "")
						description += " (" + fields[10] + ")";
					outer_this.mMainDB[codepoint] = description;
				} while (more_lines && --count > 0);

				if (!more_lines) {
					timer.cancel();
					timer = null;
					outer_this.mMainDB.loaded = true;
					outer_this.notify_descriptions_loaded();
				}
			}
		};
		timer.initWithCallback(timer_callback, 0, CI.nsITimer.TYPE_REPEATING_SLACK);
		return false;
	},

	ensure_han_db: function() {
		if (this.mHanDB)
			return this.mHanDB.loaded;
		this.mHanDB = new Array();
		this.mHanDB.loaded = false;

		var line = { value: "" };
		var more_lines;

		var lis = this.read_file_in_extension("Unihan.txt");
		var timer = CC["@mozilla.org/timer;1"].createInstance(CI.nsITimer);
		var outer_this = this;
		var timer_callback = {
			notify: function() {
				var count = 5000; // lines at a time
				do {
					more_lines = lis.readLine(line);

					var fields = line.value.split("\t");
					if (fields.length < 3)
						continue;
					var codepoint = parseInt(fields[0].substring(2), 16);
					if (!(codepoint in outer_this.mHanDB))
						outer_this.mHanDB[codepoint] = {};
					var key = fields[1];
					var value = fields[2];
					outer_this.mHanDB[codepoint][key] = value;
				} while (more_lines && --count > 0);

				if (!more_lines) {
					timer.cancel();
					timer = null;
					outer_this.mHanDB.loaded = true;
					outer_this.notify_descriptions_loaded();
				}
			}
		};
		timer.initWithCallback(timer_callback, 0, CI.nsITimer.TYPE_REPEATING_SLACK);
		return false;
	},

	ensure_jamo_db: function() {
		if (this.mJamoDB)
			return true;
		this.mJamoDB = new Array();

		var line = { value: "" };
		var more_lines;

		var lis = this.read_file_in_extension("Jamo.txt");
		do {
			more_lines = lis.readLine(line);

			var fields = line.value.match(/^([0-9A-F]+); (\w*)/);
			if (!fields)
				continue;
			var codepoint = parseInt(fields[1], 16);
			var jamo = fields[2];
			this.mJamoDB[codepoint] = jamo;
		} while (more_lines);

		return true;
	},

	read_file_in_extension: function(aFilename) {
		// The component is a file in the components directory, so
		// follow |parent| twice to get the root of the extension
		// installation.
		var file = __LOCATION__.parent.parent.clone();
		file.append("data");
		file.append(aFilename);

		if (!file.exists() ||
		    !file.isFile() ||
		    !file.isReadable())
			throw CR.NS_ERROR_UNEXPECTED;
		var fis = CC["@mozilla.org/network/file-input-stream;1"]
			.createInstance(CI.nsIFileInputStream);
		fis.init(file, -1, -1, CI.nsIFileInputStream.CLOSE_ON_EOF);
		return fis.QueryInterface(CI.nsILineInputStream);
	}
};

var components = [ CharIdentifierService ];

if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule(components);
