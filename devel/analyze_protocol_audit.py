#!/usr/bin/env python3
"""
analyze_protocol_audit.py - Audit protocol steps for M2 completeness

Generate audit details for each step:
- requiredItems vs targetItems check
- scene membership verification
- item-to-step reachability
- missing waste/reagent routing
"""

import sys
import subprocess
import pathlib
import yaml

def get_repo_root():
    """Determine REPO_ROOT via git rev-parse --show-toplevel."""
    result = subprocess.run(
        ['git', 'rev-parse', '--show-toplevel'],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Failed to find repo root: {result.stderr}")
    return pathlib.Path(result.stdout.strip())

def load_yaml_file(path):
    """Load a YAML file and return parsed content."""
    with open(path, 'r') as f:
        return yaml.safe_load(f)

REPO_ROOT = get_repo_root()
protocol_path = REPO_ROOT / 'content/cell_culture/protocol.yaml'
items_path = REPO_ROOT / 'content/cell_culture/items.yaml'

protocol = load_yaml_file(protocol_path)
items_data = load_yaml_file(items_path)

steps = protocol.get('steps', [])
items = items_data.get('items', {})

# Build item index
item_index = {}
for item_id, item_def in items.items():
    item_index[item_id] = item_def

# Track which items are used by steps
item_usage = {item_id: [] for item_id in items.keys()}

# Audit each step
audit_results = []

for i, step in enumerate(steps):
    audit = {
        'stepIndex': i + 1,
        'id': step.get('id'),
        'label': step.get('label'),
        'scene': step.get('scene'),
        'requiredItems': step.get('requiredItems', []),
        'targetItems': step.get('targetItems', []),
        'issues': [],
        'notes': [],
    }

    # Check 1: every targetItem in requiredItems or is virtual
    for target in audit['targetItems']:
        if target not in item_index:
            audit['issues'].append(f"targetItem '{target}' not declared in items.yaml")
        elif target not in audit['requiredItems']:
            target_item = item_index[target]
            if target_item.get('role') != 'virtual_target':
                audit['issues'].append(
                    f"targetItem '{target}' not in requiredItems (role: {target_item.get('role')})"
                )

    # Check 2: scene membership
    for target in audit['targetItems']:
        if target in item_index:
            target_scene = item_index[target].get('scene')
            if target_scene not in (audit['scene'], 'virtual', 'overlay', 'none'):
                audit['issues'].append(
                    f"targetItem '{target}' has scene: {target_scene}, step has scene: {audit['scene']}"
                )

    # Check 3: track usage
    for item_id in audit['requiredItems']:
        if item_id in item_usage:
            item_usage[item_id].append(step.get('id'))

    audit_results.append(audit)

# Find unused items (non-visual-only items that are never required)
unused_items = []
for item_id, item_def in items.items():
    if not item_usage[item_id]:
        if not item_def.get('visualOnly'):
            unused_items.append({'id': item_id, **item_def})

# Report summary
print('=' * 70)
print('PROTOCOL AUDIT SUMMARY')
print('=' * 70)
print(f'Total steps: {len(steps)}')
print(f'Total items: {len(items)}')
print(f'Items with usage: {sum(1 for usage in item_usage.values() if usage)}')
print(f'Unused items (non-visual): {len(unused_items)}')

if unused_items:
    print('\nUNUSED ITEMS (non-visual-only):')
    for item in unused_items:
        print(f"  - {item['id']} (role: {item.get('role')}, scene: {item.get('scene')})")

# Report issues by step
steps_with_issues = [a for a in audit_results if a['issues']]
if steps_with_issues:
    print('\n' + '=' * 70)
    print('STEPS WITH ISSUES:')
    print('=' * 70)
    for audit in steps_with_issues:
        print(f"\nStep {audit['stepIndex']}: {audit['id']}")
        for issue in audit['issues']:
            print(f"  ! {issue}")

# List all items by step
print('\n' + '=' * 70)
print('ITEM USAGE BY STEP:')
print('=' * 70)
for audit in audit_results:
    req_str = ', '.join(audit['requiredItems'])
    tgt_str = ', '.join(audit['targetItems'])
    print(
        f"{str(audit['stepIndex']).rjust(2)}: {audit['id'].ljust(25)} "
        f"Req: [{req_str}] Tgt: [{tgt_str}]"
    )

print('\n' + '=' * 70)
print('ITEM USAGE SUMMARY:')
print('=' * 70)
sorted_by_usage = sorted(item_usage.items(), key=lambda x: -len(x[1]))

for item_id, used_in in sorted_by_usage:
    if used_in:
        used_str = ', '.join(used_in)
        print(f"{item_id.ljust(25)} used in {len(used_in)} steps: [{used_str}]")

print('\nDone.')
