"use client";

import dynamic from "next/dynamic";

function ChargeStageFallback() {
  return (
    <div className="catalog-stage catalog-charge-stage">
      <div className="catalog-charge-well" />
    </div>
  );
}

function ThrusterStageFallback() {
  return (
    <div className="catalog-stage catalog-thruster-stage">
      <div className="flight-pad" />
    </div>
  );
}

const EnergyChargeDetail = dynamic(
  () =>
    import("./energy-charge-detail").then(
      (module) => module.EnergyChargeDetail,
    ),
  { loading: ChargeStageFallback },
);
const ThrusterDetail = dynamic(
  () => import("./thruster-detail").then((module) => module.ThrusterDetail),
  { loading: ThrusterStageFallback },
);

const LightsaberDetail = dynamic(
  () => import("./lightsaber-detail").then((module) => module.LightsaberDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading Lightsaber" />
    ),
  },
);

const EchoProbeDetail = dynamic(
  () => import("./echo-probe-detail").then((module) => module.EchoProbeDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading Echo Probe" />
    ),
  },
);

const RiftDetail = dynamic(
  () => import("./rift-detail").then((module) => module.RiftDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading The Rift" />
    ),
  },
);

const RiffReactorDetail = dynamic(
  () => import("./riff-detail").then((module) => module.RiffReactorDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading Riff Reactor" />
    ),
  },
);

const EchoVisionDetail = dynamic(
  () =>
    import("./echo-vision-detail").then((module) => module.EchoVisionDetail),
  {
    loading: () => (
      <div className="catalog-stage" aria-label="Loading Echo Vision" />
    ),
  },
);

export function CatalogExperience({ slug }: { slug: string }) {
  return slug === "echo-vision" ? (
    <EchoVisionDetail />
  ) : slug === "riff-reactor" ? (
    <RiffReactorDetail />
  ) : slug === "the-rift" ? (
    <RiftDetail />
  ) : slug === "echo-probe" ? (
    <EchoProbeDetail />
  ) : slug === "lightsaber" ? (
    <LightsaberDetail />
  ) : slug === "energy-charge" ? (
    <EnergyChargeDetail />
  ) : (
    <ThrusterDetail />
  );
}
