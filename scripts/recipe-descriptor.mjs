const number = (minimum, maximum) => ({ type: "number", minimum, maximum });
const object = (properties, required = Object.keys(properties)) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const array = (items, minItems, maxItems) => ({
  type: "array",
  items,
  minItems,
  maxItems,
});
const ref = (name) => ({ $ref: `#/$defs/${name}` });

// Descriptor covers only executable recipe primitives.
export const descriptor = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $ref: "#/$defs/Recipe",
  $defs: {
    Mapping: object({
      control: { type: "string", minLength: 1, maxLength: 64 },
      range: {
        type: "array",
        prefixItems: [number(-60000, 60000), number(-60000, 60000)],
        minItems: 2,
        maxItems: 2,
      },
      scale: { enum: ["linear", "exponential"] },
    }),
    Variation: object({
      random: {
        type: "array",
        prefixItems: [number(-60000, 60000), number(-60000, 60000)],
        minItems: 2,
        maxItems: 2,
      },
    }),
    PointValue: {
      anyOf: [number(-60000, 60000), ref("Mapping"), ref("Variation")],
    },
    Value: {
      anyOf: [
        ref("PointValue"),
        object({
          points: array(
            {
              type: "array",
              prefixItems: [number(0, 60), ref("PointValue")],
              minItems: 2,
              maxItems: 2,
            },
            1,
            128,
          ),
          curve: { enum: ["linear", "exponential"] },
        }),
      ],
    },
    Frequency: ref("Value"),
    Parameter: {
      anyOf: [
        object({
          min: number(-60000, 60000),
          max: number(-60000, 60000),
          default: number(-60000, 60000),
          mode: { const: "play" },
        }),
        object({
          min: number(-60000, 60000),
          max: number(-60000, 60000),
          default: number(-60000, 60000),
          mode: { const: "live" },
          smoothing: number(0.005, 1),
        }),
      ],
    },
    Parameters: {
      type: "object",
      maxProperties: 16,
      propertyNames: { pattern: "^[A-Za-z][A-Za-z0-9_]{0,63}$" },
      additionalProperties: ref("Parameter"),
    },
    Envelope: object({
      attack: number(0, 10),
      decay: number(0, 10),
      sustain: number(0, 1),
      release: number(0.005, 10),
    }),
    Filter: object({
      type: { const: "filter" },
      filter: { enum: ["lowpass", "highpass", "bandpass"] },
      frequency: ref("Frequency"),
      q: number(0.1, 20),
    }),
    Source: {
      anyOf: [
        object({
          type: { const: "oscillator" },
          waveform: { enum: ["sine", "triangle", "sawtooth", "square"] },
          frequency: ref("Frequency"),
        }),
        object({ type: { const: "noise" }, color: { const: "white" } }),
      ],
    },
    Layer: object(
      {
        id: { type: "string", minLength: 1, maxLength: 64 },
        source: ref("Source"),
        gainDb: ref("PointValue"),
        envelope: ref("Envelope"),
        effects: array(ref("Filter"), 0, 8),
      },
      ["id", "source", "gainDb", "envelope"],
    ),
    OneShotRecipe: object(
      {
        schemaVersion: { const: 1 },
        kind: { const: "one-shot" },
        duration: { ...number(0, 60), exclusiveMinimum: 0 },
        parameters: ref("Parameters"),
        layers: array(ref("Layer"), 1, 16),
        effects: array(ref("Filter"), 0, 8),
      },
      ["schemaVersion", "kind", "duration", "layers"],
    ),
    SustainedRecipe: object(
      {
        schemaVersion: { const: 1 },
        kind: { const: "sustained" },
        parameters: ref("Parameters"),
        layers: array(ref("Layer"), 1, 16),
        effects: array(ref("Filter"), 0, 8),
      },
      ["schemaVersion", "kind", "layers"],
    ),
    Recipe: { anyOf: [ref("OneShotRecipe"), ref("SustainedRecipe")] },
  },
};
