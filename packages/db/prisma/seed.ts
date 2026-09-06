import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

const prisma = new PrismaClient();

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const categories = [
  { name: "Nuts", slug: "nuts", description: "Premium almonds, cashews, pistachios and more", displayOrder: 1 },
  { name: "Dried Fruits", slug: "dried-fruits", description: "Naturally dried fruits packed with flavour", displayOrder: 2 },
  { name: "Spices", slug: "spices", description: "Fresh aromatic spices — available on demand", displayOrder: 3 },
  { name: "Healthy Snacks", slug: "healthy-snacks", description: "Seeds and wholesome everyday snacks", displayOrder: 4 },
  { name: "Premium Nuts & Fruits", slug: "premium-nuts-and-fruits", description: "Rare and gourmet selections", displayOrder: 5 },
];

type SeedProduct = {
  name: string;
  description: string;
  pricePerKg: number;
  imageUrl: string;
  categorySlug: string;
  inStock: boolean;
  alternateNames: string[];
  onDemand?: boolean;
  hidden?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  isTrending?: boolean;
  isNewArrival?: boolean;
  isPremium?: boolean;
};

const products: SeedProduct[] = [
  { name: "Almond Regular", description: "Badam", pricePerKg: 1050, imageUrl: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRsRlJIPs9At8zhCRlNNAwJUtm6EQGCuknVC_OEOGNRt71xRjDdbtBuDupvATusHqgAMVHGmJlm-gG-yGsrXoSMEMmzFK4dVJZQ2771p2p-Y9T9Zj5quaIm", categorySlug: "nuts", inStock: true, alternateNames: ["badam", "baadam", "badum", "badma", "badem"], isBestSeller: true, isFeatured: true },
  { name: "Cashew 210", description: "Kaju", pricePerKg: 1400, imageUrl: "https://royalfantasy.in/cdn/shop/products/Cashew-Nuts-Jumbo-1.jpg?v=1627469989", categorySlug: "nuts", inStock: true, alternateNames: ["cashew", "kaju", "kaju 210", "cashew 210", "kajoo"], isBestSeller: true, isFeatured: true },
  { name: "Irani Pista (without shell)", description: "Irani Pista (pholela)", pricePerKg: 2700, imageUrl: "https://5.imimg.com/data5/SELLER/Default/2025/7/527530488/KH/KX/JA/234594437/pista-irani-plain-without-shell-500x500.jpg", categorySlug: "nuts", inStock: true, alternateNames: ["pista", "pistachio", "irani pista", "pistachio without shell", "pistoo"], isPremium: true, isTrending: true },
  { name: "Walnuts with Shell", description: "Akharot Walnuts with Shell", pricePerKg: 1000, imageUrl: "https://nileshsupermarket.com/wp-content/uploads/2022/07/akrot-whole.jpg", categorySlug: "nuts", inStock: true, alternateNames: ["walnut", "akhrot", "walnuts", "walnut with shell", "akrot"], isFeatured: true },
  { name: "Green Russian Raisins", description: "Kishmish", pricePerKg: 600, imageUrl: "https://thespicesonline.com/wp-content/uploads/2020/08/Yellow-Kismis.jpg", categorySlug: "nuts", inStock: true, alternateNames: ["green raisin", "kishmish", "green russian raisin", "kishmish green", "green raisns"], isBestSeller: true },
  { name: "Big Dry Figs (Anjeer)", description: "Anjeer", pricePerKg: 2600, imageUrl: "https://shaktidryfruits.com/cdn/shop/files/anjeer_big.jpg?v=1745670150", categorySlug: "nuts", inStock: true, alternateNames: ["anjeer", "fig", "dry fig", "big anjeer", "anjir"], isPremium: true },
  { name: "Almond Flakes (Badam Tukda)", description: "Almond Flakes", pricePerKg: 1000, imageUrl: "https://www.govindjee.store/cdn/shop/files/almond-flakes-badam-cutting-6769850.png?v=1766585356", categorySlug: "nuts", inStock: true, alternateNames: ["almond", "badam", "almond flakes", "baadam", "badum"] },
  { name: "Almond Mamra", description: "Almond Mamra", pricePerKg: 4000, imageUrl: "https://royalfantasy.in/cdn/shop/products/Almond-Mamra-Jumbo-1.jpg?v=1627547263", categorySlug: "nuts", inStock: true, alternateNames: ["almond mamra", "mamra", "badam mamra", "baadam mamra", "badum mamra"], isPremium: true, isFeatured: true },
  { name: "Almond Jumbo (Badam Jambo)", description: "Almond Jumbo", pricePerKg: 1200, imageUrl: "https://in.cherrypick.city/cdn/shop/files/JumboAlmonds_Badam_1024x1024@2x.jpg?v=1703911692", categorySlug: "nuts", inStock: true, alternateNames: ["almond jumbo", "jumbo almond", "badam jumbo", "baadam jumbo", "big almond"], isNewArrival: true },
  { name: "Almond Roasted", description: "Almond Roasted", pricePerKg: 1350, imageUrl: "https://farmonics.co.in/cdn/shop/products/Roasted-Almonds-Farmonics.jpg?v=1723873332&width=1445", categorySlug: "nuts", inStock: true, alternateNames: ["roasted almond", "almond roasted", "bhuna badam", "bhuna baadam", "bhuna almond"], isTrending: true },
  { name: "Cashew 240", description: "Cashew 240", pricePerKg: 1200, imageUrl: "https://jammubasket.com/images/products/148_cashew-nut-sw-240-250-gm-0e51558df1985bfa7e40ce291f1bad6c.jpeg", categorySlug: "nuts", inStock: true, alternateNames: ["cashew 240", "kaju 240", "cashew", "kajoo", "kaju"] },
  { name: "Cashew 320", description: "Cashew 320", pricePerKg: 1000, imageUrl: "https://royalfantasy.in/cdn/shop/products/Cashew-Nuts-Medium-1.jpg?v=1627471405", categorySlug: "nuts", inStock: true, alternateNames: ["cashew 320", "kaju 320", "cashew", "kajoo", "kaju"] },
  { name: "Cashew Split/2 pc", description: "Cashew Split/2 pc", pricePerKg: 1000, imageUrl: "https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQtYeqs0hhLN3whQWNY_yprrMdzLtZvkwcPBN2_oRXIny4X-e9H8Zot_XMPMiqp4B1LVh1OeNpLjN_c1tDkGaLT8O6pQcg38AOHG3QrADp-", categorySlug: "nuts", inStock: true, alternateNames: ["cashew split", "kaju split", "cashew 2 pc", "kajoo split", "kaju"] },
  { name: "Cashew 4 pc/Broken", description: "Cashew 4 pc/Broken", pricePerKg: 900, imageUrl: "https://www.taazashahimewa.com/assets/product/large/product_14_1775.jpg", categorySlug: "nuts", inStock: true, alternateNames: ["cashew 4 pc", "cashew broken", "kaju 4 pc", "broken cashew", "kajoo"] },
  { name: "Cashew Roasted", description: "Cashew Roasted", pricePerKg: 1450, imageUrl: "https://www.nuskhakitchen.com/public/img/uploads/products/28921693204616.jpeg", categorySlug: "nuts", inStock: true, alternateNames: ["roasted cashew", "cashew roasted", "bhuna kaju", "bhuna cashew", "kajoo bhuna"], isTrending: true },
  { name: "Walnut 2 pc", description: "Akharot 2 pc", pricePerKg: 2000, imageUrl: "https://5.imimg.com/data5/SELLER/Default/2023/7/325372548/HU/MH/TW/88400203/kashmiri-walnut-kernels-2pc.jpg", categorySlug: "nuts", inStock: true, alternateNames: ["walnut 2 pc", "walnuts 2", "akhrot 2", "2 pcs walnut", "akrot 2"] },
  { name: "Walnuts 4 pc", description: "Akharot 4 pc", pricePerKg: 800, imageUrl: "https://cdn.dotpe.in/longtail/store-items/6211649/cnTqAFFH.jpeg", categorySlug: "nuts", inStock: true, alternateNames: ["walnuts 4 pc", "walnut 4", "akhrot 4", "4 pcs walnut", "akrot 4"] },
  { name: "Roasted Pista Jumbo (with shell)", description: "Roasted Pista Jumbo (with shell)", pricePerKg: 1700, imageUrl: "https://wholesaledryfruits.in/wp-content/uploads/2024/07/pista-royal-akhbari-1.jpg", categorySlug: "nuts", inStock: true, alternateNames: ["roasted pista jumbo", "pistachio jumbo", "bhuna pista", "bhuna pistachio", "pista with shell"], isNewArrival: true },
  { name: "Pista Flakes", description: "Pista Flakes", pricePerKg: 2700, imageUrl: "https://m.media-amazon.com/images/I/81kkLqvPLhL._AC_UF350,350_QL80_.jpg", categorySlug: "nuts", inStock: true, alternateNames: ["pista flakes", "pistachio flakes", "pista flake", "pistachio flake", "pistoo flakes"], isPremium: true },
  { name: "Black Raisins Jumbo", description: "Black Raisins(Black Kishmish)", pricePerKg: 1000, imageUrl: "https://healthymaster.in/cdn/shop/products/621f52ad3bd39.jpg?v=1747120317&width=1200", categorySlug: "nuts", inStock: true, alternateNames: ["black raisins", "kishmish", "black kishmish", "raisin black", "black raisn"] },
  { name: "Hazelnuts", description: "Hazelnuts", pricePerKg: 2700, imageUrl: "https://cdn.shopaccino.com/adfs/products/hazelnuts-338732_l.jpg?v=608", categorySlug: "nuts", inStock: true, alternateNames: ["hazelnuts", "hazel nuts", "hazel", "hazelnut", "hazel nut"], isPremium: true },
  { name: "Apricot", description: "Jaradalu", pricePerKg: 1000, imageUrl: "https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcTEmJGCoSh5UoW7MoZU3ydHbcqU7EfyssLfzTzJGRA6VeJ9KQKO_WP4P9N9Hlv38XXvI177HonerZ6R0LBbN16xtbUR97JVJVPgcELhYC6Ka8eUr5tNfRvSoA", categorySlug: "dried-fruits", inStock: true, alternateNames: ["apricot", "dried apricot", "aprikot", "aprikot dry", "apricot dry"], isFeatured: true },
  { name: "Mejdool Dates", description: "Khajur", pricePerKg: 1400, imageUrl: "https://www.aishcart.in/3953-large_default/medjool-dates-1kg.jpg", categorySlug: "dried-fruits", inStock: true, alternateNames: ["medjool dates", "mejdool dates", "dates medjool", "dates mejdool", "medjool"], isBestSeller: true },
  { name: "Regular Dates", description: "Regular Khajur", pricePerKg: 500, imageUrl: "https://m.media-amazon.com/images/I/41czl5557UL._AC_UF894,1000_QL80_.jpg", categorySlug: "dried-fruits", inStock: true, alternateNames: ["regular dates", "dates", "normal dates", "red dates", "reg dates"] },
  { name: "Dried Kiwi", description: "Dried Kiwi", pricePerKg: 600, imageUrl: "https://m.media-amazon.com/images/I/41QLkVsh4YL.jpg", categorySlug: "dried-fruits", inStock: true, alternateNames: ["dried kiwi", "kiwi dry", "dry kiwi", "dried kiwifruit", "kiwi fruit"] },
  { name: "Dried Mix Fruits", description: "Dried Mix Fruits", pricePerKg: 800, imageUrl: "https://shreejifoods.in/cdn/shop/products/Dried-mixed-fruits.jpg?v=1616404516", categorySlug: "dried-fruits", inStock: true, alternateNames: ["dried mix fruits", "mixed dry fruits", "dry fruit mix", "dry fruits", "fruit mix"], isTrending: true },
  { name: "Dried Cherry", description: "Dried Cherry", pricePerKg: 800, imageUrl: "https://m.media-amazon.com/images/I/81+jjxm0jrL.jpg", categorySlug: "dried-fruits", inStock: true, alternateNames: ["dried cherry", "cherry dry", "dry cherry", "cherries", "cherry fruit"] },
  { name: "Dried Cranberry", description: "Dried Cranberry", pricePerKg: 700, imageUrl: "https://cdn.shopaccino.com/adfs/products/dry-cranberry-733428_m.jpg?v=610", categorySlug: "dried-fruits", inStock: true, alternateNames: ["dried cranberry", "cranberry dry", "dry cranberry", "cranberries", "cranberry fruit"] },
  { name: "Cardamom", description: "Elaichi *on demand price", pricePerKg: 1, imageUrl: "https://m.media-amazon.com/images/I/61CtcUkkVqL._UF1000,1000_QL80_.jpg", categorySlug: "spices", inStock: false, alternateNames: ["cardamom", "elaichi", "green cardamom", "elaichi green", "cardamom pods"], onDemand: true, hidden: true },
  { name: "Kashmiri Red Chilli Powder", description: "Kashmiri red chilli powder", pricePerKg: 1, imageUrl: "https://www.consciousfood.com/cdn/shop/files/kashmiriredchilli4_1ba4ee8f-5b33-43ba-9ddc-8430dbf4bca6.jpg?v=1691132812&width=1445", categorySlug: "spices", inStock: false, alternateNames: ["kashmiri red chilli powder", "kashmiri chilli", "kashmiri lal mirch", "red chilli powder", "kashmiri mirch"], onDemand: true, hidden: true },
  { name: "Reshampatti Red Chilli Powder", description: "Reshampatti Red Chilli Powder", pricePerKg: 1, imageUrl: "https://www.thakkarbros.com/wp-content/uploads/2021/08/Reshampatti-Red-CHilly-Powder-1.png", categorySlug: "spices", inStock: false, alternateNames: ["reshampatti red chilli powder", "reshampatti chilli", "reshampatti mirch", "red chilli powder", "reshampatti lal mirch"], onDemand: true, hidden: true },
  { name: "Spicy Red Chilli Powder", description: "Spicy Red Chilli Powder", pricePerKg: 1, imageUrl: "https://www.suncityspices.com/wp-content/uploads/2020/10/super-hot-chilli-powder.jpg", categorySlug: "spices", inStock: false, alternateNames: ["spicy red chilli powder", "spicy chilli", "spicy lal mirch", "hot red chilli", "red chilli powder"], onDemand: true, hidden: true },
  { name: "Cumin Whole (jeera)", description: "Cumin Whole (jeeru)", pricePerKg: 1, imageUrl: "https://satopradhan.com/cdn/shop/products/jeera-sabut-cumin-seeds-150g-natural-and-purely-organic-without-adulteration-satopradhan-1-20269176488086.jpg?v=1696574810", categorySlug: "spices", inStock: false, alternateNames: ["cumin whole", "jeera", "whole jeera", "jeera seeds", "cumin seeds"], onDemand: true, hidden: true },
  { name: "Coriander Cumin Powder (Dhana jeera)", description: "Coriander Cumin Powder(Dhana jeera)", pricePerKg: 1, imageUrl: "https://khuvi.com/cdn/shop/files/CorrienderCuminPowder.jpg?v=1727698421", categorySlug: "spices", inStock: false, alternateNames: ["coriander cumin powder", "dhana jeera", "coriander jeera", "coriander cumin", "dhana jeera powder"], onDemand: true, hidden: true },
  { name: "Turmeric Powder (Haldi)", description: "Turmeric Powder (Haldi)", pricePerKg: 1, imageUrl: "https://www.viralspices.com/wp-content/uploads/2024/11/Untitled-1-624x312.jpg", categorySlug: "spices", inStock: false, alternateNames: ["turmeric powder", "haldi", "haldi powder", "turmeric", "turmeric haldi"], onDemand: true, hidden: true },
  { name: "Makhana", description: "Makhana", pricePerKg: 1600, imageUrl: "https://www.dryfruitsgallery.com/wp-content/uploads/2024/07/Makhana-munchify.webp", categorySlug: "healthy-snacks", inStock: true, alternateNames: ["makhana", "fox nuts", "makhane", "phool makhana", "lotus seeds"], isBestSeller: true, isFeatured: true },
  { name: "Pumpkin Seeds", description: "Pumpkin Seeds", pricePerKg: 700, imageUrl: "https://d3kgrlupo77sg7.cloudfront.net/media/chococoorgspice.com/images/products/coorg-spices-pumpkin-seeds.20240409003525.webp", categorySlug: "healthy-snacks", inStock: true, alternateNames: ["pumpkin seeds", "kaddu ke beej", "pumpkin beej", "pumpkin kernels", "pumpkin"], isFeatured: true },
  { name: "Chia Seeds", description: "Chia Seeds", pricePerKg: 500, imageUrl: "https://assets.bonappetit.com/photos/57d6ce4f1844fc37461430ba/master/pass/chia-seeds.jpg", categorySlug: "healthy-snacks", inStock: true, alternateNames: ["chia seeds", "chia", "chia beej", "chia seeds dry", "salvia seeds"], isTrending: true },
  { name: "Sunflower Seeds", description: "Sunflower Seeds", pricePerKg: 400, imageUrl: "https://5.imimg.com/data5/SELLER/Default/2022/12/DT/FB/CC/126017160/sunflower.png", categorySlug: "healthy-snacks", inStock: true, alternateNames: ["sunflower seeds", "sunflower", "sunflower beej", "sunflower kernels", "surajmukhi beej"] },
  { name: "Macadamia", description: "Macadamia", pricePerKg: 3200, imageUrl: "https://www.afa.go.ke/wp-content/uploads/2024/10/macadamia-1.jpg", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["macadamia", "macadamia nuts", "macadam nuts", "mackadamia", "makadamia"], isPremium: true },
  { name: "Brazil Nuts", description: "Brazil Nuts", pricePerKg: 3800, imageUrl: "https://shreejifoods.in/cdn/shop/products/brazil-nut-main_1200x1200_2ee63114-ae8e-40e8-9898-c8a1ff2acf8c.png?v=1616404334", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["brazil nuts", "brazil", "brazil nut", "brazil dry fruit", "brazils"], isPremium: true },
  { name: "Pine Nuts without Skin", description: "Pine Nuts without Skin", pricePerKg: 8000, imageUrl: "https://www.houseofrasda.com/cdn/shop/files/Pine_Nuts_without_Shell_Chilgoza_Giri_3.png?v=1744965001", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["pine nuts", "pine nuts without skin", "chilgoza", "pine kernels", "pinenuts"], isPremium: true },
  { name: "Dried Blueberry", description: "Dried Blueberry", pricePerKg: 1800, imageUrl: "https://cdn.shopaccino.com/adfs/products/dry-blueberry-957750_l.jpg?v=608", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["dried blueberry", "blueberry", "dry blueberry", "bluberry", "blue berries"], isPremium: true },
  { name: "Watermelon Seeds", description: "Watermelon Seeds", pricePerKg: 700, imageUrl: "https://www.taazashahimewa.com/assets/product/large/product_142_1867.jpg", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["watermelon seeds", "tarbooj beej", "watermelon beej", "melon seeds", "tarbooj seeds"] },
  { name: "Pecans", description: "Pecans", pricePerKg: 2400, imageUrl: "https://wholesaledryfruits.in/wp-content/uploads/2024/07/pecan-nuts-top-1.jpg", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["pecans", "pecan nuts", "pekan", "pecans dry fruit", "pekan nuts"], isPremium: true },
  { name: "Prunes", description: "Prunes", pricePerKg: 900, imageUrl: "https://m.media-amazon.com/images/I/41oPu5ZGTAL.jpg", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["prunes", "dried plums", "prune", "prun", "plums dry"] },
  { name: "Masala Cranberry", description: "Masala Cranberry", pricePerKg: 800, imageUrl: "https://5.imimg.com/data5/SELLER/Default/2021/1/RS/IP/YH/119119356/masala-cranberry-by-goosebumps-.jpg", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["masala cranberry", "spicy cranberry", "masala cran", "cranberry masala", "masala dry cran"], isNewArrival: true },
  { name: "Chilli Lemon Guava", description: "Chilli Lemon Guava", pricePerKg: 900, imageUrl: "https://jagsfresh-bucket.s3.amazonaws.com/media/package/img_one/2020-12-18/Guava_-_Dried.jpg", categorySlug: "premium-nuts-and-fruits", inStock: false, alternateNames: ["chilli lemon guava", "chilli lemon", "spicy guava", "lemon guava", "mirchi lemon guava"] },
  { name: "Sweet and Sour Raisins", description: "Sweet and Sour Raisins", pricePerKg: 700, imageUrl: "https://i.pinimg.com/736x/ce/75/0f/ce750fe9ec6036d4eb64522d79be9d52.jpg", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["sweet and sour raisins", "sweet sour raisin", "sweet & sour kishmish", "sweet & sour raisins", "sour sweet raisin"] },
  { name: "Black Pepper Walnuts", description: "Black Pepper Walnuts", pricePerKg: 2000, imageUrl: "https://bhavnagaris.com/cdn/shop/products/walnut-bowl-down-1_1_large.jpg?v=1621927404", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["black pepper walnuts", "pepper walnuts", "black pepper akhrot", "black pepper walnut", "akrot pepper"], isTrending: true },
  { name: "Coco-Almond mint Freshener.", description: "Coco-Almond mint Freshener.", pricePerKg: 1800, imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/No_image_available.svg/960px-No_image_available.svg.png", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["coco-almond mint freshener", "coco almond mint", "coconut almond mint", "coco almond freshener", "almond mint"] },
  { name: "Dark chocolate Nuts, Seeds and Berries Mix", description: "Dark chocolate Nuts, Seeds and Berries Mix", pricePerKg: 1300, imageUrl: "https://i.redd.it/z1czeaol3yh71.jpg", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["dark chocolate mix", "chocolate nuts seeds berries", "dark choco mix", "choco nuts berries", "dark chocolate nuts"], isFeatured: true },
  { name: "Flavoured Almond Flakes", description: "Flavoured Almond Flakes", pricePerKg: 1100, imageUrl: "https://wicked-gourmet.in/cdn/shop/files/IMG_5497_Large_9a4d5b97-7e87-4a89-b2ee-b79590bb8306.jpg?v=1712898391&width=1400", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["flavoured almond flakes", "flavoured badam flakes", "almond flakes flavored", "badam flakes flavored", "flavoured almonds"], isNewArrival: true },
  { name: "Flavoured Almonds", description: "Flavoured Almonds", pricePerKg: 1300, imageUrl: "https://manamchocolate.com/cdn/shop/files/1_caf6c3dc-fd44-44e9-bade-b658a1ff2acf8c.jpg?v=1735311341", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["flavoured almonds", "flavoured badam", "badam flavored", "almond flavored", "flavored almonds"] },
  { name: "Flavoured Cashews", description: "Flavoured Cashews", pricePerKg: 1500, imageUrl: "https://5.imimg.com/data5/SELLER/Default/2022/5/NE/JH/BJ/152317219/flavored-cashew-png-500x500.png", categorySlug: "premium-nuts-and-fruits", inStock: true, alternateNames: ["flavoured cashews", "flavoured kaju", "kaju flavored", "cashew flavored", "flavoured cashew"], isTrending: true },
];

async function main() {
  console.log("Seeding MyDryFruits…");

  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.bulkInquiry.deleteMany();
  await prisma.collectionItem.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.review.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.homepageSection.deleteMany();
  await prisma.emailTemplate.deleteMany();
  await prisma.siteSetting.deleteMany();
  await prisma.seoPage.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.newsletterSubscriber.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.analyticsEvent.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.admin.deleteMany();

  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || "Admin@12345", 10);
  await prisma.admin.create({
    data: {
      email: process.env.ADMIN_EMAIL || "admin@dhruvmodi.online",
      passwordHash,
      name: "MyDryFruits Admin",
    },
  });

  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const created = await prisma.category.create({ data: cat });
    categoryMap.set(cat.slug, created.id);
  }

  const createdProducts: { id: string; slug: string; name: string }[] = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const categoryId = categoryMap.get(p.categorySlug)!;
    const slug = slugify(p.name);
    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        description: p.description,
        localName: p.description,
        pricePerKg: p.pricePerKg,
        imageUrl: p.imageUrl,
        alternateNames: JSON.stringify(p.alternateNames),
        categoryId,
        inStock: p.inStock,
        onDemand: p.onDemand ?? false,
        hidden: p.hidden ?? false,
        isFeatured: p.isFeatured ?? false,
        isBestSeller: p.isBestSeller ?? false,
        isTrending: p.isTrending ?? false,
        isNewArrival: p.isNewArrival ?? false,
        isPremium: p.isPremium ?? false,
        displayOrder: i,
        benefits: getBenefits(p.name),
        storageTips: "Store in an airtight container in a cool, dry place away from direct sunlight.",
        origin: "India / Imported Premium",
        shelfLife: "6–12 months (best before date on pack)",
        nutrition: { calories: "Varies", protein: "High", fiber: "Good source" },
        images: {
          create: [{ url: p.imageUrl, alt: p.name, sortOrder: 0 }],
        },
      },
    });
    createdProducts.push({ id: created.id, slug: created.slug, name: created.name });
  }

  for (const cat of categories) {
    const count = await prisma.product.count({
      where: { categoryId: categoryMap.get(cat.slug)!, hidden: false },
    });
    await prisma.category.update({
      where: { id: categoryMap.get(cat.slug)! },
      data: { productCount: count },
    });
  }

  const byName = (n: string) => createdProducts.find((p) => p.name === n);

  const collections = [
    {
      name: "Brain Booster Pack",
      slug: "brain-booster-pack",
      description: "Almonds, walnuts and pumpkin seeds — curated for focus and memory.",
      benefitTag: "Brain Health",
      items: [
        { name: "Almond Regular", weightGrams: 250 },
        { name: "Walnut 2 pc", weightGrams: 250 },
        { name: "Pumpkin Seeds", weightGrams: 200 },
      ],
    },
    {
      name: "Kids Nutrition Pack",
      slug: "kids-nutrition-pack",
      description: "A tasty mix of dates, raisins and makhana for growing kids.",
      benefitTag: "Kids",
      items: [
        { name: "Mejdool Dates", weightGrams: 250 },
        { name: "Green Russian Raisins", weightGrams: 250 },
        { name: "Makhana", weightGrams: 200 },
      ],
    },
    {
      name: "Heart Health Pack",
      slug: "heart-health-pack",
      description: "Walnuts, almonds and chia for everyday heart-friendly snacking.",
      benefitTag: "Heart",
      items: [
        { name: "Walnuts with Shell", weightGrams: 500 },
        { name: "Almond Regular", weightGrams: 250 },
        { name: "Chia Seeds", weightGrams: 200 },
      ],
    },
    {
      name: "Gym Protein Pack",
      slug: "gym-protein-pack",
      description: "Roasted nuts and seeds packed with plant protein.",
      benefitTag: "Fitness",
      items: [
        { name: "Cashew Roasted", weightGrams: 250 },
        { name: "Almond Roasted", weightGrams: 250 },
        { name: "Pumpkin Seeds", weightGrams: 250 },
      ],
    },
    {
      name: "Dry Fruit Gift Box",
      slug: "dry-fruit-gift-box",
      description: "A premium assortment perfect for festivals and gifting.",
      benefitTag: "Gifting",
      items: [
        { name: "Cashew 210", weightGrams: 250 },
        { name: "Almond Jumbo (Badam Jambo)", weightGrams: 250 },
        { name: "Irani Pista (without shell)", weightGrams: 200 },
        { name: "Mejdool Dates", weightGrams: 250 },
      ],
    },
    {
      name: "Festival Combo Pack",
      slug: "festival-combo-pack",
      description: "Celebrate with premium dry fruits — ideal for Diwali & Raksha Bandhan.",
      benefitTag: "Festival",
      items: [
        { name: "Almond Mamra", weightGrams: 250 },
        { name: "Cashew 210", weightGrams: 250 },
        { name: "Big Dry Figs (Anjeer)", weightGrams: 250 },
      ],
    },
  ];

  for (let i = 0; i < collections.length; i++) {
    const c = collections[i];
    const created = await prisma.collection.create({
      data: {
        name: c.name,
        slug: c.slug,
        description: c.description,
        benefitTag: c.benefitTag,
        displayOrder: i,
        imageUrl: byName(c.items[0].name)?.slug
          ? products.find((p) => p.name === c.items[0].name)?.imageUrl
          : undefined,
      },
    });
    for (const item of c.items) {
      const prod = byName(item.name);
      if (!prod) continue;
      await prisma.collectionItem.create({
        data: {
          collectionId: created.id,
          productId: prod.id,
          weightGrams: item.weightGrams,
        },
      });
    }
  }

  await prisma.homepageSection.createMany({
    data: [
      {
        key: "hero",
        title: "Hero Banner",
        content: {
          headline: "Premium Dry Fruits Delivered Fresh",
          subheading: "100% Natural • Fresh Stock • Premium Quality",
          ctaPrimary: { label: "Shop Now", href: "/shop" },
          ctaSecondary: { label: "Explore Categories", href: "/shop#categories" },
          imageUrl: products[0].imageUrl,
        },
      },
      {
        key: "trust",
        title: "Why Choose Us",
        content: {
          items: [
            { title: "Fresh Every Week", text: "New stock rotated weekly for peak freshness." },
            { title: "Premium Quality", text: "Hand-selected nuts and dried fruits." },
            { title: "No Artificial Chemicals", text: "100% natural — nothing added." },
            { title: "Best Prices", text: "Family wholesale rates, delivered to you." },
            { title: "Fast Delivery", text: "Carefully packed and shipped quickly." },
            { title: "Family Business", text: "Trusted craftsmanship since decades." },
          ],
        },
      },
      {
        key: "seasonal",
        title: "Seasonal Offers",
        content: {
          banners: [
            { title: "Raksha Bandhan Special", subtitle: "Gift packs ready to ship", href: "/collections/festival-combo-pack", theme: "rakhi" },
            { title: "Diwali Gift Boxes", subtitle: "Premium dry fruit hampers", href: "/collections/dry-fruit-gift-box", theme: "diwali" },
            { title: "Winter Special", subtitle: "Warm up with wholesome nuts", href: "/shop?sort=popularity", theme: "winter" },
          ],
        },
      },
      {
        key: "benefits",
        title: "Healthy Benefits",
        content: {
          items: [
            { name: "Almond", benefit: "Good for Brain", productSlug: "almond-regular" },
            { name: "Walnuts", benefit: "Heart Health", productSlug: "walnuts-with-shell" },
            { name: "Dates", benefit: "Natural Energy", productSlug: "mejdool-dates" },
            { name: "Pistachios", benefit: "Protein Rich", productSlug: "irani-pista-without-shell" },
            { name: "Makhana", benefit: "Light & Filling", productSlug: "makhana" },
            { name: "Chia Seeds", benefit: "Omega-3 Boost", productSlug: "chia-seeds" },
          ],
        },
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      { customerName: "Priya Shah", rating: 5, comment: "Freshest almonds I've ordered online. Packaging was excellent.", productName: "Almond Regular", displayOrder: 1 },
      { customerName: "Rahul Mehta", rating: 5, comment: "Cashews are jumbo and delicious. Will order again for Diwali.", productName: "Cashew 210", displayOrder: 2 },
      { customerName: "Ananya Patel", rating: 5, comment: "The gift box looked premium. My family loved every item.", productName: "Dry Fruit Gift Box", displayOrder: 3 },
      { customerName: "Vikram Desai", rating: 4, comment: "Fast delivery and honest pricing. Makhana quality is top-notch.", productName: "Makhana", displayOrder: 4 },
    ],
  });

  await prisma.faq.createMany({
    data: [
      { question: "Do I need an account to order?", answer: "No. Checkout only needs your name, email and address — order in under 30 seconds.", displayOrder: 1 },
      { question: "How are prices calculated?", answer: "All products are priced per kilogram. Choose a weight (250g–4kg) and the total updates automatically.", displayOrder: 2 },
      { question: "Can I order more than 4kg?", answer: "Yes. Select Bulk Order on the product page and we'll email you a custom quote.", displayOrder: 3 },
      { question: "What is your delivery time?", answer: "Most orders are packed within 24–48 hours. Estimated delivery is shown at checkout.", displayOrder: 4 },
      { question: "Are your dry fruits natural?", answer: "Yes. We stock 100% natural dry fruits with no artificial chemicals.", displayOrder: 5 },
    ],
  });

  await prisma.emailTemplate.createMany({
    data: [
      {
        key: "order_confirmation",
        name: "Order Confirmation",
        subject: "Thank you for your order {{orderNumber}} — MyDryFruits",
        htmlBody: `<div style="font-family:Georgia,serif;color:#1a2e1a"><h1 style="color:#1B4332">Thank you, {{customerName}}!</h1><p>Your order <strong>{{orderNumber}}</strong> is confirmed.</p><p>Total: <strong>₹{{total}}</strong></p><p>{{itemsHtml}}</p><p>Estimated delivery: {{estimatedDelivery}}</p></div>`,
      },
      {
        key: "admin_order_notification",
        name: "Admin New Order",
        subject: "New order {{orderNumber}}",
        htmlBody: `<div style="font-family:Georgia,serif;color:#1a2e1a">
  <h2 style="color:#1B4332">New order {{orderNumber}}</h2>
  <p><strong>{{customerName}}</strong> · {{customerEmail}}</p>
  <p>{{address}}</p>
  <h3>Items</h3>
  {{itemsHtml}}
  <p>Subtotal: ₹{{subtotal}}<br/>Discount: ₹{{discount}}<br/>Delivery: ₹{{deliveryCharge}}<br/><strong>Total: ₹{{total}}</strong></p>
  {{viewOrderHtml}}
  <p style="margin-top:16px;font-size:13px;color:#555">Copy this summary:</p>
  <pre style="background:#f7f4ee;padding:12px;white-space:pre-wrap;font-size:12px">{{copySummary}}</pre>
</div>`,
      },
      {
        key: "invoice",
        name: "Invoice Email",
        subject: "Your MyDryFruits invoice for {{orderNumber}}",
        htmlBody: `<div style="font-family:Georgia,serif"><h1>Invoice attached</h1><p>Hi {{customerName}}, your PDF invoice for order {{orderNumber}} is attached.</p></div>`,
      },
      {
        key: "bulk_inquiry_ack",
        name: "Bulk Inquiry Acknowledgement",
        subject: "We received your bulk inquiry — MyDryFruits",
        htmlBody: `<div><p>Hi {{name}}, thanks for your inquiry about {{productName}} ({{requiredQuantity}}). We'll get back to you shortly.</p></div>`,
      },
      {
        key: "offer",
        name: "Offer Email",
        subject: "Special offer from MyDryFruits",
        htmlBody: `<div><h1>{{title}}</h1><p>{{body}}</p></div>`,
      },
      {
        key: "festival",
        name: "Festival Greeting",
        subject: "Festival wishes from MyDryFruits",
        htmlBody: `<div><h1>{{title}}</h1><p>{{body}}</p></div>`,
      },
    ],
  });

  await prisma.siteSetting.createMany({
    data: [
      {
        key: "business",
        value: {
          name: "MyDryFruits",
          tagline: "Premium Dry Fruits Delivered Fresh",
          email: process.env.ADMIN_EMAIL || "admin@dhruvmodi.online",
          phone: "",
          address: "Family Dry Fruit Store, India",
          gst: "",
          yearsInBusiness: 25,
          currency: "INR",
          deliveryCharge: 50,
          freeDeliveryAbove: 999,
          taxPercent: 0,
        },
      },
      {
        key: "social",
        value: { instagram: "", facebook: "", whatsapp: "" },
      },
      {
        key: "policies",
        value: {
          privacy: "We respect your privacy. Order details are used only to fulfil and support your purchase.",
          refund: "Please contact us within 48 hours of delivery for damaged or incorrect items. Perishable goods may have limited return eligibility.",
          terms: "By placing an order you agree to our pricing, delivery estimates and product availability at the time of packing.",
        },
      },
      {
        key: "about",
        value: {
          title: "About MyDryFruits",
          body: "MyDryFruits is a family-owned dry fruits and healthy foods business. We source premium nuts, dried fruits and wholesome snacks — fresh stock, honest prices, and packaging that protects every order.",
        },
      },
      {
        key: "branding",
        value: { faviconUrl: "" },
      },
      {
        key: "integrations",
        value: {
          sendgrid: { apiKey: "", fromEmail: "", fromName: "MyDryFruits" },
          sms: { enabled: false, provider: "msg91", apiKey: "", apiSecret: "", senderId: "" },
          whatsapp: { enabled: false, provider: "meta", apiKey: "", apiSecret: "", phoneNumberId: "" },
        },
      },
    ],
  });

  await prisma.seoPage.createMany({
    data: [
      { path: "/", title: "MyDryFruits — Premium Dry Fruits Delivered Fresh", description: "Shop premium almonds, cashews, pistachios, dates and healthy snacks. Fresh stock, natural quality, fast delivery.", keywords: "dry fruits, almonds, cashews, mydryfruits" },
      { path: "/shop", title: "Shop Dry Fruits | MyDryFruits", description: "Browse our full catalog of nuts, dried fruits, seeds and premium mixes.", keywords: "buy dry fruits online" },
      { path: "/about", title: "About Us | MyDryFruits", description: "Learn about our family dry fruits business and quality promise." },
      { path: "/contact", title: "Contact | MyDryFruits", description: "Get in touch with MyDryFruits for orders and bulk inquiries." },
    ],
  });

  await prisma.coupon.create({
    data: {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      minPurchase: 500,
      maxUses: 1000,
      active: true,
    },
  });

  console.log(`Seeded ${products.length} products, ${collections.length} collections.`);
}

function getBenefits(name: string) {
  const n = name.toLowerCase();
  if (n.includes("almond")) return "Rich in vitamin E and healthy fats. Supports brain function and skin health.";
  if (n.includes("walnut")) return "Excellent source of omega-3. Supports heart and brain health.";
  if (n.includes("cashew")) return "Creamy texture with magnesium and plant protein for everyday energy.";
  if (n.includes("pista") || n.includes("pistachio")) return "Protein-rich and satisfying — great for mindful snacking.";
  if (n.includes("date") || n.includes("khajur")) return "Natural energy and fibre. Perfect pre-workout or evening sweet.";
  if (n.includes("makhana")) return "Light, crunchy and low in calories — ideal healthy snack.";
  if (n.includes("chia")) return "Omega-3, fibre and plant protein in every spoonful.";
  return "Naturally nutritious dry fruit — enjoy as a snack or in recipes.";
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
