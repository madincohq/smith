const MIN_DOTS = 3;
const GAPS = 2;

type Paint = (dots: string) => string;

export interface Detail {
	readonly label: string;
	readonly value: string;
}

export function detail(entry: Detail, width: number | null, paint: Paint = (dots) => dots): string {
	const { label, value } = entry;

	if (!value) return label;

	const dots = width === null ? 0 : width - label.length - value.length - GAPS;

	if (dots < MIN_DOTS) return `${label}: ${value}`;

	return `${label} ${paint('.'.repeat(dots))} ${value}`;
}
