"use client";

import { useStoryblokState, StoryblokComponent } from "@storyblok/react";
import type { ISbStoryData } from "storyblok-js-client";
import { initStoryblok } from "./StoryblokProvider";

export default function StoryblokStoryClient({
  story: initialStory,
}: {
  story: any;
}) {
  initStoryblok();
  const story = useStoryblokState(initialStory as ISbStoryData);
  if (!story?.content) return null;
  return <StoryblokComponent blok={story.content} />;
}
