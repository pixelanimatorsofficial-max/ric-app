# APK Kaise Banayein — Rickshaw Trip Counting App

Maine yeh project already Capacitor ke saath Android-ready bana diya hai (`.env` aur
`android/` folder dono taiyaar hain, aap ke backend aur Supabase credentials already
configured hain). APK compile karne ke liye 2 tareeqe hain — jo aasan lage wo use karein.

---

## Tareeqa 1: GitHub Actions se (Android Studio install karne ki zaroorat nahi) ✅ Recommended

1. Is poore `frontend` folder ko ek naye GitHub repo me push karein.
2. GitHub repo settings me jayein: **Settings → Secrets and variables → Actions → Variables**
   aur 3 repository variables banayein (Variables tab me, Secrets me nahi — zaroori nahi
   inhe secret rakhna kyunke anon key public-safe hoti hai, lekin aap chahein to Secrets
   me bhi daal sakte hain, sirf workflow file me `vars.` ko `secrets.` se badal dena):
   - `VITE_API_URL` = `https://my-daily-bot-nef0.onrender.com`
   - `VITE_SUPABASE_URL` = `https://rnieywicxxnsrrozowsn.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = (aapki anon key)
3. GitHub repo ke **Actions** tab me jayein, "Build Android APK" workflow ko **Run workflow**
   se manually trigger karein (ya `main` branch pe push karein, automatically chalega).
4. Build complete hone ke baad (2-3 minute), workflow run ke "Artifacts" section me
   `app-debug-apk` milega — wahan se `.apk` file download kar lein.
5. Yeh `.apk` file apne Android phone pe bhej kar install kar lein (Settings me
   "install from unknown sources" allow karna parega, kyunke yeh Play Store se nahi hai).

Yeh APK **debug build** hai — testing/personal use ke liye bilkul theek hai, har Android
phone (Android 6+) pe chal jayega. Agar Play Store pe publish karna ho to "signed release
build" chahiye hoga (niche note dekhein).

---

## Tareeqa 2: Apne computer pe Android Studio se

1. [Android Studio](https://developer.android.com/studio) install karein.
2. Is `frontend` folder ko apne computer pe copy karein.
3. Terminal me:
   ```bash
   cd frontend
   npm install
   npm run build
   npx cap sync android
   npx cap open android
   ```
4. Android Studio khulega → upar menu se **Build → Build Bundle(s)/APK(s) → Build APK(s)**
5. Build complete hone par "locate" link click karein — APK
   `android/app/build/outputs/apk/debug/app-debug.apk` par milegi.
6. Phone pe transfer karke install kar lein.

---

## Zaroori Notes

- **.env file** me aapke backend aur Supabase credentials already daal diye gaye hain.
  Agar backend URL change ho to `.env` update karke `npm run build && npx cap sync android`
  dobara chalana hoga.
- Yeh app aapke deployed FastAPI backend (Render) aur Supabase se internet ke zariye connect
  hota hai — phone ka internet connection zaroori hai.
- File/image upload phone ki gallery se kaam karega; koi extra Android permission setup
  nahi chahiye (sirf INTERNET permission already manifest me hai).
- **Render free tier** agar use kar rahe hain to backend "sleep" ho sakta hai jab use na ho
  — pehli request slow ho sakti hai (cold start), yeh normal hai.

### Play Store ke liye signed release build (optional, sirf agar publish karna ho)
Debug APK sirf testing ke liye hota hai. Play Store pe daalne ke liye release build
sign karna zaroori hai:
```bash
cd android
./gradlew assembleRelease
```
Iske liye ek keystore generate karna hoga (`keytool` se) — agar yeh step chahiye ho to
bata dein, main detailed signing guide bhi bana dunga.
