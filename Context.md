# PROJE BAĞLAMI: Müjde Doenyas - Digital Piano Salon

**Tarih:** 06-04-2026
**Durum:** Geliştirme Aşamasında (Digital Piano Salon / Portfolio)

## 1. Proje Özeti ve Amacı

Bu proje Müjde Doenyas'ın piyano hobisini sergilemek, izleyici kitlesiyle etkileşim kurmak (şarkı istekleri ve oylamalar) ve performanslarını prestijli bir "Gilded Gallery" temasıyla sunmak amacıyla tasarlanmıştır. Projenin temel amacı, piyano performanslarının izlenme sayılarını artırmak, "Digital Piano Salon" konseptiyle seçkin bir dijital deneyim sunmak ve topluluk etkileşimini (Poll & Request) teşvik etmektir.

## 2. Teknik Stack (Teknoloji Yığını)
* **Frontend:** React 18 (Vite), Tailwind CSS, Framer Motion, TypeScript/JavaScript
* **Backend / API:** Vercel Serverless Functions (`/api/` dizini), Axios
* **Kütüphaneler:** Lucide-React, Phosphor Icons, react-i18next (Çoklu Dil), react-helmet-async (SEO)
* **Tasarım:** "Gilded Gallery" (Gece mavisi, fildişi, altın aksanlar), Playfair Display Tipografisi
* **Araçlar:** Vercel (Deployment), ESLint, PostCSS

## 3. Tamamlanan Kritik İşler (Geçmiş)
* Proje temelleri (Vite/React) ve "Gilded Gallery" tasarım sistemi kuruldu.
* Çoklu dil desteği (Türkçe, İngilizce, İtalyanca) ve otomatik dil tespiti eklendi.
* Sayfa bölümleri (Hero, Bio, Archive, Choice/Poll, Request Form, Footer) geliştirildi.
* Performans Arşivi (YouTube Video Gallery) ve Poll (Voting) modülleri tasarlanıp eklendi.
* SEO optimizasyonu, JSON-LD schema verileri ve mobil uyumluluk (Responsive) sağlandı.

## 4. Mevcut Sorunlar ve Üstünde Çalışılan Konular
* **Bug/Hata:** Formların Vercel API endpointleri ile tam stabilizasyonu.
* **Bekleyen Özellik:** Poll sonuçlarının kalıcı olarak saklanması (LocalStorage veya basit DB entegrasyonu).
* **Optimizasyon:** Performans Arşivi'ndeki videoların lazy-loading ve mobildeki yüklenme performansının iyileştirilmesi.

## 5. Yazım Standartları ve Tercihler
* Kodlar Vite ve ESLint standartlarına uygun, temiz React pratikleriyle yazılmalı.
* Değişkenlerde camelCase, bileşen isimlerinde PascalCase tercih edilmeli.
* Global stil yönetimi Tailwind CSS ve `index.css` üzerinden yapılmalı.
* Hata yönetimi (Error Handling) (`try-catch` blokları ve Sonner toast bildirimleri) her zaman uygulanmalı.
