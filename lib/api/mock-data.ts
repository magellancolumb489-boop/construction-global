import type {
  AuctionListItem,
  AuctionDetail,
  BidRow,
  ProductListItem,
  ProductDetail,
  User,
  OrderSummary,
  OrderDetail,
  AdminStats,
  AdminPayment,
} from "@/types/domain"

const futureDate = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const pastDate = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// ── Auctions ────────────────────────────────────────────────────────────────
export const mockAuctions: AuctionListItem[] = [
  {
    id: "a1",
    slug: "macara-turn-liebherr-200ec",
    title: "Macara Turn Liebherr 200 EC-H",
    categoryName: "Macarale",
    currentHighestBid: 185000,
    bidCount: 14,
    deadline: futureDate(2),
    reservePrice: 220000,
    status: "active",
    currency: "EUR",
    thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
  },
  {
    id: "a2",
    slug: "excavator-caterpillar-320",
    title: "Excavator CAT 320 GC",
    categoryName: "Excavatoare",
    currentHighestBid: 95000,
    bidCount: 8,
    deadline: futureDate(1),
    reservePrice: 130000,
    status: "active",
    currency: "EUR",
    thumbnailUrl: "https://images.unsplash.com/photo-1580901368919-7738efb0f228?w=400&h=300&fit=crop",
  },
  {
    id: "a3",
    slug: "buldozer-komatsu-d65",
    title: "Buldozer Komatsu D65EX-18",
    categoryName: "Buldozere",
    currentHighestBid: 72000,
    bidCount: 5,
    deadline: futureDate(3),
    status: "active",
    currency: "EUR",
    thumbnailUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&h=300&fit=crop",
  },
  {
    id: "a4",
    slug: "statie-betoane-schwing",
    title: "Statie de Betoane Schwing Stetter M2",
    categoryName: "Statii betoane",
    currentHighestBid: 145000,
    bidCount: 11,
    deadline: futureDate(5),
    reservePrice: 180000,
    status: "active",
    currency: "EUR",
    thumbnailUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop",
  },
  {
    id: "a5",
    slug: "transport-materiale-constructii",
    title: "Servicii Transport Materiale Constructii",
    categoryName: "Transport",
    currentHighestBid: 8500,
    bidCount: 3,
    deadline: futureDate(0.5),
    status: "active",
    currency: "RON",
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
  },
  {
    id: "a6",
    slug: "automacara-grove-gmk",
    title: "Automacara Grove GMK 4100L",
    categoryName: "Macarale",
    currentHighestBid: 310000,
    bidCount: 19,
    deadline: pastDate(2),
    reservePrice: 350000,
    status: "ended",
    currency: "EUR",
    thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
  },
  {
    id: "a7",
    slug: "incarcator-frontal-volvo-l120",
    title: "Incarcator Frontal Volvo L120H",
    categoryName: "Incarcatoare",
    currentHighestBid: 68000,
    bidCount: 6,
    deadline: pastDate(5),
    status: "ended",
    currency: "EUR",
    thumbnailUrl: "https://images.unsplash.com/photo-1580901368919-7738efb0f228?w=400&h=300&fit=crop",
  },
  {
    id: "a8",
    slug: "cilindru-compactor-bomag",
    title: "Cilindru Compactor BOMAG BW 213",
    categoryName: "Compactoare",
    currentHighestBid: 42000,
    bidCount: 2,
    deadline: futureDate(7),
    status: "draft",
    currency: "EUR",
    thumbnailUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&h=300&fit=crop",
  },
]

export const mockAuctionDetails: Record<string, AuctionDetail> = {
  a1: {
    ...mockAuctions[0],
    description:
      "Macara turn Liebherr 200 EC-H in stare excelenta, revizii la zi. Capacitate maxima de ridicare 12 tone la 25m. Include sistem de control electronic si cabina climatizata. Disponibila pentru inspectie la santierul din Bucuresti, Sector 3.",
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&h=600&fit=crop",
    ],
    startingPrice: 150000,
    bidIncrement: 1000,
    minNextBid: 186000,
    startsAt: pastDate(10),
    seller: { id: "u2", displayName: "SC Constructii Moderne SRL" },
  },
  a2: {
    ...mockAuctions[1],
    description:
      "Excavator Caterpillar 320 GC cu doar 3200 ore functionare. Motor Stage V, cupa standard 1.2m3, sistem hidraulic avansat. Perfect pentru lucrari de excavare, fundatii si terasamente.",
    images: [
      "https://images.unsplash.com/photo-1580901368919-7738efb0f228?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
    ],
    startingPrice: 75000,
    bidIncrement: 1000,
    minNextBid: 96000,
    startsAt: pastDate(7),
    seller: { id: "u3", displayName: "EuroConstruct SA" },
  },
  a3: {
    ...mockAuctions[2],
    description:
      "Buldozer Komatsu D65EX-18 cu lama PAT, ripper spate, sistem GPS integrat. Ore functionare: 4500h. Revizie generala efectuata in 2024.",
    images: [
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&h=600&fit=crop",
    ],
    startingPrice: 55000,
    bidIncrement: 1000,
    minNextBid: 73000,
    startsAt: pastDate(5),
    seller: { id: "u2", displayName: "SC Constructii Moderne SRL" },
  },
  a4: {
    ...mockAuctions[3],
    description:
      "Statie de betoane Schwing Stetter M2 cu capacitate 60m3/h. Include 4 silozuri de ciment, benzi transportoare si sistem de dozare computerizat. Functionala si operationala.",
    images: [
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
    ],
    startingPrice: 100000,
    bidIncrement: 1000,
    minNextBid: 146000,
    startsAt: pastDate(14),
    seller: { id: "u4", displayName: "BetonMix Romania SRL" },
  },
  a5: {
    ...mockAuctions[4],
    description:
      "Servicii de transport materiale de constructii in zona Constanta si imprejurimi. Flota de 5 camioane basculante 8x4 cu capacitate 20 tone fiecare. Contract pe 6 luni.",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop",
    ],
    startingPrice: 5000,
    bidIncrement: 100,
    minNextBid: 8600,
    startsAt: pastDate(3),
    seller: { id: "u5", displayName: "TransBuild Logistics SRL" },
  },
  a6: {
    ...mockAuctions[5],
    description:
      "Automacara Grove GMK 4100L cu capacitate maxima 100 tone. Brat telescopic 60m. Revizie completa 2024, certificari ISCIR la zi.",
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
    ],
    startingPrice: 250000,
    bidIncrement: 1000,
    minNextBid: 311000,
    startsAt: pastDate(30),
    seller: { id: "u2", displayName: "SC Constructii Moderne SRL" },
    winnerId: "u1",
  },
}

export const mockBids: Record<string, BidRow[]> = {
  a1: [
    { id: "b1", bidderMasked: "Ion ***", amount: 185000, currency: "EUR", createdAt: pastDate(0.1) },
    { id: "b2", bidderMasked: "Maria ***", amount: 182000, currency: "EUR", createdAt: pastDate(0.2) },
    { id: "b3", bidderMasked: "SC Cons***", amount: 178000, currency: "EUR", createdAt: pastDate(0.5) },
    { id: "b4", bidderMasked: "Andrei ***", amount: 175000, currency: "EUR", createdAt: pastDate(0.8) },
    { id: "b5", bidderMasked: "Euro***", amount: 170000, currency: "EUR", createdAt: pastDate(1) },
    { id: "b6", bidderMasked: "Ion ***", amount: 168000, currency: "EUR", createdAt: pastDate(1.2) },
    { id: "b7", bidderMasked: "SC Tra***", amount: 165000, currency: "EUR", createdAt: pastDate(1.5) },
    { id: "b8", bidderMasked: "Maria ***", amount: 162000, currency: "EUR", createdAt: pastDate(2) },
    { id: "b9", bidderMasked: "Popescu***", amount: 160000, currency: "EUR", createdAt: pastDate(2.5) },
    { id: "b10", bidderMasked: "Ion ***", amount: 155000, currency: "EUR", createdAt: pastDate(3) },
    { id: "b11", bidderMasked: "Andrei ***", amount: 153000, currency: "EUR", createdAt: pastDate(3.5) },
    { id: "b12", bidderMasked: "SC Cons***", amount: 152000, currency: "EUR", createdAt: pastDate(4) },
    { id: "b13", bidderMasked: "Euro***", amount: 151000, currency: "EUR", createdAt: pastDate(4.5) },
    { id: "b14", bidderMasked: "Maria ***", amount: 150000, currency: "EUR", createdAt: pastDate(5) },
  ],
  a2: [
    { id: "b20", bidderMasked: "SC Rom***", amount: 95000, currency: "EUR", createdAt: pastDate(0.3) },
    { id: "b21", bidderMasked: "Mihai ***", amount: 92000, currency: "EUR", createdAt: pastDate(0.5) },
    { id: "b22", bidderMasked: "SC Teh***", amount: 88000, currency: "EUR", createdAt: pastDate(1) },
    { id: "b23", bidderMasked: "Adrian ***", amount: 85000, currency: "EUR", createdAt: pastDate(1.5) },
    { id: "b24", bidderMasked: "SC Con***", amount: 82000, currency: "EUR", createdAt: pastDate(2) },
    { id: "b25", bidderMasked: "Vasile ***", amount: 80000, currency: "EUR", createdAt: pastDate(3) },
    { id: "b26", bidderMasked: "SC Rom***", amount: 78000, currency: "EUR", createdAt: pastDate(4) },
    { id: "b27", bidderMasked: "Mihai ***", amount: 75000, currency: "EUR", createdAt: pastDate(5) },
  ],
}

// ── Products ────────────────────────────────────────────────────────────────
export const mockProducts: ProductListItem[] = [
  {
    id: "p1",
    slug: "beton-c25-30",
    name: "Beton C25/30 (B350)",
    price: 380,
    unit: "M3",
    currency: "RON",
    availableQty: 500,
    thumbnailUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop",
    category: "Beton",
  },
  {
    id: "p2",
    slug: "pietris-sort-8-16",
    name: "Pietris Sort 8-16mm",
    price: 85,
    unit: "TON",
    currency: "RON",
    availableQty: 2000,
    thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
    category: "Agregate",
  },
  {
    id: "p3",
    slug: "nisip-spalat-02",
    name: "Nisip Spalat 0-2mm",
    price: 65,
    unit: "TON",
    currency: "RON",
    availableQty: 3000,
    thumbnailUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&h=300&fit=crop",
    category: "Agregate",
  },
  {
    id: "p4",
    slug: "caramida-porotherm-25",
    name: "Caramida Porotherm 25 N+F",
    price: 4.2,
    unit: "BUC",
    currency: "RON",
    availableQty: 50000,
    thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
    category: "Zidarie",
  },
  {
    id: "p5",
    slug: "otel-beton-bst500",
    name: "Otel Beton BST500 D12",
    price: 3200,
    unit: "TON",
    currency: "RON",
    availableQty: 100,
    thumbnailUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
    category: "Metal",
  },
  {
    id: "p6",
    slug: "ciment-holcim-cem-ii",
    name: "Ciment Holcim CEM II/B-LL 42.5N",
    price: 28,
    unit: "KG",
    currency: "RON",
    availableQty: 10000,
    thumbnailUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop",
    category: "Lianturi",
  },
  {
    id: "p7",
    slug: "profile-metalice-ipn-200",
    name: "Profil Metalic IPN 200",
    price: 4800,
    unit: "TON",
    currency: "RON",
    availableQty: 50,
    thumbnailUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
    category: "Metal",
  },
  {
    id: "p8",
    slug: "tabla-zincata-0-5mm",
    name: "Tabla Zincata 0.5mm",
    price: 32,
    unit: "ML",
    currency: "RON",
    availableQty: 5000,
    thumbnailUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&h=300&fit=crop",
    category: "Metal",
  },
]

export const mockProductDetails: Record<string, ProductDetail> = {
  p1: {
    ...mockProducts[0],
    description:
      "Beton clasa C25/30 (fost B350), livrat cu autobetoniera. Rezistenta la compresiune 25 N/mm2 la 28 zile. Ideal pentru fundatii, stalpi, grinzi si placi. Livrare in Bucuresti si Ilfov, minim 4m3 per comanda.",
    images: [
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
    ],
  },
  p2: {
    ...mockProducts[1],
    description:
      "Pietris sort 8-16mm provenit din cariera proprie. Spalat si calibrat. Utilizat pentru prepararea betonului, drenaje si straturi de fundatie. Transport inclus pentru comenzi peste 20 tone.",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800&h=600&fit=crop",
    ],
  },
  p3: {
    ...mockProducts[2],
    description:
      "Nisip spalat fractiune 0-2mm, calitate superioara pentru tencuieli, sape si prepararea mortarului. Provenienta: raul Olt. Certificat de calitate disponibil.",
    images: [
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=800&h=600&fit=crop",
    ],
  },
  p4: {
    ...mockProducts[3],
    description:
      "Caramida ceramica Porotherm 25 N+F cu nut si feder. Dimensiuni: 250x375x238mm. Rezistenta termica ridicata, consum redus de mortar. Ideala pentru pereti exteriori.",
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop",
    ],
  },
  p5: {
    ...mockProducts[4],
    description:
      "Otel beton BST500S, diametru 12mm, in bare de 12m. Conform SR EN 10080. Utilizat pentru armarea elementelor din beton armat. Disponibil si in alte diametre (8, 10, 14, 16, 20, 25mm).",
    images: [
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop",
    ],
  },
  p6: {
    ...mockProducts[5],
    description:
      "Ciment Portland compozit CEM II/B-LL 42.5N, producator Holcim Romania. Ambalat in saci de 40kg sau vrac. Potrivit pentru lucrari generale de constructii.",
    images: [
      "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=800&h=600&fit=crop",
    ],
  },
}

// ── Users ────────────────────────────────────────────────────────────────────
export const mockUsers: User[] = [
  {
    id: "u1",
    email: "ion.popescu@email.ro",
    displayName: "Ion Popescu",
    phone: "+40 722 123 456",
    role: "user",
  },
  {
    id: "u2",
    email: "contact@constructiimoderne.ro",
    displayName: "SC Constructii Moderne SRL",
    phone: "+40 731 456 789",
    role: "user",
  },
  {
    id: "u3",
    email: "office@euroconstruct.ro",
    displayName: "EuroConstruct SA",
    phone: "+40 744 789 012",
    role: "user",
  },
  {
    id: "u4",
    email: "contact@betonmix.ro",
    displayName: "BetonMix Romania SRL",
    phone: "+40 755 234 567",
    role: "user",
  },
  {
    id: "u5",
    email: "office@transbuild.ro",
    displayName: "TransBuild Logistics SRL",
    phone: "+40 766 345 678",
    role: "user",
  },
  {
    id: "u6",
    email: "admin@constructionhub.ro",
    displayName: "Administrator",
    role: "admin",
  },
]

// ── Orders ──────────────────────────────────────────────────────────────────
export const mockOrders: OrderSummary[] = [
  {
    id: "ord1",
    createdAt: pastDate(3),
    status: "CONFIRMED",
    paymentStatus: "PAID",
    total: 7600,
    currency: "RON",
    itemCount: 2,
  },
  {
    id: "ord2",
    createdAt: pastDate(7),
    status: "FULFILLED",
    paymentStatus: "PAID",
    total: 19200,
    currency: "RON",
    itemCount: 1,
  },
  {
    id: "ord3",
    createdAt: pastDate(1),
    status: "PENDING",
    paymentStatus: "PENDING",
    total: 4200,
    currency: "RON",
    itemCount: 3,
  },
]

export const mockOrderDetails: Record<string, OrderDetail> = {
  ord1: {
    ...mockOrders[0],
    items: [
      {
        productId: "p1",
        name: "Beton C25/30 (B350)",
        price: 380,
        unit: "M3",
        currency: "RON",
        qty: 20,
        availableQty: 500,
        thumbnailUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop",
      },
    ],
    shippingAddress: {
      line1: "Str. Constructorilor 12",
      city: "Bucuresti",
      county: "Bucuresti",
      country: "Romania",
    },
    receiptUrl: "#",
  },
  ord2: {
    ...mockOrders[1],
    items: [
      {
        productId: "p5",
        name: "Otel Beton BST500 D12",
        price: 3200,
        unit: "TON",
        currency: "RON",
        qty: 6,
        availableQty: 100,
        thumbnailUrl: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=400&h=300&fit=crop",
      },
    ],
    shippingAddress: {
      line1: "Bd. Industriei 45",
      city: "Bucuresti",
      county: "Bucuresti",
      country: "Romania",
    },
    receiptUrl: "#",
  },
  ord3: {
    ...mockOrders[2],
    items: [
      {
        productId: "p2",
        name: "Pietris Sort 8-16mm",
        price: 85,
        unit: "TON",
        currency: "RON",
        qty: 30,
        availableQty: 2000,
        thumbnailUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=300&fit=crop",
      },
      {
        productId: "p3",
        name: "Nisip Spalat 0-2mm",
        price: 65,
        unit: "TON",
        currency: "RON",
        qty: 10,
        availableQty: 3000,
        thumbnailUrl: "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?w=400&h=300&fit=crop",
      },
      {
        productId: "p6",
        name: "Ciment Holcim CEM II/B-LL 42.5N",
        price: 28,
        unit: "KG",
        currency: "RON",
        qty: 50,
        availableQty: 10000,
        thumbnailUrl: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=400&h=300&fit=crop",
      },
    ],
  },
}

// ── Admin ───────────────────────────────────────────────────────────────────
export const mockAdminStats: AdminStats = {
  totalAuctions: 8,
  activeAuctions: 5,
  totalOrders: 3,
  totalUsers: 6,
  totalPayments: 5,
  revenue: 425200,
}

export const mockAdminPayments: AdminPayment[] = [
  {
    id: "pay1",
    providerId: "pi_3Qa1b2c3d4e5",
    status: "PAID",
    amount: 7600,
    currency: "RON",
    linkedEntityType: "ORDER",
    linkedEntityId: "ord1",
    createdAt: pastDate(3),
  },
  {
    id: "pay2",
    providerId: "pi_4Rb2c3d4e5f6",
    status: "PAID",
    amount: 19200,
    currency: "RON",
    linkedEntityType: "ORDER",
    linkedEntityId: "ord2",
    createdAt: pastDate(7),
  },
  {
    id: "pay3",
    providerId: "pi_5Sc3d4e5f6g7",
    status: "PENDING",
    amount: 4200,
    currency: "RON",
    linkedEntityType: "ORDER",
    linkedEntityId: "ord3",
    createdAt: pastDate(1),
  },
  {
    id: "pay4",
    providerId: "pi_6Td4e5f6g7h8",
    status: "PAID",
    amount: 310000,
    currency: "EUR",
    linkedEntityType: "AUCTION",
    linkedEntityId: "a6",
    createdAt: pastDate(2),
  },
  {
    id: "pay5",
    providerId: "pi_7Ue5f6g7h8i9",
    status: "PAID",
    amount: 68000,
    currency: "EUR",
    linkedEntityType: "AUCTION",
    linkedEntityId: "a7",
    createdAt: pastDate(5),
  },
]
