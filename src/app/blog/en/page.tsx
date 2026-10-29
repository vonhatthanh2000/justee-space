import type { Metadata } from "next";
import { BlogIndex } from "@/components/blog/blog-index";

export const metadata: Metadata = {
  title: "Blog | Thanh",
  description:
    "Technical discoveries, personal observations, and the paths between them.",
};

export default function EnglishBlogPage() {
  return <BlogIndex language="en" />;
}
