import type { Project } from "./types";
import { projectImages } from "./projectImages";

export const enterprise_project: readonly Project[] = [
  {
    id: 1,
    industry: "Decentralized Exchange",
    name: "PerpX DEX",
    organization: "PerpX | 1119Labs",
    timeline: "Dec 2025 — May 2026",
    description:
      "A decentralized exchange platform for trading digital assets.",
    role: [
      "A database design for synthesizing on-chain data to improve performance",
      "Built Kafka system for event pipelines for high-throughput workloads",
      "Build the explorer to query the address's transactions",
    ],
    results: ["40% cost reduction", "5M+ events/day", "Sub-100ms latency"],
    href: "",
    image: projectImages.perpx,
  },
  {
    id: 2,
    industry: "Distributed System",
    name: "U2U Network Solaris Mainnet | Subnet Node",
    organization: "Unicorn Ultra Labs",
    timeline: "2024 — 2025",
    description:
      "Decentralized Layer 1 network supporting DEPIN applications. U2U is listed on the major centralized exchanges (CEX) such as OKX, BingX, and MEXC.",
    role: [
      "Forked Helios Network with customized features",
      "Optimized gas usage and transaction costs",
      "DePIN hardware validation & Virtual Machine (VM) support",
      "Implement DAG (Directed Acyclic Graph) Architecture which help increase transaction processing speed and minimize congestion in the net",
      "Implement multi-layered Consensus",
    ],
    results: [
      "10K+ active users",
      "User nodes are operational in almost all Asian countries.",
    ],
    href: "https://u2u.xyz/",
    image: projectImages.u2uNetwork,
  },
  {
    id: 3,
    industry: "Recruiting platform",
    name: "Heydevs",
    organization: "Codelight Co",
    timeline: "Sep 2022 — Apr 2024",
    description:
      "Passive Recruiting platform for both companies and candidates to find the best fit for their needs",
    role: [
      "Building and maintaining server-side applications using NestJS, GraphQL, and PostgreSQL",
      "Security: Implementing Passport OAuth2 for authentication (supporting Google, GitHub, and LinkedIn)",
      "Database Optimization:  Designing database structures, applying Indexing, caching, full-text search, and using Elasticsearch for complex query searches.",
      "Mail Service: Using Open-source (Novu) interacted with AWS SES, S3 to send email/ notification",
      "Chat Service: implement Websocket to build a real-time message system",
      "Payment: Implement Stripe API to handle payment checkout",
    ],
    results: ["10K+ active users"],
    href: "",
    image: projectImages.heydevs,
  },
  {
    id: 4,
    industry: "Fiat NFT Marketplace",
    name: "Pikasso",
    organization: "Codelight Co",
    timeline: "Sep 2022 — Apr 2024",
    description: "A platform for buying and selling NFTs using Fiat currency",
    role: [
      "Develop backend solutions using TypeScript, NestJS, and ExpressJS to implement a Microservice architecture system",
      "Interact on-chain with the ETH network using Ethers.js and Hardhat to access decentralized data",
      "Use the Stripe API to handle Visa checkout, using Fiat to buy Web3 asset",
    ],
    results: ["100+ NFTs listed"],
    href: "",
    image: projectImages.pikasso,
  },
];

export const personal_project: readonly Project[] = [
  {
    id: 1,
    industry: "ID Card Generator",
    name: "TAOANHTHE.ONLINE",
    organization: "Self-employed",
    timeline: "May 2026 — Present",
    description:
      "Turns phone selfies into print-ready ID photos with AI (background, outfit)",
    role: [
      "Fullstack for this project",
      "Support using all image type (.jpg, .png, .heic)",
      "Build AI model (Gemini, Banana Nano 2.0) to generate ID card",
      "Fast Checkout screen without Registering an account",
      "SePay webhook checkout",
    ],
    results: [],
    href: "https://taoanhthe.online/",
    image: projectImages.taoanhthe,
  },
  {
    id: 2,
    industry: "English Learning Platform",
    name: "EPro",
    organization: "Self-employed",
    timeline: "April 2026 — May 2026",
    description:
      "A platform for practicing English with AI, AI will correct your pronunciation and grammar",
    role: [
      "Fullstack for this project",
      "Tuning AI model to correct your pronunciation and grammar based on IELTS exam",
      "Implement a system to track your progress and history",
      "Correct the sentence natually and analyze the result to guide user to improve",
    ],
    results: [""],
    href: "https://epro-fe.vercel.app",
    image: projectImages.epro,
  },
  {
    id: 3,
    industry: "Headhunt application",
    name: "Talent Scout",
    organization: "Self-employed",
    timeline: "May 2024 — June 2024",
    description:
      "A platform for headhunt companies to find the best fit for their needs. Inspiration by Heydevs",
    role: [
      "Design Database, Project Structure",
      "Authentication with OAuth2 (Google, Linkedin), and OTP",
      "Build mail service with Novu",
      "Develop and Maintain API for admin, candidate, recruiter, HR,",
    ],
    results: [""],
    href: "",
    image: projectImages.talentScout,
  },
];
