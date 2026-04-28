# Protocol YAML format

This document specifies the three-file YAML schema for the Cell Culture Game protocol.
The protocol is author-editable at build time, not at runtime.

## Design rationale

The protocol was historically hardcoded as TypeScript object literals in [parts/constants.ts](../parts/constants.ts).
Moving to YAML achieves:

- **Editability**: a non-coder can edit YAML in a text editor without touching code.
- **Separation of concerns**: protocol logic (branching, validation) lives in TypeScript;
  protocol content (steps, wiring, reagent properties) lives in YAML.
- **Build-time compilation**: a Python 3.12 script `tools/build_protocol_data.py` reads
  the YAML files and emits typed TypeScript exports. No YAML parser ships in the browser.
  The browser consumes only the generated TS constants.
- **Single source of truth**: every step, every item, every interaction is declared once
  in YAML. Drift between the banner text, the highlights, and the click handlers cannot
  happen because they all read from the same generated data structure.

## File locations

Protocol-specific YAML files are organized in subfolders under `content/`. Each
protocol is self-contained:

```
content/
  <protocol_name>/
    items.yaml        # item definitions
    reagents.yaml     # reagent definitions
    protocol.yaml     # protocol steps, parts, and days
```

The default protocol is `cell_culture`:

- `content/cell_culture/items.yaml`: item definitions
- `content/cell_culture/reagents.yaml`: reagent definitions
- `content/cell_culture/protocol.yaml`: protocol steps, parts, and days

A Python generator at `tools/build_protocol_data.py` reads these files and emits two
TypeScript modules:

- `parts/protocol_data.ts`: exports `PROTOCOL_STEPS`, `PROTOCOL_PARTS`, `PROTOCOL_DAYS`
- `parts/inventory_data.ts`: exports `EQUIPMENT` (item map) and `REAGENTS` (reagent map)

### Multiple protocols

To support future protocols (e.g. western blot, flow cytometry), each protocol is a
self-contained subfolder under `content/`. At build time, specify the protocol:

```bash
python3 tools/build_protocol_data.py --protocol cell_culture
python3 tools/build_protocol_data.py --protocol western_blot  # future
```

The `--protocol` flag defaults to `cell_culture` if omitted. To add a new protocol,
copy `content/cell_culture/` to `content/<new_protocol_name>/`, edit the YAML files,
and rebuild.

## content/items.yaml and content/reagents.yaml

Two YAML files handle items and reagents separately. Namespaces are disjoint:
item ids appear in layout, reagent ids appear in liquid state. Both can appear in
interaction blocks.

### Items block

Each item is a mapping keyed by snake_case id. Required fields vary by role.

#### Item fields (all items)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `label` | string | yes | Display name (shown in UI) |
| `role` | string | yes | Item category; must be one of the closed set below |
| `scene` | string | yes | Where the item lives: `hood`, `bench`, `overlay`, `virtual`, or `none` |

#### Item fields (optional by role)

| Field | Type | When required | Description |
| --- | --- | --- | --- |
| `asset` | string | when `scene` != `virtual` and `scene` != `none` | SVG asset basename in `assets/equipment/` (no .svg). This is distinct from the legacy ASSET_SPECS lookup key in `parts/hood_config.ts`. M1.C reconciles the two namespaces at build time. |
| `liquidCapable` | boolean | items that hold liquid | whether the item can be filled/emptied |
| `capacityMl` | number | if `liquidCapable: true` | max volume in mL |
| `allowedLiquids` | array of strings | if `liquidCapable: true` | list of reagent ids that can be stored (e.g. `[media, pbs, trypsin]`) |
| `contains` | string | reagent sources only | reagent id currently inside (e.g. `pbs_bottle` contains `pbs`) |
| `containsAny` | array of strings | when `contains` is insufficient | reagent ids that might be inside (future use) |
| `visualOnly` | boolean | decoration items | if `true`, exempts the item from "must be referenced by a step" validation rule |

#### Role vocabulary (closed set, validated)

- `transfer_tool`: a pipette used to move liquid (serological, multichannel)
- `aspirate_tool`: a pipette used to draw off liquid (aspirating pipette)
- `reagent_source`: a bottle or vial holding a reagent (media_bottle, pbs_bottle)
- `culture_vessel`: a multi-well plate (well_plate_24, etc.)
- `cell_container`: a tissue culture vessel (flask)
- `waste_target`: a disposal container (waste_container)
- `instrument`: bench equipment (centrifuge, incubator)
- `modal_tool`: an item used only inside a modal (mtt_vial)
- `virtual_target`: a clickable zone with no asset (hood_surface)
- `decoration`: visual-only non-interactive item (professor, glove_box)

#### Scene vocabulary (closed set, required)

- `hood`: item renders in the hood scene
- `bench`: item renders in the bench scene
- `overlay`: persistent UI overlay (reserved for professor card)
- `virtual`: no scene rendering; used only in interaction targets
- `none`: modal-only item; never rendered in a 2D scene

### Reagents block

Each reagent is a mapping keyed by snake_case id. All fields required.

| Field | Type | Description |
| --- | --- | --- |
| `label` | string | Display name (shown in UI and step text) |
| `colorKey` | string | Internal identifier for color selection |
| `displayColor` | string | CSS hex color code (lowercase, ASCII-only) |

### Items and reagents example

content/cell_culture/items.yaml:
```yaml
items:
  serological_pipette:
    label: "Serological pipette"
    role: transfer_tool
    asset: sero_pipette
    scene: hood
    liquidCapable: true
    capacityMl: 10
    allowedLiquids: [media, pbs, trypsin, cells]

  pbs_bottle:
    label: "PBS bottle"
    role: reagent_source
    asset: pbs_bottle
    scene: hood
    liquidCapable: true
    contains: pbs

  hood_surface:
    label: "Hood work surface"
    role: virtual_target
    scene: virtual

  professor:
    label: "Professor"
    role: decoration
    asset: angry_professor
    scene: overlay
    visualOnly: true
```

content/cell_culture/reagents.yaml:
```yaml
reagents:
  pbs:
    label: "1x PBS"
    colorKey: pbs
    displayColor: "#b8e5ff"

  media:
    label: "Complete media"
    colorKey: media
    displayColor: "#f7a6b8"
```

## content/protocol.yaml

Three top-level blocks: `parts`, `days`, and `steps`. Parts organize steps by lab workflow
phase; days mark when each part runs. Steps are the runnable units of the protocol.

### Parts block

List of part definitions (order matters for UI display).

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Unique snake_case identifier |
| `label` | string | Display name (e.g. "Part 1: Split") |
| `dayId` | string | Reference to a day id below |

### Days block

List of day definitions (order matters for UI display).

| Field | Type | Description |
| --- | --- | --- |
| `id` | string | Unique snake_case identifier (e.g. day1, day2, day4) |
| `label` | string | Display name (e.g. "Day 1") |

### Steps block

List of protocol steps. Order in this list is for convenience; the actual execution order
is determined by `nextId` linked-list pointers, not by array position.

#### Step fields (all steps)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | string | yes | Unique snake_case identifier |
| `label` | string | yes | Short display name (shown in UI) |
| `action` | string | yes | Imperative phrase (e.g. "Wash cells with 4 mL PBS") |
| `why` | string | yes | Rationale for the step (shown as professor feedback) |
| `partId` | string | yes | Reference to a part id in the parts block |
| `dayId` | string | yes | Reference to a day id in the days block |
| `stepIndex` | number | yes | 1-based position within the part |
| `scene` | string | yes | Where this step's interactions happen: `hood`, `bench`, `incubator`, `microscope`, or `plate_reader` |
| `requiredItems` | array of strings | yes | Item ids that must be available (shown in step card) |
| `targetItems` | array of strings | yes | Item ids that the student must click to advance |
| `trigger` | object | no | Maps a scene event to step completion (see below) |
| `nextId` | string or null | yes | Id of the next step, or `null` if this is the final step |
| `errorHints` | map of strings | no | Feedback messages keyed by error type (e.g. `wrong_tool`, `volume_off`) |

#### Step fields (backward compatibility)

These fields exist on the TypeScript `ProtocolStep` interface and must be round-tripped
by YAML, but are not used to drive new resolver behavior in M1:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `requiredAction` | string | no | Legacy action type (e.g. `spray_ethanol`, `pipette_media`, `centrifuge`). Kept for runtime event wiring. |
| `correctVolumeMl` | number | no | Optional. Target volume for volume-checking steps (e.g. 9 mL for `neutralize_trypsin`). |
| `toleranceMl` | number | no | Optional. Tolerance window paired with `correctVolumeMl` (e.g. &plusmn;1 mL). |

#### Step fields (interaction-driven steps)

Steps that advance via item clicks (most steps) must have `allowedInteractions`:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `allowedInteractions` | list of objects | if no `modal` | Array of valid click sequences that advance the step |

#### Step fields (modal-owned steps)

Steps that advance via a modal screen instead of scene clicks have `modal`:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `modal` | object | if no `allowedInteractions` | References the modal owner and screen name |

Modal structure:

| Field | Type | Description |
| --- | --- | --- |
| `owner` | string | The modal system (e.g. `drug_treatment`, `incubator`, `microscope`, `plate_reader`) |
| `screen` | string | Unique screen name within the owner (e.g. `carb_intermediate`, `hemocytometer`) |

#### Step fields (non-click steps)

Pure incubation or animation steps with no interaction:

| Field | Type | Description |
| --- | --- | --- |
| `isIncubation` | boolean | if `true`, the step is routed through `step_dispatch` with no resolver |

### allowedInteractions structure

Each interaction object describes one valid click combination. Multiple interactions form
a sequence that the student can do in any order.

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `actor` | string | yes | Item id of the tool the student is holding |
| `source` | string | no | Item id to draw from (pipette source) |
| `target` | string | no | Item id to apply to (pipette destination) |
| `liquid` | string | no | Reagent id involved in the interaction |
| `volumeMl` | number | no | Liquid volume for UI feedback |
| `consumesVolumeMl` | number | no | Amount to deduct from actor's capacity after transfer |
| `event` | string | no | Protocol event to fire on completion (e.g. `pbs_wash`) |
| `result` | object | no | Post-interaction state of the actor. See result structure below. |

Result structure (post-interaction tool state):

Nested under `result` in the interaction object:

| Field | Type | Description |
| --- | --- | --- |
| `tool` | string | Item id of the tool |
| `liquid` | string | Reagent id now inside the tool |
| `volumeMl` | number | Volume of liquid in mL |
| `colorKey` | string | Reagent colorKey for UI rendering |

### Trigger structure

Wires a scene event to step completion. The builder validates that the event in an
interaction's `result` matches the step's trigger event.

| Field | Type | Description |
| --- | --- | --- |
| `scene` | string | Scene where the event fires (e.g. `hood`, `microscope`) |
| `event` | string | Event identifier (e.g. `pbs_wash`, `count_cells`) |

## Worked example: pbs_wash step

The `pbs_wash` step from the OVCAR8 protocol demonstrates the full schema (from
content/cell_culture/protocol.yaml):

```yaml
steps:
  - id: pbs_wash
    label: "Wash cells with 4 mL PBS"
    action: "Wash cells with 4 mL PBS"
    why: "PBS rinses off serum that would block trypsin."
    partId: part1_split
    dayId: day1
    stepIndex: 3
    scene: hood
    requiredItems: [flask, pbs_bottle, serological_pipette, waste_container]
    targetItems:   [flask, pbs_bottle, waste_container]
    allowedInteractions:
      - actor: serological_pipette
        source: pbs_bottle
        liquid: pbs
        result:
          heldLiquid:
            tool: serological_pipette
            liquid: pbs
            volumeMl: 4
            colorKey: pbs
      - actor: serological_pipette
        liquid: pbs
        target: flask
        event: pbs_wash
        consumesVolumeMl: 4
    errorHints:
      wrong_reagent: "PBS is the wash buffer. Media will stop trypsin."
      volume_off: "Use about 4 mL so the whole surface is rinsed."
    trigger:
      scene: hood
      event: pbs_wash
    nextId: add_trypsin
```

### Step anatomy

- **Required context** (`requiredItems`): tools and containers available for this step.
  These appear in the step card so the student knows what to look for.
- **Target context** (`targetItems`): items the student must interact with. The UI
  renders green highlights on these items. Must be a subset of `requiredItems`.
- **Click sequences** (`allowedInteractions`): each interaction object is one valid click.
  An interaction specifies the actor (held tool), optional source (where to draw from),
  optional target (where to apply), optional liquid and volume. Multiple interactions
  form a complete sequence (draw from bottle, then apply to flask).
- **Result state** (`result.heldLiquid`): what the actor holds after this interaction
  (tool id, liquid id, volume, color). The next interaction can reference this state
  to validate or to build on it.
- **Completion trigger** (`trigger`): the event that signals step completion. Validated
  at build time to match an interaction's `event` field.
- **Next step** (`nextId`): explicit linked-list pointer to the next protocol step.
  Can be a string id or `null` to mark the final step.

## Cross-file validation rules

The build process (`tools/build_protocol_data.py`) enforces these rules:

### Protocol structure

- Every `step.id` unique and snake_case.
- `nextId` references an existing step id or is `null`. Exactly one terminator.
- Walking `nextId` from the first step visits every step (no orphans).
- `partId` and `dayId` reference declared `parts` and `days`.
- `scene` is one of `hood | bench | incubator | microscope | plate_reader`.

### Item validation

- Every id in `requiredItems` exists in `items.yaml:items`.
- Every id in `targetItems` is either (a) in `requiredItems`, (b) declared in
  `items.yaml:items`, or (c) has role `virtual_target`.
- For a step with `scene: hood`, every non-virtual targetItem must have
  `scene: hood` in items and have a layout entry in `HOOD_LAYOUT`.
  Symmetric rule for `scene: bench` and `BENCH_LAYOUT`.

### Interaction validation

- `actor` exists in inventory and has role `transfer_tool`, `aspirate_tool`,
  or `modal_tool`.
- `source`, when present, has role `reagent_source` or `cell_container`.
- `target`, when present, has role `cell_container`, `culture_vessel`,
  `waste_target`, or `virtual_target`.
- `liquid`, when present, exists in inventory and is in actor's `allowedLiquids`.
- For a draw interaction, the source item's `contains` matches the declared `liquid`.
- `volumeMl` and `consumesVolumeMl` do not exceed actor `capacityMl`.
- `event`, when present, matches the step's `trigger.event` (modulo the
  `click:` or `modal_ok:` prefix added by the resolver at runtime).

### Modal validation

- For every step with `modal:`, the `modal.owner` is in the set
  `{drug_treatment, incubator, microscope, plate_reader}`.
- `modal.screen` is unique within an owner.

### Asset validation

- Every item with an `asset` field has a corresponding file in
  `assets/equipment/<asset>.svg`. Items with `role: virtual_target` may omit `asset`.

### Hygiene rules

- ASCII-only across all YAML. UTF-8 glyphs escaped per [docs/MARKDOWN_STYLE.md](MARKDOWN_STYLE.md)
  (e.g. `&alpha;`, `&micro;`).
- Every item in items.yaml must be referenced by at least one step OR have
  `visualOnly: true`. Catches dead inventory.
- Every reagent in reagents.yaml must be referenced by at least one interaction or item
  `contains` field. Catches dead reagents.

## Generated TypeScript surface

The Python builder emits two modules:

### parts/protocol_data.ts

```typescript
export const PROTOCOL_STEPS: readonly ProtocolStep[] = [
  // auto-generated from content/protocol.yaml
  { id: 'spray_hood', label: '...', ... },
  // ... 24 more steps ...
];

export const PROTOCOL_PARTS: readonly Record<string, ProtocolPart> = {
  // keyed by part id
  part1_split: { id: 'part1_split', label: 'Part 1: Split', dayId: 'day1' },
  // ...
};

export const PROTOCOL_DAYS: readonly Record<string, ProtocolDay> = {
  // keyed by day id
  day1: { id: 'day1', label: 'Day 1' },
  // ...
};
```

### parts/inventory_data.ts

```typescript
export const EQUIPMENT: readonly Record<string, InventoryItem> = {
  // keyed by item id
  serological_pipette: { label: 'Serological pipette', role: 'transfer_tool', ... },
  // ...
};

export const REAGENTS: readonly Record<string, InventoryReagent> = {
  // keyed by reagent id
  pbs: { label: '1x PBS', colorKey: 'pbs', displayColor: '#b8e5ff' },
  // ...
};
```

Scene code consumes these exports directly; no YAML parsing happens at runtime.

## Stable-id discipline

Every cross-reference uses snake_case ids, never display labels. Labels are free to
change without breaking the build; ids are durable.

## Item vs reagent namespace

The two namespaces are intentionally disjoint:

- **Only item ids** appear in layout (`HOOD_SCENE_ITEMS`, `BENCH_SCENE_ITEMS`,
  asset specs, future `content/scenes.yaml`).
- **Only reagent ids** appear in `heldLiquid.liquid`, `contains` fields, and
  interaction `liquid:` fields.
- Protocol `allowedInteractions` reference both: `source: pbs_bottle` (item id)
  plus `liquid: pbs` (reagent id). The builder verifies that the source item's
  `contains` matches the liquid id.

This prevents accidental name collisions and catches copy-paste errors at build time.

## See also

- [docs/REPO_STYLE.md](REPO_STYLE.md) for repository conventions
- [docs/MARKDOWN_STYLE.md](MARKDOWN_STYLE.md) for ASCII-only and escaping rules
- [AGENTS.md](../AGENTS.md) for agent guidelines on YAML authoring
