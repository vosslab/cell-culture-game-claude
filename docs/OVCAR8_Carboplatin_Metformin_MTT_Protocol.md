# Cell culture standard operating protocol

OVCAR8 | Carboplatin IC50 +/- Metformin (5 mM) | 72h MTT assay

- Drug 1: Carboplatin
- Drug 2: Metformin

## Part 1 - Splitting cells

Passage OVCAR8 cells at a 1:7 split ratio when they reach 70-80% confluency.

- Aspirate media from the plate.
- Wash with ~4 mL of PBS to remove residual serum.
- Add trypsin and incubate ~2 minutes until cells detach.
  - 3 mL trypsin for 10 cm^2 plate
  - 5 mL trypsin for 15 cm^2 plate
- Confirm detachment under microscope before proceeding.
- Neutralize trypsin by adding 3x the trypsin volume of complete media.
- Transfer to a labeled 15 mL conical tube and centrifuge.
- Aspirate supernatant.
- Resuspend pellet and split at 1:7 for OVCAR8.
- Add media to the new plate:
  - 10 mL media for 10 cm^2 plate
  - 20 mL media for 15 cm^2 plate
- Label plate: cell line, date, passage #, initials.

| Cell line | Split ratio | Plate media (10 cm^2) | Plate media (15 cm^2) |
| --- | --- | --- | --- |
| OVCAR8 | 1:7 | 10 mL | 20 mL |
| TYKnu  | 1:4 | 10 mL | 20 mL |
| CAOV3  | 1:3 | 10 mL | 20 mL |
| Kura   | 1:2 | 10 mL | 20 mL |

## Part 2 - Counting cells (Trypan Blue exclusion)

Count cells before seeding to achieve accurate and reproducible seeding density.

- Add 10 &micro;L of Trypan Blue to the diamond chamber.
- Add 10 &micro;L of cell suspension.
- Mix by pipetting.
- Load 10 &micro;L of the mixture into the semicircle chamber.
- Wipe off excess.
- Insert slide into cell counter.
- Wait for focus.
- Press "Capture" to record count and viability.

Note: use only samples with &gt;90% viability for experiments. Dead cells stain
blue; live cells remain clear.

## Part 3 - MTT assay protocol (72h, OVCAR8)

Plate layout:

- Columns 1-6 = Carboplatin only
- Columns 7-12 = Carboplatin + Metformin (5 mM)

### Day 1 - Cell seeding

- Prepare 12 mL of 2x10^5 cells/mL suspension in complete media.
- Seed 100 &micro;L per well into a 96-well clear-walled plate
  (final: 2x10^4 cells/well).
- Incubate ~24 hours to allow attachment and recovery before dosing.

### Day 2 - Drug treatment

- Add media adjustment to each well BEFORE adding any drug (see plate map, Part 5).
- Prepare Carboplatin and Metformin working stocks (see Part 4).
- Add 5 &micro;L of Carboplatin working stock per well (columns 1-12, rows B-H).
  - Row A, columns 1-6: untreated control (media only)
  - Row A, columns 7-12: Metformin-only control (5 mM)
- Add 5 &micro;L of Metformin working stock (200 mM) to columns 7-12.
- Incubate for 48 hours.

### Day 4 - MTT readout

- Prepare 12 mM MTT: dissolve 5 mg MTT (MW = 414.32 g/mol) per mL 1x PBS.
  Need &ge;4 mL per plate.
- Add 25 &micro;L of 12 mM MTT per well &rarr; 1.5 mM final concentration.
- Incubate 1.5 hours (OVCAR8) to allow formazan conversion.
- Decant MTT/media into biohazard bin.
- Pat plate dry gently on paper towels.
- Add 200 &micro;L DMSO per well.
- Pipette up and down ~10 times to fully dissolve formazan.
- Read absorbance at 560 nm.

## Part 4 - Drug dilution guide

Stocks on hand (both in sterile water):

| Drug | Stock conc. |
| --- | --- |
| Carboplatin | 10 mM |
| Metformin   | 1 M   |

All working stocks dispense 5 &micro;L per well. Prep step: make the
**Carboplatin 200 &micro;M intermediate** first (20 &micro;L of 10 mM stock
into 980 &micro;L media), then use it as the source for the low-range rows
below.

### Carboplatin working stocks

Source column shows which stock feeds each dilution.

| Final in well | Working stock | Source     | Drug (&micro;L) | Media (&micro;L) |
| --- | --- | --- | --- | --- |
|  10 nM  | 400 nM        | 200 &micro;M intermediate |   2 | 998 |
|  50 nM  |   2 &micro;M  | 200 &micro;M intermediate |  10 | 990 |
| 125 nM  |   5 &micro;M  | 200 &micro;M intermediate |  25 | 975 |
| 250 nM  |  10 &micro;M  | 200 &micro;M intermediate |  50 | 950 |
| 500 nM  |  20 &micro;M  | 200 &micro;M intermediate | 100 | 900 |
|   5 &micro;M  | 100 &micro;M  | 10 mM stock              |  10 | 990 |
|  25 &micro;M  | 500 &micro;M  | 10 mM stock              |  50 | 950 |
| 100 &micro;M  |   2 mM        | 10 mM stock              | 200 | 800 |

### Metformin working stock

Prepare fresh on day of treatment. 10 mM working stock, 5 &micro;L per well
&rarr; 5 mM final (500 &micro;M per 100 &micro;L well).

| Final in well | Working stock | Source | Drug (&micro;L) | Media (&micro;L) |
| --- | --- | --- | --- | --- |
| 5 mM | 10 mM | 1 M stock | 10 | 990 |

Note: prepare &ge;60 &micro;L of Metformin working stock per experiment
(5 &micro;L x 48 wells in columns 7-12, plus dead volume).

## Part 5 - 96-well plate map

All wells end at 100 &micro;L total = 100 &micro;L cells seeded on Day 1 +
media adjustment + drug(s). Row A is the control row; rows B-H are the
Carboplatin dose series.

### Treatment by row

Columns 1-6 receive Carboplatin only; columns 7-12 receive the same
Carboplatin dose **plus** 5 mM Metformin.

| Row | Carboplatin dose | Cols 1-6 (Carb only) | Cols 7-12 (Carb + Met 5 mM) |
| --- | --- | --- | --- |
| A | --          | Untreated control    | Metformin only (5 mM) |
| B |  10 nM      | 10 nM Carb           | 10 nM Carb + Met |
| C |  50 nM      | 50 nM Carb           | 50 nM Carb + Met |
| D | 125 nM      | 125 nM Carb          | 125 nM Carb + Met |
| E | 250 nM      | 250 nM Carb          | 250 nM Carb + Met |
| F | 500 nM      | 500 nM Carb          | 500 nM Carb + Met |
| G |   5 &micro;M | 5 &micro;M Carb     | 5 &micro;M Carb + Met |
| H |  25 &micro;M | 25 &micro;M Carb    | 25 &micro;M Carb + Met |

### Per-well volumes

Row A gets no Carboplatin, so its media adjustment absorbs the missing
5 &micro;L.

| Wells              | Cells  | Carboplatin | Metformin | Media adj. |
| --- | --- | --- | --- | --- |
| A, cols 1-6        | 100 &micro;L | --          | --          | 100 &micro;L |
| A, cols 7-12       | 100 &micro;L | --          | 5 &micro;L  |  90 &micro;L |
| B-H, cols 1-6      | 100 &micro;L | 5 &micro;L  | --          |  95 &micro;L |
| B-H, cols 7-12     | 100 &micro;L | 5 &micro;L  | 5 &micro;L  |  85 &micro;L |

Reminder: add the media adjustment BEFORE any drug, so each well is at its
target working volume when the drug goes in.
