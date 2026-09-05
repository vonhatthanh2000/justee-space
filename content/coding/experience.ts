import type { ExperienceEntry } from "./types";

/** Newest first — edit periods, roles, and copy as your career grows */
export const experience: ExperienceEntry[] = [
  {
    id: 1,
    period: "Mar 2026 — Present",
    title: "Web3 Backend Engineer",
    organization: "Self-employed",
    description: {
      "TAOANHTHE.ONLINE": [
        "Fullstack for this project",
        "Support using all image type (.jpg, .png, .heic)",
        "Build AI model (gemini, banana nano 2.0) to generate ID card",
        "Fast Checkout screen without Registering an account",
      ],
      "EPro - English Learning Platform": [
        "Fullstack for this project",
        "Tuning AI model to correct your pronunciation and grammar based on IELTS exam",
        "Implement a system to track your progress and history",
        "Correct the sentence natually and analyze the result to guide user to improve",
      ],
    },
    techstack: {
      "TAOANHTHE.ONLINE": [
        "Next.js",
        "Tailwind CSS",
        "TypeScript",
        "PostgreSQL",
        "Docker",
        "CICD",
      ],
      "EPro - English Learning Platform": [
        "Next.js",
        "Tailwind CSS",
        "TypeScript",
        "PostgreSQL",
        "Docker",
        "CICD",
      ],
    },
  },

  {
    id: 2,
    period: "Dec 2025 — May 2026",
    title: "Web3 Backend Engineer",
    organization: "PerpX - 1119labs",
    description: {
      "PerpX DEX": [
        "Database design for synthesizing on-chain data to improve performance",
        "Build Kafka system for event pipelines for high-throughput workloads",
        "Build the explorer to query the address's transactions",
      ],
    },
    techstack: {
      "PerpX DEX": [
        "Go",
        "Kafka",
        "TypeScript",
        "PostgreSQL",
        "Docker",
        "CICD",
        "gRPC",
      ],
    },
  },
  {
    id: 3,
    period: "Jun 2024 — Dec 2025",
    title: "Blockchain Backend Engineer",
    organization: "Unicorn Ultra Labs",
    description: {
      LayerG: [
        "Real-time data synchronization, ensuring every transaction is verifiable and secure",
        "Implement Subgraph for nodes to fetch configuration to run on their local node",
        "P2P Cross check data between indexer nodes",
        "Implement a DA Layer with POI (Proof of Indexing) to ensure data validation. Data is stored with MMR Data Structure",
      ],
      "U2U Network | Subnet Node": [
        "Forked Helios Network with customized features",
        "Optimized gas usage and transaction costs",
      ],
    },
    techstack: {
      LayerG: ["Go", "GraphQL", "gRPC", "Docker", "Subgraph"],
      "U2U Solaris Network | Subnet Node": [
        "Go",
        "Kubernetes",
        "VM Virtualization",
      ],
      "U2U Network | Subnet Node": ["Go", "IPFS", "P2P"],
    },
  },
  {
    id: 4,
    period: "Sep 2022 — Apr 2024",
    title: "Software Engineer",
    organization: "Codelight Co",
    description: {
      "Heydevs - Recruiting platform": [
        "Building and maintaining server-side applications using NestJS, GraphQL, and PostgreSQL",
        "Security: Implementing Passport OAuth2 for authentication (supporting Google, GitHub, and LinkedIn)",
        "Database Optimization:  Designing database structures, applying Indexing, caching, full-text search, and using Elasticsearch for complex query searches.",
        "Mail Service: Using Open-source (Novu) interacted with AWS SES, S3 to send email/ notification",
        "Chat Service: implement Websocket to build a real-time message system",
        "Payment: Implement Stripe API to handle payment checkout",
      ],
      "Pikasso - Fiat NFT Marketplace": [
        "Develop backend solutions using TypeScript, NestJS, and ExpressJS to implement a Microservice architecture system",
        "Interact on-chain with the ETH network using Ethers.js and Hardhat to access decentralized data",
        "Use the Stripe API to handle Visa checkout, using Fiat to buy Web3 asset",
      ],
    },
    techstack: {
      "Heydevs - Recruiting platform": [
        "NestJs",
        "PostgreSQL",
        "Elasticsearch",
        "Stripe",
        "Novu",
        "Websocket",
        "Redis",
        "BullMQ",
        "OAuth2",
      ],
      "Pikasso - Fiat NFT Marketplace": [
        "NestJS",
        "Ethers.js",
        "Hardhat",
        "Stripe",
        "Docker",
      ],
    },
  },
];
