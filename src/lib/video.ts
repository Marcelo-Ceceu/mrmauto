/**
 * Utility functions for vehicle video handling (YouTube, Shorts, Vimeo, direct MP4)
 */

export type VideoInfo = {
  type: "youtube" | "vimeo" | "instagram" | "direct" | "unsupported";
  embedUrl: string | null;
  rawUrl: string;
};

/**
 * Extracts a video URL from either native `video_url` property or `[VIDEO:...]` embedded inside `ad_text`
 */
export function extractVideoUrl(vehicle?: {
  video_url?: string | null;
  ad_text?: string | null;
} | null): string | null {
  if (!vehicle) return null;
  if (vehicle.video_url && typeof vehicle.video_url === "string" && vehicle.video_url.trim()) {
    return vehicle.video_url.trim();
  }
  if (vehicle.ad_text) {
    const match = vehicle.ad_text.match(/\[VIDEO:(https?:\/\/[^\]\s]+)\]/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Cleans any internal [VIDEO:...] tag from description text so user only sees clean ad text
 */
export function cleanAdText(adText?: string | null): string {
  if (!adText) return "";
  return adText.replace(/\[VIDEO:[^\]]+\]\s*/g, "").trim();
}

/**
 * Injects or updates a [VIDEO:...] tag inside adText as a database-safe fallback
 */
export function injectVideoToAdText(
  adText?: string | null,
  videoUrl?: string | null,
): string | null {
  const clean = cleanAdText(adText);
  if (!videoUrl || !videoUrl.trim()) {
    return clean || null;
  }
  const tag = `[VIDEO:${videoUrl.trim()}]`;
  if (!clean) return tag;
  return `${clean}\n\n${tag}`;
}

/**
 * Parses and returns video embedding info (YouTube / Vimeo / Direct)
 */
export function parseVideoUrl(url?: string | null): VideoInfo | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // YouTube standard, short or embed
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      type: "youtube",
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`,
      rawUrl: trimmed,
    };
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/);
  if (vimeoMatch && vimeoMatch[3]) {
    return {
      type: "vimeo",
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[3]}`,
      rawUrl: trimmed,
    };
  }

  // Instagram Reel or Post
  const igMatch = trimmed.match(/instagram\.com\/(reel|reels|p)\/([a-zA-Z0-9_-]+)/i);
  if (igMatch && igMatch[1] && igMatch[2]) {
    const kind = igMatch[1].toLowerCase() === "p" ? "p" : "reel";
    const code = igMatch[2];
    return {
      type: "instagram",
      embedUrl: `https://www.instagram.com/${kind}/${code}/embed/`,
      rawUrl: trimmed,
    };
  }

  // Direct MP4 / WebM
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)) {
    return {
      type: "direct",
      embedUrl: trimmed,
      rawUrl: trimmed,
    };
  }

  // Fallback for generic links
  return {
    type: "unsupported",
    embedUrl: null,
    rawUrl: trimmed,
  };
}
