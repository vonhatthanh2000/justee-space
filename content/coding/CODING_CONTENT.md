# Coding section — content and migration reference

This document captures the current content and behavior of the Coding page so it can be rebuilt in another repository. The new implementation should use local content files only. Do not install, configure, or connect Sanity for this section.

## Content source requirement

Use the files in the new repository as the single source of truth:

- Store project, experience, and skill records in local TypeScript, JavaScript, JSON, YAML, or Markdown content files.
- Import or load that local content directly in the Coding page.
- Do not add a CMS client, Sanity schemas, GROQ queries, dataset environment variables, synchronization scripts, or CMS fallback logic.
- Keep images and the CV as local static assets.
- A practical structure is:

```text
content/coding/
├── projects.ts
├── experience.ts
├── skills.ts
├── types.ts
├── image/
│   ├── perpx.webp
│   ├── u2u-network-project.webp
│   └── ...
└── ThanhVo_CV.pdf
```

## Page structure

The page is presented in this order:

1. Header navigation: Projects, Experience, Contact, and Download CV
2. Hero introduction
3. Skills
4. Projects, split into Enterprise and Personal projects tabs
5. Experience timeline
6. Contact call to action

The Enterprise tab is selected by default. Projects retain their own ordering inside each category, and the project cards alternate image/content placement on desktop.

## Recommended content model

Use one `Project` collection and distinguish project types with a required `category` property. Do not maintain separate project shapes for enterprise and personal work.

```ts
type ProjectCategory = "enterprise" | "personal";

type Project = {
  id: string;                       // Stable unique key; prefer a slug
  name: string;                     // Display name
  slug: string;                     // URL-safe identifier
  category: ProjectCategory;        // Drives Enterprise/Personal filtering
  industry: string;                 // Short domain or product type
  organization: string;             // Employer, client, or Self-employed
  timeline: string;                 // Human-readable display range
  startDate?: string;               // YYYY-MM for sorting/filtering
  endDate?: string | null;          // YYYY-MM; null while ongoing
  isOngoing: boolean;
  description: string;              // Short project summary
  role: string[];                   // “What I did” bullet points
  results: string[];                // Measurable outcomes; use [] when absent
  href?: string;                    // Absolute public project URL
  image: {
    src: string;                    // Local asset path
    alt: string;                    // Usually the project name plus context
  };
  sortOrder: number;                // Lower values render first per category
  featured: boolean;                // Whether it appears on this page
};

type Skill = {
  category: string;
  detail: string;
  sortOrder: number;
};

type ExperienceHighlight = {
  projectId?: string;               // Optional link to a Project
  label?: string;                   // Required if there is no linked project;
                                    // can override a linked project’s name
  bullets: string[];
  techStack: string[];
};

type ExperienceEntry = {
  id: string;
  period: string;                   // Human-readable display range
  startDate?: string;               // YYYY-MM
  endDate?: string | null;          // YYYY-MM; null while current
  isCurrent: boolean;
  title: string;
  organization: string;
  highlights: ExperienceHighlight[];
  sortOrder: number;                // Lower values render first
};
```

Implementation notes:

- `category`, not `organization`, determines whether a project is Enterprise or Personal.
- Keep category values stable as `enterprise` and `personal`; labels such as “Enterprise” and “Personal projects” belong in the UI.
- Use stable string IDs or slugs in the local content files.
- Keep both machine-readable dates and the editorial `timeline`/`period` when exact display wording matters.
- Remove blank strings from `role`, `results`, `bullets`, and `techStack`. An absent result is `[]`, not `[""]`.
- `ExperienceHighlight` is role-specific. Link it to a project when possible, but retain its own bullets and technology stack because these describe work performed during that particular job.
- Image alt text should be stored with the image. The current project page falls back to the project name.
- Only render the external “View project” action when `href` is present.
- Only render project results when the cleaned `results` array is non-empty.
- Filter projects with `featured === true`, then group by `category` and sort by `sortOrder` within each group.

### Current source shape versus recommended shape

The current static code keeps two arrays named `enterprise_project` and `personal_project`, while each individual project has no category field. In the new repository, place `category` directly on every project and use one local projects array or collection. This makes each record self-describing and prevents accidental misclassification when records are moved.

The current static experience format stores project names as object keys in separate `description` and `techstack` maps. The recommended `highlights` array avoids fragile string-key matching and supports an optional explicit project relationship.

## Hero

Eyebrow:

> Coding — technical work

Heading:

> Software built with clarity, care, and long-term intent

Introduction:

> I'm a Web3 Backend Engineer with **5 years of experience** developing web applications and complex infrastructure. I love diving into new tech, especially anything involving Blockchain and AI. I am familiar with NodeJs, Typescript, Go, Docker,

> Most of my time is spent building in the Web3 space, specifically implementing **Layer 1 networks** and **optimizing databases**.

> One of my favorite recent wins was re-engineering our company's database to increase **query performance by 50%**.

Hero image (outside the project image folder):

- Source: `images/coding-1.webp`
- Current alt text: empty/decorative

## Skills

1. **Programming Languages & Frameworks** — Go, Node.js, NestJS
2. **Database Optimizing** — Indexing, partitioning
3. **API Design** — RESTful APIs, GraphQL, gRPC
4. **System Design** — Architecture, scalability, distributed systems
5. **DevOps** — Docker, Kubernetes, Jenkins, GitHub Actions
6. **Problem Solving** — Discussing, analyzing, debugging, and optimizing complex systems

## Projects

### Enterprise

#### PerpX DEX

- ID/order: `1`
- Category: `enterprise`
- Industry: Decentralized Exchange
- Organization: PerpX | 1119Labs
- Timeline: Dec 2025 — May 2026
- Description: A decentralized exchange platform for trading digital assets.
- Image: `image/perpx.webp`
- URL: none
- What I did:
  - A database design for synthesizing on-chain data to improve performance
  - Built Kafka system for event pipelines for high-throughput workloads
  - Build the explorer to query the address's transactions
- Results:
  - 40% cost reduction
  - 5M+ events/day
  - Sub-100ms latency

#### U2U Network Solaris Mainnet | Subnet Node

- ID/order: `2`
- Category: `enterprise`
- Industry: Distributed System
- Organization: Unicorn Ultra Labs
- Timeline: 2024 — 2025
- Description: Decentralized Layer 1 network supporting DEPIN applications. U2U is listed on the major centralized exchanges (CEX) such as OKX, BingX, and MEXC.
- Image: `image/u2u-network-project.webp`
- URL: https://u2u.xyz/
- What I did:
  - Forked Helios Network with customized features
  - Optimized gas usage and transaction costs
  - DePIN hardware validation & Virtual Machine (VM) support
  - Implement DAG (Directed Acyclic Graph) Architecture which help increase transaction processing speed and minimize congestion in the net
  - Implement multi-layered Consensus
- Results:
  - 10K+ active users
  - User nodes are operational in almost all Asian countries.

#### Heydevs

- ID/order: `3`
- Category: `enterprise`
- Industry: Recruiting platform
- Organization: Codelight Co
- Timeline: Sep 2022 — Apr 2024
- Description: Passive Recruiting platform for both companies and candidates to find the best fit for their needs
- Image: `image/heydevs.webp`
- URL: none
- What I did:
  - Building and maintaining server-side applications using NestJS, GraphQL, and PostgreSQL
  - Security: Implementing Passport OAuth2 for authentication (supporting Google, GitHub, and LinkedIn)
  - Database Optimization: Designing database structures, applying Indexing, caching, full-text search, and using Elasticsearch for complex query searches.
  - Mail Service: Using Open-source (Novu) interacted with AWS SES, S3 to send email/ notification
  - Chat Service: implement Websocket to build a real-time message system
  - Payment: Implement Stripe API to handle payment checkout
- Results:
  - 10K+ active users

#### Pikasso

- ID/order: `4`
- Category: `enterprise`
- Industry: Fiat NFT Marketplace
- Organization: Codelight Co
- Timeline: Sep 2022 — Apr 2024
- Description: A platform for buying and selling NFTs using Fiat currency
- Image: `image/pikasso.webp`
- URL: none
- What I did:
  - Develop backend solutions using TypeScript, NestJS, and ExpressJS to implement a Microservice architecture system
  - Interact on-chain with the ETH network using Ethers.js and Hardhat to access decentralized data
  - Use the Stripe API to handle Visa checkout, using Fiat to buy Web3 asset
- Results:
  - 100+ NFTs listed

### Personal projects

#### TAOANHTHE.ONLINE

- ID/order: `1`
- Category: `personal`
- Industry: ID Card Generator
- Organization: Self-employed
- Timeline: May 2026 — Present
- Description: Turns phone selfies into print-ready ID photos with AI (background, outfit, sizing)
- Image: `image/taoanhthe.webp`
- URL: https://taoanhthe.online/
- What I did:
  - Fullstack for this project
  - Support using all image type (.jpg, .png, .heic)
  - Build AI model (Gemini, Banana Nano 2.0) to generate ID card
  - Fast Checkout screen without Registering an account
  - SePay webhook checkout
- Results: none

#### EPro

- ID/order: `2`
- Category: `personal`
- Industry: English Learning Platform
- Organization: Self-employed
- Timeline: April 2026 — May 2026
- Description: A platform for practicing English with AI, AI will correct your pronunciation and grammar
- Image: `image/epro.webp`
- URL: https://epro-fe.vercel.app
- What I did:
  - Fullstack for this project
  - Tuning AI model to correct your pronunciation and grammar based on IELTS exam
  - Implement a system to track your progress and history
  - Correct the sentence natually and analyze the result to guide user to improve
- Results: none (the source currently contains a blank result string, which should be removed during migration)

#### Talent Scout

- ID/order: `3`
- Category: `personal`
- Industry: Headhunt application
- Organization: Self-employed
- Timeline: May 2024 — June 2024
- Description: A platform for headhunt companies to find the best fit for their needs. Inspiration by Heydevs
- Image: `image/talentscout.webp`
- URL: none
- What I did:
  - Design Database, Project Structure
  - Authentication with OAuth2 (Google, Linkedin), and OTP
  - Build mail service with Novu
  - Develop and Maintain API for admin, candidate, recruiter, HR,
- Results: none (the source currently contains a blank result string, which should be removed during migration)

## Experience

Entries are ordered newest first.

### Web3 Backend Engineer — Self-employed

- ID/order: `1`
- Period: Mar 2026 — Present
- Current role: yes

#### TAOANHTHE.ONLINE

- Fullstack for this project
- Support using all image type (.jpg, .png, .heic)
- Build AI model (gemini, banana nano 2.0) to generate ID card
- Fast Checkout screen without Registering an account

Tech stack: Next.js, Tailwind CSS, TypeScript, PostgreSQL, Docker, CICD

#### EPro - English Learning Platform

- Fullstack for this project
- Tuning AI model to correct your pronunciation and grammar based on IELTS exam
- Implement a system to track your progress and history
- Correct the sentence natually and analyze the result to guide user to improve

Tech stack: Next.js, Tailwind CSS, TypeScript, PostgreSQL, Docker, CICD

### Web3 Backend Engineer — PerpX - 1119labs

- ID/order: `2`
- Period: Dec 2025 — May 2026
- Current role: no

#### PerpX DEX

- Database design for synthesizing on-chain data to improve performance
- Build Kafka system for event pipelines for high-throughput workloads
- Build the explorer to query the address's transactions

Tech stack: Go, Kafka, TypeScript, PostgreSQL, Docker, CICD, gRPC

### Blockchain Backend Engineer — Unicorn Ultra Labs

- ID/order: `3`
- Period: Jun 2024 — Dec 2025
- Current role: no

#### LayerG

- Real-time data synchronization, ensuring every transaction is verifiable and secure
- Implement Subgraph for nodes to fetch configuration to run on their local node
- P2P Cross check data between indexer nodes
- Implement a DA Layer with POI (Proof of Indexing) to ensure data validation. Data is stored with MMR Data Structure

Tech stack: Go, GraphQL, gRPC, Docker, Subgraph

#### U2U Network | Subnet Node

- Forked Helios Network with customized features
- Optimized gas usage and transaction costs

Tech stack: Go, IPFS, P2P

Note: the current source also contains an unmatched tech-stack key named `U2U Solaris Network | Subnet Node` with Go, Kubernetes, and VM Virtualization. Because there is no matching description key, the current UI does not display it. During migration, decide whether to merge those technologies into the U2U highlight or create a separate highlight.

### Software Engineer — Codelight Co

- ID/order: `4`
- Period: Sep 2022 — Apr 2024
- Current role: no

#### Heydevs - Recruiting platform

- Building and maintaining server-side applications using NestJS, GraphQL, and PostgreSQL
- Security: Implementing Passport OAuth2 for authentication (supporting Google, GitHub, and LinkedIn)
- Database Optimization: Designing database structures, applying Indexing, caching, full-text search, and using Elasticsearch for complex query searches.
- Mail Service: Using Open-source (Novu) interacted with AWS SES, S3 to send email/ notification
- Chat Service: implement Websocket to build a real-time message system
- Payment: Implement Stripe API to handle payment checkout

Tech stack: NestJs, PostgreSQL, Elasticsearch, Stripe, Novu, Websocket, Redis, BullMQ, OAuth2

#### Pikasso - Fiat NFT Marketplace

- Develop backend solutions using TypeScript, NestJS, and ExpressJS to implement a Microservice architecture system
- Interact on-chain with the ETH network using Ethers.js and Hardhat to access decentralized data
- Use the Stripe API to handle Visa checkout, using Fiat to buy Web3 asset

Tech stack: NestJS, Ethers.js, Hardhat, Stripe, Docker

## Contact

Call to action:

> Let's build something scalable and impactful — open to collaborations and thoughtful engineering conversations.

Links:

- GitHub: https://github.com/vonhatthanh2000
- Email: nthanhatee@gmail.com
- LinkedIn: https://www.linkedin.com/in/nhatthanhvo/

## Files to migrate

Project images (the folder the new repository will receive):

- `src/content/coding/image/perpx.webp` — PerpX DEX
- `src/content/coding/image/u2u-network-project.webp` — U2U Network Solaris Mainnet | Subnet Node
- `src/content/coding/image/heydevs.webp` — Heydevs
- `src/content/coding/image/pikasso.webp` — Pikasso
- `src/content/coding/image/taoanhthe.webp` — TAOANHTHE.ONLINE
- `src/content/coding/image/epro.webp` — EPro
- `src/content/coding/image/talentscout.webp` — Talent Scout

Additional Coding assets outside that folder:

- `images/coding-1.webp` — hero image
- `src/content/coding/ThanhVo_CV.pdf` — downloadable CV; current download filename is `ThanhVo_CV.pdf`

If only `src/content/coding/image/` is copied, project cards have all their images, but the hero image and CV will still be missing.

## Content-only runtime behavior

- Import projects, experience, and skills directly from their local content files.
- Filter projects with `featured === true`.
- Group projects by `category`, then order each group by `sortOrder` ascending.
- Order experience and skills by `sortOrder` ascending.
- Resolve project images from the local `content/coding/image/` directory.
- Keep hero text, hero image, section labels, contact copy, contact links, navigation, and the CV reference in local content or configuration.
- The page must not depend on network access or CMS availability to render its content.

## Migration checklist

- Copy `src/content/coding/image/` into the new repository and preserve or update every image path.
- Also copy `images/coding-1.webp` and `src/content/coding/ThanhVo_CV.pdf` if the new page keeps the hero and CV download.
- Create local files for projects, experience, skills, and their shared types; import them directly into the page.
- Do not migrate the `sanity/` directory, `src/lib/sanity/`, CMS packages, CMS environment variables, or content synchronization scripts for the Coding section.
- Add `category` to every project record and use a single projects collection.
- Convert experience’s keyed maps to a `highlights` array and resolve the unmatched U2U tech-stack entry.
- Normalize empty array items, especially the blank results currently stored for EPro and Talent Scout.
- Add machine-readable dates if the new site will sort by chronology rather than explicit `sortOrder`.
- Keep outbound project/contact links absolute and open external links safely with `noopener noreferrer` when using a new tab.
- Verify mobile behavior: the project tabs remain accessible, cards stack to one column, and every project image has useful alt text.
