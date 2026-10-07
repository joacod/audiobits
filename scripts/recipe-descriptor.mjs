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

// Only the executable Step 02 subset belongs in this descriptor.
export const descriptor = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $ref: "#/$defs/Recipe",
  $defs: {
    Frequency: {
      anyOf: [
        number(20, 20000),
        object({
          points: array(
            {
              type: "array",
              prefixItems: [number(0, 60), number(20, 20000)],
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
    Envelope: object({
      attack: number(0, 10),
      decay: number(0, 10),
      sustain: number(0, 1),
      release: number(0.005, 10),
    }),
    Filter: object({
      type: { const: "filter" },
      filter: { enum: ["lowpass", "highpass", "bandpass"] },
      frequency: number(20, 20000),
      q: number(0.1, 20),
    }),
    Source: object({
      type: { const: "oscillator" },
      waveform: { enum: ["sine", "triangle", "sawtooth", "square"] },
      frequency: ref("Frequency"),
    }),
    Layer: object(
      {
        id: { type: "string", minLength: 1, maxLength: 64 },
        source: ref("Source"),
        gainDb: number(-60, 0),
        envelope: ref("Envelope"),
        effects: array(ref("Filter"), 0, 8),
      },
      ["id", "source", "gainDb", "envelope"],
    ),
    Recipe: object(
      {
        schemaVersion: { const: 1 },
        kind: { const: "one-shot" },
        duration: { ...number(0, 60), exclusiveMinimum: 0 },
        layers: array(ref("Layer"), 1, 16),
        effects: array(ref("Filter"), 0, 8),
      },
      ["schemaVersion", "kind", "duration", "layers"],
    ),
  },
};
