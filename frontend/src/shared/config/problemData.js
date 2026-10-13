export const PROBLEM_CATEGORIES = [
  {
    id: "Engine noise",
    label: "Engine Noise",
    icon: "Volume2",
    symptoms: [
      "Knocking or ticking sound under hood",
      "Squealing sound during acceleration",
      "Rough idling or engine shaking",
      "Hissing or popping sound while driving"
    ],
    recommendedService: "Engine Check-up"
  },
  {
    id: "Brakes",
    label: "Brakes",
    icon: "ShieldAlert",
    symptoms: [
      "High-pitch squealing or grinding noise",
      "Spongy or soft brake pedal feel",
      "Car pulls to one side when braking",
      "Pulsating or vibrating brake pedal",
      "Handbrake feels loose or fails to hold"
    ],
    recommendedService: "Brake Repair"
  },
  {
    id: "Battery / won't start",
    label: "Battery / Won't Start",
    icon: "Zap",
    symptoms: [
      "Engine cranks slowly but won't start",
      "Rapid clicking noise when turning key",
      "Complete electrical silence (no lights)",
      "Battery terminals corroded with white powder",
      "Jumpstart needed frequently"
    ],
    recommendedService: "Battery Replacement"
  },
  {
    id: "AC not cooling",
    label: "AC Not Cooling",
    icon: "Wind",
    symptoms: [
      "AC blows ambient or warm air",
      "Musty or damp odor when AC is turned on",
      "Hissing or rattling noise from dash vents",
      "Weak airflow even at maximum fan speed"
    ],
    recommendedService: "AC Service"
  },
  {
    id: "Oil / fluid leak",
    label: "Oil / Fluid Leak",
    icon: "Droplets",
    symptoms: [
      "Dark brown or black puddle under engine",
      "Bright green or pink puddle (coolant leak)",
      "Clear fluid or water near footwell",
      "Burning oil smell after highway driving"
    ],
    recommendedService: "Oil Change"
  },
  {
    id: "Warning light",
    label: "Warning Light",
    icon: "AlertTriangle",
    symptoms: [
      "Check Engine Light (CEL) steadily on",
      "Check Engine Light flashing rapidly",
      "ABS or Traction Control warning light on",
      "Oil Pressure or Battery light illuminated",
      "Tyre Pressure (TPMS) warning active"
    ],
    recommendedService: "Engine Check-up"
  },
  {
    id: "Overheating",
    label: "Overheating",
    icon: "Thermometer",
    symptoms: [
      "Temperature gauge needle entering red zone",
      "Steam or white vapor escaping from radiator cap",
      "Coolant reservoir boiling or overflowing",
      "Heater blows cold air while engine is hot"
    ],
    recommendedService: "Emergency Breakdown Assistance"
  },
  {
    id: "Steering / suspension",
    label: "Steering / Suspension",
    icon: "Compass",
    symptoms: [
      "Excessive bouncing over minor speed bumps",
      "Car drifts or pulls to one side on flat road",
      "Clunking noise when turning steering wheel",
      "Steering wheel feels unusually heavy or stiff"
    ],
    recommendedService: "Wheel Alignment & Balancing"
  },
  {
    id: "Tyres / wheel vibration",
    label: "Tyres / Vibration",
    icon: "Disc",
    symptoms: [
      "Steering wheel shakes at 60-100 km/h",
      "Uneven tread wear on inner or outer edges",
      "Low tyre pressure puncture or slow leak",
      "Rumbling road noise increasing with vehicle speed"
    ],
    recommendedService: "Wheel Alignment & Balancing"
  },
  {
    id: "Gear / clutch",
    label: "Gear / Clutch",
    icon: "Settings",
    symptoms: [
      "Difficulty shifting into 1st or Reverse gear",
      "Engine revs up without car gaining speed (slip)",
      "Burning clutch smell when stopping on an incline",
      "Jerking or vibration when releasing clutch pedal"
    ],
    recommendedService: "General Service"
  },
  {
    id: "Electrical / lights",
    label: "Electrical / Lights",
    icon: "Sun",
    symptoms: [
      "Headlight or taillight bulb fused",
      "Power windows slow or non-responsive",
      "Infotainment screen rebooting randomly",
      "Horn or turn signals intermittently failing"
    ],
    recommendedService: "General Service"
  },
  {
    id: "Strange smell / smoke",
    label: "Smell / Smoke",
    icon: "Flame",
    symptoms: [
      "Acrid burning plastic or wire smell",
      "Blue exhaust smoke from tailpipe",
      "Black soot smoke during heavy acceleration",
      "Sweet syrup odor inside the passenger cabin"
    ],
    recommendedService: "Engine Check-up"
  },
  {
    id: "Routine service",
    label: "Routine Service",
    icon: "CheckCircle",
    symptoms: [
      "Periodic 10,000 / 20,000 KM service due",
      "General safety inspection before a long road trip",
      "Seasonal monsoon or summer preparation",
      "Standard multi-point fluid and brake inspection"
    ],
    recommendedService: "General Service"
  },
  {
    id: "Other",
    label: "Other Issue",
    icon: "HelpCircle",
    symptoms: [
      "Uncategorized mechanical issue",
      "Custom accessory or fitment inquiry",
      "Bodywork, dent, or scratch repair request"
    ],
    recommendedService: "General Service"
  }
];

export const PROBLEM_STARTED_OPTIONS = [
  "Just today",
  "Last 2-3 days",
  "Over a week ago",
  "More than a month ago"
];

export const PROBLEM_FREQUENCY_OPTIONS = [
  "Constantly (every time I drive)",
  "Intermittently (randomly comes and goes)",
  "Only under hard acceleration",
  "Only when applying brakes",
  "Only on morning / cold start"
];

export const URGENCY_LEVELS = [
  {
    id: "Routine",
    label: "Routine (Standard Service)",
    desc: "Scheduled maintenance or minor issues that do not affect drivability.",
    color: "teal"
  },
  {
    id: "Soon",
    label: "Soon (Within 2-3 Days)",
    desc: "Noticeable driving impairment, weird noise, or upcoming road trip.",
    color: "amber"
  },
  {
    id: "Urgent",
    label: "Urgent (Safety / Immediate Attention)",
    desc: "Warning lights, brake issues, severe overheating, or risk of breakdown.",
    color: "rose"
  }
];
