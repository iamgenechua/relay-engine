import type { Metadata } from "next";
import { EB_Garamond, Outfit, JetBrains_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
import { CartProvider } from "@/lib/cart-context";
import { PostHogProvider } from "@/components/posthog-provider";
import { CartDrawer } from "@/components/cart-drawer";
import "./globals.css";
import RelayEngine from "@/components/relay-engine 15-04-12-466/relay-engine";

const ebGaramond = EB_Garamond({
	subsets: ["latin"],
	variable: "--font-eb-garamond",
	weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
	subsets: ["latin"],
	variable: "--font-outfit",
	weight: ["300", "400", "500", "600"],
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains-mono",
	weight: ["400", "500"],
});

export const metadata: Metadata = {
	title: "HONE | Refined Essentials",
	description: "Curated tech accessories for the modern workspace.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html
			lang="en"
			className={`${ebGaramond.variable} ${outfit.variable} ${jetbrainsMono.variable}`}
		>
			<body>
				<CartProvider>
					<PostHogProvider>
						<div className="grain-overlay" aria-hidden="true" />
						<Nav />
						<main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
						<CartDrawer />
					</PostHogProvider>
				</CartProvider>
				<RelayEngine />
			</body>
		</html>
	);
}
