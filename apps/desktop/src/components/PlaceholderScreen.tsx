import { useTranslation } from "react-i18next";
import type { Screen } from "../screens";

/** Temporary content for screens that are not built yet. */
export function PlaceholderScreen({ screen }: { screen: Screen }) {
  const { t } = useTranslation();

  return (
    <section className="screen">
      <h1>{t(`screens.${screen}.title`)}</h1>
      <p className="screen-placeholder">{t(`screens.${screen}.placeholder`)}</p>
    </section>
  );
}
