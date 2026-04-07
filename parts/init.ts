// ============================================
// init.ts - Bootstrap and main render dispatcher
// ============================================

// Override the stub renderGame with the real implementation
renderGame = function(): void {
	switch (gameState.activeScene) {
		case 'hood':
			renderHoodScene();
			break;
		case 'incubator':
			renderIncubatorScene();
			break;
		case 'microscope':
			renderMicroscopeScene();
			break;
		case 'plate_reader':
			renderPlateReaderScene();
			break;
		case 'results':
			const scoreResult = calculateScore();
			renderResultsScreen(scoreResult);
			break;
	}

	// Always update the sidebar
	renderProtocolPanel();
	renderScoreDisplay();
};

// ============================================
document.addEventListener('DOMContentLoaded', () => {
	gameState = createInitialGameState();
	renderGame();
	showNotification('Welcome! Follow the protocol steps on the right.', 'info');
});
