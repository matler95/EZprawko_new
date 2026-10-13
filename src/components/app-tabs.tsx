import { useTranslation } from '@/hooks/use-translation';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useContext } from 'react';
import { useAppTheme } from '@/context/app-theme-context';
import { TabBarContext } from '@/context/tab-bar-context';

export default function AppTabs() {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const { isTabBarHidden } = useContext(TabBarContext);

  return (
    <NativeTabs
      backgroundColor={colors.background}
      hidden={isTabBarHidden}
      indicatorColor={colors.backgroundElement}
      tintColor={colors.primaryText}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>{t("Start")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="study">
        <NativeTabs.Trigger.Label>{t("Nauka")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'book', selected: 'book.fill' }} md={{ default: 'menu_book', selected: 'menu_book' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>{t("Postęp")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md={{ default: 'bar_chart', selected: 'bar_chart' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>{t("Ustawienia")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gear" md="settings" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="signs">
        <NativeTabs.Trigger.Label>{t("Znaki")}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="signpost.right" md="traffic" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
