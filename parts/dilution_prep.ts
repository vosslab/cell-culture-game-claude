// ============================================
// dilution_prep.ts - Dilution preparation validators for drug stock solutions
// ============================================

interface DilutionResult {
	ok: boolean;
	message: string;
}

// Helper: validate a volume is within tolerance
// Absolute tolerance is expected * fraction
function isWithinTolerance(actual: number, expected: number, fraction: number = 0.05): boolean {
	const tolerance = expected * fraction;
	return Math.abs(actual - expected) <= tolerance;
}

// ============================================
// prepareCarbIntermediate
// Validate Carboplatin 200 uM intermediate dilution (20 uL + 980 uL)
function prepareCarbIntermediate(drugUl: number, mediaUl: number): DilutionResult {
	const expectedDrug = 20;
	const expectedMedia = 980;

	if (!isWithinTolerance(drugUl, expectedDrug) || !isWithinTolerance(mediaUl, expectedMedia)) {
		return {
			ok: false,
			message: `Intermediate: expected 20 uL drug + 980 uL media (Part 4 Drug 1a).`,
		};
	}

	return {
		ok: true,
		message: `Intermediate 200 uM ready.`,
	};
}

// ============================================
// prepareCarbLowRange
// Validate low-range working stocks (5 variants, index 0..4)
// index 0 -> 2 uL + 998 uL
// index 1 -> 10 uL + 990 uL
// index 2 -> 25 uL + 975 uL
// index 3 -> 50 uL + 950 uL
// index 4 -> 100 uL + 900 uL
function prepareCarbLowRange(index: number, drugUl: number, mediaUl: number): DilutionResult {
	const specs = [
		{ drug: 2, media: 998 },
		{ drug: 10, media: 990 },
		{ drug: 25, media: 975 },
		{ drug: 50, media: 950 },
		{ drug: 100, media: 900 },
	];

	if (index < 0 || index >= specs.length) {
		return {
			ok: false,
			message: `Low-range: invalid index ${index}.`,
		};
	}

	const spec = specs[index];
	if (!isWithinTolerance(drugUl, spec.drug) || !isWithinTolerance(mediaUl, spec.media)) {
		const indexLabel = index + 1;
		return {
			ok: false,
			message: `Low-range #${indexLabel}: expected ${spec.drug} uL + ${spec.media} uL (Part 4 Drug 1b).`,
		};
	}

	return {
		ok: true,
		message: `Low-range stock ${index + 1}/5 ready.`,
	};
}

// ============================================
// prepareCarbHighRange
// Validate high-range working stocks (2 variants, index 0..1)
// index 0 -> 10 uL + 990 uL (100 uM)
// index 1 -> 50 uL + 950 uL (500 uM)
function prepareCarbHighRange(index: number, drugUl: number, mediaUl: number): DilutionResult {
	const specs = [
		{ drug: 10, media: 990 },
		{ drug: 50, media: 950 },
	];

	if (index < 0 || index >= specs.length) {
		return {
			ok: false,
			message: `High-range: invalid index ${index}.`,
		};
	}

	const spec = specs[index];
	if (!isWithinTolerance(drugUl, spec.drug) || !isWithinTolerance(mediaUl, spec.media)) {
		const indexLabel = index + 1;
		return {
			ok: false,
			message: `High-range #${indexLabel}: expected ${spec.drug} uL + ${spec.media} uL (Part 4 Drug 1c).`,
		};
	}

	return {
		ok: true,
		message: `High-range stock ${index + 1}/2 ready.`,
	};
}

// ============================================
// prepareMetforminWorking
// Validate Metformin 10 mM working stock (10 uL + 990 uL)
function prepareMetforminWorking(drugUl: number, mediaUl: number): DilutionResult {
	const expectedDrug = 10;
	const expectedMedia = 990;

	if (!isWithinTolerance(drugUl, expectedDrug) || !isWithinTolerance(mediaUl, expectedMedia)) {
		return {
			ok: false,
			message: `Metformin stock: expected 10 uL + 990 uL (Part 4 Drug 2).`,
		};
	}

	return {
		ok: true,
		message: `Metformin stock 10 mM ready.`,
	};
}
