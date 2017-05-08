# vim: set shiftwidth=8 tabstop=8 autoindent noexpandtab copyindent:
#
# ***** BEGIN LICENSE BLOCK *****
# Version: MPL 1.1/GPL 2.0/LGPL 2.1
#
# The contents of this file are subject to the Mozilla Public License Version
# 1.1 (the "License"); you may not use this file except in compliance with
# the License. You may obtain a copy of the License at
# http://www.mozilla.org/MPL/
#
# Software distributed under the License is distributed on an "AS IS" basis,
# WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
# for the specific language governing rights and limitations under the
# License.
#
# The Original Code is mozilla.org code.
#
# The Initial Developer of the Original Code is
# Netscape Communications Corporation.
# Portions created by the Initial Developer are Copyright (C) 1998
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#
# Alternatively, the contents of this file may be used under the terms of
# either the GNU General Public License Version 2 or later (the "GPL"), or
# the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
# in which case the provisions of the GPL or the LGPL are applicable instead
# of those above. If you wish to allow use of your version of this file only
# under the terms of either the GPL or the LGPL, and not to allow others to
# use your version of this file under the terms of the MPL, indicate your
# decision by deleting the provisions above and replace them with the notice
# and other provisions required by the GPL or the LGPL. If you do not delete
# the provisions above, a recipient may use your version of this file under
# the terms of any one of the MPL, the GPL or the LGPL.
#
# ***** END LICENSE BLOCK *****

FINAL_TARGET = output
PACKAGE = char-identifier.zip
srcdir = .

DIST_NO_PP_FILES = \
		images/icon-48.png \
		images/icon-96.png \
		src/background.js \
		src/worker.js \
		src/manifest.json \
		src/characterDialog.html \
		src/characterDialog.js \
		src/characterDialog.css \
		$(NULL)

DATA_SIMPLE_PP_FILES = \
		data/Jamo.txt \
		$(NULL)

DATA_HAN_FILES	= \
		data/Unihan_Readings.txt \
		$(NULL)

DATA_NO_PP_FILES = \
		data/LICENSE \
		data/UnicodeData.txt \
		$(NULL)

package:: all
	(cd output && zip -r -FS ../$(PACKAGE) .)

all:: $(DIST_NO_PP_FILES)
	mkdir -p $(FINAL_TARGET)
	for f in $(DIST_NO_PP_FILES); do \
		cp $(srcdir)/$$f $(FINAL_TARGET)/; \
	done

all:: $(DATA_SIMPLE_PP_FILES)
	mkdir -p $(FINAL_TARGET)/data
	for f in $(DATA_SIMPLE_PP_FILES); do \
		echo "# This is a MODIFIED version of a Unicode Data File.  See the file" > $(FINAL_TARGET)/$$f; \
		echo "# LICENSE in this directory for more information." >> $(FINAL_TARGET)/$$f; \
		sed 's/#.*//;/^$$/d' $(srcdir)/$$f >> $(FINAL_TARGET)/$$f; \
	done

all:: $(DATA_HAN_FILES)
	mkdir -p $(FINAL_TARGET)/data
	for f in $(DATA_HAN_FILES); do \
		echo "# This is a MODIFIED version of a Unicode Data File.  See the file" > $(FINAL_TARGET)/$$f; \
		echo "# LICENSE in this directory for more information." >> $(FINAL_TARGET)/$$f; \
		grep "^U+[0-9A-F]\+	k\(Cantonese\|Definition\|JapaneseKun\|JapaneseOn\|Korean\|Mandarin\)	" $(srcdir)/$$f  >> $(FINAL_TARGET)/$$f; \
	done

all:: $(DATA_NO_PP_FILES)
	mkdir -p $(FINAL_TARGET)/data
	for f in $(DATA_NO_PP_FILES); do \
		cp $(srcdir)/$$f $(FINAL_TARGET)/data/; \
	done

clean:
	rm -rf $(FINAL_TARGET) $(PACKAGE)
