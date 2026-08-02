import { API_URL } from "../api";

/**
 * Safely builds an image URL for any product/ad/cart item.
 * Handles null, undefined, "null" string, and already-absolute URLs.
 * Use this everywhere instead of `image.startsWith("http")` directly —
 * that crashes the page whenever image is null/undefined.
 */
export function getImageUrl(image, fallbackText = "No+Image") {
  if (!image || image === "null" || image === "undefined") {
    return `https://dummyimage.com/150x150/cccccc/000000&text=${fallbackText}`;
  }
  if (image.startsWith("http")) return image;

  // FIXED: stored `image` values already include the "uploads/" folder
  // prefix (adminRoutes.js saves them as `uploads/<filename>`), so
  // prepending "uploads/" again here produced "uploads/uploads/..." —
  // a path that never exists, hence every item image 404ing. Only add
  // the prefix for legacy values that don't already have it.
  const normalizedPath = image.startsWith("uploads/") ? image : `uploads/${image}`;
  return `${API_URL}/${normalizedPath}`;
}