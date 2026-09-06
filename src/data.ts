export type Page =
  | 'home' | 'shop' | 'product' | 'brands' | 'services' | 'offers'
  | 'knowledge' | 'article' | 'support' | 'track' | 'account'
  | 'wishlist' | 'checkout' | 'notifications' | 'help'

export type Product = {
  id: string
  name: string
  nameBn: string
  brand: string
  category: string
  price: number
  old?: number
  badge: string
  badgeBn: string
  image: string
  color: string
  rating: number
  reviews: number
  stock: number
  unit: string
  unitBn: string
  desc: string
  descBn: string
  tags: string[]
  tagsBn: string[]
  bestSeller?: boolean
  newArrival?: boolean
  onSale?: boolean
}

export const categories = [
  { id: 'seeds', icon: '01', name: 'Seeds', nameBn: 'বীজ', note: 'Field, vegetable and fruit seeds', noteBn: 'ক্ষেত, সবজি ও ফলের বীজ' },
  { id: 'fertilizers', icon: '02', name: 'Fertilizers', nameBn: 'সার', note: 'Crop nutrition essentials', noteBn: 'ফসলের পুষ্টি উপকরণ' },
  { id: 'protection', icon: '03', name: 'Crop Protection', nameBn: 'ফসল সুরক্ষা', note: 'Pesticides and fungicides', noteBn: 'কীটনাশক ও ছত্রাকনাশক' },
  { id: 'equipment', icon: '04', name: 'Farm Equipment', nameBn: 'যন্ত্রপাতি', note: 'Tools and machinery', noteBn: 'যন্ত্র ও সরঞ্জাম' },
  { id: 'feed', icon: '05', name: 'Fish & Animal Feed', nameBn: 'খাদ্য', note: 'Nutrition for livestock', noteBn: 'পশুপাখি ও মাছের পুষ্টি' },
  { id: 'irrigation', icon: '06', name: 'Irrigation', nameBn: 'সেচ', note: 'Smart water solutions', noteBn: 'স্মার্ট সেচ সমাধান' },
]

export const products: Product[] = [
  { id: 'p1', name: 'Hybrid Tomato Seeds', nameBn: 'হাইব্রিড টমেটো বীজ', brand: 'Lal Teer Seed', category: 'seeds', price: 850, old: 1000, badge: '15% OFF', badgeBn: '১৫% ছাড়', image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=800&q=80', color: '#a6502c', rating: 4.8, reviews: 124, stock: 86, unit: '10g pack', unitBn: '১০ গ্রাম প্যাক', desc: 'High-yield hybrid tomato seed selected for Bangladesh monsoon conditions. Strong disease resistance and uniform fruit size.', descBn: 'বাংলাদেশের বর্ষার জন্য নির্বাচিত উচ্চ ফলনশীল হাইব্রিড টমেটো বীজ। রোগ প্রতিরোধ ক্ষমতা শক্তিশালী এবং ফলের আকার সমান।', tags: ['vegetable', 'hybrid'], tagsBn: ['সবজি', 'হাইব্রিড'], onSale: true, bestSeller: true },
  { id: 'p2', name: 'Urea Fertilizer — 50kg', nameBn: 'ইউরিয়া সার — ৫০ কেজি', brand: 'BCIC Authorized', category: 'fertilizers', price: 1180, badge: 'Best Seller', badgeBn: 'বেস্ট সেলার', image: 'https://images.unsplash.com/photo-1523741543316-beb7fc7023d8?auto=format&fit=crop&w=800&q=80', color: '#3f6b3a', rating: 4.9, reviews: 418, stock: 240, unit: '50kg bag', unitBn: '৫০ কেজি বস্তা', desc: 'Government-authorized urea for paddy, wheat and vegetable fields. Consistent granule quality with verified source.', descBn: 'ধান, গম ও সবজি ক্ষেতের জন্য সরকার অনুমোদিত ইউরিয়া। যাচাইকৃত উৎস ও সমান দানার মান।', tags: ['nitrogen'], tagsBn: ['নাইট্রোজেন'], bestSeller: true },
  { id: 'p3', name: 'Neem Bio Pesticide', nameBn: 'নিম বায়ো কীটনাশক', brand: 'Apex Agro', category: 'protection', price: 420, badge: 'Organic', badgeBn: 'জৈব', image: 'https://images.unsplash.com/photo-1531853121101-cb94c8ed218d?auto=format&fit=crop&w=800&q=80', color: '#c98a1f', rating: 4.6, reviews: 89, stock: 152, unit: '1 litre', unitBn: '১ লিটার', desc: 'Botanical neem extract for sucking pests and early fungal pressure. Safe around beneficial insects when used as directed.', descBn: 'চোষক পোকা ও প্রাথমিক ছত্রাক চাপের জন্য নিম নির্যাস। নির্দেশমতো ব্যবহার করলে উপকারী পোকা নিরাপদ থাকে।', tags: ['organic', 'neem'], tagsBn: ['জৈব', 'নিম'], onSale: true },
  { id: 'p4', name: 'Premium Rice Seeds BR-28', nameBn: 'প্রিমিয়াম ধান বীজ বিআর-২৮', brand: 'ACI Seed', category: 'seeds', price: 1240, old: 1400, badge: 'New Arrival', badgeBn: 'নতুন', image: 'https://images.unsplash.com/photo-1536304447766-da0ed4ce1b73?auto=format&fit=crop&w=800&q=80', color: '#2b3b60', rating: 4.7, reviews: 201, stock: 64, unit: '10kg bag', unitBn: '১০ কেজি বস্তা', desc: 'Certified BR-28 rice seed with high germination and strong tillering. Suited for Aman planting windows.', descBn: 'উচ্চ অঙ্কুরোদগম ও শক্ত কুশিসহ প্রত্যয়িত বিআর-২৮ ধান বীজ। আমন রোপণের সময়ের জন্য উপযোগী।', tags: ['paddy', 'certified'], tagsBn: ['ধান', 'প্রত্যয়িত'], newArrival: true, onSale: true },
  { id: 'p5', name: 'DAP Fertilizer — 50kg', nameBn: 'ডিএপি সার — ৫০ কেজি', brand: 'BCIC Authorized', category: 'fertilizers', price: 2450, badge: 'Verified', badgeBn: 'যাচাইকৃত', image: 'https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=800&q=80', color: '#3f6b3a', rating: 4.8, reviews: 166, stock: 98, unit: '50kg bag', unitBn: '৫০ কেজি বস্তা', desc: 'Diammonium phosphate for basal application. Builds early root strength in rice, maize and vegetables.', descBn: 'মূল প্রয়োগের জন্য ডাইঅ্যামোনিয়াম ফসফেট। ধান, ভুট্টা ও সবজিতে শিকড় শক্ত করে।', tags: ['phosphate'], tagsBn: ['ফসফেট'], bestSeller: true },
  { id: 'p6', name: 'Drip Irrigation Starter Kit', nameBn: 'ড্রিপ সেচ স্টার্টার কিট', brand: 'RFL Agri', category: 'irrigation', price: 3890, old: 4500, badge: '20% OFF', badgeBn: '২০% ছাড়', image: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80', color: '#2b3b60', rating: 4.5, reviews: 54, stock: 31, unit: '1/4 acre kit', unitBn: '১/৪ একর কিট', desc: 'Complete drip kit with laterals, emitters and a filter. Cuts water use and keeps vegetable beds evenly wet.', descBn: 'ল্যাটারাল, ইমিটার ও ফিল্টারসহ সম্পূর্ণ ড্রিপ কিট। পানির ব্যবহার কমায় এবং সবজি বেড সমান ভেজা রাখে।', tags: ['water', 'kit'], tagsBn: ['পানি', 'কিট'], onSale: true, newArrival: true },
  { id: 'p7', name: 'Floating Fish Feed 25kg', nameBn: 'ভাসমান মাছের খাবার ২৫ কেজি', brand: 'Quality Feeds', category: 'feed', price: 1680, badge: 'Farm Pick', badgeBn: 'খামার পছন্দ', image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80', color: '#a6502c', rating: 4.7, reviews: 97, stock: 120, unit: '25kg bag', unitBn: '২৫ কেজি বস্তা', desc: 'High-protein floating pellet for carp and tilapia. Low waste formula with strong water stability.', descBn: 'কার্প ও তেলাপিয়ার জন্য উচ্চ প্রোটিনের ভাসমান প্যালেট। কম অপচয়, পানিতে স্থিতিশীল।', tags: ['aquaculture'], tagsBn: ['মৎস্য'], bestSeller: true },
  { id: 'p8', name: '16L Knapsack Sprayer', nameBn: '১৬ লিটার স্প্রেয়ার', brand: 'ACI Motors', category: 'equipment', price: 2150, badge: 'Durable', badgeBn: 'টেকসই', image: 'https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&w=800&q=80', color: '#2b3b60', rating: 4.4, reviews: 73, stock: 44, unit: '16 litre', unitBn: '১৬ লিটার', desc: 'Brass-nozzle knapsack sprayer with padded straps. Even coverage for pesticides and foliar feed.', descBn: 'প্যাডেড স্ট্র্যাপসহ পিতলের নজলের স্প্রেয়ার। কীটনাশক ও পাতায় সার সমান ছড়ায়।', tags: ['sprayer'], tagsBn: ['স্প্রেয়ার'], newArrival: true },
  { id: 'p9', name: 'Hybrid Maize NK-40', nameBn: 'হাইব্রিড ভুট্টা এনকে-৪০', brand: 'Syngenta', category: 'seeds', price: 1340, badge: 'High Yield', badgeBn: 'উচ্চ ফলন', image: 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80', color: '#c98a1f', rating: 4.9, reviews: 188, stock: 77, unit: '1kg pack', unitBn: '১ কেজি প্যাক', desc: 'Vigorous hybrid maize with strong standability. Performs well in both rabi and kharif plantings.', descBn: 'শক্তিশালী হাইব্রিড ভুট্টা, ভালো দাঁড়ানো ক্ষমতা। রবি ও খরিফ দুই মৌসুমেই ভালো ফলন।', tags: ['maize', 'hybrid'], tagsBn: ['ভুট্টা', 'হাইব্রিড'], bestSeller: true },
  { id: 'p10', name: 'TSP Fertilizer — 50kg', nameBn: 'টিএসপি সার — ৫০ কেজি', brand: 'BCIC Authorized', category: 'fertilizers', price: 1450, badge: 'Essential', badgeBn: 'প্রয়োজনীয়', image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=800&q=80', color: '#3f6b3a', rating: 4.6, reviews: 142, stock: 110, unit: '50kg bag', unitBn: '৫০ কেজি বস্তা', desc: 'Triple super phosphate for phosphorus-deficient soils. Mix at planting for stronger early growth.', descBn: 'ফসফরাস ঘাটতি মাটির জন্য ট্রিপল সুপার ফসফেট। রোপণের সময় মিশিয়ে প্রাথমিক বৃদ্ধি বাড়ান।', tags: ['phosphate'], tagsBn: ['ফসফেট'] },
  { id: 'p11', name: 'Solar Water Pump 1HP', nameBn: 'সোলার পাম্প ১ এইচপি', brand: 'Rahimafrooz', category: 'irrigation', price: 28500, old: 32000, badge: 'New Arrival', badgeBn: 'নতুন', image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=800&q=80', color: '#2b3b60', rating: 4.8, reviews: 36, stock: 12, unit: '1HP set', unitBn: '১ এইচপি সেট', desc: 'Off-grid solar pump for small plots and homestead ponds. Includes controller and mounting kit.', descBn: 'ছোট প্লট ও বাড়ির পুকুরের জন্য অফ-গ্রিড সোলার পাম্প। কন্ট্রোলার ও মাউন্টিং কিটসহ।', tags: ['solar', 'pump'], tagsBn: ['সোলার', 'পাম্প'], newArrival: true, onSale: true },
  { id: 'p12', name: 'Cattle Feed Mix 40kg', nameBn: 'গবাদি পশুর খাবার ৪০ কেজি', brand: 'Aftab Feed', category: 'feed', price: 1960, badge: 'Balanced', badgeBn: 'সুষম', image: 'https://images.unsplash.com/photo-1500595046743-cd271d815d08?auto=format&fit=crop&w=800&q=80', color: '#a6502c', rating: 4.5, reviews: 61, stock: 88, unit: '40kg bag', unitBn: '৪০ কেজি বস্তা', desc: 'Balanced dairy mix with energy, protein and minerals. Supports milk yield through the dry season.', descBn: 'শক্তি, প্রোটিন ও খনিজসহ সুষম দুধাল মিশ্রণ। শুষ্ক মৌসুমে দুধ উৎপাদন সহায়তা করে।', tags: ['livestock'], tagsBn: ['গবাদি'] },
]

export const brands = [
  { name: 'Lal Teer Seed', field: 'Seeds', fieldBn: 'বীজ', since: '1995', sinceBn: '১৯৯৫', products: 3, note: 'Vegetable and field crop genetics trusted nationwide.', noteBn: 'সারাদেশে বিশ্বস্ত সবজি ও ক্ষেত ফসলের জিনেটিক্স।' },
  { name: 'ACI Seed', field: 'Seeds', fieldBn: 'বীজ', since: '1968', sinceBn: '১৯৬৮', products: 2, note: 'Certified rice and hybrid lines for Bangladesh seasons.', noteBn: 'বাংলাদেশের মৌসুমের জন্য প্রত্যয়িত ধান ও হাইব্রিড লাইন।' },
  { name: 'BCIC Authorized', field: 'Fertilizers', fieldBn: 'সার', since: '1976', sinceBn: '১৯৭৬', products: 3, note: 'Official urea, DAP and TSP supply chain.', noteBn: 'সরকারি ইউরিয়া, ডিএপি ও টিএসপি সরবরাহ চেইন।' },
  { name: 'Apex Agro', field: 'Crop Care', fieldBn: 'ফসল পরিচর্যা', since: '2004', sinceBn: '২০০৪', products: 1, note: 'Botanical crop protection and foliar nutrition.', noteBn: 'উদ্ভিজ্জ ফসল সুরক্ষা ও পাতায় পুষ্টি।' },
  { name: 'Quality Feeds', field: 'Aqua Feed', fieldBn: 'মৎস্য খাদ্য', since: '2001', sinceBn: '২০০১', products: 1, note: 'Floating and sinking feeds for commercial ponds.', noteBn: 'বাণিজ্যিক পুকুরের ভাসমান ও ডুবন্ত খাবার।' },
  { name: 'RFL Agri', field: 'Irrigation', fieldBn: 'সেচ', since: '1980', sinceBn: '১৯৮০', products: 1, note: 'Pipes, drip kits and on-farm water hardware.', noteBn: 'পাইপ, ড্রিপ কিট ও খামারের পানি সরঞ্জাম।' },
  { name: 'Syngenta', field: 'Seeds', fieldBn: 'বীজ', since: '2000', sinceBn: '২০০০', products: 1, note: 'High-performance maize and vegetable hybrids.', noteBn: 'উচ্চ ক্ষমতার ভুট্টা ও সবজি হাইব্রিড।' },
  { name: 'Rahimafrooz', field: 'Energy', fieldBn: 'জ্বালানি', since: '1954', sinceBn: '১৯৫৪', products: 1, note: 'Solar pumping systems for off-grid farms.', noteBn: 'অফ-গ্রিড খামারের সোলার পাম্পিং ব্যবস্থা।' },
]

export const articles = [
  { id: 'a1', title: 'Preparing paddy before the monsoon break', titleBn: 'বর্ষা ভাঙার আগে ধান ক্ষেত প্রস্তুত', kicker: 'Field notes', kickerBn: 'মাঠ নোট', read: '6 min', readBn: '৬ মিনিট', body: 'Drain standing water from seedbeds, check germination of stored seed, and stage urea for the first top-dress. Fields that are levelled now lose less nitrogen after the first heavy rain. Keep a 7-day weather window in mind before transplanting BR-28 and similar Aman lines.', bodyBn: 'বীজতলা থেকে দাঁড়ানো পানি সরান, মজুত বীজের অঙ্কুরোদগম দেখুন এবং প্রথম টপ-ড্রেসের ইউরিয়া প্রস্তুত রাখুন। এখন সমান করা জমিতে প্রথম ভারী বৃষ্টির পর নাইট্রোজেন কম হারায়। বিআর-২৮ ও অনুরূপ আমন লাইন রোপণের আগে সাত দিনের আবহাওয়া খেয়াল রাখুন।' },
  { id: 'a2', title: 'How to read a soil test without a lab degree', titleBn: 'ল্যাব ডিগ্রি ছাড়া মাটি পরীক্ষা পড়া', kicker: 'Soil', kickerBn: 'মাটি', read: '5 min', readBn: '৫ মিনিট', body: 'pH tells you whether phosphate will lock up. Organic matter tells you how well the soil holds water. If nitrogen is low but phosphorus is adequate, split urea instead of adding more DAP. Bring a sample from 0–15 cm, mix five spots, and keep it dry until drop-off.', bodyBn: 'পিএইচ বলে ফসফেট আটকে যাবে কি না। জৈব পদার্থ বলে মাটি কতটা পানি ধরে। নাইট্রোজেন কম কিন্তু ফসফরাস পর্যাপ্ত হলে আর ডিএপি না দিয়ে ইউরিয়া ভাগ করে দিন। ০–১৫ সেমি থেকে নমুনা নিন, পাঁচ জায়গা মেশান, জমা দেওয়া পর্যন্ত শুকনো রাখুন।' },
  { id: 'a3', title: 'Neem first, chemistry second', titleBn: 'আগে নিম, পরে রাসায়নিক', kicker: 'Crop care', kickerBn: 'ফসল পরিচর্যা', read: '4 min', readBn: '৪ মিনিট', body: 'Scout the underside of leaves twice a week. If whiteflies or aphids are just starting, a neem spray at dusk often holds them. Save synthetic products for outbreak thresholds — it protects beneficial insects and keeps residue lower at harvest.', bodyBn: 'সপ্তাহে দুবার পাতার নিচ দেখুন। সাদামাছি বা জাব পোকা শুরু হলে সন্ধ্যায় নিম স্প্রে প্রায়ই ধরে রাখে। প্রাদুর্ভাবের সীমায় না পৌঁছালে কৃত্রিম ওষুধ রাখুন — উপকারী পোকা বাঁচে এবং ফসলে অবশিষ্টাংশ কম থাকে।' },
  { id: 'a4', title: 'Drip vs flood: a cost picture for 1 bigha', titleBn: 'ড্রিপ বনাম বন্যা সেচ: এক বিঘার খরচ', kicker: 'Water', kickerBn: 'পানি', read: '7 min', readBn: '৭ মিনিট', body: 'A starter drip kit costs more on day one, but diesel hours drop fast on vegetable beds. For paddy, flood still wins. For tomato, chilli and gourd, drip pays back within two seasons if water is pumped.', bodyBn: 'স্টার্টার ড্রিপ কিট প্রথম দিনে বেশি খরচ, কিন্তু সবজি বেডে ডিজেল ঘণ্টা দ্রুত কমে। ধানের জন্য বন্যা সেচ এখনও জিত। টমেটো, মরিচ ও লাউয়ে পাম্প করলে দুই মৌসুমে ড্রিপ খরচ উঠে আসে।' },
]

export const faqs = [
  { q: 'Which districts do you deliver to?', qBn: 'কোন জেলায় ডেলিভারি হয়?', a: 'We deliver to all 64 districts. Dhaka, Chattogram, Rajshahi, Khulna and Sylhet metro orders usually arrive in 24–48 hours. Remote upazilas take 3–5 days.', aBn: 'আমরা ৬৪ জেলায় পৌঁছাই। ঢাকা, চট্টগ্রাম, রাজশাহী, খুলনা ও সিলেট মেট্রো অর্ডার সাধারণত ২৪–৪৮ ঘণ্টায় পৌঁছায়। দূরবর্তী উপজেলায় ৩–৫ দিন লাগে।' },
  { q: 'Are fertilizers government-authorized?', qBn: 'সার কি সরকার অনুমোদিত?', a: 'Yes. Urea, DAP and TSP listed as BCIC Authorized are sourced through licensed dealers. Each bag carries a batch mark you can share with support if you need verification.', aBn: 'হ্যাঁ। বিসিআইসি অনুমোদিত ইউরিয়া, ডিএপি ও টিএসপি লাইসেন্সপ্রাপ্ত ডিলারের মাধ্যমে আসে। প্রতি বস্তায় ব্যাচ মার্ক থাকে, যাচাইয়ের জন্য সাপোর্টে পাঠাতে পারেন।' },
  { q: 'Can I pay with bKash or Nagad?', qBn: 'বিকাশ বা নগদে পরিশোধ করা যায়?', a: 'Yes. Checkout supports bKash, Nagad, cards and cash on delivery for orders under ৳15,000.', aBn: 'হ্যাঁ। ১৫,০০০ টাকার নিচের অর্ডারে বিকাশ, নগদ, কার্ড ও ক্যাশ অন ডেলিভারি চলে।' },
  { q: 'How do agronomist calls work?', qBn: 'কৃষিবিদ কল কীভাবে কাজ করে?', a: 'Book a slot from Services. An agronomist calls within one working day. Keep photos of the crop, a recent soil test if you have one, and your union name ready.', aBn: 'সেবা পাতা থেকে সময় বুক করুন। এক কর্মদিবসের মধ্যে কৃষিবিদ কল করেন। ফসলের ছবি, থাকলে সাম্প্রতিক মাটি পরীক্ষা এবং ইউনিয়নের নাম প্রস্তুত রাখুন।' },
  { q: 'What is the return window?', qBn: 'ফেরতের সময়সীমা কত?', a: 'Unopened seed, feed and equipment can be returned within 7 days. Opened fertilizer and pesticide cannot be returned for safety reasons.', aBn: 'না খোলা বীজ, খাদ্য ও যন্ত্র ৭ দিনের মধ্যে ফেরত যায়। নিরাপত্তার কারণে খোলা সার ও কীটনাশক ফেরত নেওয়া হয় না।' },
]

export const tickerRow = [
  { label: 'Paddy (Coarse)', labelBn: 'মোটা ধান', price: '৳1,180 /40kg', priceBn: '৳১,১৮০ /৪০কেজি', delta: 2.1 },
  { label: 'Urea', labelBn: 'ইউরিয়া', price: '৳1,180 /50kg', priceBn: '৳১,১৮০ /৫০কেজি', delta: 0 },
  { label: 'Onion', labelBn: 'পেঁয়াজ', price: '৳45 /kg', priceBn: '৳৪৫ /কেজি', delta: -1.2 },
  { label: 'Hybrid Maize', labelBn: 'হাইব্রিড ভুট্টা', price: '৳1,340 /40kg', priceBn: '৳১,৩৪০ /৪০কেজি', delta: 3.4 },
  { label: 'Fish Feed (Floating)', labelBn: 'ভাসমান মাছের খাবার', price: '৳58 /kg', priceBn: '৳৫৮ /কেজি', delta: 0.8 },
  { label: 'TSP Fertilizer', labelBn: 'টিএসপি সার', price: '৳1,450 /50kg', priceBn: '৳১,৪৫০ /৫০কেজি', delta: -0.6 },
  { label: 'Potato', labelBn: 'আলু', price: '৳28 /kg', priceBn: '৳২৮ /কেজি', delta: 1.5 },
]

export const farmServices = [
  { id: 'crop', title: 'Crop Diagnosis', titleBn: 'ফসল রোগ নির্ণয়', note: 'Photo-led diagnosis from a licensed agronomist within one working day.', noteBn: 'এক কর্মদিবসের মধ্যে লাইসেন্সপ্রাপ্ত কৃষিবিদের ছবিভিত্তিক নির্ণয়।', fee: 350, icon: '01' },
  { id: 'soil', title: 'Soil Testing', titleBn: 'মাটি পরীক্ষা', note: 'Drop a mixed 0–15 cm sample. pH, NPK and organic matter in 72 hours.', noteBn: '০–১৫ সেমি মিশ্র নমুনা দিন। ৭২ ঘণ্টায় পিএইচ, এনপিকে ও জৈব পদার্থ।', fee: 650, icon: '02' },
  { id: 'call', title: 'Talk to an Agronomist', titleBn: 'কৃষিবিদের সাথে কথা', note: 'A 20-minute call timed to your crop stage and union weather.', noteBn: 'আপনার ফসলের পর্যায় ও ইউনিয়নের আবহাওয়া অনুযায়ী ২০ মিনিটের কল।', fee: 200, icon: '03' },
  { id: 'visit', title: 'Farm Visit', titleBn: 'খামার পরিদর্শন', note: 'On-field walkthrough for plots within 40 km of a regional desk.', noteBn: 'আঞ্চলিক ডেস্কের ৪০ কিমির মধ্যে জমিতে সরেজমিন পরিদর্শন।', fee: 1800, icon: '04' },
]

export const districts = ['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barishal', 'Rangpur', 'Mymensingh', 'Cumilla', 'Gazipur', 'Narayanganj', 'Bogura']
export const districtsBn: Record<string, string> = {
  Dhaka: 'ঢাকা', Chattogram: 'চট্টগ্রাম', Rajshahi: 'রাজশাহী', Khulna: 'খুলনা', Sylhet: 'সিলেট',
  Barishal: 'বরিশাল', Rangpur: 'রংপুর', Mymensingh: 'ময়মনসিংহ', Cumilla: 'কুমিল্লা',
  Gazipur: 'গাজীপুর', Narayanganj: 'নারায়ণগঞ্জ', Bogura: 'বগুড়া', Natore: 'নাটোর',
}

export const sampleOrders = [
  { id: 'AMC-24091', date: '28 Aug 2026', dateBn: '২৮ অগাস্ট ২০২৬', status: 'In transit', district: 'Rajshahi', total: 2630, items: 'Urea 50kg · Neem Bio', itemsBn: 'ইউরিয়া ৫০ কেজি · নিম বায়ো' },
  { id: 'AMC-23902', date: '12 Aug 2026', dateBn: '১২ অগাস্ট ২০২৬', status: 'Delivered', district: 'Rajshahi', total: 1240, items: 'Rice Seeds BR-28', itemsBn: 'ধান বীজ বিআর-২৮' },
  { id: 'AMC-23110', date: '02 Jul 2026', dateBn: '০২ জুলাই ২০২৬', status: 'Delivered', district: 'Natore', total: 850, items: 'Hybrid Tomato Seeds', itemsBn: 'হাইব্রিড টমেটো বীজ' },
]

export const sampleNotes = [
  { id: 'n1', title: 'Van left the Rajshahi desk', titleBn: 'রাজশাহী ডেস্ক থেকে ভ্যান বেরিয়েছে', body: 'Order AMC-24091 is on the Natore road. Expected tomorrow before noon.', bodyBn: 'অর্ডার AMC-24091 নাটোর সড়কে আছে। আগামীকাল দুপুরের আগে পৌঁছানোর কথা।', time: '2h ago', timeBn: '২ ঘণ্টা আগে', unread: true },
  { id: 'n2', title: 'Urea restocked', titleBn: 'ইউরিয়া স্টক হয়েছে', body: 'BCIC authorized urea is back in 50kg bags across the northern desk.', bodyBn: 'উত্তর ডেস্কে বিসিআইসি অনুমোদিত ইউরিয়া ৫০ কেজি বস্তায় ফিরেছে।', time: 'Yesterday', timeBn: 'গতকাল', unread: true },
  { id: 'n3', title: 'Soil test ready', titleBn: 'মাটি পরীক্ষা প্রস্তুত', body: 'Sample ST-441 is ready for pickup. pH 6.2, nitrogen moderate.', bodyBn: 'নমুনা ST-441 নেওয়ার জন্য প্রস্তুত। পিএইচ ৬.২, নাইট্রোজেন মাঝারি।', time: '3 days ago', timeBn: '৩ দিন আগে', unread: false },
]

export const topicKeys = ['Delivery', 'Product quality', 'Payment', 'Service booking'] as const
export const payKeys = ['bKash', 'Nagad', 'Card', 'Cash on delivery'] as const
