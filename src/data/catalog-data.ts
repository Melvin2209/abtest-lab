// Fictional catalog and experiments used by the demo store. All brands are made up.

export const products = [
  {
    id: "p-headphones",
    name: "Nordwave Studio Headphones",
    category: "Audio",
    priceCents: 12900,
    emoji: "🎧",
    color: "#e0e7ff",
    description: "Over-ear wireless headphones with active noise cancelling and 30h battery life.",
  },
  {
    id: "p-speaker",
    name: "Nordwave Pebble Speaker",
    category: "Audio",
    priceCents: 5900,
    emoji: "🔊",
    color: "#dbeafe",
    description: "Pocket-size Bluetooth speaker, splash-proof, 12h of music.",
  },
  {
    id: "p-earbuds",
    name: "Nordwave Buds Air",
    category: "Audio",
    priceCents: 7900,
    emoji: "🎵",
    color: "#ede9fe",
    description: "True wireless earbuds with a compact charging case.",
  },
  {
    id: "p-coffee",
    name: "Brewlio Espresso One",
    category: "Kitchen",
    priceCents: 19900,
    emoji: "☕",
    color: "#fef3c7",
    description: "15-bar espresso machine with milk frother, ready in 40 seconds.",
  },
  {
    id: "p-blender",
    name: "Brewlio Power Blender",
    category: "Kitchen",
    priceCents: 8900,
    emoji: "🥤",
    color: "#fce7f3",
    description: "1200W blender with 6 stainless steel blades and a 1.5L jar.",
  },
  {
    id: "p-kettle",
    name: "Brewlio Glass Kettle",
    category: "Kitchen",
    priceCents: 3900,
    emoji: "🫖",
    color: "#ffedd5",
    description: "1.7L glass kettle with temperature presets and keep-warm mode.",
  },
  {
    id: "p-console",
    name: "Pixelforge Console S",
    category: "Gaming",
    priceCents: 39900,
    emoji: "🎮",
    color: "#dcfce7",
    description: "Compact 4K gaming console with 1TB of storage.",
  },
  {
    id: "p-controller",
    name: "Pixelforge Pro Controller",
    category: "Gaming",
    priceCents: 6900,
    emoji: "🕹️",
    color: "#d1fae5",
    description: "Wireless controller with remappable back buttons.",
  },
  {
    id: "p-vacuum",
    name: "Tidyo Robot Vacuum",
    category: "Home",
    priceCents: 29900,
    emoji: "🤖",
    color: "#e2e8f0",
    description: "Robot vacuum with lidar mapping and auto-empty dock.",
  },
  {
    id: "p-lamp",
    name: "Tidyo Smart Lamp",
    category: "Home",
    priceCents: 4900,
    emoji: "💡",
    color: "#fef9c3",
    description: "Dimmable smart lamp with 16 million colors and voice control.",
  },
  {
    id: "p-cable",
    name: "Volta USB-C Cable 2m",
    category: "Accessories",
    priceCents: 1490,
    emoji: "🔌",
    color: "#f1f5f9",
    description: "Braided USB-C to USB-C cable, 100W fast charging.",
  },
  {
    id: "p-case",
    name: "Volta Travel Case",
    category: "Accessories",
    priceCents: 1990,
    emoji: "🧳",
    color: "#f5f5f4",
    description: "Hard-shell travel case for headphones and small gadgets.",
  },
];

/** Accessory suggested by the upsell pop-in for each product (fallback: the cable). */
export const upsellFor: Record<string, string> = {
  "p-headphones": "p-case",
  "p-earbuds": "p-case",
  "p-console": "p-controller",
};

export const experiments = [
  {
    key: "atc-button",
    name: "Add-to-cart button wording",
    hypothesis:
      "Heatmaps show the add-to-cart button gets little attention. A full-width button that mentions free delivery should increase the add-to-cart rate.",
    primaryMetric: "add_to_cart",
    variants: [
      { key: "control", name: "Default button", weight: 50 },
      { key: "B", name: "Full-width + free delivery", weight: 50 },
    ],
  },
  {
    key: "upsell-popin",
    name: "Upsell pop-in after add to cart",
    hypothesis:
      "Users rarely buy accessories. Suggesting one in a pop-in right after add to cart should increase accessory sales without hurting the purchase rate.",
    primaryMetric: "purchase",
    variants: [
      { key: "control", name: "Simple confirmation", weight: 50 },
      { key: "B", name: "Pop-in with accessory", weight: 50 },
    ],
  },
];
