const MIN_DOTS = 3;
const SPACING = 1;

type Paint = (text: string) => string;

export type Tone = 'good' | 'warn';

export interface Detail {
	readonly label: string;
	readonly value: string;
	readonly tone?: Tone;
}

export interface DetailPaint {
	dots?: Paint;
	value?: Paint;
}

export interface LeaderPaint {
	label?: Paint;
	dots?: Paint;
}

export function detail(entry: Detail, width: number | null, paint: DetailPaint = {}): string {
	const { label, value } = entry;

	if (!value) return label;

	const painted = apply(paint.value, value);
	const collapsed = `${label}: ${painted}`;

	if (width === null) return collapsed;

	const dots = width - label.length - value.length - SPACING * 2;

	if (dots < MIN_DOTS) return collapsed;

	return `${label} ${apply(paint.dots, '.'.repeat(dots))} ${painted}`;
}

export function leader(label: string, width: number | null, paint: LeaderPaint = {}): string {
	const painted = apply(paint.label, label);

	if (width === null) return painted;

	const dots = width - label.length - SPACING;

	if (dots < MIN_DOTS) return painted;

	return `${painted} ${apply(paint.dots, '.'.repeat(dots))}`;
}

function apply(paint: Paint | undefined, text: string): string {
	return paint === undefined ? text : paint(text);
}
