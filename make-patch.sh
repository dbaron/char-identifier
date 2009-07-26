#!/bin/bash

# Which source should we patch?
MOZRELEASE=http://hg.mozilla.org/releases/mozilla-1.9.1/
MOZREV=FIREFOX_3_1b3_RELEASE  # any revision syntax that hg accepts

TMPDIR="$(mktemp -d)" || exit 1
pushd "$TMPDIR" > /dev/null 2>&1 || exit 1

for FILE in "browser/confvars.sh" "browser/installer/windows/packages-static" "browser/installer/unix/packages-static"
do
    mkdir -p "$(echo "$FILE" | sed 's,/[^/]*$,,;s,^,a/,')"
    wget -q "$MOZRELEASE/raw-file/$MOZREV/$FILE" -O "a/$FILE"
done

cp -r a b

perl -pi -e 's/MOZ_EXTENSIONS_DEFAULT=" /MOZ_EXTENSIONS_DEFAULT=" char-identifier /' b/browser/confvars.sh || exit 1
cat >> b/browser/installer/windows/packages-static <<EOM
bin\\extensions\\char-identifier@dbaron.org\\components\\fontetor.dll
bin\\extensions\\char-identifier@dbaron.org\\components\\char-identifier.xpt
bin\\extensions\\char-identifier@dbaron.org\\chrome\\char-identifier.jar
bin\\extensions\\char-identifier@dbaron.org\\chrome.manifest
bin\\extensions\\char-identifier@dbaron.org\\install.rdf
EOM
cat >> b/browser/installer/unix/packages-static <<EOM
bin/extensions/char-identifier@dbaron.org/chrome.manifest
bin/extensions/char-identifier@dbaron.org/components/char-identifier.xpt
bin/extensions/char-identifier@dbaron.org/components/libfontetor.so
bin/extensions/char-identifier@dbaron.org/install.rdf
bin/extensions/char-identifier@dbaron.org/chrome/char-identifier.jar
EOM
diff -u -r a b
popd > /dev/null
rm -rf "$TMPDIR"

DATE="$(LC_TIME=C TZ=UTC date +'%-d %b %Y %H:%M:%S') -0000"

find . -type f | grep -v ".hg" | sed 's/^\.\///' | while read FNAME
do
        cat <<EOM
diff -N b/extensions/char-identifier/$FNAME
--- /dev/null	1 Jan 1970 00:00:00 -0000
+++ b/extensions/char-identifier/$FNAME	$DATE
EOM
        LEN=$(wc -l "$FNAME" | cut -d' ' -f1)
        if [ "$LEN" == "0" ]
        then
            # really shouldn't even output previous 2 lines, but this
            # case irrelevant in practice
            echo -n
        elif [ "$LEN" == "1" ]
        then
            echo "@@ -0,0 +1 @@"
        else 
            echo "@@ -0,0 +1,$LEN @@"
        fi
        cat $FNAME | sed 's/^/\+/'
done
