import { fetchCatalogFromApi } from "@/lib/catalog-fetch";
import type { CatalogResponse } from "@/lib/catalog";

export async function getServerCatalog(): Promise<CatalogResponse | null> {
  return fetchCatalogFromApi();
}
