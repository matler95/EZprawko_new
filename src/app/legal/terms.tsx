import { LegalDocumentScreen, LegalSourceLink } from "@/components/legal-document-screen";
import { ministrySource, terms } from "@/content/legal";

export default function TermsScreen() {
  return <LegalDocumentScreen document={terms}><LegalSourceLink title="Ministerstwo Infrastruktury — źródło pytań" url={ministrySource} /></LegalDocumentScreen>;
}
