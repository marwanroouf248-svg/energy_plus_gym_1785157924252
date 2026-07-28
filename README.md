# Next.js

A modern Next.js 15 application built with TypeScript and Tailwind CSS.

## 🚀 Features

- **Next.js 15** - Latest version with improved performance and features
- **React 19** - Latest React version with enhanced capabilities
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development

## 🛠️ Installation

1. Install dependencies:
  ```bash
  npm install
  # or
  yarn install
  ```import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs"; // نحتاج runtime node علشان نستخدم fs

// خريطة سريعة لنوع الملف -> امتداد
function mimeToExt(mime: string | null): string {
  if (!mime) return "bin";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  return "bin";
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();

    // expects a file field named "recording" and optional metadata fields like "callId", "caller"
    const file = form.get("recording") as File | null;
    const callId = String(form.get("callId") ?? `call-${Date.now()}`);
    const caller = String(form.get("caller") ?? "");

    if (!file) {
      return NextResponse.json({ error: "missing file field 'recording'" }, { status: 400 });
    }

    // read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ensure public/recordings exists so we can serve the file directly
    const publicFolder = path.join(process.cwd(), "public", "recordings");
    await fs.mkdir(publicFolder, { recursive: true });

    const ext = mimeToExt(file.type);
    const filename = `${callId}_${Date.now()}.${ext}`;
    const filePath = path.join(publicFolder, filename);

    await fs.writeFile(filePath, buffer);

    // يمكنك حفظ بيانات الميتاداتا في قاعدة بيانات هنا إن أردت

    const publicUrl = `/recordings/${filename}`; // served from public/
    return NextResponse.json({
      ok: true,
      file: publicUrl,
      filename,
      caller,
      callId,
    });
  } catch (err) {
    console.error("recording upload error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

2. Start the development server:
  ```bash
  npm run dev
  # or
  yarn dev
  ```
3. Open [http://localhost:4028](http://localhost:4028) with your browser to see the result.

## 📁 Project Structure

```
nextjs/
├── public/             # Static assets
├── src/
│   ├── app/            # App router components
│   │   ├── layout.tsx  # Root layout component
│   │   └── page.tsx    # Main page component
│   ├── components/     # Reusable UI components
│   ├── styles/         # Global styles and Tailwind configuration
├── next.config.mjs     # Next.js configuration
├── package.json        # Project dependencies and scripts
├── postcss.config.js   # PostCSS configuration
└── tailwind.config.js  # Tailwind CSS configuration

```

## 🧩 Page Editing

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

## 🎨 Styling

This project uses Tailwind CSS for styling with the following features:
- Utility-first approach for rapid development
- Custom theme configuration
- Responsive design utilities
- PostCSS and Autoprefixer integration

## 📦 Available Scripts

- `npm run dev` - Start development server on port 4028
- `npm run build` - Build the application for production
- `npm run start` - Start the development server
- `npm run serve` - Start the production server
- `npm run lint` - Run ESLint to check code quality
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier

## 📱 Deployment

Build the application for production:

  ```bash
  npm run build
  ```

## 📚 Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 🙏 Acknowledgments

- Built with [Rocket.new](https://rocket.new)
- Powered by Next.js and React
- Styled with Tailwind CSS

Built with ❤️ on Rocket.new # Next.js

A modern Next.js 15 application built with TypeScript and Tailwind CSS.

## 🚀 Features

- **Next.js 15** — Latest version with improved performance and features
- **React 19** — Latest React version with enhanced capabilities
- **Tailwind CSS** — Utility-first CSS framework for rapid UI development

## 🛠️ Installation

1. Install dependencies:
   ```bash
   npm install
   # or
   yarn install