// Süresi dolan geçici bildirimleri (mobil radar, kontrol, kaza, doğa olayı)
// ve çok "yok" oyu alanları her 30 dakikada bir temizler.
// Not: Zamanlanmış fonksiyonlar Firebase "Blaze" (kullandıkça öde) planı ister.
// Bu fonksiyon olmadan da uygulama çalışır; süresi dolanları istemci zaten gizler.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp();

exports.cleanupHazards = onSchedule(
  { schedule: "every 30 minutes", region: "europe-west1" },
  async () => {
    const db = getFirestore();
    let removed = 0;

    // 1) Süresi dolanlar
    for (;;) {
      const snap = await db
        .collection("hazards")
        .where("expiresAt", "<", Timestamp.now())
        .limit(200)
        .get();
      if (snap.empty) break;
      await Promise.all(snap.docs.map((d) => db.recursiveDelete(d.ref)));
      removed += snap.size;
    }

    // 2) Kullanıcı bildirimi olup en az 5 "yok" oyu alan ve "var"dan 3 fazla olanlar
    const disputed = await db
      .collection("hazards")
      .where("source", "==", "user")
      .where("denials", ">=", 5)
      .get();
    for (const d of disputed.docs) {
      const { confirmations = 0, denials = 0 } = d.data();
      if (denials - confirmations >= 3) {
        await db.recursiveDelete(d.ref);
        removed++;
      }
    }

    console.log(`Temizlendi: ${removed} nokta`);
  }
);
