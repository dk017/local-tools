# SaaS Website Implementation Plan (In Progress)

## Objective
Transform "Offline Tools" into a premium SaaS product with a high-converting website, programmatic SEO, and "Neural AI" branding.

## Phase 1: Foundation (Completed)
- [x] Initialize Next.js 14 Project (`/website`)
- [x] Configure Tailwind CSS (Dark Mode & Typography)

## Phase 2: Core Landing Page (Completed)
- [x] **Hero Section**: High-Impact Header, "Privacy First" Value Prop.
- [x] **Features**: Bento Grid Layout, Problem/Solution Component.
- [x] **Footer & Navbar**: Responsive navigation.

## Phase 3: Monetization (Completed)
- [x] **Pricing**: Lifetime Deal ($59) section.
- [x] **Payments**: Integration points for Dodo Payments.
- [x] **Legal**: `/privacy` and `/terms` pages.

## Phase 4: Programmatic SEO & Localization (Completed)
- [x] **i18n Architecture**:
    - [x] `next-intl` setup with Middleware.
    - [x] Localized Routes: `/[locale]/tools/[slug]`.
    - [x] 6 Languages: EN, JP, KR, FR, ES, IT.
- [x] **Technical SEO**:
    - [x] Dynamic Sitemap (`sitemap.xml`) with localized entries.
    - [x] `robots.txt` configuration.
    - [x] Dynamic Metadata injection.

## Phase 5: Design & Polish (Completed)
- [x] **"Neural AI" Aesthetic**:
    - [x] Dark Mode (Slate 950) with Neon Cyan/Purple accents.
    - [x] Glassmorphism and Animated Gradients.
- [x] **Content**:
    - [x] "Killer SaaS" Copywriting for high conversion.
- [x] **Verification**:
    - [x] Successful Build (`npm run build`).
    - [x] Static Site Generation (SSG) confirmed.

## Phase 6: Cloud Processing & Web Tools (Completed)
- [x] **Backend API Layer (FastAPI)**
    - [x] Add `fastapi`, `uvicorn`, `python-multipart` to requirements.
    - [x] Create `server.py` to wrap existing modules (`pdf_tools`, `image_tools`) as HTTP endpoints.
    - [x] Implement secure temporary file handling for uploads/processing.
- [x] **Web Tool Interfaces**
    - [x] Create `FileUploader` component (Drag & Drop).
    - [x] Create interactive Tool Components replacing screenshots:
        - [x] `MergeTool` (Multi-file upload).
        - [x] `SplitTool` (Range extraction).
        - [x] `RemoveBgTool` (Image upload & compare).
    - [x] Integrate API client in Next.js.
- [x] **The "Upsell" Experience**
    - [x] Add "Processing..." overlays with Privacy/Speed marketing.
    - [x] Limit web version capabilities (e.g., max file size, simple options) to encourage Desktop download.
