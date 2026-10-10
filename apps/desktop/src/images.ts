import { useEffect, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listCovers, type Uuid } from "@remedia/core";
import { data } from "./db/database";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "gif", "avif"];

// The images folder never changes while the app runs: ask Rust once and reuse the answer.
const imagesDir = invoke<string>("images_dir");

/** Turns a stored relative path ("covers/….jpg") into a URL the webview can display. */
export function useImageUrl(relativePath: string | null | undefined): string | null {
  const [dir, setDir] = useState<string | null>(null);

  useEffect(() => {
    imagesDir.then(setDir);
  }, []);

  if (!dir || !relativePath) return null;
  // Stored paths use "/"; the folder uses the platform's separator ("\" on Windows).
  const separator = dir.includes("\\") ? "\\" : "/";
  return convertFileSrc(`${dir}${separator}${relativePath.split("/").join(separator)}`);
}

/**
 * Lets the user pick an image file and copies it into the app's images folder.
 * Returns the relative path to store, or null if the user cancelled.
 */
export async function pickImage(folder: "covers"): Promise<string | null> {
  const source = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Images", extensions: IMAGE_EXTENSIONS }],
  });
  if (!source) return null;
  return invoke<string>("import_image", { source, folder });
}

/** Cover paths of every live record, by record id. Reloads when `version` changes. */
export function useCovers(version = 0): Map<Uuid, string> {
  const [covers, setCovers] = useState<Map<Uuid, string>>(new Map());

  useEffect(() => {
    listCovers(data).then(setCovers);
  }, [version]);

  return covers;
}
