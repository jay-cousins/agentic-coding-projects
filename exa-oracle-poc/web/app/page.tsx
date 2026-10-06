import { OracleApp } from "@/components/OracleApp";
import { readRecords } from "@/lib/oracle";

export default async function Home() {
  const records = await readRecords();
  return <OracleApp initialRecords={records} />;
}
