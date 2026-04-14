# Protocol steps

How the 25-step tissue culture protocol is stored, ordered, triggered,
and validated at load time.

## Source of truth

All protocol steps live in one array: `PROTOCOL_STEPS` in
[parts/constants.ts](../parts/constants.ts).

The `ProtocolStep` interface (also in `parts/constants.ts`) defines the
shape of each entry. Every step has:

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Bare semantic name (e.g. `spray_hood`, `add_trypsin`). Unique across the array. No numeric prefixes. |
| `nextId` | `string \| null \| (state) => string \| null` | Explicit successor in the protocol. `null` marks the final step. The function form is reserved for future branching (currently unused). |
| `label` | `string` | Short title shown in the sidebar protocol panel. |
| `action` | `string` | Imperative verb phrase displayed in the hood toolbar ("Wash the flask with 4 mL PBS"). Max 60 chars. |
| `why` | `string` | One-line rationale shown under the step card. Max 100 chars. |
| `partId` | union | Which Part of the docx protocol this step belongs to (`part1_split`, `part2_count`, ..., `part7_read`). Used only for UI grouping. |
| `dayId` | `'day1' \| 'day2' \| 'day4'` | Which experiment day. Used for the day-ribbon UI. |
| `stepIndex` | `number` | 1-based position inside `partId`. Used for "Step N of M" rendering inside a part. |
| `requiredItems` | `string[]` | Scene item ids the student must interact with to complete this step. |
| `targetItems` | `string[]` | Scene item ids that get the green `is-active` highlight while this step is the active step. Also used by the toolbar hint (see [Hint derivation](#hint-derivation) below). |
| `errorHints` | `Record<string, string>` | Named hint strings surfaced when the student makes a specific mistake. |
| `scene` | union | Which scene owns this step (`hood`, `bench`, `incubator`, `microscope`, `plate_reader`). |
| `requiredAction` | `string` | Internal identifier for the interaction type (e.g. `sterilize`, `aspirate`, `pipette_trypsin`). Used by scoring. |
| `trigger` | `TriggerSpec \| null` | **Advisory** declarative wiring intent (`{scene, event}`). Not yet load-bearing; the actual wiring goes through `triggerStep()` calls in scene code. See [Future: step-driven trigger resolution](#future-step-driven-trigger-resolution). |
| `correctVolumeMl` | `number?` | Optional exact volume the student must pipette, for pipette steps. |
| `toleranceMl` | `number?` | Optional tolerance around `correctVolumeMl`. |

## Ordering: explicit, not positional

Step order is defined by the `nextId` linked list, **not** by position in
the array. Array position only controls how the protocol panel enumerates
steps for display.

```
spray_hood -> aspirate_old_media -> pbs_wash -> add_trypsin -> ...
                                                                      -> plate_read -> results (nextId: null)
```

The state machine follows the chain: on each `completeStep(id)`, the
active step resolves its `nextId` and becomes the new `activeStepId`.
When `activeStepId` becomes `null`, the protocol is complete.

### Why not array position

The pre-refactor design used `gameState.currentStep: number` and scanned
`PROTOCOL_STEPS[i].id` against `completedSteps` to advance. That coupled
step identity to array order in two ways that bit us:

1. **Inserting a step between X and Y was a global edit** -- you had to
   renumber every downstream step if their ids carried positional
   prefixes (`p0_`, `p1_`, ...). The user specifically rejected this
   naming scheme because it blocks inserting a `p3.5`-style step later.
2. **Scene code and `PROTOCOL_STEPS` had to agree on the id exactly** --
   a rename in one place without the other caused silent state-machine
   deadlocks (see [docs/CHANGELOG.md](CHANGELOG.md) "M4 stuck at step 1").

With `nextId`, reordering is a local edit: change two neighbors'
`nextId` pointers. Inserting a step is three edits: add the new entry,
point the previous step at it, point it at the next step. Deleting a
step is two: remove the entry, update the predecessor's `nextId`.

## Adding a new step

1. Append a new entry to `PROTOCOL_STEPS` in `parts/constants.ts`. Array
   position does not affect runtime ordering but it does control
   sidebar display, so place the new entry where you want it visually.
2. Set `nextId` on the new entry to the id of the step that should
   follow it (or `null` if it is the new final step).
3. Find the step that should now come *before* the new step and change
   its `nextId` to the new id.
4. Add a `triggerStep('<new_id>')` call somewhere in the scene code
   that owns the step. This is the single user-visible wiring path --
   see [Triggering a step](#triggering-a-step) below.
5. Add a module-scope `registeredTriggers.add('<new_id>')` line near
   the top of the scene file, paired with the `triggerStep` call. This
   lets `validateTriggerCoverage()` (see below) pass at page load time
   before any clicks happen.
6. Reload the game in the browser. `validateProtocolGraph()` runs on
   `DOMContentLoaded` and `validateTriggerCoverage()` runs on `load`.
   Both must pass or a red error banner blocks the game.

## Triggering a step

Scene code never calls `completeStep(id)` directly. It calls
`triggerStep(id)`, a wrapper defined in
[parts/game_state.ts](../parts/game_state.ts):

```typescript
function triggerStep(stepId: string): void {
    if (!PROTOCOL_STEPS.some(s => s.id === stepId)) {
        throw new Error('triggerStep called with unknown id: ' + stepId);
    }
    registeredTriggers.add(stepId);  // runtime wiring-coverage record
    completeStep(stepId);              // state-machine advance
}
```

`triggerStep` does three things:

1. **Orphan check at call time.** Calling it with an id that does not
   exist in `PROTOCOL_STEPS` throws immediately. This catches stale
   references after a rename without any build-time tooling.
2. **Runtime wiring registration.** Adds the id to the module-scope
   `registeredTriggers: Set<string>`. The `validateTriggerCoverage()`
   load-time check diffs this set against `PROTOCOL_STEPS` to find dead
   steps (steps with no scene wiring).
3. **State-machine advance.** Delegates to `completeStep(id)`, which
   either advances `activeStepId` via `nextId` (if `stepId === activeId`),
   or records an out-of-order attempt in `gameState.outOfOrderAttempts`.

### Pre-registration for load-time coverage

`triggerStep` only adds to `registeredTriggers` when it actually runs.
But `validateTriggerCoverage()` fires on the `load` event, before any
user clicks. Click-time triggers would not yet be registered.

Each scene file therefore announces its owned step ids at module init
time via explicit `registeredTriggers.add(id)` lines near the top of
the file, separately from the `triggerStep` calls inside click handlers.
Example from `parts/hood_scene.ts`:

```typescript
// Pre-register every step id this scene owns. validateTriggerCoverage()
// runs on the load event -- before any click handlers have fired -- and
// verifies that each PROTOCOL_STEPS id is in registeredTriggers.
registeredTriggers.add('spray_hood');
registeredTriggers.add('pbs_wash');
registeredTriggers.add('add_trypsin');
// ... etc for every step the hood scene owns
```

When you add a step, you must add its id in both places: the pre-
registration block and the click-handler `triggerStep` call. A step
with a missing pre-registration fails `validateTriggerCoverage` at
load time with a red banner.

## Reading the current step

Never index `PROTOCOL_STEPS` by a number to find the current step.
Always call `getCurrentStep()`, defined in
[parts/game_state.ts](../parts/game_state.ts):

```typescript
function getCurrentStep(): ProtocolStep | null {
    const id = gameState.activeStepId;
    if (id === null) return null;
    const step = PROTOCOL_STEPS.find(s => s.id === id);
    if (!step) throw new Error(`activeStepId '${id}' not in PROTOCOL_STEPS`);
    return step;
}
```

This is the only approved read path. UI code (the hood toolbar banner,
the protocol sidebar panel, scoring) all route through it. Direct
numeric indexing into `PROTOCOL_STEPS` is banned because that was the
coupling pattern behind the M4 stuck-at-step-1 regression.

## Hint derivation

The hood toolbar banner derives its text from the current step, not
from ad-hoc state flags. Three helpers in `parts/hood_scene.ts`
translate `currentStep.targetItems` into concrete click-level guidance:

- `getStartingToolForStep(step)` -- returns the first `kind === 'pipette'`
  item in `targetItems`. Used when the student is holding nothing, to
  suggest which tool to pick up ("Pick up the Serological Pipette --
  Wash the flask with 4 mL PBS").
- `getReagentSourceForStep(step)` -- returns the first `kind === 'bottle'`
  or `kind === 'rack'` item in `targetItems`, falling back to the first
  non-pipette non-plate target. Used when the student is holding an
  unloaded pipette, to suggest the reagent source ("Click the 1x PBS").
- Tool-loaded sub-states (`serological_pipette_with_trypsin`,
  `multichannel_pipette_with_drug`, etc.) describe intermediate UI sub-
  actions that are not distinct protocol steps and keep their hardcoded
  hints.

All three derivation paths share `currentStep` and `targetItems` as the
one source of truth. If the banner and the green `is-active` highlights
ever disagree, treat it as a bug in the hint logic, not the state.

## Startup validators

Three load-time checks live in [parts/init.ts](../parts/init.ts). All
failures route through `showValidationError(title, detail)`, which
injects a blocking red banner at the top of the page, logs to console,
and sets `window.__protocolValidation = {ok: false, title, detail}`
before throwing.

### `validateProtocolGraph()`

Runs on `DOMContentLoaded`. Checks:

1. Every `PROTOCOL_STEPS[i].id` is unique.
2. Starting at `PROTOCOL_STEPS[0].id` and following `nextId` until
   `null`, every step id in `PROTOCOL_STEPS` is visited. Catches broken
   `nextId` links and orphan steps.
3. Exactly one step has `nextId === null` (the terminator).
4. Every string-form `nextId` references a real id.

### `validateTriggerCoverage()`

Runs on the `load` event, after scenes have rendered and pre-
registration blocks have executed. Diffs `PROTOCOL_STEPS` against
`registeredTriggers`. Any step id missing from the set throws as a
"dead step (no trigger wired)" error.

Success sets `window.__protocolValidation = {ok: true}`.

### `validateProtocolSteps()`

Legacy schema check. Ensures every step has required fields (`id`,
`label`, `scene`, `requiredAction`) and that ids are unique. Still runs
for field-presence enforcement.

## Walkthrough test

[devel/protocol_walkthrough.mjs](../devel/protocol_walkthrough.mjs) is a
two-pass Playwright regression test invoked by
[walkthrough.sh](../walkthrough.sh):

- **Pass A (data layer)**: walks the `nextId` chain from the first step
  to `null`, calling `completeStep(id)` for each step via `page.evaluate`
  and screenshotting into `build/walkthrough/NN_<id>.png` (1-indexed).
  Asserts final state: `completedSteps.length === 25`,
  `stepsOutOfOrder === 0`, `activeStepId === null`.
- **Pass B (coverage)**: reads `window.__protocolValidation` set by
  `validateTriggerCoverage` on the `load` event. Any validation failure
  exits non-zero.

The walkthrough is a regression gate for the exact class of bug that
caused the M4 stuck-at-step-1 failure: a scene-code/step-id mismatch, a
stale `completeStep` call after a rename, or a dropped `nextId` link.

Running `bash walkthrough.sh` builds the game, dismisses the welcome
overlay (fresh Playwright context has empty localStorage), clears stale
screenshots, runs the walkthrough, and reports a screenshot listing on
success.

## Future: step-driven trigger resolution

The `trigger: TriggerSpec | null` field on `ProtocolStep` is currently
advisory -- it is not yet read by any code. A future refactor will:

1. Move the "which step is this click supposed to fire" decision out of
   scene code (which currently peeks at `activeStepId` in
   `parts/incubator_scene.ts` and `parts/drug_treatment.ts`) and into a
   lookup table derived from `step.trigger`.
2. Let scenes emit canonical event names (`click:ethanol_bottle`,
   `modal_ok:carb_intermediate`) and have a central dispatcher match
   the event against the current step's `trigger.event`.

This would eliminate the last structural coupling between scenes and
protocol state. It is out of scope for the current pass. See
[docs/TODO.md](TODO.md).

See also
[/Users/vosslab/.claude/plans/partitioned-hugging-blum.md](/Users/vosslab/.claude/plans/partitioned-hugging-blum.md)
Section 7 for the full trade-off discussion.
