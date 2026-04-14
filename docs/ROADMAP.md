# Roadmap

Planned features and improvements for the cell culture simulation game.

## Delivered (M1-M5)

- Two-scene workspace: hood (sterile work) and bench (equipment) peer scenes
- 96-well plate geometry with 8-point carboplatin dose response and metformin sensitization
- 24-step protocol across 3 days (Day 1 split/count/seed, Day 2 dilute/treat, Day 4 MTT/read)
- 22 hood reagents and equipment organized in tab-stop clusters
- 6 bench instruments: centrifuge, water bath, vortex, cell counter, microscope, incubator
- Depth-based visual layering (back/mid/front tiers with opacity and brightness)
- Cell model with metformin sensitization (2x IC50 shift)
- MTT assay readout with OD560 absorbance and realistic noise
- Protocol-fidelity scoring (5 categories: dilution, plate map, timing, MTT technique, absorbance plausibility)
- Dilution prep validation (intermediate, low-range, high-range, metformin stocks)
- Day timeline state machine (day1/day2/day4 with incubator-gated transitions)

## Future enhancements

## Hood setup phase

- Add a pre-protocol step where students arrange equipment inside the biosafety hood themselves
- Items start outside or on a staging area; students drag each into the hood workspace
- Teach sterile field layout: clean-to-dirty direction, airflow awareness, spacing
- Score placement based on proper technique (e.g., not blocking rear vents, waste on dirty side, spacing items)
- Could serve as an intro tutorial before the main cell culture protocol
