import type {
  OverviewDTO,
  IndicatorCategory,
  IndicatorStatus,
  Momentum,
  Confidence,
} from "../shared/";

function isoNow() {
  return new Date().toISOString();
}

function dayISO(offsetDays: number) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export const horizonStorage = {
  async getOverview(input: {
    themeId?: string;
    geoMetric?: "volume" | "acceleration" | "emotionShift";
  }): Promise<OverviewDTO> {
    const themeId = input.themeId ?? "theme_hybrid_europe";
    const geoMetric = input.geoMetric ?? "acceleration";

    // V1 seed data (feels real enough for demos)
    const scenarios = [
      {
        id: "scn_managed_competition",
        themeId,
        name: "Managed Competition",
        probability: 0.34,
        delta7d: 0.03,
        momentum: "building" as Momentum,
        confidence: "medium" as Confidence,
        topDrivers: [
          {
            indicatorId: "ind_emotion_fear_velocity",
            name: "Fear emotion velocity",
            contributionScore: 0.62,
          },
          {
            indicatorId: "ind_cross_language_amplification",
            name: "Cross-language amplification",
            contributionScore: 0.55,
          },
          {
            indicatorId: "ind_public_sector_cyber_cluster",
            name: "Public sector cyber clustering",
            contributionScore: 0.41,
          },
        ],
      },
      {
        id: "scn_political_destabilization",
        themeId,
        name: "Escalating Political Destabilization",
        probability: 0.29,
        delta7d: 0.05,
        momentum: "accelerating" as Momentum,
        confidence: "medium" as Confidence,
        topDrivers: [
          {
            indicatorId: "ind_polarizing_rhetoric_spike",
            name: "Polarizing rhetoric spike",
            contributionScore: 0.71,
          },
          {
            indicatorId: "ind_protest_cluster_acceleration",
            name: "Protest cluster acceleration",
            contributionScore: 0.52,
          },
        ],
      },
      {
        id: "scn_infra_disruption",
        themeId,
        name: "Infrastructure Disruption Campaign",
        probability: 0.23,
        delta7d: 0.02,
        momentum: "building" as Momentum,
        confidence: "low" as Confidence,
        topDrivers: [
          {
            indicatorId: "ind_undersea_cable_mentions",
            name: "Undersea cable references",
            contributionScore: 0.58,
          },
          {
            indicatorId: "ind_energy_grid_incidents",
            name: "Energy grid incidents",
            contributionScore: 0.44,
          },
        ],
      },
      {
        id: "scn_strategic_stabilization",
        themeId,
        name: "Strategic Stabilization",
        probability: 0.14,
        delta7d: -0.1,
        momentum: "calm" as Momentum,
        confidence: "low" as Confidence,
        topDrivers: [
          {
            indicatorId: "ind_deterrence_messaging",
            name: "Deterrence messaging",
            contributionScore: 0.22,
          },
        ],
      },
    ];

    const topScenario = scenarios
      .slice()
      .sort((a, b) => b.delta7d - a.delta7d)[0];

    const overview: OverviewDTO = {
      theme: {
        id: themeId,
        name: "Hybrid Warfare — Europe",
        regionScope: "Europe-wide",
        updatedAt: isoNow(),
      },
      lastUpdateAt: isoNow(),
      overallConfidence: "medium",
      heroLine: `Narrative pressure is shifting toward: ${topScenario.name} (${topScenario.momentum})`,
      scenarios,
      pressureSeries: Array.from({ length: 14 }).map((_, i) => ({
        date: dayISO(i - 13),
        value: 40 + Math.sin(i / 2) * 6 + i * 0.4, // just a plausible shape
      })),
      weakSignals: [
        {
          id: "ind_polarizing_rhetoric_spike",
          name: "Polarizing rhetoric spike",
          category: "political" as IndicatorCategory,
          status: "watching" as IndicatorStatus,
          accelerationScore: 2.1,
          lastTriggeredAt: isoNow(),
        },
        {
          id: "ind_undersea_cable_mentions",
          name: "Undersea cable references",
          category: "infra" as IndicatorCategory,
          status: "watching" as IndicatorStatus,
          accelerationScore: 1.7,
          lastTriggeredAt: null,
        },
        {
          id: "ind_cross_language_amplification",
          name: "Cross-language amplification",
          category: "infoops" as IndicatorCategory,
          status: "triggered" as IndicatorStatus,
          accelerationScore: 2.4,
          lastTriggeredAt: isoNow(),
        },
      ],
      geoPulse: [
        { geoKey: "DE", label: "Germany", metric: geoMetric, value: 1.6 },
        { geoKey: "FR", label: "France", metric: geoMetric, value: 1.1 },
        { geoKey: "PL", label: "Poland", metric: geoMetric, value: 1.9 },
        { geoKey: "NL", label: "Netherlands", metric: geoMetric, value: 0.8 },
      ],
      hotspots: [
        { geoKey: "PL", label: "Poland", value: 1.9 },
        { geoKey: "DE", label: "Germany", value: 1.6 },
        { geoKey: "FR", label: "France", value: 1.1 },
        { geoKey: "NL", label: "Netherlands", value: 0.8 },
      ],
      explainability: [
        {
          indicatorId: "ind_cross_language_amplification",
          indicatorName: "Cross-language amplification",
          rationale:
            "Rapid multi-language narrative amplification detected across EU political topics.",
          confidence: "medium",
          evidenceIds: ["ev_001", "ev_002"],
        },
        {
          indicatorId: "ind_polarizing_rhetoric_spike",
          indicatorName: "Polarizing rhetoric spike",
          rationale:
            "Polarizing rhetoric frequency increased above baseline in multiple countries.",
          confidence: "medium",
          evidenceIds: ["ev_003"],
        },
      ],
    };

    return overview;
  },
};
