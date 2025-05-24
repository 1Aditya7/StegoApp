# 🕵️‍♂️ Stegano.it — Encrypted Image Steganography in the Browser

**Stegano.it** is a web application that allows users to securely encrypt and hide secret messages inside images. The app uses modern cryptographic techniques (AES-256-GCM) and steganographic encoding (Least Significant Bit with PRNG) to ensure that:

- The message is strongly encrypted
- The encrypted data is invisibly hidden inside an image
- Only someone with the correct password can extract and decrypt the message

---

## 📦 Tech Stack

- **Framework**: Next.js 15 (App Router, PWA-ready)
- **Language**: TypeScript
- **UI**: Tailwind CSS, shadcn/ui, MagicUI
- **Crypto**: Web Crypto API (AES-GCM, PBKDF2)
- **Stego**: HTML5 Canvas + LSB Bit Manipulation
- **Mobile**: Android `.apk` + `.aab` via Bubblewrap (TWA)
- **Deploy**: Vercel

---

## 🧠 1. App Overview

Stegano.it allows users to:
- Upload any image
- Enter a secret message and password
- Encrypt and scramble the message
- Embed the encrypted message into the image
- Download the processed image

On the contrary, users can:
- Upload the encrypted image
- Enter the same password
- Recover and decrypt the original message

All of this runs 100% **client-side** (in-browser) with zero backend or external APIs.

---

## 🔐 2. Encryption Mechanism

The encryption process uses **AES-256-GCM**, a secure symmetric cipher that provides both:
- **Confidentiality** (keeps message private)
- **Integrity** (detects tampering)

### 🔧 How It Works:

1. **Salt Generation (16 bytes)**  
   Random bytes used to make key derivation unique every time.

2. **Key Derivation (PBKDF2 + SHA-256)**  
   Converts password into a 256-bit AES key with 100,000 iterations.

3. **IV Generation (12 bytes)**  
   Initialization Vector adds randomness to the encryption output.

4. **AES-GCM Encryption**  
   Encrypts the UTF-8 message using the derived key and IV.

5. **Final Encrypted Payload Structure**:  
   | salt (16 bytes) | iv (12 bytes) | ciphertext (variable) |

   This combined payload is then passed into the steganographic embedding phase.
---

## 🖼️ 3. Embedding Mechanism (LSB Steganography)

To hide the encrypted payload inside the image, the app modifies the **least significant bits (LSBs)** of image pixel color values. This process is done intelligently to avoid detection:

### 📌 Steps:

1. **Header Encoding**  
Prefix with `$STEG` (5 bytes) as a magic header to identify valid stego images.

2. **Payload Length**  
16-bit field indicating encrypted payload length in bytes.

3. **Binary Conversion**  
Entire payload is converted to a flat array of bits (0s and 1s).

4. **PRNG-based Position Shuffling**  
A pseudo-random number generator (seeded with the password) shuffles pixel positions to scatter embedded bits across the image non-sequentially.

5. **Bit Insertion (LSB encoding)**  
The LSB of each RGB byte (excluding alpha) is replaced with one bit from the message.

This ensures the image **looks identical to the original**, but hides encrypted data in a non-obvious pattern only recoverable with the password.

---

## 🔓 4. Decryption Mechanism

The decryption process reverses the entire pipeline using the **same password**:

1. **Canvas Image Parsing**  
Extract pixel data from uploaded image.

2. **Bit Extraction via PRNG**  
Using the same password, regenerate the PRNG and recover bits from shuffled pixel positions.

3. **Header Verification**  
Reassemble first 5 bytes → ensure `$STEG` exists.

4. **Length Parsing**  
Read next 16 bits → determine message size.

5. **Payload Reconstruction**  
Convert bits back into:
| salt | iv | ciphertext |


6. **Key Re-Derivation**  
Use extracted salt + user password to re-derive the AES key.

7. **AES-GCM Decryption**  
Decrypt ciphertext using key + IV.  
If the password is wrong or image was modified, decryption fails silently.

---

## 🖥️ UI & UX

- **Minimalist Design**: Clean two-tab layout using shadcn/ui
- **LetterGlitch**: Animated canvas background to evoke a subtle cryptic aesthetic
- **Responsive**: Works on desktop and mobile browsers
- **Device Mockup**: App viewable inside a simulated Pixel 5 device frame for showcase/demo mode

---

## 📱 Android Support (TWA)

The app is also packaged as an Android `.apk` and `.aab` using [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap):

- Uses Trusted Web Activity (TWA) to wrap the hosted PWA
- Android app is signed using a custom keystore
- Fully functional offline
- Uses `assetlinks.json` for verified PWA-to-TWA binding

---

## 🚀 How to Run Locally

```bash
git clone https://github.com/1Aditya7/StegoApp.git
cd StegoApp
npm install
npm run dev
```
Open http://localhost:3000 in your browser.

## 🧪 How to Build for Production
```bash
npm run build
npm run start
```

## 📂 Directory Highlight

```bash
├── app/                     # Next.js App Router structure  
│   └── page.tsx             # Main UI  
├── components/              # Tabs, inputs, stego logic  
├── blocks/Backgrounds/      # LetterGlitch canvas animation  
├── public/                  # PWA assets, icons  
├── next.config.ts           # PWA + TWA configuration  
├── manifest.json            # For Android & PWA installability
```

## 📜 License
MIT — free to use, modify, distribute.
