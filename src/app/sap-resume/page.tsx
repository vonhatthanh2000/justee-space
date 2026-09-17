import type { Metadata } from "next";
import { sapResume } from "../../../content/sap-resume";
import { ResumePage } from "@/components/resume/resume-page";

export const metadata: Metadata = {
  title: "SAP Technical Consultant Profile | Thanh Vo",
  description:
    "Thanh Vo's SAP learning, technical presentation, and software-engineering projects.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SapProposalPage() {
  return (
    <ResumePage
      resume={{
        ...sapResume,
        profileLink: { href: "/blog/sap-switching", label: "Visit my SAP blog" },
        videoLabel: "SAP learning",
        videos: [
          sapResume.videos.introduction,
          sapResume.videos.sapSd,
          sapResume.videos.sapRap,
        ],
        welcomeMessage:
          "Hi, ask me about Thanh's SAP learning and software engineering experience.",
        emphasizeSap: true,
      }}
    />
  );
}
