export const BUTTON_CONTROL_MARKER_PATTERN_SOURCE =
  "<< Button \\| text: `[\\s\\S]*?` \\| id: `([0-9a-z]+)` >>";

export const INPUT_CONTROL_MARKER_PATTERN_SOURCE =
  "<< Input \\| text: `[\\s\\S]*?` \\| id: `([0-9a-z]+)` >>";

const controlMarkerPatternFlags = "gu";

export const CONTROL_MARKER_PREFIXES = ["<< Button |", "<< Input |"] as const;

export const createButtonControlMarkerPattern = (): RegExp =>
  new RegExp(BUTTON_CONTROL_MARKER_PATTERN_SOURCE, controlMarkerPatternFlags);

export const createInputControlMarkerPattern = (): RegExp =>
  new RegExp(INPUT_CONTROL_MARKER_PATTERN_SOURCE, controlMarkerPatternFlags);
