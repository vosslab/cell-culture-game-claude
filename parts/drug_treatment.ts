// ============================================
// drug_treatment.ts - Drug addition is handled in hood_scene.ts
// This file is kept for the startDrugAddition function reference
// ============================================

// Drug addition for the 24-well plate is a simple action:
// multichannel pipette -> drug vials -> well plate
// Handled directly in hood_scene.ts onItemClick()
function startDrugAddition(): void {
	// Add drug concentrations per column layout
	gameState.wellPlate.forEach(well => {
		well.drugConcentrationUm = DRUG_CONCENTRATIONS_UM[well.col];
	});
	gameState.drugsAdded = true;
	completeStep('add_drugs');
	showNotification('Drug dilutions added to plate.', 'success');
	renderGame();
}
