import { LegalDocumentScreen, LegalSourceLink } from "@/components/legal-document-screen";
import { privacy, uodoSource } from "@/content/legal";

export default function PrivacyScreen() {
  return <LegalDocumentScreen document={privacy}><LegalSourceLink title="UODO — informacje o prawach" url={uodoSource} /></LegalDocumentScreen>;
}
