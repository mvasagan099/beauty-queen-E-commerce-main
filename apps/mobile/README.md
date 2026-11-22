# Beauty Queen — Native Android & iOS Mobile App

Native mobile storefront for **Beauty Queen** (*"Your Beauty, Our Priority"*) built with **Expo SDK 52**, **Expo Router**, **React Native**, and **TypeScript**, styled with the **Madras Silk Atelier & Royal Lacquer** palette (`#1A0B10` plum, `#FBF7F2` silk, `#A81C44` crimson, `#D4A353` zari gold).

## Features Connected to `apps/api`

- **Atelier Home** (`app/(tabs)/index.tsx`): Live Flash Sale banner CMS, royal plum editorial hero, 5 curated collections (Sarees, Kurthis, Tops, Leggings, Cosmetics), *Shop the Complete Look* bundles with 1-tap add, and New Arrivals.
- **Explore & Discovery** (`app/(tabs)/explore.tsx`): Debounced search, category chips, size (`S`–`XXL`, `FREE_SIZE`) & sort filters, pull-to-refresh 2-column grid.
- **Product Detail** (`app/product/[id].tsx`): Swipeable gallery, interactive color/shade swatches, size stock selector, Indian 6-digit pincode delivery & COD estimator, Add to Bag & Buy Now.
- **Shopping Bag** (`app/(tabs)/bag.tsx`): Instant guest Zustand bag + authenticated server cart sync on login, ₹999 free-shipping progress bar, quantity controls.
- **Atelier Checkout & Razorpay UPI** (`app/checkout.tsx`, `app/payment.tsx`): Delivery address, coupon code, **Queen's Circle** loyalty points redemption (`10 pts = ₹1`, 15% cap), **Festive Silk Gift Wrap (+₹49)** & personal note, COD, and Razorpay Standard Checkout WebView with native UPI app intent handoff (GPay, PhonePe, Paytm, BHIM), signature verification, and 1-tap retry.
- **Native Push Notifications** (`src/lib/notifications.ts`): Registers Android FCM / iOS APNs Expo push tokens with `POST /api/growth/push/expo-token` for order dispatch and drop alerts.
- **Passwordless Email OTP Auth** (`app/login.tsx`): Uses `x-client-platform: mobile` to obtain JWT access & refresh tokens persisted in `expo-secure-store` with automatic 401 refresh rotation.
- **Queen's Circle & Orders** (`app/(tabs)/account.tsx`, `app/orders.tsx`): Live loyalty tier, points balance, referral code, notification controls, and order history.

---

## Quick Start (Expo Go on Android & iOS)

1. Start the NestJS backend from the repository root:
   ```bash
   npm run dev:api
   ```

2. Configure your API URL in `apps/mobile/.env`:
   ```bash
   cp apps/mobile/.env.example apps/mobile/.env
   ```
   - **Android Emulator:** `EXPO_PUBLIC_API_URL=http://10.0.2.2:5000/api`
   - **iOS Simulator:** `EXPO_PUBLIC_API_URL=http://localhost:5000/api`
   - **Physical Phone (Expo Go):** `EXPO_PUBLIC_API_URL=http://<YOUR_LAN_IP>:5000/api` (or your deployed HTTPS domain `https://api.beautyqueen.in/api`)

3. Install dependencies and start Expo:
   ```bash
   npm run install:mobile
   npm run dev:mobile
   ```

4. Scan the QR code with **Expo Go** (Android) or the **Camera** app (iOS).

---

## Building for Google Play Store (`.aab`) & Apple App Store (`.ipa`)

Configure EAS CLI once (`npm install -g eas-cli && eas login`), then build using the included `eas.json` profiles:

```bash
cd apps/mobile

# Internal QA APK (Android)
eas build --profile preview --platform android

# Production Google Play Store App Bundle (.aab)
eas build --profile production --platform android

# Production Apple App Store Build (.ipa)
eas build --profile production --platform ios
```
