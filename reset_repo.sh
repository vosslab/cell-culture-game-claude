#!/usr/bin/env bash

# Reset this repo after cloning from the starter-repo-template.
# Removes repo-specific files and clears README and CHANGELOG
# so the new project starts clean. Self-deletes when done.

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT" || exit 1

echo "Resetting repo from starter-repo-template..."
echo ""

# Truncate repo-specific content files
for f in README.md docs/CHANGELOG.md; do
	if [ -f "$f" ]; then
		rm "$f"
		touch "$f"
		echo "  Truncated: $f"
	fi
done

# Remove repo-specific scripts
for f in propagate_style_guides.py devel/submit_to_pypi.py; do
	if [ -f "$f" ]; then
		git rm -q "$f"
		echo "  Removed:   $f"
	fi
done

# Self-delete
if [ -f "reset_repo.sh" ]; then
	git rm -q reset_repo.sh
	echo "  Removed:   reset_repo.sh"
fi

echo ""
git commit -a -m 'initial commit: reset repo to base template'
echo "Done. Repo reset and committed."
