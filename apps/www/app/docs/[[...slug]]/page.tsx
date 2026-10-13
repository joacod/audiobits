import type { ComponentProps } from "react";
import type { Metadata } from "next";
import { PackageChannel } from "../../package-channel";
import { notFound } from "next/navigation";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/page";
import defaultMdxComponents from "fumadocs-ui/mdx";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { File, Files, Folder } from "fumadocs-ui/components/files";
import { MarkdownCopyButton } from "fumadocs-ui/layouts/docs/page";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { source } from "../../../lib/source";
import { getPageGithubUrl, getPageMarkdownUrl } from "../../../lib/docs-urls";
import { DocsUtilities } from "../layout.client";

function DocsLink(props: ComponentProps<typeof defaultMdxComponents.a>) {
  const external = /^https?:\/\//.test(props.href ?? "");
  return (
    <defaultMdxComponents.a
      {...props}
      {...(external
        ? {
            target: "_blank",
            rel: "noopener noreferrer",
          }
        : {})}
    />
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  return {
    title: page.data.title,
    description: page.data.description,
    alternates: { canonical: page.url },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) notFound();
  const Content = page.data.body;
  const markdownUrl = getPageMarkdownUrl(page);
  return (
    <DocsPage
      toc={page.data.toc}
      tableOfContent={{
        header: (
          <div className="mb-6">
            <DocsUtilities />
          </div>
        ),
      }}
    >
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <div
        role="group"
        aria-label="Page actions"
        className="flex flex-wrap items-center gap-2 border-b pb-6"
      >
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <a
          href={getPageGithubUrl(page)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          View on GitHub
        </a>
        <a
          href={markdownUrl}
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Open Markdown
        </a>
      </div>
      <DocsBody>
        <Content
          components={{
            ...defaultMdxComponents,
            a: DocsLink,
            PackageChannel,
            Tab,
            Tabs,
            Step,
            Steps,
            File,
            Files,
            Folder,
          }}
        />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}
