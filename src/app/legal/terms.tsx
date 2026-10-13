import { useTranslation } from '@/hooks/use-translation';
import { LegalDocumentScreen, LegalSourceLink } from "@/components/legal-document-screen";
import { ministrySource, terms } from "@/content/legal";

export default function TermsScreen() {
  const { t } = useTranslation();
  return <LegalDocumentScreen document={terms}><LegalSourceLink title={t("Ministerstwo Infrastruktury — źródło pytań")} url={ministrySource} /></LegalDocumentScreen>;
}
