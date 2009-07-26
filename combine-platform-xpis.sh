#!/bin/bash
# vim: set shiftwidth=4 tabstop=4 autoindent noexpandtab:
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
# The Original Code is the leak-monitor extension.
#
# The Initial Developer of the Original Code is the Mozilla Foundation.
# Portions created by the Initial Developer are Copyright (C) 2006
# the Initial Developer. All Rights Reserved.
#
# Contributor(s):
#   L. David Baron <dbaron@dbaron.org>, Mozilla Corporation (original author)
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

if [ $# -lt 3 ]
then
	echo "Usage: $0 <dest> <source> <source> ..." 1>&2
	exit 1
fi

DEST="$1"
shift

if [ -e "$DEST" ]
then
	echo "Destination file $DEST already exists." 1>&2
	exit 2
fi

OLDUMASK=$(umask)
umask 077
TMPDIR="$(mktemp -d)" || exit 2

for SRC in "$@"
do
	mkdir "$TMPDIR/in"
	unzip -d "$TMPDIR/in" "$SRC" > /dev/null
	PLATFORM=$(grep targetPlatform "$TMPDIR/in/install.rdf" | cut -d\> -f2 | cut -d\< -f1)
	echo "Merging $PLATFORM" 1>&2
	mkdir "$TMPDIR/in/platform"
	mkdir "$TMPDIR/in/platform/$PLATFORM"
	mkdir "$TMPDIR/in/platform/$PLATFORM/components"
	(cd "$TMPDIR/in" && find components -type f -a -not -name "*.xpt") | while read BINARY
	do
		mv "$TMPDIR/in/$BINARY" "$TMPDIR/in/platform/$PLATFORM/$BINARY"
	done
	if [ -e "$TMPDIR/out" ]
	then
		# Move platform directory
		mv "$TMPDIR/in/platform/$PLATFORM" "$TMPDIR/out/platform/"

		# Merge install.rdf targetPlatform lines
		dos2unix -q "$TMPDIR/in/install.rdf"
		if diff "$TMPDIR/out/install.rdf" "$TMPDIR/in/install.rdf" | grep "^[<>]" | grep -v targetPlatform
		then
			echo "Warning: Differences in install.rdf files other than targetPlatform." 1>&2
		fi
		diff --ifdef=DELETEME "$TMPDIR/out/install.rdf" "$TMPDIR/in/install.rdf" | grep -v "^#" > "$TMPDIR/install.rdf"
		mv "$TMPDIR/install.rdf" "$TMPDIR/out/install.rdf"

		# XXX Warn if there are other differences?

		# Remove the rest
		rm -rf "$TMPDIR/in"
	else
		mv "$TMPDIR/in" "$TMPDIR/out"
	fi

	# Fix the targetPlatform we generated for Universal binaries to
	# represent only what is really supported.
	cat "$TMPDIR/out/install.rdf" | sed '/<em:targetPlatform>Darwin</{ h; s/<em:targetPlatform>Darwin</<em:targetPlatform>Darwin_x86-gcc3</; G; s/<em:targetPlatform>Darwin</<em:targetPlatform>Darwin_ppc-gcc3</}' > "$TMPDIR/install.rdf"
	mv "$TMPDIR/install.rdf" "$TMPDIR/out/install.rdf"
done

(cd "$TMPDIR/out" && zip ../out.zip $(find . -type f))
mv "$TMPDIR/out.zip" "$DEST"

umask $OLDUMASK
rm -rf "$TMPDIR"
