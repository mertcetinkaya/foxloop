import { getServerCatalog } from "@/lib/catalog-server";
import { HomePage } from "@/components/HomePage";

export default async function Page() {
  const initialCatalog = await getServerCatalog();
  return <HomePage initialCatalog={initialCatalog} />;
}
