import type {
  RiffInstruments,
  RiffSong,
} from "../../../catalog/experiences/riff-reactor/controller";
import { riffReactorSong } from "../../../catalog/experiences/riff-reactor/song";
import { electricGuitarLead } from "../../../catalog/recipes/electric-guitar-lead/recipe";
import { rhythmGuitar } from "../../../catalog/recipes/rhythm-guitar/recipe";
import { pickedBass } from "../../../catalog/recipes/picked-bass/recipe";
import { sweetChildSong } from "./riff-sweet-child";

export interface RiffSongEntry {
  readonly id: string;
  readonly song: RiffSong;
  readonly description: string;
  readonly instruments?: Partial<RiffInstruments>;
}

// Song selection and third-party composition data belong to this showcase.
// The installed Riff item continues to contain only the original Reactor Core.
export const riffSongs: readonly RiffSongEntry[] = [
  {
    id: "reactor-core",
    song: riffReactorSong,
    description: "An original 60-second synth-rock track.",
  },
  {
    id: "sweet-child-o-mine",
    song: sweetChildSong,
    description:
      "Guns N’ Roses · A shortened instrumental adaptation, about 66 seconds. A one-bar count-in leads into the opening riff, a condensed verse and chorus, then a riff reprise. No vocals or extended solo.",
    instruments: {
      lead: electricGuitarLead,
      bass: pickedBass,
      stab: rhythmGuitar,
    },
  },
];
