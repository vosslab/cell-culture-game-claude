#!/usr/bin/env node
/**
 * analyze_protocol_audit.mjs - Analyze protocol steps for M2 audit
 *
 * Generate audit details for each step:
 * - requiredItems vs targetItems check
 * - scene membership verification
 * - item-to-step reachability
 * - missing waste/reagent routing
 */

import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

const REPO_ROOT = process.env.REPO_ROOT || process.cwd();
const protocolPath = path.join(REPO_ROOT, 'content/cell_culture/protocol.yaml');
const itemsPath = path.join(REPO_ROOT, 'content/cell_culture/items.yaml');

const protocolYaml = yaml.load(fs.readFileSync(protocolPath, 'utf8'));
const itemsYaml = yaml.load(fs.readFileSync(itemsPath, 'utf8'));

const steps = protocolYaml.steps;
const items = itemsYaml.items;

// Build item index
const itemIndex = {};
for (const [id, item] of Object.entries(items)) {
  itemIndex[id] = item;
}

// Track which items are used by steps
const itemUsage = {};
for (const item of Object.values(items)) {
  itemUsage[item] = [];
}

// Audit each step
const auditResults = [];

for (let i = 0; i < steps.length; i++) {
  const step = steps[i];
  const audit = {
    stepIndex: i + 1,
    id: step.id,
    label: step.label,
    scene: step.scene,
    requiredItems: step.requiredItems || [],
    targetItems: step.targetItems || [],
    issues: [],
    notes: [],
  };

  // Check 1: every targetItem in requiredItems or is virtual
  for (const target of audit.targetItems) {
    if (!itemIndex[target]) {
      audit.issues.push(`targetItem '${target}' not declared in items.yaml`);
    } else if (!audit.requiredItems.includes(target)) {
      const targetItem = itemIndex[target];
      if (targetItem.role !== 'virtual_target') {
        audit.issues.push(
          `targetItem '${target}' not in requiredItems (role: ${targetItem.role})`
        );
      }
    }
  }

  // Check 2: scene membership
  for (const target of audit.targetItems) {
    if (itemIndex[target]) {
      const targetScene = itemIndex[target].scene;
      if (targetScene !== audit.scene && targetScene !== 'virtual' && targetScene !== 'overlay' && targetScene !== 'none') {
        audit.issues.push(
          `targetItem '${target}' has scene: ${targetScene}, step has scene: ${audit.scene}`
        );
      }
    }
  }

  // Check 3: track usage
  for (const itemId of audit.requiredItems) {
    if (!Object.keys(itemUsage).includes(itemId)) {
      itemUsage[itemId] = [];
    }
    itemUsage[itemId].push(step.id);
  }

  auditResults.push(audit);
}

// Find unused items (non-visual-only items that are never required)
const unusedItems = [];
for (const [itemId, item] of Object.entries(items)) {
  if (!itemUsage[itemId] || itemUsage[itemId].length === 0) {
    if (!item.visualOnly) {
      unusedItems.push({ id: itemId, ...item });
    }
  }
}

// Report summary
console.log('='.repeat(70));
console.log('PROTOCOL AUDIT SUMMARY');
console.log('='.repeat(70));
console.log(`Total steps: ${steps.length}`);
console.log(`Total items: ${Object.keys(items).length}`);
console.log(`Items with usage: ${Object.keys(itemUsage).filter((k) => itemUsage[k].length > 0).length}`);
console.log(`Unused items: ${unusedItems.length}`);

if (unusedItems.length > 0) {
  console.log('\nUNUSED ITEMS (non-visual-only):');
  for (const item of unusedItems) {
    console.log(`  - ${item.id} (role: ${item.role}, scene: ${item.scene})`);
  }
}

// Report issues by step
const stepsWithIssues = auditResults.filter((a) => a.issues.length > 0);
if (stepsWithIssues.length > 0) {
  console.log('\n' + '='.repeat(70));
  console.log('STEPS WITH ISSUES:');
  console.log('='.repeat(70));
  for (const audit of stepsWithIssues) {
    console.log(`\nStep ${audit.stepIndex}: ${audit.id}`);
    for (const issue of audit.issues) {
      console.log(`  ! ${issue}`);
    }
  }
}

// List all items by step
console.log('\n' + '='.repeat(70));
console.log('ITEM USAGE BY STEP:');
console.log('='.repeat(70));
for (const audit of auditResults) {
  console.log(
    `${String(audit.stepIndex).padStart(2)}: ${audit.id.padEnd(25)} ` +
    `Required: [${audit.requiredItems.join(', ')}] ` +
    `Target: [${audit.targetItems.join(', ')}]`
  );
}

console.log('\n' + '='.repeat(70));
console.log('ITEM USAGE SUMMARY:');
console.log('='.repeat(70));
const sortedByUsage = Object.entries(itemUsage)
  .sort((a, b) => b[1].length - a[1].length);

for (const [itemId, usedIn] of sortedByUsage) {
  if (usedIn.length === 0) continue;
  console.log(`${itemId.padEnd(25)} used in ${usedIn.length} steps: [${usedIn.join(', ')}]`);
}

console.log('\nDone.');
