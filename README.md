# AgroMEDConnect

AgroMEDConnect is a bilingual agricultural marketplace for Bangladesh. It connects farmers with trusted seeds, fertilizers, crop protection products, farm equipment, feed, irrigation supplies, and practical agronomist support.

## Features

- Browse products by category, brand, availability, and offer status.
- Search the catalog and view product details, ratings, stock, and related items.
- Save products to a wishlist and manage a shopping cart.
- Check out with bKash, Nagad, card, or cash on delivery.
- Track sample and newly placed orders by order number.
- Book crop diagnosis, soil testing, agronomist calls, and farm visits.
- Read practical farming articles and view market-rate updates.
- Open support tickets and review delivery, payment, and product FAQs.
- Switch the interface between English and Bengali.

## Tech stack

- React 19
- TypeScript
- Vite
- lucide-react

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

## Available scripts

```bash
npm run dev       # Start the development server
npm run build     # Type-check and create a production build
npm run preview   # Preview the production build locally
```

## Project structure

```text
src/
	App.tsx          Application pages and interactive flows
	data.ts          Products, services, articles, FAQs, and sample data
	i18n.ts          English and Bengali interface copy
	ui.tsx           Reusable interface components
	styles.css       Main visual styles
	interactive.css  Interactive states and motion styles
	assets/          Local image assets
```

## Language

Use the language toggle in the top navigation to switch between English and Bengali.
