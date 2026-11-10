import { describe, expect, it } from "vitest";

import {
  SUPERMARKET_STORES,
  buildVtexLegacySearchUrl,
  parseCoopeProducts,
  parseCotoProducts,
  parseIntelligentSearchProducts,
  parseVtexLegacyProducts,
} from "@/lib/vtex-client";

import type { StoreConfig } from "@/lib/vtex-client";

const carrefour: StoreConfig = { name: "Carrefour", baseUrl: "https://www.carrefour.com.ar", type: "vtex", regions: null };
const cordiez: StoreConfig = { name: "Cordiez", baseUrl: "https://www.cordiez.com.ar", type: "vtex-legacy", regions: ["cordoba"] };

// Trimmed from live responses captured on 2026-11-07.
const intelligentSearchPayload = {
  products: [
    {
      productName: "Leche La serenisima clásica 3% 1L",
      linkText: "leche-la-serenisima-clasica-3-1l-720719",
      priceRange: { sellingPrice: { highPrice: 2269, lowPrice: 2269 }, listPrice: { highPrice: 3030, lowPrice: 3030 } },
      items: [
        {
          itemId: "720719",
          images: [{ imageUrl: "https://carrefourar.vtexassets.com/arquivos/ids/636141/leche.jpg" }],
          sellers: [{ sellerId: "1" }],
        },
      ],
    },
  ],
  recordsFiltered: 1,
};

const cotoPayload = {
  contents: [
    {
      Main: [
        { "@type": "Breadcrumbs" },
        { "@type": "SearchAdjustments" },
        {
          contents: [
            {
              records: [
                {
                  detailsAction: {
                    recordState: "/leche-entera-clasica-la-serenisima-botella-larga-vida-1l/_/A-00253103-00253103-200?format=json",
                  },
                  attributes: {
                    "product.displayName": ["Leche Entera Clasica LA SERENISIMA Botella Larga Vida 1l"],
                    "product.repositoryId": ["prod00253103"],
                  },
                  records: [
                    {
                      attributes: {
                        "sku.activePrice": ["3182.000000"],
                        "product.mediumImage.url": ["https://static.cotodigital3.com.ar/sitios/fotos/medium/00253100/00253103.jpg"],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const coopePayload = {
  estado: 1,
  mensaje: "Solicitud aceptada",
  datos: [
    {
      cod_interno: "708520",
      descripcion: "leche larga vida la serenisima 0% lactosa 1lts",
      precio: "3290.00",
      precio_anterior: "3290.00",
      imagen: "https://www.lacoopeencasa.coop/media/lcec/publico/articulos/7/6/5/76552d5cdf1343df00e9667029704021",
    },
  ],
};

describe("parseIntelligentSearchProducts", () => {
  it("maps a VTEX Intelligent Search product, including its cart ref", () => {
    expect(parseIntelligentSearchProducts(carrefour, intelligentSearchPayload)).toEqual([
      {
        productName: "Leche La serenisima clásica 3% 1L",
        price: 2269,
        listPrice: 3030,
        link: "https://www.carrefour.com.ar/leche-la-serenisima-clasica-3-1l-720719/p",
        imageUrl: "https://carrefourar.vtexassets.com/arquivos/ids/636141/leche.jpg",
        cartRef: { skuId: "720719", sellerId: "1" },
      },
    ]);
  });

  it("maps cartRef to null when itemId or sellerId is missing", () => {
    const payload = {
      products: [
        {
          ...intelligentSearchPayload.products[0],
          items: [{ images: [{ imageUrl: "https://img/x.jpg" }] }],
        },
      ],
    };
    expect(parseIntelligentSearchProducts(carrefour, payload)[0]?.cartRef).toBeNull();
  });

  it("throws on a GraphQL-style error payload instead of returning no products", () => {
    const errorPayload = { errors: [{ message: "PersistedQueryNotFound" }] };
    expect(() => parseIntelligentSearchProducts(carrefour, errorPayload)).toThrow(/unexpected response shape/);
  });
});

describe("parseVtexLegacyProducts", () => {
  it("keeps available products and skips unavailable or zero-priced ones", () => {
    const offer = (price: number, isAvailable: boolean) => ({
      itemId: "999",
      images: [{ imageUrl: "https://img/x.jpg" }],
      sellers: [{ sellerId: "1", commertialOffer: { Price: price, ListPrice: price, IsAvailable: isAvailable } }],
    });
    const payload = [
      { productName: "Arroz largo fino 1kg", link: "/arroz/p", items: [offer(1500, true)] },
      { productName: "Arroz sin stock", link: "/sin-stock/p", items: [offer(1500, false)] },
      { productName: "Arroz precio cero", link: "/cero/p", items: [offer(0, true)] },
    ];

    expect(parseVtexLegacyProducts(cordiez, payload).map((product) => product.link)).toEqual([
      "https://www.cordiez.com.ar/arroz/p",
    ]);
    expect(parseVtexLegacyProducts(cordiez, payload)[0]?.cartRef).toEqual({ skuId: "999", sellerId: "1" });
  });

  it("maps cartRef to null when itemId or sellerId is missing", () => {
    const payload = [
      {
        productName: "Arroz sin sku",
        link: "/arroz/p",
        items: [{ images: [{ imageUrl: "https://img/x.jpg" }], sellers: [{ commertialOffer: { Price: 1500, ListPrice: 1500, IsAvailable: true } }] }],
      },
    ];
    expect(parseVtexLegacyProducts(cordiez, payload)[0]?.cartRef).toBeNull();
  });
});

describe("buildVtexLegacySearchUrl", () => {
  it("orders legacy search by top sales so staples come before loose text hits", () => {
    expect(buildVtexLegacySearchUrl(cordiez, "dulce de leche")).toBe(
      "https://www.cordiez.com.ar/api/catalog_system/pub/products/search/?ft=dulce%20de%20leche&_from=0&_to=5&O=OrderByTopSaleDESC",
    );
  });
});

describe("parseCotoProducts", () => {
  it("reads the name from the product record and the price from the nested SKU record", () => {
    expect(parseCotoProducts(cotoPayload)).toEqual([
      {
        productName: "Leche Entera Clasica LA SERENISIMA Botella Larga Vida 1l",
        price: 3182,
        listPrice: null,
        link: "https://www.coto.com.ar/productos/leche-entera-clasica-la-serenisima-botella-larga-vida-1l/_/A-00253103-00253103-200",
        imageUrl: "https://static.cotodigital3.com.ar/sitios/fotos/medium/00253100/00253103.jpg",
        cartRef: null,
      },
    ]);
  });

  it("returns no products for a valid search with no results", () => {
    expect(parseCotoProducts({ contents: [{ Main: [] }] })).toEqual([]);
  });

  it("throws when the Endeca envelope is missing", () => {
    expect(() => parseCotoProducts("<html>moved</html>")).toThrow(/Coto returned an unexpected response shape/);
  });
});

describe("parseCoopeProducts", () => {
  it("parses string prices and builds the product link", () => {
    expect(parseCoopeProducts(coopePayload)).toEqual([
      {
        productName: "leche larga vida la serenisima 0% lactosa 1lts",
        price: 3290,
        listPrice: null,
        link: "https://www.lacoopeencasa.coop/producto/leche-larga-vida-la-serenisima-0-lactosa-1lts/708520",
        imageUrl: "https://www.lacoopeencasa.coop/media/lcec/publico/articulos/7/6/5/76552d5cdf1343df00e9667029704021",
        cartRef: null,
      },
    ]);
  });

  it("treats status 2 as a valid search with no results", () => {
    expect(parseCoopeProducts({ estado: 2, mensaje: "No se encontraron valores", datos: [] })).toEqual([]);
  });

  it("throws on the old `articulos` format instead of returning no products", () => {
    expect(() => parseCoopeProducts({ articulos: [{ descripcion: "leche", precio: 100 }] })).toThrow(
      /unexpected response shape/,
    );
  });

  it("throws on an error status", () => {
    expect(() => parseCoopeProducts({ estado: 0, mensaje: "Error interno", datos: null })).toThrow(/status 0/);
  });
});

describe("SUPERMARKET_STORES", () => {
  it("no longer lists HiperLibertad, whose site now redirects to La Anónima", () => {
    expect(SUPERMARKET_STORES.map((store) => store.name)).not.toContain("HiperLibertad");
  });
});
