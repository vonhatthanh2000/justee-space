import type { Metadata } from "next";
import { seResume } from "../../../content/se-resume";
import { ResumePage } from "@/components/resume/resume-page";

export const metadata: Metadata = {
  title: "Software Engineer Profile | Thanh Vo",
  description:
    "Thanh Vo's software engineering experience, backend systems, distributed infrastructure, and fullstack projects.",
  robots: { index: false, follow: false },
};

export default function SoftwareEngineerResumePage() {
  return <ResumePage resume={seResume} />;
}
