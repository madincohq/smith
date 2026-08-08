const CSI = '\x1b[';

export const Color = {
	red: 31,
	green: 32,
	yellow: 33,
} as const;

export const Style = {
	bold: 1,
	dim: 2,
} as const;

export const RESET = `${CSI}0m`;

export const CLEAR_LINE = `\r${CSI}2K`;

export type Ink = (text: string) => string;

export function ink(...codes: number[]): Ink {
	return (text) => `${CSI}${codes.join(';')}m${text}${RESET}`;
}
