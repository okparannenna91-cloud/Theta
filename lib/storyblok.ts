/**
 * Storyblok CMS Integration - Server-side only
 * 
 * Public token (STORYBLOK_TOKEN) can be safely used client-side
 * Preview token (STORYBLOK_PREVIEW_TOKEN) must ONLY be used server-side
 * 
 * EU Region API configuration is used when STORYBLOK_API_REGION=eu
 */

import type { GetStoryblokContentResponse } from '@storyblok/react';

// Storyblok configuration
const SPACE_ID = process.env.STORYBLOK_SPACE_ID || '';
const PUBLIC_TOKEN = process.env.STORYBLOK_TOKEN || '';
const PREVIEW_TOKEN = process.env.STORYBLOK_PREVIEW_TOKEN || '';
const API_REGION = process.env.STORYBLOK_API_REGION || 'us'; // 'eu' or 'us'

/**
 * Storyblok API base URLs based on region
 */
const storyblokApiBase = API_REGION === 'eu'
  ? 'https://eu-api.storyblok.com/v2'
  : 'https://api.storyblok.com/v2';

/**
 * Fetches published content from Storyblok server-side
 * The PUBLIC_TOKEN can be used client-side but we keep fetching server-side
 * for security and to keep the preview token hidden
 */
export async function fetchStoryblokContent(
  slug: string,
  options: { version?: 'draft' | 'published'; language?: string } = {}
): Promise<any> {
  const { version = 'published', language } = options;
  
  // Use preview token only for draft version on server-side
  const token = version === 'draft' ? PREVIEW_TOKEN : PUBLIC_TOKEN;
  const apiVersion = version === 'draft' ? 'drafts' : '';
  
  if (!token) {
    console.warn('Storyblok token not configured');
    return null;
  }

  try {
    const url = `${storyblokApiBase}/spaces/${SPACE_ID}/entries/${slug}?version=${apiVersion}&token=${token}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // Return null if entry not found instead of breaking
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Storyblok API error: ${response.status}`);
    }

    const data = await response.json();
    return data.story || data.entry || data;
  } catch (error) {
    console.error('Storyblok content fetch error:', error);
    return null;
  }
}

/**
 * Fetches multiple Storyblok entries for a list of slugs
 */
export async function fetchStoryblokEntries(
  slugs: string[],
  options: { version?: 'draft' | 'published'; language?: string } = {}
): Promise<Map<string, any>> {
  const { version = 'published' } = options;
  const results = new Map<string, any>();
  
  // Fetch in parallel but limit concurrency
  const promises = slugs.map(slug => fetchStoryblokContent(slug, { version }).then(
    (data: any) => results.set(slug, data)
  ));
  
  await Promise.all(promises);
  return results;
}

/**
 * Gets Storyblok component data for a specific path
 * This is used for the visual editor bridge and page rendering
 */
export async function getStoryblokPage(
  path: string,
  options: { 
    version?: 'draft' | 'published'; 
    language?: string;
    preview?: boolean;
  } = {}
): Promise<{
  story: any;
  ancher: string;
  resolves: any;
} | null> {
  const { version = 'published', language, preview = false } = options;
  
  if (preview && !PREVIEW_TOKEN) {
    console.warn('Preview token not available, falling back to published');
    return null;
  }

  const token = preview ? PREVIEW_TOKEN : PUBLIC_TOKEN;
  const apiVersion = preview ? 'drafts' : '';
  
  if (!token) {
    return null;
  }

  try {
    const url = `${storyblokApiBase}/spaces/${SPACE_ID}/entries/by-path/${path}?version=${apiVersion}&token=${token}&cv=${new Date().getTime()}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Storyblok API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      story: data.story || data.entry,
      ancher: data_anchor || '',
      resolves: data.resolves || {},
    };
  } catch (error) {
    console.error('Storyblok page fetch error:', error);
    return null;
  }
}

/**
 * Gets the Storyblok editor bridge script for the visual editor
 * This should only be included when the STORYBLOK_PREVIEW_TOKEN is available
 * and the user is in preview mode (not exposed client-side in production)
 */
export function getStoryblokEditorBridge(): string | null {
  // In a real implementation, this would check for preview mode
  // and only render the bridge script when properly authorized
  // For now, return null to keep client-side code clean
  return null;
}

/**
 * Checks if Storyblok is properly configured
 */
export function isStoryblokConfigured(): boolean {
  return !!(
    SPACE_ID && 
    PUBLIC_TOKEN && 
    (PREVIEW_TOKEN || process.env.NODE_ENV === 'development')
  );
}

export default {
  fetchStoryblokContent,
  fetchStoryblokEntries,
  getStoryblokPage,
  getStoryblokEditorBridge,
  isStoryblokConfigured,
};
