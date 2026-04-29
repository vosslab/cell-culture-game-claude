# Step Audit 2026-04-28

Comprehensive audit of all 25 protocol steps in the OVCAR8 / Carboplatin / Metformin / MTT cell culture protocol.
This document enumerates logical gaps, missing waste routing, scene-membership violations, and proposed YAML fixes
to ensure the highlighted items match click handlers and every piece of equipment is properly wired.

**Audit date:** 2026-04-28  
**Protocol source:** OVCAR8_Carboplatin_Metformin_MTT_Protocol.docx (per protocol text sections)  
**YAML files:** content/cell_culture/protocol.yaml, content/cell_culture/items.yaml, content/cell_culture/reagents.yaml

## Summary

- **Total steps:** 25
- **Total items:** 29 declared in inventory
- **Items actively used:** 22
- **Unused items (non-visual):** 5 (drug_vials, microscope, vortex, plate_reader, hood_surface)
- **Steps with wiring issues:** 6
- **Critical gaps:** 3 (scene mismatches for multi-scene steps)

## Inventory Status

### Items with full usage coverage
- well_plate (12 steps)
- dilution_tube_rack (7 steps)
- flask (6 steps)
- media_bottle (6 steps)
- serological_pipette (5 steps)
- multichannel_pipette (5 steps)
- incubator (3 steps)
- And 14 others with usage

### Unused items needing decision

1. **drug_vials** (role: decoration, scene: hood)
   - Never required by any step despite being highlighted in carb_intermediate and add_carboplatin modal screens
   - **Decision:** Modal-owned steps have special routing; drug_vials is a visual reference in the drug_treatment modal, not a required hood item. Keep as-is; it's correct that it's not in the protocol's requiredItems.

2. **microscope** (role: instrument, scene: bench)
   - Never required despite being a bench instrument. count_cells step uses cell_counter only.
   - **Decision:** Microscope is shown on bench but not used in the current protocol. Mark visualOnly: true OR wire to count_cells as alternate target. Current decision: wire to count_cells (per M2 spec).

3. **vortex** (role: instrument, scene: bench)
   - Never required by any step.
   - **Decision:** Vortex is a bench decoration. Mark visualOnly: true (proposal in fix section).

4. **plate_reader** (role: instrument, scene: bench)
   - Used in modal-owned steps (plate_read, results) routed through plate_reader scene, not bench clicks.
   - **Decision:** plate_reader is correct; it's scene: bench but accessed via modal. No fix needed.

5. **hood_surface** (role: virtual_target, scene: virtual)
   - Never required; only used for spray_ethanol interaction target.
   - **Decision:** virtual_target items are correct not to appear in requiredItems. spray_hood step correctly targets hood_surface via allowedInteractions. No fix needed.

## Step-by-Step Audit

### Steps 1-5: Cell Splitting (Part 1: Split, Day 1)

**Step 1: spray_hood**
- Required: [ethanol_bottle]
- Target: [ethanol_bottle]
- Scene: hood
- Status: OK
- Handler coverage: ethanol_bottle click routes through allowedInteractions to spray_ethanol event

**Step 2: aspirate_old_media**
- Required: [flask, aspirating_pipette, waste_container]
- Target: [flask, aspirating_pipette, waste_container]
- Scene: hood
- Status: OK
- Handler coverage: all three targets have handlers; waste_container click is explicit interaction target
- Protocol reference: OVCAR8 section 2.1 (remove old media)

**Step 3: pbs_wash**
- Required: [flask, pbs_bottle, serological_pipette]
- Target: [flask, pbs_bottle, serological_pipette]
- Scene: hood
- Status: OK
- Handler coverage: all three targets routed via interaction_resolver
- Protocol reference: OVCAR8 section 2.2 (wash with PBS)

**Step 4: add_trypsin**
- Required: [flask, trypsin_bottle, serological_pipette]
- Target: [flask, trypsin_bottle, serological_pipette]
- Scene: hood
- Status: OK
- Handler coverage: all routed via resolver
- Protocol reference: OVCAR8 section 2.3 (trypsin addition)

**Step 5: neutralize_trypsin**
- Required: [flask, media_bottle, serological_pipette]
- Target: [flask, media_bottle, serological_pipette]
- Scene: hood
- Status: OK
- Handler coverage: all routed via resolver
- Protocol reference: OVCAR8 section 2.4 (media neutralization)

### Steps 6-10: Cell Counting (Part 2: Count, Day 1)

**Step 6: centrifuge**
- Required: [centrifuge, conical_15ml_rack]
- Target: [centrifuge, conical_15ml_rack]
- Scene: bench
- **Issue:** conical_15ml_rack has scene: hood, but step is bench. Modal or visual decoration?
- Status: ISSUE - scene mismatch
- Fix: Either (a) move conical_15ml_rack to scene: bench in items.yaml, or (b) remove from targetItems and mark as hidden required prep.
- Proposed fix: Mark conical_15ml_rack as decoration with visualOnly: true (tubes are assumed ready on shelf-row). Then remove from targetItems, keep in requiredItems as implicit.

**Step 7: resuspend**
- Required: [flask, media_bottle, serological_pipette, waste_container]
- Target: [flask, media_bottle, serological_pipette, waste_container]
- Scene: hood
- Status: OK
- Handler coverage: waste_container explicitly routed
- Protocol reference: OVCAR8 section 3.2 (resuspend in media)

**Step 8: count_cells**
- Required: [cell_counter, dilution_tube_rack]
- Target: [cell_counter]
- Scene: bench
- Status: PARTIAL - microscope is also bench scene and could serve as count target per M2 spec ("count_cells reachable both from bench microscope and cell_counter")
- Fix: Add microscope to targetItems and wire as alternate path in interaction_resolver.
- Modal routing: count_cells is modal-owned (microscope scene); this step correctly uses cell_counter on bench as the interactive path.

**Step 9: seed_plate**
- Required: [well_plate, serological_pipette, flask]
- Target: [well_plate, serological_pipette, flask]
- Scene: hood
- Status: OK
- Handler coverage: all routed via resolver
- Protocol reference: OVCAR8 section 3.3 (seed 96-well plate)

**Step 10: incubate_day1**
- Required: [incubator, well_plate]
- Target: [incubator, well_plate]
- Scene: bench
- **Issue:** well_plate has scene: hood. How is it highlighted on bench?
- Status: ISSUE - scene mismatch. well_plate is hood item but appears in bench step.
- Fix: This is a known multi-scene item pattern (plate moves between scenes). well_plate must be highlighted on bench even though its scene: hood in inventory. This is acceptable because well_plate appears in many steps across scenes. No YAML fix needed; scene system allows cross-scene references for items like plates.
- Note: plate_reader and incubator steps also reference well_plate on their own scenes; this is correct.

### Steps 11-15: Drug Dilution (Part 4: Dilute, Day 2)

**Step 11: carb_intermediate**
- Required: [carboplatin_stock, sterile_water, dilution_tube_rack]
- Target: [multichannel_pipette, drug_vials, well_plate]
- Scene: hood
- **Issues:**
  - multichannel_pipette not in requiredItems
  - drug_vials not in requiredItems
  - well_plate not in requiredItems
- Status: ISSUE - modal-owned step with mismatched targetItems
- Explanation: carb_intermediate is modal:owner: drug_treatment, screen: carb_intermediate. The targetItems are visual/reference items shown in the dilution UI modal, not items clicked on the hood scene. The modal drives the step via its own UI controls.
- Fix: For consistency, remove multichannel_pipette, drug_vials, well_plate from targetItems. These are modal UI references, not scene targets.

**Step 12: carb_low_range**
- Required: [dilution_tube_rack, media_bottle]
- Target: [dilution_tube_rack, media_bottle]
- Scene: hood
- Status: OK (modal-owned; targetItems match required)

**Step 13: carb_high_range**
- Required: [carboplatin_stock, dilution_tube_rack, media_bottle]
- Target: [carboplatin_stock, dilution_tube_rack, media_bottle]
- Scene: hood
- Status: OK (modal-owned; targetItems match required)

**Step 14: metformin_stock**
- Required: [metformin_stock, sterile_water, dilution_tube_rack]
- Target: [metformin_stock, sterile_water, dilution_tube_rack]
- Scene: hood
- Status: OK (modal-owned; targetItems match required)

**Step 15: prewarm_media**
- Required: [water_bath, media_bottle]
- Target: [water_bath]
- Scene: bench
- Status: OK - intentional: water_bath is the click target; media_bottle is required but not clicked (it is pre-positioned in the water bath).
- Handler coverage: water_bath click routes via interaction_resolver to prewarm event
- Protocol reference: OVCAR8 section 5.1 (pre-warm media adjustments)

### Steps 16-19: Drug Treatment (Part 5: Treat, Day 2)

**Step 16: media_adjust**
- Required: [well_plate, multichannel_pipette, media_bottle]
- Target: [well_plate, multichannel_pipette, media_bottle]
- Scene: hood
- Status: OK
- Handler coverage: all routed via resolver
- Protocol reference: OVCAR8 section 5.2 (add media adjustment)

**Step 17: add_carboplatin**
- Required: [well_plate, multichannel_pipette, dilution_tube_rack]
- Target: [multichannel_pipette, drug_vials, well_plate]
- Scene: hood
- **Issue:** drug_vials not in requiredItems
- Status: ISSUE - same as step 11. Modal-owned step with UI reference targets.
- Fix: Remove drug_vials from targetItems (modal UI reference, not scene click target).

**Step 18: add_metformin**
- Required: [well_plate, multichannel_pipette, dilution_tube_rack]
- Target: [well_plate, multichannel_pipette, dilution_tube_rack]
- Scene: hood
- Status: OK (modal-owned; targetItems match required)

**Step 19: incubate_48h**
- Required: [incubator, well_plate]
- Target: [incubator, well_plate]
- Scene: bench
- **Issue:** well_plate has scene: hood. (Same as step 10.)
- Status: ISSUE - scene mismatch, same reason. well_plate is multi-scene ref. No fix needed; it's correct.

### Steps 20-23: MTT Readout (Part 6: MTT, Day 4)

**Step 20: add_mtt**
- Required: [well_plate, multichannel_pipette, mtt_vial]
- Target: [well_plate, multichannel_pipette, mtt_vial]
- Scene: hood
- Status: OK
- Handler coverage: all routed via resolver
- Protocol reference: OVCAR8 section 6.1 (add MTT)

**Step 21: incubate_mtt**
- Required: [incubator, well_plate]
- Target: [incubator, well_plate]
- Scene: bench
- **Issue:** well_plate has scene: hood. (Same as steps 10, 19.)
- Status: ISSUE - scene mismatch, same reason. No fix needed.

**Step 22: decant_mtt**
- Required: [well_plate, biohazard_decant]
- Target: [well_plate, biohazard_decant]
- Scene: hood
- Status: OK
- Handler coverage: all routed via resolver
- Protocol reference: OVCAR8 section 6.3 (decant MTT)

**Step 23: add_dmso**
- Required: [well_plate, multichannel_pipette, dmso_bottle]
- Target: [well_plate, multichannel_pipette, dmso_bottle]
- Scene: hood
- Status: OK
- Handler coverage: all routed via resolver
- Protocol reference: OVCAR8 section 6.4 (add DMSO)

### Steps 24-25: Plate Reading (Part 7: Read, Day 4)

**Step 24: plate_read**
- Required: [well_plate]
- Target: [well_plate]
- Scene: plate_reader
- **Issue:** well_plate has scene: hood. (Same as steps 10, 19, 21.)
- Status: ISSUE - scene mismatch, same reason. well_plate is accessible from plate_reader modal scene. No fix needed; correct by design.

**Step 25: results**
- Required: [well_plate]
- Target: [well_plate]
- Scene: plate_reader
- **Issue:** well_plate has scene: hood. (Same as step 24.)
- Status: ISSUE - scene mismatch, same reason. No fix needed.

---

## Summary of Issues and Fixes

### Category 1: Modal-Owned Steps with UI Reference Targets (non-critical)

Steps 11, 17 have targetItems that are modal UI references, not scene click targets:
- carb_intermediate targets multichannel_pipette, drug_vials, well_plate (not clicked on hood)
- add_carboplatin targets drug_vials (not clicked on hood)

**Fix:** Remove non-required targetItems from modal-owned steps to align with the rule "every targetItem is a requiredItem or virtual_target".

**Affected steps:**
1. carb_intermediate: Remove multichannel_pipette, drug_vials, well_plate from targetItems
2. add_carboplatin: Remove drug_vials from targetItems

### Category 2: Scene Mismatch for Multi-Scene Items (acceptable by design)

Steps 10, 19, 21, 24, 25 list well_plate as target but well_plate has scene: hood. This is by design: well_plate appears in steps across hood, bench, incubator, and plate_reader scenes, but its scene declaration is hood (origin scene). This is acceptable because:
- well_plate is a persistent item that moves between scenes
- The interaction_resolver can highlight it regardless of step scene
- Layout engine renders it on the appropriate scene dynamically

**Fix:** No YAML change needed. Document in code comments that well_plate is multi-scene.

### Category 3: Bench Equipment Scene Issues (low priority)

Step 6 (centrifuge) targets conical_15ml_rack, which has scene: hood. The conical tubes are likely on a hood shelf (not bench-visible during centrifuge step on bench scene).

**Fix:** Mark conical_15ml_rack as visualOnly: true (they are implied ready on the shelf), and remove from targetItems (keep in requiredItems).

### Category 4: Instrument Coverage (M2 requirement)

The plan requires: "count_cells reachable both from bench microscope and cell_counter".

Current state: Step 8 (count_cells) targets only cell_counter. Microscope is unused and should serve as an alternate path.

**Fix:** 
1. Add microscope to targetItems of count_cells
2. Add microscope to requiredItems of count_cells
3. Wire microscope as an alternate interaction target for count_cells in interaction_resolver OR mark as scene: bench for layout visibility

### Category 5: Unused Decoration (cleanup)

Vortex (role: instrument, scene: bench) is never used.

**Fix:** Mark vortex with visualOnly: true.

---

## Proposed YAML Edits

### 1. Fix items.yaml: conical_15ml_rack, vortex, microscope

```yaml
  conical_15ml_rack:
    label: "15 mL Tubes"
    role: decoration
    asset: conical_15ml_rack
    scene: hood
    visualOnly: true         # <-- ADD: tubes are shelf-ready, not clicked

  vortex:
    label: "Vortex"
    role: instrument
    asset: vortex
    scene: bench
    visualOnly: true         # <-- ADD: bench decoration, not used in protocol

  microscope:
    label: "Microscope"
    role: instrument
    asset: microscope
    scene: bench
    # Keep scene: bench, drop visualOnly (count_cells will target it)
```

### 2. Fix protocol.yaml steps

**Step 6 (centrifuge):**
```yaml
  - id: centrifuge
    # ... other fields ...
    requiredItems: [centrifuge, conical_15ml_rack]  # KEEP (implicit prep)
    targetItems: [centrifuge]                       # CHANGE: remove conical_15ml_rack
```

**Step 8 (count_cells):**
```yaml
  - id: count_cells
    # ... other fields ...
    requiredItems: [cell_counter, dilution_tube_rack, microscope]  # CHANGE: add microscope
    targetItems: [cell_counter, microscope]                        # CHANGE: add microscope
    # Scene: bench (both cell_counter and microscope are bench items)
```

**Step 11 (carb_intermediate):**
```yaml
  - id: carb_intermediate
    # ... other fields ...
    requiredItems: [carboplatin_stock, sterile_water, dilution_tube_rack]
    targetItems: [sterile_water, dilution_tube_rack]  # CHANGE: remove multichannel_pipette, drug_vials, well_plate
    modal:
      owner: drug_treatment
      screen: carb_intermediate
```

**Step 17 (add_carboplatin):**
```yaml
  - id: add_carboplatin
    # ... other fields ...
    requiredItems: [well_plate, multichannel_pipette, dilution_tube_rack]
    targetItems: [well_plate, multichannel_pipette, dilution_tube_rack]  # CHANGE: remove drug_vials
    modal:
      owner: drug_treatment
      screen: add_carboplatin
```

---

## Test Coverage

The new `devel/test_step_completeness.mjs` test enforces:
1. Every targetItem is in requiredItems OR has role: virtual_target
2. Every targetItem in a scene:hood step is scene:hood in items (or multi-scene exception like well_plate)
3. Every step is reachable via nextId chain (no orphans)
4. Every item is either used by a step OR marked visualOnly: true

Expected result after fixes: 25/25 steps pass completeness audit.

---

## Build and Verification

After applying YAML edits:
```bash
bash build_game.sh
node devel/test_step_completeness.mjs  # Should pass all 25 steps
bash walkthrough.sh                     # Should still be 25/25
```

Expected: All tests pass, walkthrough continues to show 25/25 screenshots and real-click coverage.

