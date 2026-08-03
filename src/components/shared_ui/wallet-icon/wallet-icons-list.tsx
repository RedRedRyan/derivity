import { lazy, Suspense } from 'react';
import { IconSize } from '@/components/shared_ui/figma-icons';

const WALLET_ICONS = {
    IcWalletDerivDemoLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodDerivDemoBrandDarkIcon,
        }))
    ),
    IcWalletDerivDemoDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodDerivDemoBrandDarkIcon,
        }))
    ),
    IcWalletCurrencyUsdLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdIcon }))
    ),
    IcWalletCurrencyUsdDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdIcon }))
    ),
    IcWalletCurrencyEurLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEurIcon }))
    ),
    IcWalletCurrencyEurDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEurIcon }))
    ),
    IcWalletCurrencyAudLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyAudIcon }))
    ),
    IcWalletCurrencyAudDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyAudIcon }))
    ),
    IcWalletCurrencyGbpLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyGbpIcon }))
    ),
    IcWalletCurrencyGbpDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyGbpIcon }))
    ),
    IcWalletBitcoinLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyBtcIcon }))
    ),
    IcWalletBitcoinDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyBtcIcon }))
    ),
    IcWalletEthereumLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEthIcon }))
    ),
    IcWalletEthereumDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyEthIcon }))
    ),
    IcWalletTetherLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodTetherUsdtBrandIcon,
        }))
    ),
    IcWalletTetherDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodTetherUsdtBrandIcon,
        }))
    ),
    IcWalletLiteCoinLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodLitecoinBrandIcon,
        }))
    ),
    IcWalletLiteCoinDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodLitecoinBrandIcon,
        }))
    ),
    IcWalletUsdCoinLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodUsdCoinBrandIcon,
        }))
    ),
    IcWalletUsdCoinDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/Logo').then(module => ({
            default: module.PaymentMethodUsdCoinBrandIcon,
        }))
    ),
    IcWalletXrpLight: lazy(() =>
        import('@/components/shared_ui/figma-icons/PaymentMethods').then(module => ({
            default: module.PaymentMethodXrpBrandIcon,
        }))
    ),
    IcWalletXrpDark: lazy(() =>
        import('@/components/shared_ui/figma-icons/PaymentMethods').then(module => ({
            default: module.PaymentMethodXrpBrandIcon,
        }))
    ),
    unknown: lazy(() =>
        import('@/components/shared_ui/figma-icons/Currencies').then(module => ({ default: module.CurrencyUsdIcon }))
    ),
};

export const WalletIconList = ({ type, size }: { type: string; size?: IconSize }) => {
    const Icon = WALLET_ICONS[type as keyof typeof WALLET_ICONS] || WALLET_ICONS.unknown;

    return (
        <Suspense fallback={null}>
            <Icon iconSize={size ?? 'xs'} />
        </Suspense>
    );
};
