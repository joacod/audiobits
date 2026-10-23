import {
  riffArp,
  riffBass,
  riffChoke,
  riffCrash,
  riffHat,
  riffKick,
  riffLead,
  riffOpenHat,
  riffPad,
  riffRiser,
  riffSnare,
  riffStab,
} from "./recipe";

/** The curated synth-rock palette. Each preset is an editable, serializable recipe. */
export const riffInstruments = Object.freeze({
  kick: riffKick,
  snare: riffSnare,
  hat: riffHat,
  openHat: riffOpenHat,
  bass: riffBass,
  pad: riffPad,
  arp: riffArp,
  stab: riffStab,
  riser: riffRiser,
  crash: riffCrash,
  lead: riffLead,
  choke: riffChoke,
});
